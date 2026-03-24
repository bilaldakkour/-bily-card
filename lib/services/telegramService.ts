// Frontend-only project - Telegram service disabled
class TelegramService {
  private bot: any = null;
  private chatId: string;

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = process.env.TELEGRAM_ADMIN_CHAT_ID || '';
  }

  async sendAdminNotification(
    _title: string,
    _data: Record<string, any>
  ): Promise<boolean> {
    // Mock notification
    return true;
  }

  async sendCustomerNotification(
    _chatId: string,
    _title: string,
    _data: Record<string, any>
  ): Promise<boolean> {
    // Mock notification
    return true;
  }

  private formatAdminMessage(title: string, data: Record<string, any>): string {
    let message = `<b>Bily Card - ${title}</b>\n\n`;

    for (const [key, value] of Object.entries(data)) {
      const formatted = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase());
      message += `<b>${formatted}:</b> ${value}\n`;
    }

    return message;
  }

  private formatCustomerMessage(
    title: string,
    data: Record<string, any>
  ): string {
    let message = `<b>Bily Card</b>\n\n`;
    message += `<b>${title}</b>\n\n`;

    // Only show customer-relevant fields
    const customerFields = ['Product', 'playerId', 'Status', 'Amount'];
    for (const [key, value] of Object.entries(data)) {
      if (customerFields.some((f) => key.toLowerCase().includes(f.toLowerCase()))) {
        message += `${key}: ${value}\n`;
      }
    }

    message += `\nThank you for choosing Bily Card.`;
    return message;
  }
}

export default new TelegramService();
