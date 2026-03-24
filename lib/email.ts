import nodemailer from 'nodemailer'

function getEmailConfig() {
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST
  const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587)
  const user = process.env.SMTP_USER || process.env.EMAIL_USER
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS
  const from = process.env.REPORT_EMAIL_FROM || user

  return { host, port, user, pass, from }
}

function formatVerificationCode(code: string) {
  const normalized = String(code || '').replace(/\s+/g, '')
  if (normalized.length !== 6) return normalized
  return `${normalized.slice(0, 3)} ${normalized.slice(3)}`
}

export async function sendOtpEmail(email: string, code: string): Promise<void> {
  const { host, port, user, pass, from } = getEmailConfig()
  const formattedCode = formatVerificationCode(code)
  const previewText = 'Use this code to verify your Bily Card account.'

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
    text: `Bily Card verification code\n${formattedCode}\nValid for 10 minutes.`,
    html: `
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
        ${previewText}
      </div>
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px 18px; background: #f8fafc; color: #0f172a;">
        <div style="border: 1px solid #dbeafe; border-radius: 22px; background: #ffffff; padding: 28px 24px; text-align: center; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);">
          <p style="margin: 0; font-size: 14px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #0369a1;">
            Bily Card Verification
          </p>
          <p style="margin: 14px 0 0; font-size: 16px; line-height: 1.8; color: #334155;">
            Use the code below to complete your sign in.
          </p>
          <p style="margin: 18px 0 0; font-size: 34px; font-weight: 800; letter-spacing: 0.28em; color: #2563eb;">
            ${formattedCode}
          </p>
          <p style="margin: 16px 0 0; font-size: 13px; line-height: 1.7; color: #64748b;">
            Valid for 10 minutes.
          </p>
        </div>
      </div>
    `,
  })
}

export async function sendPasswordResetCodeEmail(email: string, code: string): Promise<void> {
  const { host, port, user, pass, from } = getEmailConfig()
  const formattedCode = formatVerificationCode(code)
  const previewText = 'Use this code to reset your Bily Card password.'

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
    subject: 'Bily Card - Password Reset Code',
    text: `Bily Card password reset code\n${formattedCode}\nValid for 10 minutes.`,
    html: `
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
        ${previewText}
      </div>
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px 18px; background: #f8fafc; color: #0f172a;">
        <div style="border: 1px solid #dbeafe; border-radius: 22px; background: #ffffff; padding: 28px 24px; text-align: center; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);">
          <p style="margin: 0; font-size: 14px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #0369a1;">
            Bily Card Password Reset
          </p>
          <p style="margin: 14px 0 0; font-size: 16px; line-height: 1.8; color: #334155;">
            Use the code below to choose a new password for your account.
          </p>
          <p style="margin: 18px 0 0; font-size: 34px; font-weight: 800; letter-spacing: 0.28em; color: #2563eb;">
            ${formattedCode}
          </p>
          <p style="margin: 16px 0 0; font-size: 13px; line-height: 1.7; color: #64748b;">
            Valid for 10 minutes.
          </p>
        </div>
      </div>
    `,
  })
}
