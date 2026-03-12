import axios from 'axios';
import nodemailer from 'nodemailer';
import { connectDB } from '@/lib/db/mongodb';
import Order from '@/lib/models/Order';

type DailyReportData = {
  date: string;
  orders: {
    total: number;
    completed: number;
    failed: number;
    refunded: number;
    pending: number;
  };
  financial: {
    totalSales: number;
    totalProviderCost: number;
    totalProfit: number;
  };
  topProducts: Array<{
    productName: string;
    count: number;
    revenue: number;
    profit: number;
  }>;
};

function getDayRange(baseDate?: Date) {
  const start = baseDate ? new Date(baseDate) : new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

export async function buildDailyReportData(baseDate?: Date): Promise<DailyReportData> {
  await connectDB();
  const { start, end } = getDayRange(baseDate);

  const [
    totalOrders,
    completedOrders,
    failedOrders,
    refundedOrders,
    salesAgg,
    costAgg,
    profitAgg,
    topProductsRaw,
  ] = await Promise.all([
    Order.countDocuments({ createdAt: { $gte: start, $lt: end } }),
    Order.countDocuments({ createdAt: { $gte: start, $lt: end }, status: 'completed' }),
    Order.countDocuments({ createdAt: { $gte: start, $lt: end }, status: 'failed' }),
    Order.countDocuments({ createdAt: { $gte: start, $lt: end }, status: 'refunded' }),
    Order.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end }, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end }, status: 'completed' } },
      {
        $addFields: {
          computedCost: {
            $ifNull: [
              '$providerTotalCost',
              {
                $multiply: [
                  { $ifNull: ['$baseUnitPrice', 0] },
                  { $ifNull: ['$quantity', 1] },
                ],
              },
            ],
          },
        },
      },
      { $group: { _id: null, total: { $sum: '$computedCost' } } },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end }, status: 'completed' } },
      {
        $addFields: {
          computedProfit: {
            $ifNull: [
              '$grossProfit',
              {
                $subtract: [
                  '$total',
                  {
                    $multiply: [
                      { $ifNull: ['$baseUnitPrice', 0] },
                      { $ifNull: ['$quantity', 1] },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
      { $group: { _id: null, total: { $sum: '$computedProfit' } } },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end }, status: 'completed' } },
      {
        $addFields: {
          computedProfit: {
            $ifNull: [
              '$grossProfit',
              {
                $subtract: [
                  '$total',
                  {
                    $multiply: [
                      { $ifNull: ['$baseUnitPrice', 0] },
                      { $ifNull: ['$quantity', 1] },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: '$productName',
          count: { $sum: 1 },
          revenue: { $sum: '$total' },
          profit: { $sum: '$computedProfit' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
  ]);

  const totalSales = Number(salesAgg[0]?.total || 0);
  const totalProviderCost = Number(costAgg[0]?.total || 0);
  const totalProfit = Number(profitAgg[0]?.total || 0);

  return {
    date: start.toISOString().split('T')[0],
    orders: {
      total: totalOrders,
      completed: completedOrders,
      failed: failedOrders,
      refunded: refundedOrders,
      pending: Math.max(0, totalOrders - completedOrders - failedOrders - refundedOrders),
    },
    financial: {
      totalSales,
      totalProviderCost,
      totalProfit,
    },
    topProducts: (topProductsRaw || []).map((row: any) => ({
      productName: String(row._id || 'Unknown Product'),
      count: Number(row.count || 0),
      revenue: Number(row.revenue || 0),
      profit: Number(row.profit || 0),
    })),
  };
}

function formatTelegramReport(report: DailyReportData): string {
  const topProductsText = report.topProducts.length
    ? report.topProducts
        .map(
          (p, idx) =>
            `${idx + 1}. ${p.productName}\n   Orders: ${p.count} | Revenue: $${p.revenue.toFixed(2)} | Profit: $${p.profit.toFixed(2)}`
        )
        .join('\n')
    : 'No completed orders today';

  return [
    `Bily Card Daily Report (${report.date})`,
    '',
    `Orders: ${report.orders.total}`,
    `Completed: ${report.orders.completed}`,
    `Pending: ${report.orders.pending}`,
    `Failed: ${report.orders.failed}`,
    `Refunded: ${report.orders.refunded}`,
    '',
    `Total Sales: $${report.financial.totalSales.toFixed(2)}`,
    `Provider Cost: $${report.financial.totalProviderCost.toFixed(2)}`,
    `Total Profit: $${report.financial.totalProfit.toFixed(2)}`,
    '',
    'Top Products:',
    topProductsText,
  ].join('\n');
}

function formatEmailHtml(report: DailyReportData): string {
  const rows = report.topProducts
    .map(
      (p) =>
        `<tr><td style="padding:6px 8px;border:1px solid #ddd;">${p.productName}</td><td style="padding:6px 8px;border:1px solid #ddd;">${p.count}</td><td style="padding:6px 8px;border:1px solid #ddd;">$${p.revenue.toFixed(2)}</td><td style="padding:6px 8px;border:1px solid #ddd;">$${p.profit.toFixed(2)}</td></tr>`
    )
    .join('');

  return `
    <h2>Bily Card Daily Report (${report.date})</h2>
    <p><strong>Orders:</strong> ${report.orders.total}</p>
    <p><strong>Completed:</strong> ${report.orders.completed} | <strong>Pending:</strong> ${report.orders.pending} | <strong>Failed:</strong> ${report.orders.failed} | <strong>Refunded:</strong> ${report.orders.refunded}</p>
    <p><strong>Total Sales:</strong> $${report.financial.totalSales.toFixed(2)}</p>
    <p><strong>Provider Cost:</strong> $${report.financial.totalProviderCost.toFixed(2)}</p>
    <p><strong>Total Profit:</strong> $${report.financial.totalProfit.toFixed(2)}</p>
    <h3>Top Products</h3>
    <table style="border-collapse:collapse;">
      <thead>
        <tr>
          <th style="padding:6px 8px;border:1px solid #ddd;">Product</th>
          <th style="padding:6px 8px;border:1px solid #ddd;">Orders</th>
          <th style="padding:6px 8px;border:1px solid #ddd;">Revenue</th>
          <th style="padding:6px 8px;border:1px solid #ddd;">Profit</th>
        </tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="4" style="padding:6px 8px;border:1px solid #ddd;">No completed orders today</td></tr>'}</tbody>
    </table>
  `;
}

async function sendTelegram(report: DailyReportData) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !chatId) {
    return { ok: false, reason: 'telegram_not_configured' };
  }

  await axios.post(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      chat_id: chatId,
      text: formatTelegramReport(report),
    },
    { timeout: 15000 }
  );

  return { ok: true };
}

async function sendEmail(report: DailyReportData) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const to = process.env.REPORT_EMAIL_TO;
  const from = process.env.REPORT_EMAIL_FROM || user;

  if (!host || !user || !pass || !to || !from) {
    return { ok: false, reason: 'email_not_configured' };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to,
    subject: `Bily Card Daily Report - ${report.date}`,
    text: formatTelegramReport(report),
    html: formatEmailHtml(report),
  });

  return { ok: true };
}

export async function sendDailyReportNotifications(baseDate?: Date) {
  const report = await buildDailyReportData(baseDate);

  const [telegram, email] = await Promise.allSettled([
    sendTelegram(report),
    sendEmail(report),
  ]);

  const telegramResult = telegram.status === 'fulfilled' ? telegram.value : { ok: false, reason: 'telegram_error' };
  const emailResult = email.status === 'fulfilled' ? email.value : { ok: false, reason: 'email_error' };

  return {
    report,
    delivery: {
      telegram: telegramResult,
      email: emailResult,
    },
  };
}
