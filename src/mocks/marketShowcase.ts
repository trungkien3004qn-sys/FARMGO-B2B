import type { DemoState } from './seed';
import type { Order, OrderStatus } from '../types';

export function addMarketShowcase(state: DemoState) {
  const now = Date.parse(state.demoNow);
  const date = (days: number) => new Date(now + days * 86_400_000).toISOString();
  const start = date(1).slice(0, 10);
  const lotRows = [
    ['LOT-MAU-01', 'dragon-fruit', 28, false],
    ['LOT-MAU-02', 'avocado-034', 30, false],
    ['LOT-MAU-03', 'mango-mekong', 34, false],
    ['LOT-MAU-04', 'avocado-sap', -7, true],
    ['LOT-MAU-05', 'strawberry-demo', 21, false],
    ['LOT-MAU-06', 'pineapple-demo', -5, true],
    ['LOT-MAU-07', 'avocado-sap', 38, false],
    ['LOT-MAU-08', 'pineapple-demo', 38, false],
  ] as const;
  const lots = state.harvestLots ??= [];
  const preorders = state.preorders ??= [];
  for (const [id, productId, days, closed] of lotRows) {
    let lot = lots.find(row => row.id === id);
    if (!lot) {
      const product = state.products.find(row => row.id === productId);
      if (!product) continue;
      lot = { id, productId, supplierId: product.supplierId, productName: product.name, title: product.name + ' · Lô mẫu',
        region: product.originLabel || 'Chưa cập nhật', postedAt: date(-12), harvestDate: date(days).slice(0, 10),
        pricePerKg: product.publicPricePerKg, expectedKg: 200, lossPercent: 10, grade: 'Loại 1',
        color: closed ? 'gold' : 'green', imageUrl: product.imageUrl, ...(closed ? { completedAt: date(days) } : {}) };
      lots.push(lot);
    }
    const customerId = lot.supplierId === 'supplier-1' ? 'customer-1' : 'customer-2';
    const status = closed || id === 'LOT-MAU-01' || id === 'LOT-MAU-02' ? 'DEPOSITED'
      : id === 'LOT-MAU-03' || id === 'LOT-MAU-05' ? 'CONFIRMED' : 'PENDING';
    const orderId = 'FG-PH-MAU-' + id.slice(-2);
    if (!state.customers.some(row => row.id === customerId) || preorders.some(row => row.id === orderId)) continue;
    const quantityKg = 15;
    const bookedKg = preorders.reduce((sum, row) => sum + (row.lotId === id && row.status === 'DEPOSITED' ? row.quantityKg : 0), 0);
    if (status === 'DEPOSITED' && bookedKg + quantityKg > lot.expectedKg - Math.ceil(lot.expectedKg * lot.lossPercent / 100)) continue;
    const totalVnd = quantityKg * lot.pricePerKg;
    preorders.push({ id: orderId, lotId: id, customerId, requestKey: orderId, quantityKg,
      pricePerKg: lot.pricePerKg, totalVnd, depositVnd: Math.round(totalVnd / 10), status,
      ...(status !== 'PENDING' ? { verification: 'OTP' } : {}), ...(status === 'DEPOSITED' ? { depositedAt: date(-10) } : {}) });
  }

  const greenId = 'customer-green-showcase';
  if (!state.customers.some(row => row.id === greenId)) state.customers.push({
    id: greenId, businessName: 'Quán Bếp Xanh (mẫu)', phone: '0900000075', deliveryAddressIds: ['address-green-showcase'],
  });
  if (!state.addresses.some(row => row.id === 'address-green-showcase')) state.addresses.push({
    id: 'address-green-showcase', customerId: greenId, address: '102 Nguyễn Huệ, TP. Hồ Chí Minh', label: 'Quán mẫu', deliveryZone: 'DEMO_30000',
  });
  if (!state.profiles.some(row => row.id === greenId)) state.profiles.push({
    id: greenId, role: 'CUSTOMER', businessName: 'Quán Bếp Xanh (mẫu)', phone: '0900000075', contactName: '',
    address: '102 Nguyễn Huệ, TP. Hồ Chí Minh', taxCode: '', status: 'DRAFT', legacy: true,
  });
  const pickups = state.greenPickups ??= [];
  for (const [index, status] of (['WAITING', 'CONFIRMED', 'EN_ROUTE', 'COMPLETE', 'COMPLETE'] as const).entries()) {
    const id = `FG-XANH-MAU-${index + 1}`;
    const finished = status === 'COMPLETE';
    if (!pickups.some(row => row.id === id)) pickups.push({
      id, customerId: greenId, types: [index % 2 ? 'Bã cà phê' : 'Bã trái cây'], expectedKg: 35,
      appointment: (finished ? date(0) : date(1)).slice(0, 10) + 'T09:00', address: '102 Nguyễn Huệ, TP. Hồ Chí Minh',
      status, ...(finished ? { actualKg: 40, completedAt: date(0) } : {}), ...(index === 4 ? { receivedAt: date(0) } : {}),
    });
  }
  const vouchers = state.greenVouchers ??= [];
  if (!vouchers.some(row => row.id === 'XANH-MAU-01')) vouchers.push({
    id: 'XANH-MAU-01', customerId: greenId, valueVnd: 50000, requestKey: 'XANH-MAU-01',
  });

  function sampleOrder(id: string, customerId: string, productId: string, status: OrderStatus): Order | undefined {
    const existing = state.orders.find(row => row.id === id);
    if (existing) return existing;
    const product = state.products.find(row => row.id === productId);
    const supplier = state.suppliers.find(row => row.id === product?.supplierId);
    const address = state.addresses.find(row => row.customerId === customerId);
    if (!product || !supplier || !address || !state.customers.some(row => row.id === customerId)) return;
    const unitPriceVnd = product.publicPricePerKg;
    const quantityKg = 5;
    const subtotalVnd = unitPriceVnd * quantityKg;
    const order: Order = { id, customerId, deliveryAddressId: address.id, status, paymentStatus: 'PAID',
      placedAt: date(0), deliveryDate: start, deliverySlot: 'MORNING', subtotalVnd, shippingFeeVnd: 30000,
      totalVnd: subtotalVnd + 30000, items: [{ productId, productName: product.name, supplierId: supplier.id,
        supplierName: supplier.name, unitPriceVnd, quantityKg, lineTotalVnd: subtotalVnd }] };
    state.orders.push(order);
    if (status !== 'PLACED') state.confirmations.push({ supplierId: supplier.id, orderIds: [id], confirmedAt: date(0) });
    return order;
  }
  sampleOrder('showcase-order-106', 'customer-1', 'avocado-034', 'SUPPLIER_CONFIRMED');
  sampleOrder('showcase-order-109', greenId, 'avocado-034', 'PLACED');
  const first = sampleOrder('showcase-order-107', 'customer-1', 'mango-cat-hoa-loc', 'AT_HUB');
  const second = sampleOrder('showcase-order-108', 'customer-2', 'dragon-fruit', 'AT_HUB');
  if (first?.status === 'AT_HUB' && second?.status === 'AT_HUB' && first.deliveryDate === second.deliveryDate &&
    !state.shipments.some(row => row.id === 'showcase-shipment-107' || row.orderIds.includes(first.id) || row.orderIds.includes(second.id))) {
    state.shipments.push({ id: 'showcase-shipment-107', orderIds: [first.id, second.id], status: 'ASSIGNED',
      deliveryDate: first.deliveryDate, deliverySlot: 'MORNING', routeLabel: 'Tuyến mẫu Quận 1 · Thủ Đức',
      driverName: 'Nguyễn Văn Minh', vehiclePlate: '51D-246.80', trackingLabel: 'Chuyến đã phân công' });
  }
}
