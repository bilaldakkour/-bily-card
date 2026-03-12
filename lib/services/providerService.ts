import axios, { AxiosInstance } from 'axios';

class ProviderService {
  private client: AxiosInstance;

  constructor() {
    const baseURL = process.env.PROVIDER_API_URL || 'https://api.dailycard.io';
    const apiKey = process.env.PROVIDER_API_KEY || '';

    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      timeout: 10000,
    });
  }

  async fetchProducts(category?: string) {
    try {
      const response = await this.client.get('/products', {
        params: { category },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(
        `Failed to fetch products: ${error.message}`
      );
    }
  }

  async getProductDetails(productId: string) {
    try {
      const response = await this.client.get(`/products/${productId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch product: ${error.message}`);
    }
  }

  async createOrder(orderData: {
    productId: string;
    playerId: string;
    quantity: number;
  }) {
    try {
      const response = await this.client.post('/orders', orderData);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to create order: ${error.message}`);
    }
  }

  async getOrderStatus(orderId: string) {
    try {
      const response = await this.client.get(`/orders/${orderId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch order status: ${error.message}`);
    }
  }

  async checkBalance(accountId: string) {
    try {
      const response = await this.client.get(`/balance/${accountId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to check balance: ${error.message}`);
    }
  }

  async refundOrder(orderId: string, reason: string) {
    try {
      const response = await this.client.post(`/orders/${orderId}/refund`, {
        reason,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to refund order: ${error.message}`);
    }
  }
}

export default new ProviderService();
