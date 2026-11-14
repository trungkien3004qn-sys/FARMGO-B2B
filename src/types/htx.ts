export interface HtxProductInput {
  name: string;
  category: string;
  description: string;
  packaging: string;
  priceVnd: number;
  stock: number;
  imageUrl?: string;
}
export interface HtxProduct extends HtxProductInput { id: string; active: boolean }
export interface HtxOrder {
  id: string;
  customer: string;
  productId: string;
  productName: string;
  quantity: number;
  priceVnd: number;
  placedAt: string;
  status: 'PENDING' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';
}
