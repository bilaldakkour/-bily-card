export interface Testimonial {
  id: string;
  name: string;
  avatar?: string;
  rating: number;
  review: string;
  product: string;
  date: string;
  verified: boolean;
}

export const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Ahmed Hassan',
    rating: 5,
    review: 'Amazing service! Got my PUBG UC instantly after payment. Very reliable and fast delivery.',
    product: 'PUBG Mobile UC',
    date: '2024-03-08',
    verified: true
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    rating: 5,
    review: 'Bily Card is my go-to for all gaming top-ups. Never had any issues with delivery or payment.',
    product: 'Steam Gift Card',
    date: '2024-03-07',
    verified: true
  },
  {
    id: '3',
    name: 'Mohammed Ali',
    rating: 4,
    review: 'Great prices and instant delivery. Support team is very helpful when needed.',
    product: 'Free Fire Diamonds',
    date: '2024-03-06',
    verified: true
  },
  {
    id: '4',
    name: 'Emma Wilson',
    rating: 5,
    review: 'Perfect for gifting! Bought Google Play cards for my family and they received them instantly.',
    product: 'Google Play Gift Card',
    date: '2024-03-05',
    verified: true
  },
  {
    id: '5',
    name: 'David Chen',
    rating: 5,
    review: 'Professional service with excellent customer support. Highly recommended!',
    product: 'PlayStation Gift Card',
    date: '2024-03-04',
    verified: true
  },
  {
    id: '6',
    name: 'Fatima Al-Zahra',
    rating: 4,
    review: 'Very trustworthy platform. All transactions are secure and delivery is always on time.',
    product: 'TikTok Coins',
    date: '2024-03-03',
    verified: true
  }
];