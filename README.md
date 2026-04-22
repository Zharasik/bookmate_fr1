# BookMate 

**Стек**: React Native (Expo) + Node.js (Express) + PostgreSQL (Neon.tech)
**Хостинг**: Render.com (backend) + Expo Go 

---

## Структура проекта

```
bookmate/
├── bookmate-backend/     ← Express API + JWT + PostgreSQL
│   ├── src/
│   │   ├── index.js          ← Входная точка сервера
│   │   ├── db/pool.js        ← Подключение к PostgreSQL
│   │   ├── db/init.js        ← Создание таблиц + seed данные
│   │   ├── middleware/auth.js ← JWT middleware
│   │   └── routes/
│   │       ├── auth.js        ← Регистрация / Логин / Профиль
│   │       ├── venues.js      ← Заведения
│   │       ├── bookings.js    ← Бронирования
│   │       ├── reviews.js     ← Отзывы
│   │       ├── notifications.js ← Уведомления
│   │       ├── favorites.js   ← Избранное
│   │       └── photos.js      ← Загрузка фото
│   ├── package.json
│   ├── render.yaml            ← Конфиг для Render.com
│   └── .env.example
│
└── bookmate-frontend/    ← React Native (Expo Router)
    ├── app/
    │   ├── _layout.tsx        ← Корневой layout
    │   ├── index.tsx          ← Редирект (auth или tabs)
    │   ├── auth/
    │   │   ├── login.tsx      ← Экран входа
    │   │   └── register.tsx   ← Экран регистрации
    │   ├── (tabs)/
    │   │   ├── _layout.tsx    ← Tab navigator
    │   │   ├── index.tsx      ← Главная (Explore)
    │   │   ├── map.tsx        ← Карта
    │   │   ├── bookings.tsx   ← Мои брони
    │   │   ├── notifications.tsx ← Уведомления
    │   │   └── profile.tsx    ← Профиль + настройки
    │   └── venue/
    │       ├── [id].tsx       ← Детали заведения
    │       └── [id]/
    │           ├── book.tsx   ← Бронирование
    │           └── reviews.tsx ← Отзывы + написать отзыв
    ├── constants/
    │   ├── api.ts             ← URL бэкенда
    │   ├── i18n.ts            ← Переводы (RU + KK)
    │   └── theme.ts           ← Светлая + тёмная тема
    ├── hooks/
    │   ├── useStore.ts        ← Zustand (auth, theme, lang)
    │   └── useHelpers.ts      ← useTheme() + useT()
    ├── services/
    │   └── api.ts             ← HTTP-клиент ко всем эндпоинтам
    ├── app.json
    └── package.json
```

---
