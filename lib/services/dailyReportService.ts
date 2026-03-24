import axios from 'axios';
import nodemailer from 'nodemailer';
import { connectDB } from '@/lib/db/mongodb';
import Order from '@/lib/models/Order';
import ManualOrder from '@/lib/models/ManualOrder';
import SystemSettings from '@/lib/models/SystemSettings';
import DailyReportDispatch from '@/lib/models/DailyReportDispatch';

type DailyReportData = {
  date: string;
  orders: {
    total: number;
    completed: number;
    failed: number;
    refunded: number;
    pending: number;
    manualTotal: number;
  };
  financial: {
    totalSales: number;
    totalProviderCost: number;
    totalProfit: number;
    manualSales: number;
    manualCost: number;
    manualProfit: number;
    combinedProfit: number;
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

function toNum(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildOrderCostExpression() {
  return {
    $cond: [
      { $gt: [{ $ifNull: ['$providerTotalCost', 0] }, 0] },
      { $ifNull: ['$providerTotalCost', 0] },
      {
        $cond: [
          { $gt: [{ $ifNull: ['$baseUnitPrice', 0] }, 0] },
          {
            $multiply: [
              { $ifNull: ['$baseUnitPrice', 0] },
              { $ifNull: ['$quantity', 1] },
            ],
          },
          0,
        ],
      },
    ],
  };
}

function mergeTopProducts(normalRows: any[], manualRows: any[]) {
  const merged = new Map<string, { productName: string; count: number; revenue: number; profit: number }>();

  for (const row of normalRows || []) {
    const productName = String(row?._id || 'Unknown Product');
    const current = merged.get(productName) || { productName, count: 0, revenue: 0, profit: 0 };
    current.count += toNum(row?.count);
    current.revenue += toNum(row?.revenue);
    current.profit += toNum(row?.profit);
    merged.set(productName, current);
  }

  for (const row of manualRows || []) {
    const productName = String(row?._id || 'Unknown Product');
    const current = merged.get(productName) || { productName, count: 0, revenue: 0, profit: 0 };
    current.count += toNum(row?.count);
    current.revenue += toNum(row?.revenue);
    current.profit += toNum(row?.profit);
    merged.set(productName, current);
  }

  return Array.from(merged.values())
    .map((item) => ({
      productName: item.productName,
      count: Number(item.count),
      revenue: Number(item.revenue.toFixed(2)),
      profit: Number(item.profit.toFixed(2)),
    }))
    .sort((a, b) => b.profit - a.profit || b.revenue - a.revenue || b.count - a.count)
    .slice(0, 5);
}

export async function buildDailyReportData(baseDate?: Date): Promise<DailyReportData> {
  await connectDB();
  const { start, end } = getDayRange(baseDate);

  const dateMatch = { createdAt: { $gte: start, $lt: end } };
  const orderCompletedMatch = { ...dateMatch, status: 'completed' };
  const manualCompletedMatch = {
    ...dateMatch,
    status: 'completed',
    source: 'manual',
    isManual: true,
    isVisibleToCustomer: false,
  };

  const orderCostExpression = buildOrderCostExpression();

  const [
    totalOrders,
    completedOrders,
    failedOrders,
    refundedOrders,
    pendingOrders,
    manualTotalOrders,
    normalFinancialAgg,
    manualFinancialAgg,
    normalTopProducts,
    manualTopProducts,
  ] = await Promise.all([
    Order.countDocuments(dateMatch),
    Order.countDocuments({ ...dateMatch, status: 'completed' }),
    Order.countDocuments({ ...dateMatch, status: 'failed' }),
    Order.countDocuments({ ...dateMatch, status: 'refunded' }),
    Order.countDocuments({ ...dateMatch, status: 'pending' }),
    ManualOrder.countDocuments({
      ...dateMatch,
      source: 'manual',
      isManual: true,
      isVisibleToCustomer: false,
    }),
    Order.aggregate([
      { $match: orderCompletedMatch },
      {
        $addFields: {
          computedCost: orderCostExpression,
          computedProfit: {
            $ifNull: [
              '$grossProfit',
              {
                $subtract: [{ $ifNull: ['$total', 0] }, orderCostExpression],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: { $ifNull: ['$total', 0] } },
          totalCost: { $sum: '$computedCost' },
          totalProfit: { $sum: '$computedProfit' },
        },
      },
    ]),
    ManualOrder.aggregate([
      { $match: manualCompletedMatch },
      {
        $group: {
          _id: null,
          manualSales: { $sum: { $ifNull: ['$totalSale', 0] } },
          manualCost: { $sum: { $ifNull: ['$totalCost', 0] } },
          manualProfit: {
            $sum: {
              $ifNull: [
                '$totalProfit',
                {
                  $subtract: [
                    { $ifNull: ['$totalSale', 0] },
                    { $ifNull: ['$totalCost', 0] },
                  ],
                },
              ],
            },
          },
        },
      },
    ]),
    Order.aggregate([
      { $match: orderCompletedMatch },
      {
        $addFields: {
          computedProfit: {
            $ifNull: [
              '$grossProfit',
              {
                $subtract: [{ $ifNull: ['$total', 0] }, orderCostExpression],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: { $ifNull: ['$productName', 'Unknown Product'] },
          count: { $sum: 1 },
          revenue: { $sum: { $ifNull: ['$total', 0] } },
          profit: { $sum: '$computedProfit' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]),
    ManualOrder.aggregate([
      { $match: manualCompletedMatch },
      {
        $group: {
          _id: { $ifNull: ['$productName', 'Unknown Product'] },
          count: { $sum: 1 },
          revenue: { $sum: { $ifNull: ['$totalSale', 0] } },
          profit: {
            $sum: {
              $ifNull: [
                '$totalProfit',
                {
                  $subtract: [
                    { $ifNull: ['$totalSale', 0] },
                    { $ifNull: ['$totalCost', 0] },
                  ],
                },
              ],
            },
          },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]),
  ]);

  const normalSales = toNum(normalFinancialAgg?.[0]?.totalSales);
  const normalCost = toNum(normalFinancialAgg?.[0]?.totalCost);
  const normalProfit = toNum(normalFinancialAgg?.[0]?.totalProfit);

  const manualSales = toNum(manualFinancialAgg?.[0]?.manualSales);
  const manualCost = toNum(manualFinancialAgg?.[0]?.manualCost);
  const manualProfit = toNum(manualFinancialAgg?.[0]?.manualProfit);

  return {
    date: start.toISOString().split('T')[0],
    orders: {
      total: Number(totalOrders || 0),
      completed: Number(completedOrders || 0),
      failed: Number(failedOrders || 0),
      refunded: Number(refundedOrders || 0),
      pending: Number(pendingOrders || 0),
      manualTotal: Number(manualTotalOrders || 0),
    },
    financial: {
      totalSales: Number(normalSales.toFixed(2)),
      totalProviderCost: Number(normalCost.toFixed(2)),
      totalProfit: Number(normalProfit.toFixed(2)),
      manualSales: Number(manualSales.toFixed(2)),
      manualCost: Number(manualCost.toFixed(2)),
      manualProfit: Number(manualProfit.toFixed(2)),
      combinedProfit: Number((normalProfit + manualProfit).toFixed(2)),
    },
    topProducts: mergeTopProducts(normalTopProducts, manualTopProducts),
  };
}

function formatTelegramReport(report: DailyReportData): string {
  const topProductsText = report.topProducts.length
    ? report.topProducts
        .map(
          (p, idx) =>
            `${idx + 1}) ${p.productName}\n   Orders: ${p.count} | Revenue: $${p.revenue.toFixed(2)} | Profit: $${p.profit.toFixed(2)}`
        )
        .join('\n')
    : 'No top products today';

  return [
    `Bily Card Admin Daily Report (${report.date})`,
    '',
    `Total Orders Today: ${report.orders.total}`,
    `Manual Orders Today: ${report.orders.manualTotal}`,
    `Pending Orders Count: ${report.orders.pending}`,
    `Failed Orders Count: ${report.orders.failed}`,
    '',
    `Revenue Today: $${report.financial.totalSales.toFixed(2)}`,
    `Cost Today: $${report.financial.totalProviderCost.toFixed(2)}`,
    `Profit Today: $${report.financial.totalProfit.toFixed(2)}`,
    `Manual Revenue Today: $${report.financial.manualSales.toFixed(2)}`,
    `Manual Cost Today: $${report.financial.manualCost.toFixed(2)}`,
    `Manual Profit Today: $${report.financial.manualProfit.toFixed(2)}`,
    `Combined Profit Today: $${report.financial.combinedProfit.toFixed(2)}`,
    '',
    'Top Products Today:',
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
    <h2>Bily Card Admin Daily Report (${report.date})</h2>
    <p><strong>Total Orders Today:</strong> ${report.orders.total}</p>
    <p><strong>Manual Orders Today:</strong> ${report.orders.manualTotal}</p>
    <p><strong>Pending Orders:</strong> ${report.orders.pending} | <strong>Failed:</strong> ${report.orders.failed}</p>
    <p><strong>Revenue Today:</strong> $${report.financial.totalSales.toFixed(2)}</p>
    <p><strong>Cost Today:</strong> $${report.financial.totalProviderCost.toFixed(2)}</p>
    <p><strong>Profit Today:</strong> $${report.financial.totalProfit.toFixed(2)}</p>
    <p><strong>Manual Revenue:</strong> $${report.financial.manualSales.toFixed(2)} | <strong>Manual Cost:</strong> $${report.financial.manualCost.toFixed(2)} | <strong>Manual Profit:</strong> $${report.financial.manualProfit.toFixed(2)}</p>
    <p><strong>Combined Profit:</strong> $${report.financial.combinedProfit.toFixed(2)}</p>
    <h3>Top Products Today</h3>
    <table style="border-collapse:collapse;">
      <thead>
        <tr>
          <th style="padding:6px 8px;border:1px solid #ddd;">Product</th>
          <th style="padding:6px 8px;border:1px solid #ddd;">Orders</th>
          <th style="padding:6px 8px;border:1px solid #ddd;">Revenue</th>
          <th style="padding:6px 8px;border:1px solid #ddd;">Profit</th>
        </tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="4" style="padding:6px 8px;border:1px solid #ddd;">No top products today</td></tr>'}</tbody>
    </table>
  `;
}

async function loadTelegramSettings() {
  await connectDB();
  const settings = (await SystemSettings.findOne({}).lean()) as any;

  return {
    botToken: String(process.env.TELEGRAM_BOT_TOKEN || settings?.telegramBotToken || '').trim(),
    chatId: String(
      process.env.TELEGRAM_CHAT_ID ||
      process.env.TELEGRAM_ADMIN_CHAT_ID ||
      settings?.telegramChatId ||
      ''
    ).trim(),
  };
}

function classifyTelegramError(error: any) {
  const status = Number(error?.response?.status || 0);
  const apiDesc = String(error?.response?.data?.description || '').toLowerCase();
  const code = String(error?.code || '');

  if (status === 400 && apiDesc.includes('chat')) return 'invalid_chat_id';
  if (status >= 400) return 'telegram_api_error';
  if (code === 'ECONNABORTED' || code === 'ENOTFOUND' || code === 'ECONNRESET') return 'network_error';
  return 'telegram_request_failed';
}

async function sendTelegram(report: DailyReportData) {
  const settings = await loadTelegramSettings();
  if (!settings.botToken || !settings.chatId) {
    console.warn('Daily report Telegram skipped: missing bot token or chat id');
    return { ok: false, reason: 'telegram_not_configured' as const };
  }

  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${settings.botToken}/sendMessage`,
      {
        chat_id: settings.chatId,
        text: formatTelegramReport(report),
      },
      { timeout: 15000 }
    );

    if (!response.data?.ok) {
      const description = String(response.data?.description || 'telegram_api_error');
      console.error('Daily report Telegram API error:', description);
      return { ok: false, reason: 'telegram_api_error' as const, details: description };
    }

    console.info('Daily report Telegram send success', {
      date: report.date,
      chatId: settings.chatId,
    });

    return { ok: true as const };
  } catch (error: any) {
    const reason = classifyTelegramError(error);
    const status = Number(error?.response?.status || 0) || undefined;
    const description = String(error?.response?.data?.description || error?.message || '').trim();

    if (reason === 'invalid_chat_id') {
      console.error('Daily report Telegram invalid chat id', {
        date: report.date,
        status,
        description,
      });
    } else if (reason === 'network_error') {
      console.error('Daily report Telegram network error', {
        date: report.date,
        code: error?.code,
        description,
      });
    } else {
      console.error('Daily report Telegram send failure', {
        date: report.date,
        status,
        description,
      });
    }

    return { ok: false as const, reason, details: description };
  }
}

async function sendEmail(report: DailyReportData) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const to = process.env.REPORT_EMAIL_TO;
  const from = process.env.REPORT_EMAIL_FROM || user;

  if (!host || !user || !pass || !to || !from) {
    return { ok: false, reason: 'email_not_configured' as const };
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

  return { ok: true as const };
}

async function acquireDispatchLock(reportDate: string) {
  await connectDB();

  try {
    await DailyReportDispatch.create({
      channel: 'telegram_admin_daily',
      reportDate,
      status: 'sending',
      lastAttemptAt: new Date(),
    });
    return { acquired: true as const };
  } catch (error: any) {
    if (error?.code === 11000) {
      const existing = (await DailyReportDispatch.findOne({
        channel: 'telegram_admin_daily',
        reportDate,
      })
        .select('status sentAt')
        .lean()) as { status?: string; sentAt?: Date | null } | null;

      if (existing?.status === 'sent') {
        return { acquired: false as const, reason: 'already_sent' as const };
      }

      await DailyReportDispatch.updateOne(
        { channel: 'telegram_admin_daily', reportDate },
        {
          $set: {
            status: 'sending',
            lastAttemptAt: new Date(),
          },
        }
      );

      return { acquired: true as const };
    }

    throw error;
  }
}

async function markDispatchSent(reportDate: string) {
  await DailyReportDispatch.updateOne(
    { channel: 'telegram_admin_daily', reportDate },
    {
      $set: {
        status: 'sent',
        sentAt: new Date(),
        lastError: '',
      },
    }
  );
}

async function markDispatchFailed(reportDate: string, errorText: string) {
  await DailyReportDispatch.updateOne(
    { channel: 'telegram_admin_daily', reportDate },
    {
      $set: {
        status: 'failed',
        lastError: String(errorText || '').slice(0, 800),
      },
    }
  );
}

export async function sendDailyReportNotifications(baseDate?: Date) {
  const report = await buildDailyReportData(baseDate);
  const lock = await acquireDispatchLock(report.date);

  if (!lock.acquired) {
    console.info('Daily report skipped (duplicate prevention)', { date: report.date });
    return {
      report,
      skipped: true,
      reason: lock.reason,
      delivery: {
        telegram: { ok: false, reason: 'duplicate_report_prevented' as const },
        email: { ok: false, reason: 'duplicate_report_prevented' as const },
      },
    };
  }

  const [telegram, email] = await Promise.allSettled([
    sendTelegram(report),
    sendEmail(report),
  ]);

  const telegramResult = telegram.status === 'fulfilled'
    ? telegram.value
    : { ok: false, reason: 'telegram_error' as const };
  const emailResult = email.status === 'fulfilled'
    ? email.value
    : { ok: false, reason: 'email_error' as const };

  if (telegramResult.ok) {
    await markDispatchSent(report.date);
  } else {
    await markDispatchFailed(
      report.date,
      `${(telegramResult as any)?.reason || 'telegram_error'} | ${(emailResult as any)?.reason || 'email_error'}`
    );
  }

  return {
    report,
    skipped: false,
    delivery: {
      telegram: telegramResult,
      email: emailResult,
    },
  };
}
