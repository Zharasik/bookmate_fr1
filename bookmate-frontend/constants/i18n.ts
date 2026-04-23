export type Lang = 'ru' | 'kk';

const translations: Record<Lang, Record<string, string>> = {
  ru: {
    // ─── Auth ──────────────────────────
    login: 'Войти',
    register: 'Регистрация',
    email: 'Email',
    password: 'Пароль',
    name: 'Имя',
    noAccount: 'Нет аккаунта?',
    hasAccount: 'Уже есть аккаунт?',
    loginError: 'Неверный email или пароль',
    registerError: 'Ошибка регистрации',

    // ─── Tabs ──────────────────────────
    explore: 'Главная',
    map: 'Карта',
    bookings: 'Брони',
    notifications: 'Уведомления',
    profile: 'Профиль',

    // ─── Explore ───────────────────────
    searchPlaceholder: 'Поиск клубов, боулинга, бильярда',
    all: 'Все',

    // ─── Venue Detail ──────────────────
    about: 'Описание',
    amenities: 'Удобства',
    reviews: 'Отзывы',
    seeAll: 'Все',
    bookNow: 'Забронировать',
    openNow: 'Открыто',
    reviewsCount: 'отзывов',
    photos: 'Фото',
    addPhoto: 'Добавить фото',

    // ─── Booking ───────────────────────
    bookReservation: 'Бронирование',
    selectDate: 'Выберите дату',
    selectTime: 'Выберите время',
    guests: 'Гости',
    confirmReservation: 'Подтвердить бронь',
    myBookings: 'Мои брони',
    upcoming: 'Предстоящие',
    completed: 'Завершённые',
    cancelled: 'Отменённые',
    cancel: 'Отменить',
    bookingConfirmed: 'Бронь подтверждена!',

    // ─── Reviews ───────────────────────
    writeReview: 'Написать отзыв',
    noReviews: 'Отзывов пока нет',
    yourRating: 'Ваша оценка',
    yourComment: 'Ваш комментарий',
    submit: 'Отправить',

    // ─── Notifications ─────────────────
    noNotifications: 'Нет уведомлений',
    markAllRead: 'Прочитать все',

    // ─── Profile ───────────────────────
    editProfile: 'Редактировать',
    favorites: 'Избранное',
    settings: 'Настройки',
    helpSupport: 'Помощь',
    logOut: 'Выйти',
    language: 'Язык',
    darkTheme: 'Тёмная тема',
    phone: 'Телефон',
    save: 'Сохранить',

    // ─── Map ───────────────────────────
    discoverVenues: 'Заведения рядом',
    venueNotFound: 'Заведение не найдено',

    // ─── General ───────────────────────
    loading: 'Загрузка...',
    error: 'Ошибка',
    retry: 'Повторить',
    back: 'Назад',
    ok: 'Ок',
  },

  kk: {
    // ─── Auth ──────────────────────────
    login: 'Кіру',
    register: 'Тіркелу',
    email: 'Email',
    password: 'Құпия сөз',
    name: 'Аты',
    noAccount: 'Аккаунт жоқ па?',
    hasAccount: 'Аккаунт бар ма?',
    loginError: 'Email немесе құпия сөз қате',
    registerError: 'Тіркелу қатесі',

    // ─── Tabs ──────────────────────────
    explore: 'Басты',
    map: 'Карта',
    bookings: 'Брондар',
    notifications: 'Хабарламалар',
    profile: 'Профиль',

    // ─── Explore ───────────────────────
    searchPlaceholder: 'Клуб, боулинг, бильярд іздеу',
    all: 'Барлығы',

    // ─── Venue Detail ──────────────────
    about: 'Сипаттама',
    amenities: 'Ыңғайлылықтар',
    reviews: 'Пікірлер',
    seeAll: 'Барлығы',
    bookNow: 'Брондау',
    openNow: 'Ашық',
    reviewsCount: 'пікір',
    photos: 'Фото',
    addPhoto: 'Фото қосу',

    // ─── Booking ───────────────────────
    bookReservation: 'Брондау',
    selectDate: 'Күнді таңдаңыз',
    selectTime: 'Уақытты таңдаңыз',
    guests: 'Қонақтар',
    confirmReservation: 'Брондау растау',
    myBookings: 'Менің брондарым',
    upcoming: 'Алдағы',
    completed: 'Аяқталған',
    cancelled: 'Бас тартылған',
    cancel: 'Бас тарту',
    bookingConfirmed: 'Бронь расталды!',

    // ─── Reviews ───────────────────────
    writeReview: 'Пікір жазу',
    noReviews: 'Пікірлер жоқ',
    yourRating: 'Сіздің бағаңыз',
    yourComment: 'Сіздің пікіріңіз',
    submit: 'Жіберу',

    // ─── Notifications ─────────────────
    noNotifications: 'Хабарламалар жоқ',
    markAllRead: 'Бәрін оқу',

    // ─── Profile ───────────────────────
    editProfile: 'Өзгерту',
    favorites: 'Таңдаулылар',
    settings: 'Баптаулар',
    helpSupport: 'Көмек',
    logOut: 'Шығу',
    language: 'Тіл',
    darkTheme: 'Қараңғы тақырып',
    phone: 'Телефон',
    save: 'Сақтау',

    // ─── Map ───────────────────────────
    discoverVenues: 'Жақын орындар',
    venueNotFound: 'Орын табылмады',

    // ─── General ───────────────────────
    loading: 'Жүктелуде...',
    error: 'Қате',
    retry: 'Қайталау',
    back: 'Артқа',
    ok: 'Жарайды',
  },
};

export default translations;
