export type LotColor = 'gold' | 'green' | 'red';
export type PreorderStatus = 'PENDING' | 'CONFIRMED' | 'DEPOSITED';

export interface NewHarvestLot {
  title: string;
  productId: string;
  region: string;
  harvestDate: string;
  pricePerKg: number;
  expectedKg: number;
  lossPercent: number;
  grade: 'Loại 1' | 'Loại 2';
  color: LotColor;
  imageUrl?: string;
}

export interface HarvestLot extends NewHarvestLot {
  id: string;
  supplierId: string;
  productName: string;
  postedAt: string;
  completedAt?: string;
}

export interface Preorder {
  id: string;
  requestKey: string;
  lotId: string;
  customerId: string;
  quantityKg: number;
  pricePerKg: number;
  totalVnd: number;
  depositVnd: number;
  status: PreorderStatus;
  verification?: 'OTP' | 'QR';
  depositedAt?: string;
}

export interface HarvestRequest {
  id: string;
  customerId: string;
  productName: string;
  quantityKg: number;
  neededDate: string;
  note: string;
}
