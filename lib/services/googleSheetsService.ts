import { google } from 'googleapis';
import { IOrder, IWalletTransaction } from '../types';

class GoogleSheetsService {
  private sheets: any;
  private spreadsheetId: string;

  constructor() {
    this.spreadsheetId = process.env.GOOGLE_SHEETS_ID || '';

    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_SHEETS_CREDENTIALS_PATH,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheets = google.sheets({ version: 'v4', auth }) as any;
    } catch (error) {
      console.error('Failed to initialize Google Sheets');
    }
  }

  async appendOrder(order: IOrder): Promise<void> {
    if (!this.sheets || !this.spreadsheetId) return;

    try {
      const values = [
        [
          order.orderId,
          new Date(order.createdAt).toISOString(),
          order.customerName,
          order.customerUsername,
          order.productName,
          order.playerId,
          order.quantity,
          order.costPrice,
          order.sellingPrice,
          order.profit,
          order.currency,
          order.status,
          order.providerOrderId,
          order.notes || '',
        ],
      ];

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Raw_Orders!A:N',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });
    } catch (error: any) {
      console.error('Failed to append order to Google Sheets:', error.message);
    }
  }

  async appendWalletTransaction(
    transaction: IWalletTransaction
  ): Promise<void> {
    if (!this.sheets || !this.spreadsheetId) return;

    try {
      const values = [
        [
          transaction._id,
          new Date(transaction.createdAt).toISOString(),
          transaction.userId,
          transaction.type,
          transaction.amount,
          transaction.currency,
          transaction.balanceBefore,
          transaction.balanceAfter,
          transaction.notes || '',
        ],
      ];

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Wallet_Transactions!A:I',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });
    } catch (error: any) {
      console.error(
        'Failed to append transaction to Google Sheets:',
        error.message
      );
    }
  }

  async generateDailyReport(date: Date): Promise<void> {
    if (!this.sheets || !this.spreadsheetId) return;

    try {
      // This would aggregate data and create a report
      // Implementation depends on your reporting needs
      console.log('Generating daily report for', date);
    } catch (error: any) {
      console.error('Failed to generate report:', error.message);
    }
  }
}

export default new GoogleSheetsService();
