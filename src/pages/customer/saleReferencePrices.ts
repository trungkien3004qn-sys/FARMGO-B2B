const saleReferencePrices: Partial<Record<string, number>> = {
  'strawberry-demo': 120000,
  'avocado-sap': 45000,
  'watermelon-demo': 16000,
  'pineapple-demo': 20000,
};

export function saleReferencePrice(id: string): number {
  return saleReferencePrices[id] ?? 0;
}
