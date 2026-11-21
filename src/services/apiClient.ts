/**
 * FARMGO B2B Enterprise API Client
 * Kết nối trực tiếp giữa Frontend (cổng 5173) và Backend NestJS (cổng 3000)
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const TOKEN_KEY = 'farmgo_jwt_token';
const USER_KEY = 'farmgo_current_user';

export interface BackendUser {
  id: string;
  email: string;
  name: string;
  role: 'BUYER' | 'SUPPLIER' | 'ADMIN' | 'DRIVER' | 'FERTILIZER';
  companyName?: string;
  phone?: string;
  address?: string;
}

export interface BackendProduct {
  id: string;
  supplierId: string;
  name: string;
  category: string;
  unit: string;
  priceVnd: number;
  stockKg: number;
  origin: string;
  storageTemp?: string;
  shelfLifeDays?: number;
  imageUrl?: string;
  isActive: boolean;
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredAuth(token: string, user: BackendUser) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (err) {
    console.error('Không lưu được auth token:', err);
  }
}

export function getStoredUser(): BackendUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearStoredAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (err) {
    console.error('Không xóa được auth token:', err);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let errorMsg = `Lỗi máy chủ (${response.status})`;
    try {
      const errorData = await response.json();
      errorMsg = errorData.message || errorMsg;
    } catch {
      // ignore JSON parse error
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // 1. Kiểm tra trạng thái Backend
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/products`, { method: 'GET', signal: AbortSignal.timeout(1500) });
      return res.ok;
    } catch {
      return false;
    }
  },

  // 2. Xác thực & Tài khoản
  async getAccounts(): Promise<BackendUser[]> {
    return request<BackendUser[]>('/auth/accounts');
  },

  async login(email: string, password = '123456') {
    const res = await request<{ message: string; user: BackendUser; accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredAuth(res.accessToken, res.user);
    return res;
  },

  async register(data: {
    email: string;
    password?: string;
    name: string;
    role: 'BUYER' | 'SUPPLIER' | 'ADMIN' | 'DRIVER' | 'FERTILIZER';
    companyName?: string;
    phone?: string;
    address?: string;
  }) {
    const payload = {
      password: data.password || '123456',
      ...data,
    };
    const res = await request<{ message: string; user: BackendUser; accessToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setStoredAuth(res.accessToken, res.user);
    return res;
  },

  async getProfile(): Promise<BackendUser> {
    return request<BackendUser>('/auth/profile');
  },

  // 3. Danh mục sản phẩm
  async getProducts(category?: string): Promise<BackendProduct[]> {
    const query = category ? `?category=${category}` : '';
    return request<BackendProduct[]>(`/products${query}`);
  },

  async getProduct(id: string): Promise<BackendProduct> {
    return request<BackendProduct>(`/products/${id}`);
  },

  async createProduct(productData: any): Promise<BackendProduct> {
    return request<BackendProduct>('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  },

  async updateProduct(id: string, productData: any): Promise<BackendProduct> {
    return request<BackendProduct>(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(productData),
    });
  },

  async deleteProduct(id: string): Promise<any> {
    return request(`/products/${id}`, {
      method: 'DELETE',
    });
  },

  // 4. Đơn hàng & Checkout
  async checkout(orderData: any): Promise<any> {
    return request('/orders/checkout', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },

  async getOrders(supplierId?: string): Promise<any[]> {
    const query = supplierId ? `?supplierId=${encodeURIComponent(supplierId)}` : '';
    return request(`/orders${query}`);
  },

  async updateOrderStatus(orderId: string, status: string): Promise<any> {
    return request(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // 5. Escrow & Sổ cái
  async settleEscrow(orderId: string, supplierId: string): Promise<any> {
    return request('/escrow/settle', {
      method: 'POST',
      body: JSON.stringify({ orderId, supplierId }),
    });
  },

  async createClaim(claimData: { orderId: string; damagedKg: number; refundAmountVnd: number; reason: string; photoUrl?: string }): Promise<any> {
    return request('/escrow/claims', {
      method: 'POST',
      body: JSON.stringify(claimData),
    });
  },

  async getFinance(): Promise<any> {
    return request('/escrow/finance');
  },

  // 6. Logistics
  async aggregateOrders22h(targetDate: string, slot: 'MORNING' | 'AFTERNOON'): Promise<any> {
    return request('/logistics/aggregate-22h', {
      method: 'POST',
      body: JSON.stringify({ targetDate, slot }),
    });
  },

  async scanCrate(crateCode: string, newStatus: 'IN_TRANSIT' | 'DELIVERED'): Promise<any> {
    return request('/logistics/scan-crate', {
      method: 'POST',
      body: JSON.stringify({ crateCode, newStatus }),
    });
  },

  async getShipments(): Promise<any[]> {
    return request('/logistics/shipments');
  },

  // 7. Farmgo Green
  async createGreenPickup(wasteType: string, expectedKg: number): Promise<any> {
    return request('/green/pickups', {
      method: 'POST',
      body: JSON.stringify({ wasteType, expectedKg }),
    });
  },

  async redeemGreenVoucher(discountVnd: number): Promise<any> {
    return request('/green/vouchers/redeem', {
      method: 'POST',
      body: JSON.stringify({ discountVnd }),
    });
  },

  async getGreenSummary(): Promise<any> {
    return request('/green/my-summary');
  },
};
