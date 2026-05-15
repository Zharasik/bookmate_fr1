export type Lang = 'ru' | 'kk';

const translations: Record<Lang, Record<string, string>> = {
  ru: {
    // Auth
    login: 'Войти',
    register: 'Регистрация',
    email: 'Email',
    password: 'Пароль',
    name: 'Имя',
    noAccount: 'Нет аккаунта?',
    hasAccount: 'Уже есть аккаунт?',
    loginError: 'Неверный email или пароль',
    registerError: 'Ошибка регистрации',
    forgotPassword: 'Забыли пароль?',
    forgotTitle: 'Восстановление пароля',
    forgotSub: 'Введите email — отправим 6-значный код для сброса пароля',
    sendCode: 'Отправить код',
    backToLogin: 'Назад к входу',
    resetTitle: 'Новый пароль',
    resetSub: 'Введите код из письма на',
    savePassword: 'Сохранить пароль',
    verifyTitle: 'Подтвердите email',
    verifySub: 'Введите 6-значный код отправленный на',
    verifyBtn: 'Подтвердить',
    resendCode: 'Отправить повторно',
    devMode: 'DEV режим — SMTP не настроен',
    devHint: 'Нажми чтобы вставить код автоматически',
    // Validation
    errNameRequired: 'Введите имя',
    errNameShort: 'Имя минимум 2 символа',
    errNameDigits: 'Имя не должно содержать цифры',
    errEmailRequired: 'Введите email',
    errEmailInvalid: 'Некорректный email адрес',
    errPhoneFormat: 'Формат: +7 777 777 77 77',
    errPassRequired: 'Введите пароль',
    errPassShort: 'Пароль минимум 8 символов',
    errPassUpper: 'Нужна хотя бы одна заглавная буква',
    errPassLower: 'Нужна хотя бы одна строчная буква',
    errPassDigit: 'Нужна хотя бы одна цифра',
    passHint: 'Мин. 8 символов · Загл. буква · Строчная · Цифра',
    errCodeIncomplete: 'Введите все 6 цифр',
    newPassword: 'Новый пароль',

    //  Tabs 
    explore: 'Главная',
    map: 'Карта',
    bookings: 'Брони',
    notifications: 'Уведомления',
    profile: 'Профиль',

    //Explore
    searchPlaceholder: 'Поиск клубов, боулинга, бильярда',
    all: 'Все',

    //Venue Detail 
    about: 'Описание',
    amenities: 'Удобства',
    reviews: 'Отзывы',
    seeAll: 'Все',
    bookNow: 'Забронировать',
    openNow: 'Открыто',
    reviewsCount: 'отзывов',
    photos: 'Фото',
    addPhoto: 'Добавить фото',
    promotions: 'Акции',
    services: 'Услуги',
    masters: 'Мастера',

    //Booking
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

    // Reviews 
    writeReview: 'Написать отзыв',
    noReviews: 'Отзывов пока нет',
    yourRating: 'Ваша оценка',
    yourComment: 'Ваш комментарий',
    submit: 'Отправить',

    // Notifications 
    noNotifications: 'Нет уведомлений',
    markAllRead: 'Прочитать все',

    //  Profile
    editProfile: 'Редактировать',
    favorites: 'Избранное',
    settings: 'Настройки',
    helpSupport: 'Помощь',
    logOut: 'Выйти',
    language: 'Язык',
    darkTheme: 'Тёмная тема',
    phone: 'Телефон',
    save: 'Сохранить',

    //  Map 
    discoverVenues: 'Заведения рядом',
    venueNotFound: 'Заведение не найдено',

    // General
    loading: 'Загрузка...',
    error: 'Ошибка',
    retry: 'Повторить',
    back: 'Назад',
    ok: 'Ок',
  },

  kk: {
    // Auth
    login: 'Кіру',
    register: 'Тіркелу',
    email: 'Email',
    password: 'Құпия сөз',
    name: 'Аты',
    noAccount: 'Аккаунт жоқ па?',
    hasAccount: 'Аккаунт бар ма?',
    loginError: 'Email немесе құпия сөз қате',
    registerError: 'Тіркелу қатесі',
    forgotPassword: 'Құпия сөзді ұмыттыңыз ба?',
    forgotTitle: 'Құпия сөзді қалпына келтіру',
    forgotSub: 'Email енгізіңіз — құпия сөзді сфіру үшін 6 таңбалы код жіберіледі',
    sendCode: 'Код жіберу',
    backToLogin: 'Кіруге оралу',
    resetTitle: 'Жаңа құпия сөз',
    resetSub: 'Хаттан кодты енгізіңіз',
    savePassword: 'Құпия сөзді сақтау',
    verifyTitle: 'Email растаңыз',
    verifySub: 'Жіберілген 6 таңбалы кодты енгізіңіз',
    verifyBtn: 'Растау',
    resendCode: 'Қайта жіберу',
    devMode: 'DEV режим — SMTP баптанбаған',
    devHint: 'Кодты автоматты енгізу үшін басыңыз',
    // Validation
    errNameRequired: 'Атыңызды енгізіңіз',
    errNameShort: 'Аты кемінде 2 таңба болуы керек',
    errNameDigits: 'Атта сан болмауы керек',
    errEmailRequired: 'Email енгізіңіз',
    errEmailInvalid: 'Email форматы дұрыс емес',
    errPhoneFormat: 'Формат: +7 777 777 77 77',
    errPassRequired: 'Құпия сөз енгізіңіз',
    errPassShort: 'Құпия сөз кемінде 8 таңба',
    errPassUpper: 'Кем дегенде бір бас әріп керек',
    errPassLower: 'Кем дегенде бір кіші әріп керек',
    errPassDigit: 'Кем дегенде бір сан керек',
    passHint: 'Кем дегенде 8 таңба · Бас әріп · Кіші · Сан',
    errCodeIncomplete: '6 санның бәрін енгізіңіз',
    newPassword: 'Жаңа құпия сөз',

    //  Tabs 
    explore: 'Басты',
    map: 'Карта',
    bookings: 'Брондар',
    notifications: 'Хабарламалар',
    profile: 'Профиль',

    //Explore
    searchPlaceholder: 'Клуб, боулинг, бильярд іздеу',
    all: 'Барлығы',

    //Venue Detail 
    about: 'Сипаттама',
    amenities: 'Ыңғайлылықтар',
    reviews: 'Пікірлер',
    seeAll: 'Барлығы',
    bookNow: 'Брондау',
    openNow: 'Ашық',
    reviewsCount: 'пікір',
    photos: 'Фото',
    addPhoto: 'Фото қосу',
    promotions: 'Акциялар',
    services: 'Қызметтер',
    masters: 'Шеберлер',

    //  Booking 
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

    //  Reviews 
    writeReview: 'Пікір жазу',
    noReviews: 'Пікірлер жоқ',
    yourRating: 'Сіздің бағаңыз',
    yourComment: 'Сіздің пікіріңіз',
    submit: 'Жіберу',

    //  Notifications 
    noNotifications: 'Хабарламалар жоқ',
    markAllRead: 'Бәрін оқу',

    // ─── Profile 
    editProfile: 'Өзгерту',
    favorites: 'Таңдаулылар',
    settings: 'Баптаулар',
    helpSupport: 'Көмек',
    logOut: 'Шығу',
    language: 'Тіл',
    darkTheme: 'Қараңғы тақырып',
    phone: 'Телефон',
    save: 'Сақтау',

    //  Map 
    discoverVenues: 'Жақын орындар',
    venueNotFound: 'Орын табылмады',

    // General 
    loading: 'Жүктелуде...',
    error: 'Қате',
    retry: 'Қайталау',
    back: 'Артқа',
    ok: 'Жарайды',
  },
};

export default translations;
