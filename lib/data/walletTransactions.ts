export interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  reference?: string;
  balance: number;
}

export const walletTransactions: WalletTransaction[] = [
  {
    id: 'txn-001',
    type: 'debit',
    amount: 9.99,
    description: 'Purchase: PUBG Mobile UC 325',
    date: '2024-03-08T14:30:00Z',
    status: 'completed',
    reference: 'ORD-2024-001',
    balance: 45.01
  },
  {
    id: 'txn-002',
    type: 'credit',
    amount: 50.00,
    description: 'Wallet Top-up via PayPal',
    date: '2024-03-07T10:15:00Z',
    status: 'completed',
    reference: 'TOPUP-2024-001',
    balance: 55.00
  },
  {
    id: 'txn-003',
    type: 'debit',
    amount: 25.00,
    description: 'Purchase: Steam Gift Card $25',
    date: '2024-03-06T16:45:00Z',
    status: 'completed',
    reference: 'ORD-2024-002',
    balance: 30.00
  },
  {
    id: 'txn-004',
    type: 'debit',
    amount: 12.99,
    description: 'Purchase: Free Fire Diamonds 310',
    date: '2024-03-05T12:20:00Z',
    status: 'completed',
    reference: 'ORD-2024-003',
    balance: 17.01
  },
  {
    id: 'txn-005',
    type: 'credit',
    amount: 30.00,
    description: 'Wallet Top-up via Credit Card',
    date: '2024-03-04T09:30:00Z',
    status: 'completed',
    reference: 'TOPUP-2024-002',
    balance: 30.00
  },
  {
    id: 'txn-006',
    type: 'debit',
    amount: 5.00,
    description: 'Purchase: Google Play Gift Card $5',
    date: '2024-03-03T18:10:00Z',
    status: 'completed',
    reference: 'ORD-2024-004',
    balance: 25.00
  }
];

export const getWalletBalance = (): number => {
  // Calculate current balance from transactions
  const sortedTransactions = walletTransactions.sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  return sortedTransactions[0]?.balance || 0;
};