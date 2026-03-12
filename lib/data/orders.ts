export interface Order {
  id: string;
  orderNumber: string;
  product: {
    id: string;
    name: string;
    image: string;
    category: string;
  };
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  date: string;
  deliveryTime?: string;
  inputData?: Record<string, string>;
  paymentMethod: string;
  notes?: string;
}

export const orders: Order[] = [
  {
    id: 'ord-001',
    orderNumber: 'ORD-2024-001',
    product: {
      id: 'pubg-uc-325',
      name: 'PUBG Mobile UC 325',
      image: '/games/pubg.jpg',
      category: 'PUBG Mobile'
    },
    amount: 9.99,
    status: 'completed',
    date: '2024-03-08T14:30:00Z',
    deliveryTime: '2024-03-08T14:32:00Z',
    inputData: {
      playerId: '5123456789',
      package: '325 UC - $9.99'
    },
    paymentMethod: 'Wallet',
    notes: 'Delivered successfully'
  },
  {
    id: 'ord-002',
    orderNumber: 'ORD-2024-002',
    product: {
      id: 'steam-gift-card-25',
      name: 'Steam Gift Card $25',
      image: '/games/steam.jpg',
      category: 'Steam'
    },
    amount: 25.00,
    status: 'completed',
    date: '2024-03-06T16:45:00Z',
    deliveryTime: '2024-03-06T16:46:00Z',
    inputData: {
      email: 'user@example.com',
      package: '$25 - $25.00'
    },
    paymentMethod: 'Credit Card',
    notes: 'Gift card sent to email'
  },
  {
    id: 'ord-003',
    orderNumber: 'ORD-2024-003',
    product: {
      id: 'free-fire-diamonds-310',
      name: 'Free Fire Diamonds 310',
      image: '/games/free-fire.jpg',
      category: 'Free Fire'
    },
    amount: 12.99,
    status: 'processing',
    date: '2024-03-05T12:20:00Z',
    inputData: {
      playerId: '9876543210',
      package: '310 Diamonds - $12.99'
    },
    paymentMethod: 'PayPal',
    notes: 'Processing delivery'
  },
  {
    id: 'ord-004',
    orderNumber: 'ORD-2024-004',
    product: {
      id: 'google-play-5',
      name: 'Google Play Gift Card $5',
      image: '/games/google-play.jpg',
      category: 'Google Play'
    },
    amount: 5.00,
    status: 'completed',
    date: '2024-03-03T18:10:00Z',
    deliveryTime: '2024-03-03T18:11:00Z',
    inputData: {
      email: 'user@example.com',
      package: '$5 - $5.00'
    },
    paymentMethod: 'Wallet',
    notes: 'Code delivered via email'
  },
  {
    id: 'ord-005',
    orderNumber: 'ORD-2024-005',
    product: {
      id: 'tiktok-coins-500',
      name: 'TikTok Coins 500',
      image: '/games/tiktok.jpg',
      category: 'TikTok'
    },
    amount: 8.99,
    status: 'pending',
    date: '2024-03-02T11:30:00Z',
    inputData: {
      username: '@tiktokuser',
      package: '500 Coins - $8.99'
    },
    paymentMethod: 'Bank Transfer',
    notes: 'Awaiting payment confirmation'
  }
];

export const getOrderById = (id: string): Order | undefined => {
  return orders.find(order => order.id === id);
};

export const getOrdersByStatus = (status: Order['status']): Order[] => {
  return orders.filter(order => order.status === status);
};