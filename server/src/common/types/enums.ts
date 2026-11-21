export enum Role {
  BUYER = 'BUYER',
  SUPPLIER = 'SUPPLIER',
  ADMIN = 'ADMIN',
  DRIVER = 'DRIVER',
}

export enum OrderStatus {
  PAID = 'PAID',
  CONFIRMED = 'CONFIRMED',
  AGGREGATED = 'AGGREGATED',
  TRANSIT = 'TRANSIT',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum DeliverySlot {
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
}

export enum EscrowStatus {
  HELD = 'HELD',
  SETTLED = 'SETTLED',
}

export enum LedgerKind {
  HOLD = 'HOLD',
  REFUND = 'REFUND',
  SETTLEMENT = 'SETTLEMENT',
  WITHDRAWAL = 'WITHDRAWAL',
}

export enum ClaimStatus {
  OPEN = 'OPEN',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum GreenPickupStatus {
  WAITING = 'WAITING',
  CONFIRMED = 'CONFIRMED',
  EN_ROUTE = 'EN_ROUTE',
  COMPLETE = 'COMPLETE',
  RECEIVED = 'RECEIVED',
}
