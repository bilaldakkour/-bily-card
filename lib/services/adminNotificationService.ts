import axios from 'axios';
import { connectDB } from '@/lib/db/mongodb';
import SystemSettings from '@/lib/models/SystemSettings';

type NotificationLine = string | number | null | undefined;

export interface AdminNotificationPayload {
  title: string;
  lines?: NotificationLine[];
}

interface NotificationSettings {
  telegramBotToken: string;
  telegramChatId: string;
  whatsappAccessToken: string;
  whatsappPhoneNumberId: string;
  whatsappAdminNumber: string;
}

function firstNonEmpty(...values: Array<string | undefined | null>): string {
  for (const value of values) {
    const trimmed = String(value || '').trim();
    if (trimmed) return trimmed;
  }

  return '';
}

function normalizePhoneNumber(value: string): string {
  return String(value || '').replace(/\D/g, '');
}

function formatMessage(payload: AdminNotificationPayload): string {
  const body = (payload.lines || [])
    .map((line) => String(line || '').trim())
    .filter(Boolean)
    .join('\n');

  return [payload.title.trim(), body].filter(Boolean).join('\n\n');
}

async function loadNotificationSettings(): Promise<NotificationSettings> {
  await connectDB();
  const settings = (await SystemSettings.findOne({}).lean()) as any;

  return {
    telegramBotToken: firstNonEmpty(
      process.env.TELEGRAM_BOT_TOKEN,
      settings?.telegramBotToken
    ),
    telegramChatId: firstNonEmpty(
      process.env.TELEGRAM_CHAT_ID,
      process.env.TELEGRAM_ADMIN_CHAT_ID,
      settings?.telegramChatId
    ),
    whatsappAccessToken: firstNonEmpty(
      process.env.WHATSAPP_ACCESS_TOKEN,
      settings?.whatsappAccessToken
    ),
    whatsappPhoneNumberId: firstNonEmpty(
      process.env.WHATSAPP_PHONE_NUMBER_ID,
      settings?.whatsappPhoneNumberId
    ),
    whatsappAdminNumber: normalizePhoneNumber(
      firstNonEmpty(
        process.env.WHATSAPP_ADMIN_NUMBER,
        settings?.whatsappAdminNumber
      )
    ),
  };
}

async function sendTelegram(settings: NotificationSettings, text: string) {
  if (!settings.telegramBotToken || !settings.telegramChatId) {
    return { ok: false, reason: 'telegram_not_configured' as const };
  }

  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`,
      {
        chat_id: settings.telegramChatId,
        text,
      },
      {
        timeout: 15000,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.data?.ok) {
      console.error('Telegram API error:', response.data);
      return { ok: false, reason: 'telegram_api_error' as const };
    }

    return { ok: true as const };
  } catch (error: any) {
    console.error(
      'Telegram notification failed:',
      error?.response?.data || error?.message || error
    );
    return { ok: false, reason: 'telegram_request_failed' as const };
  }
}

async function sendWhatsApp(settings: NotificationSettings, text: string) {
  if (
    !settings.whatsappAccessToken ||
    !settings.whatsappPhoneNumberId ||
    !settings.whatsappAdminNumber
  ) {
    return { ok: false, reason: 'whatsapp_not_configured' as const };
  }

  try {
    await axios.post(
      `https://graph.facebook.com/v22.0/${settings.whatsappPhoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: settings.whatsappAdminNumber,
        type: 'text',
        text: {
          preview_url: false,
          body: text,
        },
      },
      {
        timeout: 15000,
        headers: {
          Authorization: `Bearer ${settings.whatsappAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return { ok: true as const };
  } catch (error: any) {
    console.error(
      'WhatsApp notification failed:',
      error?.response?.data || error?.message || error
    );
    return { ok: false, reason: 'whatsapp_request_failed' as const };
  }
}

export async function sendAdminNotification(payload: AdminNotificationPayload) {
  try {
    const settings = await loadNotificationSettings();
    const text = formatMessage(payload);

    const [telegram, whatsapp] = await Promise.allSettled([
      sendTelegram(settings, text),
      sendWhatsApp(settings, text),
    ]);

    return {
      ok: true,
      telegram:
        telegram.status === 'fulfilled'
          ? telegram.value
          : { ok: false, reason: 'telegram_error' as const },
      whatsapp:
        whatsapp.status === 'fulfilled'
          ? whatsapp.value
          : { ok: false, reason: 'whatsapp_error' as const },
    };
  } catch (error) {
    console.error('Admin notification service failed:', error);
    return {
      ok: false,
      telegram: { ok: false, reason: 'telegram_error' as const },
      whatsapp: { ok: false, reason: 'whatsapp_error' as const },
    };
  }
}
