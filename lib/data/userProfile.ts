export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  phone?: string;
  avatar?: string;
  joinDate: string;
  lastLogin: string;
  isVerified: boolean;
  stats: {
    totalOrders: number;
    totalSpent: number;
    favoriteCategory: string;
  };
}

export const userProfile: UserProfile = {
  id: 'user-001',
  displayName: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+1 (555) 123-4567',
  avatar: undefined, // Will use default avatar
  joinDate: '2024-01-15T00:00:00Z',
  lastLogin: '2024-03-08T14:30:00Z',
  isVerified: true,
  stats: {
    totalOrders: 12,
    totalSpent: 156.47,
    favoriteCategory: 'Games'
  }
};