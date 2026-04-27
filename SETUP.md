# 🚀 Bookmate - Инструкция по запуску

## Требования
- **Node.js** >=18
- **PostgreSQL** (локально или облачная БД типа Neon, Supabase)
- **npm** или **yarn**

---

## 1️⃣ Установка Backend

```bash
cd bookmate-backend
npm install
```

**Конфигурация:**
- Файл `.env` уже создан с примером конфигурации
- Отредактируйте `DATABASE_URL` под вашу БД:
  - Локально: `postgresql://postgres:password@localhost:5432/bookmate_db`
  - Облако (Neon): `postgresql://user:pass@project.neon.tech/bookmate_db?sslmode=require`
- Обязательно задайте `JWT_SECRET` длиннее 32 символов
- При необходимости bootstrap-админа можно задать через `ADMIN_BOOTSTRAP_EMAIL` и `ADMIN_BOOTSTRAP_PASSWORD`

**Запуск:**
```bash
npm run db:init
npm start
```
Server запустится на `http://localhost:3000`

---

## 2️⃣ Установка Frontend

```bash
cd bookmate-frontend
npm install
```

**Запуск:**
```bash
npm start
# или
expo start
```

Выберите:
- `i` - iOS симулятор
- `a` - Android эмулятор  
- `w` - Web браузер

---

## 🗄️ PostgreSQL - Первичная настройка

Если БД еще не создана:

```bash
# Windows (через psql)
psql -U postgres -c "CREATE DATABASE bookmate_db;"

# macOS/Linux
createdb bookmate_db
```

Затем убедитесь, что БД инициализирована:
- Проверьте файл `bookmate-backend/src/db/init.js` для SQL схемы
- Запустите инициализацию при первом подключении

---

## ✅ Проверка

- Backend: http://localhost:3000
- Frontend: Expo QR-код в консоли
- Admin панель: http://localhost:3000/admin

---

## 🔧 Troubleshooting

| Проблема | Решение |
|----------|---------|
| `DATABASE_URL не найден` | Проверьте файл `.env` в backend |
| `Cannot find module 'pg'` | Запустите `npm install` в backend |
| `Port 3000 уже использован` | Измените PORT в `.env` |
| `Cannot connect to database` | Проверьте PostgreSQL запущена и учетные данные в DATABASE_URL |

---

## 📝 Структура проекта

```
bookmate-backend/     - Node.js API (Express + PostgreSQL)
bookmate-frontend/    - React Native Expo приложение
```
