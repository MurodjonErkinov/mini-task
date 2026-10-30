# O‘quv markazi to‘lovlari

O‘quvchilarni, ularning oylik to‘lov miqdorini va amalga oshirilgan to‘lovlarni hisobga oluvchi FastAPI + SQLite ilovasi. Telefonda ishlatishga mos veb-interfeys va JSON API mavjud.

## Ishga tushirish

Python 3.10 yoki yangirog‘i kerak. Buyruqlarni loyiha papkasida bajaring:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Brauzerda `http://127.0.0.1:8000` ni oching. Sahifada o‘quvchi qo‘shish, ro‘yxatni ko‘rish, tahrirlash va o‘chirish; to‘lov kiritish va o‘quvchi to‘lovlari tarixini ochish; tanlangan oy qarzdorlarini ko‘rish mumkin. Interaktiv API hujjatlari: `http://127.0.0.1:8000/docs`. SQLite bazasi birinchi ishga tushishda `payments.db` faylida yaratiladi. Boshqa joy tanlash uchun `DATABASE_PATH` muhit o‘zgaruvchisini belgilang.

## API endpointlari

- `POST /students` — o‘quvchi yaratish (`name`, `phone`, `group`, `monthly_fee`).
- `GET /students` — o‘quvchilar ro‘yxati.
- `PUT /students/{id}` — o‘quvchi ma’lumotlarini yangilash.
- `DELETE /students/{id}` — o‘quvchini o‘chirish (to‘lovlari ham o‘chadi).
- `POST /payments` — to‘lov qo‘shish (`student_id`, `amount`, `date`, `YYYY-MM-DD`).
- `GET /students/{id}/payments` — o‘quvchining to‘lovlari.
- `GET /debtors?month=YYYY-MM` — qarzdorlar, shu oyda to‘langan jami va qarz miqdori.

`POST /students` va `PUT /students/{id}` so‘rovlari JSON qabul qiladi, masalan:

```json
{
  "name": "Ali Valiyev",
  "phone": "+998 90 123 45 67",
  "group": "Frontend-1",
  "monthly_fee": 500000
}
```

To‘lov uchun `POST /payments` ga `student_id`, `amount` va `date` (`YYYY-MM-DD`) yuboring.

Summa butun so‘mda saqlanadi. Sanasi tanlangan oyga to‘g‘ri kelgan to‘lovlar yig‘indisi oylik summadan ayiriladi; ortiqcha to‘lov qarzdorlikni manfiy qilmaydi. O‘quvchi o‘chirilganda unga tegishli to‘lov yozuvlari ham o‘chadi.

## Tekshiruv

Python sintaksisi, brauzer JavaScript sintaksisi va o‘quvchi CRUD, to‘lovlar tarixi hamda oylik qarzni hisoblash ssenariylari vaqtinchalik SQLite bazasida tekshirildi.

## Yana bir necha kun bo‘lsa

1. Foydalanuvchi autentifikatsiyasi va rollarni qo‘shardim.
2. To‘lovlarni tahrirlash yoki bekor qilish imkoniyatini qo‘shardim.
3. CSV eksporti hamda oylar bo‘yicha hisobot qo‘shardim.
4. Valyuta va qisman to‘lov qoidalarini sozlanadigan qilardim.
5. Migratsiyalar, avtomatik testlar va Docker orqali ishga tushirishni qo‘shardim.
# mini-task
