const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`BookMate API v2 running on port ${PORT}`);
  const smtpOk = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  const resendOk = Boolean(process.env.RESEND_API_KEY);
  console.log(`Mail: ${resendOk ? 'Resend ✓' : smtpOk ? 'SMTP (Gmail) ✓' : 'НЕ НАСТРОЕН — DEV режим'}`);
  const { startReminderScheduler } = require('./utils/reminderScheduler');
  startReminderScheduler();
});
