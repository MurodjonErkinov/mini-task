from contextlib import asynccontextmanager
from datetime import date
from decimal import Decimal
import os
import sqlite3
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

DB_PATH = Path(os.getenv("DATABASE_PATH", "payments.db"))


def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    with connect() as db:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                group_name TEXT NOT NULL,
                monthly_fee INTEGER NOT NULL CHECK (monthly_fee >= 0)
            );
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                amount INTEGER NOT NULL CHECK (amount > 0),
                paid_on TEXT NOT NULL
            );
        """)


def student_json(row):
    result = dict(row)
    result["group"] = result.pop("group_name")
    return result


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Study Center Payments", version="1.0.0", lifespan=lifespan)
app.mount("/static", StaticFiles(directory="static"), name="static")


class StudentIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(min_length=1, max_length=40)
    group: str = Field(min_length=1, max_length=80)
    monthly_fee: int = Field(ge=0)


class PaymentIn(BaseModel):
    student_id: int = Field(gt=0)
    amount: int = Field(gt=0)
    date: date


@app.get("/")
def home():
    return FileResponse("static/index.html")


@app.post("/students", status_code=201)
def create_student(student: StudentIn):
    with connect() as db:
        cur = db.execute("INSERT INTO students(name, phone, group_name, monthly_fee) VALUES (?, ?, ?, ?)",
                         (student.name.strip(), student.phone.strip(), student.group.strip(), student.monthly_fee))
        row = db.execute("SELECT * FROM students WHERE id = ?", (cur.lastrowid,)).fetchone()
        return student_json(row)


@app.get("/students")
def list_students():
    with connect() as db:
        return [student_json(row) for row in db.execute("SELECT * FROM students ORDER BY name COLLATE NOCASE")]


@app.put("/students/{student_id}")
def update_student(student_id: int, student: StudentIn):
    with connect() as db:
        cur = db.execute("UPDATE students SET name=?, phone=?, group_name=?, monthly_fee=? WHERE id=?",
                         (student.name.strip(), student.phone.strip(), student.group.strip(), student.monthly_fee, student_id))
        if not cur.rowcount:
            raise HTTPException(404, "Student not found")
        return student_json(db.execute("SELECT * FROM students WHERE id=?", (student_id,)).fetchone())


@app.delete("/students/{student_id}", status_code=204)
def delete_student(student_id: int):
    with connect() as db:
        cur = db.execute("DELETE FROM students WHERE id=?", (student_id,))
        if not cur.rowcount:
            raise HTTPException(404, "Student not found")
    return Response(status_code=204)


@app.post("/payments", status_code=201)
def create_payment(payment: PaymentIn):
    with connect() as db:
        if not db.execute("SELECT 1 FROM students WHERE id=?", (payment.student_id,)).fetchone():
            raise HTTPException(404, "Student not found")
        cur = db.execute("INSERT INTO payments(student_id, amount, paid_on) VALUES (?, ?, ?)",
                         (payment.student_id, payment.amount, payment.date.isoformat()))
        return dict(db.execute("SELECT * FROM payments WHERE id=?", (cur.lastrowid,)).fetchone())


@app.get("/students/{student_id}/payments")
def list_payments(student_id: int):
    with connect() as db:
        if not db.execute("SELECT 1 FROM students WHERE id=?", (student_id,)).fetchone():
            raise HTTPException(404, "Student not found")
        return [dict(row) for row in db.execute("SELECT * FROM payments WHERE student_id=? ORDER BY paid_on DESC, id DESC", (student_id,))]


@app.get("/debtors")
def debtors(month: str = Query(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")):
    with connect() as db:
        rows = db.execute("""
            SELECT s.id, s.name, s.phone, s.group_name AS 'group', s.monthly_fee,
                   COALESCE(SUM(p.amount), 0) AS paid,
                   MAX(s.monthly_fee - COALESCE(SUM(p.amount), 0), 0) AS debt
            FROM students s LEFT JOIN payments p
              ON p.student_id=s.id AND substr(p.paid_on, 1, 7)=?
            GROUP BY s.id
            HAVING COALESCE(SUM(p.amount), 0) < s.monthly_fee
            ORDER BY debt DESC, s.name COLLATE NOCASE
        """, (month,)).fetchall()
        return [dict(row) for row in rows]
