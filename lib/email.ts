import nodemailer from 'nodemailer'

function getEmailConfig() {
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST
  const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587)
  const user = process.env.SMTP_USER || process.env.EMAIL_USER
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS
  const from = process.env.REPORT_EMAIL_FROM || user

  return { host, port, user, pass, from }
}

export async function sendOtpEmail(email: string, code: string): Promise<void> {
  const { host, port, user, pass, from } = getEmailConfig()

  if (!host || !user || !pass || !from) {
    throw new Error('Email service is not configured (SMTP/EMAIL env vars are missing).')
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  await transporter.sendMail({
    from,
    to: email,
    subject: 'Bily Card - Verification Code',
    text: `Your verification code is: ${code}\nThis code expires in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #111827;">Verify your email</h2>
        <p style="color: #374151;">Your Bily Card verification code is:</p>
        <p style="font-size: 30px; font-weight: 700; letter-spacing: 4px; color: #2563eb;">${code}</p>
        <p style="color: #6b7280;">This code expires in 10 minutes.</p>
      </div>
    `,
  })
}