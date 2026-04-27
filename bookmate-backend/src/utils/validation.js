const { ALLOWED_USER_ROLES } = require('./auth');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[1-9]\d{9,14}$/;
const FAKE_EMAIL_DOMAINS = new Set([
  'example.com',
  'example.org',
  'example.net',
  'test.com',
  'mailinator.com',
  'tempmail.com',
]);
const FAKE_EMAIL_LOCAL_PARTS = [
  'test',
  'fake',
  'demo',
  'temp',
  'example',
  'asdf',
  'qwerty',
];

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmail(value) {
  const email = normalizeString(value).toLowerCase();
  return email || null;
}

function validateEmail(value) {
  const email = normalizeEmail(value);
  if (!email) {
    return { value: null, error: 'Email обязателен' };
  }

  if (email.length > 254 || !EMAIL_REGEX.test(email)) {
    return { value: null, error: 'Укажите корректный email' };
  }

  const [localPart, domain] = email.split('@');
  if (
    !localPart ||
    !domain ||
    FAKE_EMAIL_DOMAINS.has(domain) ||
    FAKE_EMAIL_LOCAL_PARTS.includes(localPart)
  ) {
    return { value: null, error: 'Нельзя использовать тестовый или фейковый email' };
  }

  return { value: email, error: null };
}

function normalizePhone(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const raw = normalizeString(value);
  if (!raw) {
    return null;
  }

  const normalized = raw.replace(/[^\d+]/g, '');
  const digitsOnly = normalized.startsWith('+') ? normalized.slice(1) : normalized;

  if (!digitsOnly || !PHONE_REGEX.test(`+${digitsOnly}`)) {
    return null;
  }

  return `+${digitsOnly}`;
}

function validatePhone(value, { required = false } = {}) {
  const phone = normalizePhone(value);

  if (!phone) {
    if (required) {
      return { value: null, error: 'Телефон обязателен' };
    }
    if (value === undefined || value === null || normalizeString(value) === '') {
      return { value: null, error: null };
    }
    return { value: null, error: 'Укажите корректный телефон в международном формате' };
  }

  return { value: phone, error: null };
}

function validatePassword(value) {
  const password = typeof value === 'string' ? value : '';
  if (!password) {
    return { value: null, error: 'Пароль обязателен' };
  }

  if (password.length < 8 || password.length > 72) {
    return { value: null, error: 'Пароль должен содержать от 8 до 72 символов' };
  }

  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return { value: null, error: 'Пароль должен содержать буквы и цифры' };
  }

  return { value: password, error: null };
}

function validateRole(value, { required = false } = {}) {
  const role = normalizeString(value);
  if (!role) {
    if (required) {
      return { value: null, error: 'Роль обязательна' };
    }
    return { value: null, error: null };
  }

  if (!ALLOWED_USER_ROLES.includes(role)) {
    return { value: null, error: 'Недопустимая роль пользователя' };
  }

  return { value: role, error: null };
}

function sanitizeProfileName(value) {
  const name = normalizeString(value);
  return name ? name.slice(0, 120) : '';
}

module.exports = {
  normalizeEmail,
  normalizePhone,
  normalizeString,
  sanitizeProfileName,
  validateEmail,
  validatePassword,
  validatePhone,
  validateRole,
};
