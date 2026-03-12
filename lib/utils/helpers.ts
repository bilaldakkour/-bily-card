// Simple UUID-like generator without uuid dependency
function generateRandomId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function generateDigits(length: number): string {
  const max = Math.pow(10, Math.max(1, length)) - 1;
  const min = Math.pow(10, Math.max(1, length - 1));
  const value = Math.floor(Math.random() * (max - min + 1)) + min;
  return String(value);
}

export function generateOrderId(): string {
  return `BC-${generateDigits(6)}-${generateDigits(5)}`;
}

export function generateTransactionId(): string {
  return `TXN-${Date.now()}-${generateRandomId()}`;
}

export function generateDepositId(): string {
  return `DEP-${Date.now()}-${generateRandomId()}`;
}

export function calculateProfit(
  costPrice: number,
  sellingPrice: number,
  quantity: number = 1
): number {
  return (sellingPrice - costPrice) * quantity;
}

export function convertCurrency(
  amount: number,
  from: 'USD' | 'LBP',
  to: 'USD' | 'LBP',
  rate: number = 89500 // Example rate USD to LBP
): number {
  if (from === to) return amount;
  if (from === 'USD') return amount * rate;
  return amount / rate;
}

export function formatCurrency(
  amount: number,
  currency: 'USD' | 'LBP'
): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  });
  return formatter.format(amount);
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function truncateText(text: string, length: number = 50): string {
  return text.length > length ? text.substring(0, length) + '...' : text;
}
