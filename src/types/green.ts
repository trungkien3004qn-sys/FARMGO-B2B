export const organicTypes = ['Bã trái cây', 'Vỏ cam, chanh', 'Bã cà phê', 'Vỏ dứa'] as const;
export type OrganicType = typeof organicTypes[number];
export const greenPickupTypes = (pickup: Pick<GreenPickup, 'types' | 'otherType'>) =>
  [...pickup.types, ...(pickup.otherType ? [pickup.otherType] : [])];
export interface GreenPickup {
  id: string;
  customerId: string;
  types: OrganicType[];
  otherType?: string;
  expectedKg: number;
  appointment: string;
  address: string;
  status: 'WAITING' | 'CONFIRMED' | 'EN_ROUTE' | 'COMPLETE';
  actualKg?: number;
  completedAt?: string;
  receivedAt?: string;
}
export interface GreenVoucher {
  id: string;
  customerId: string;
  valueVnd: number;
  requestKey: string;
  usedOrderId?: string;
}
