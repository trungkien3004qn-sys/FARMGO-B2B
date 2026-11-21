import { mutate as mutateDemo, readState } from '../store/demoStore';
import { actor, check, entity, photo } from './governanceService';
import { payWithBuyerWallet } from './walletService';
import type { HarvestLot, HarvestRequest, NewHarvestLot, Preorder } from '../types/preorder';
import type { DemoState } from '../mocks/seed';

const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' });
export const preorderOtp = '000000';
export const depositFor = (total: number) => Math.round(total / 10);
export const saleableKg = (expected: number, loss: number) => expected - Math.ceil(expected * loss / 100);
export const depositedFor = (orders: Preorder[], lotId: string) => orders.filter(order => order.lotId === lotId && order.status === 'DEPOSITED');
const reservedKg = (orders: Preorder[]) => orders.reduce((sum, order) => sum + order.quantityKg, 0);

function mutate<T>(type: 'DATA_CHANGED', action: (state: DemoState) => T): Promise<T> {
  const update = () => mutateDemo(type, action, true);
  return typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request('farmgo-preorders', update)
    : Promise.resolve().then(update);
}

function lotsFor(state: DemoState): HarvestLot[] {
  const harvestDate = date.format(new Date(Date.parse(state.demoNow) + 30 * 86_400_000));
  const samples = [
    { id: 'LOT-MAU-01', productId: 'dragon-fruit', supplierId: 'supplier-2', title: 'Thanh long vụ tháng tới', color: 'gold' },
    { id: 'LOT-MAU-02', productId: 'avocado-034', supplierId: 'supplier-1', title: 'Bơ 034 vụ tháng tới', color: 'green' },
  ] as const;
  return state.harvestLots ?? samples.flatMap(sample => {
    const product = state.products.find(row => row.id === sample.productId && row.supplierId === sample.supplierId);
    if (!product) return [];
    return [{ ...sample, region: product.originLabel || 'Chưa cập nhật', productName: product.name, grade: 'Loại 1',
      postedAt: state.demoNow, harvestDate, pricePerKg: product.publicPricePerKg, expectedKg: 10_000,
      lossPercent: 10, imageUrl: product.imageUrl }];
  });
}

function validDate(value: string, now: string) {
  const parsed = new Date(value + 'T00:00:00Z');
  check(/^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(+parsed) &&
    parsed.toISOString().slice(0, 10) === value && value >= date.format(new Date(now)), 'Chọn ngày hợp lệ, từ hôm nay trở đi.');
}

export async function getPreorderMarket(view: 'buyer' | 'seller') {
  const state = readState();
  const seller = view === 'seller';
  const own = seller ? state.session.activeSupplierId : state.session.activeCustomerId;
  const orders = state.preorders ?? [];
  const owned = orders.filter(order => order.customerId === own);
  const lots = lotsFor(state).filter(lot => seller ? lot.supplierId === own :
    !lot.completedAt || owned.some(order => order.lotId === lot.id));
  return {
    today: date.format(new Date(state.demoNow)),
    accountId: own,
    products: seller ? state.products.filter(product => product.supplierId === own) : [],
    lots: lots.map(lot => {
      const supplier = state.suppliers.find(row => row.id === lot.supplierId);
      const deposited = depositedFor(orders, lot.id);
      const capacity = saleableKg(lot.expectedKg, lot.lossPercent);
      const booked = reservedKg(deposited);
      return { ...lot, supplierName: supplier?.name ?? lot.supplierId,
        vietGap: state.profiles.some(profile => profile.id === lot.supplierId && profile.status === 'APPROVED' && !!profile.vietGapImage),
        capacity, booked, remaining: capacity - booked, depositCount: deposited.length };
    }).sort((a, b) => b.postedAt.localeCompare(a.postedAt)),
    orders: seller ? orders.filter(order => lots.some(lot => lot.id === order.lotId)).map(order => ({
      ...order, customerName: state.customers.find(customer => customer.id === order.customerId)?.businessName,
    })) : owned.map(order => ({ ...order, customerName: undefined })),
    requests: (state.harvestRequests ?? []).filter(request => seller || request.customerId === own),
  };
}

export async function publishHarvestLot(input: NewHarvestLot) {
  return mutate('DATA_CHANGED', state => {
    const product = entity(state.products, input.productId);
    actor(state, 'SUPPLIER', product.supplierId);
    validDate(input.harvestDate, state.demoNow);
    check(input.title.trim() && input.region.trim(), 'Nhập tên lô và vùng trồng.');
    check(Number.isSafeInteger(input.pricePerKg) && input.pricePerKg > 0 && Number.isSafeInteger(input.expectedKg) &&
      input.expectedKg > 0 && Number.isSafeInteger(input.pricePerKg * input.expectedKg), 'Giá và sản lượng phải là số nguyên dương hợp lệ.');
    check(Number.isInteger(input.lossPercent) && input.lossPercent >= 0 && input.lossPercent < 100 &&
      saleableKg(input.expectedKg, input.lossPercent) > 0, 'Tỷ lệ hao hụt phải để lại ít nhất 1 kg bán được.');
    check(['Loại 1', 'Loại 2'].includes(input.grade) && ['gold', 'green', 'red'].includes(input.color), 'Chọn phân loại và màu lô hợp lệ.');
    if (input.imageUrl) photo(input.imageUrl);
    const lot = { ...input, title: input.title.trim(), region: input.region.trim(), imageUrl: input.imageUrl || product.imageUrl,
      id: `LOT-${state.nextId++}`, productName: product.name, supplierId: product.supplierId, postedAt: state.demoNow };
    (state.harvestLots ??= lotsFor(state)).push(lot);
    return lot;
  });
}

export async function completeHarvestLot(id: string) {
  return mutate('DATA_CHANGED', state => {
    const lot = entity(state.harvestLots ??= lotsFor(state), id);
    actor(state, 'SUPPLIER', lot.supplierId);
    lot.completedAt ??= state.demoNow;
  });
}

export async function createPreorder(lotId: string, quantityKg: number, requestKey: string) {
  return mutate('DATA_CHANGED', state => {
    const customerId = entity(state.customers, state.session.activeCustomerId ?? '').id;
    actor(state, 'CUSTOMER', customerId);
    const orders = state.preorders ??= [];
    check(requestKey.trim(), 'Thiếu mã yêu cầu.');
    const previous = orders.find(order => order.customerId === customerId && order.requestKey === requestKey);
    if (previous) {
      check(previous.lotId === lotId && previous.quantityKg === quantityKg, 'Mã yêu cầu đã được dùng.');
      return previous;
    }
    const lot = entity(state.harvestLots ??= lotsFor(state), lotId);
    check(!lot.completedAt, 'Lô đã đóng nhận đặt trước.');
    check(Number.isSafeInteger(quantityKg) && quantityKg > 0 &&
      quantityKg <= saleableKg(lot.expectedKg, lot.lossPercent) - reservedKg(depositedFor(orders, lotId)), 'Khối lượng vượt lượng còn lại hoặc không hợp lệ.');
    const totalVnd = quantityKg * lot.pricePerKg;
    const order: Preorder = { id: `FG-PH-${state.nextId++}`, customerId, lotId, quantityKg, pricePerKg: lot.pricePerKg,
      totalVnd, depositVnd: depositFor(totalVnd), requestKey, status: 'PENDING' };
    orders.push(order);
    return order;
  });
}

export async function confirmPreorder(id: string, method: 'OTP' | 'QR', code: string) {
  return mutate('DATA_CHANGED', state => {
    const order = entity(state.preorders ?? [], id);
    actor(state, 'CUSTOMER', order.customerId);
    if (order.status !== 'PENDING') return order;
    check(!entity(state.harvestLots ?? [], order.lotId).completedAt, 'Lô đã đóng nhận đặt trước.');
    check(method === 'QR' || (method === 'OTP' && code === preorderOtp), 'Mã OTP mô phỏng chưa đúng.');
    order.status = 'CONFIRMED';
    order.verification = method;
    return order;
  });
}

export async function depositPreorder(id: string) {
  return mutate('DATA_CHANGED', state => {
    const orders = state.preorders ?? [];
    const order = entity(orders, id);
    actor(state, 'CUSTOMER', order.customerId);
    if (order.status === 'DEPOSITED') return order;
    check(order.status === 'CONFIRMED', 'Xác nhận đơn trước khi đặt cọc.');
    const lot = entity(state.harvestLots ?? [], order.lotId);
    check(!lot.completedAt, 'Lô đã đóng nhận đặt trước.');
    check(order.quantityKg <= saleableKg(lot.expectedKg, lot.lossPercent) - reservedKg(depositedFor(orders, lot.id)),
      'Lượng còn lại không đủ. Chưa ghi nhận tiền cọc.');
    order.status = 'DEPOSITED';
    order.depositedAt = state.demoNow;

    // Trừ 10% tiền cọc ký quỹ từ Ví FarmGoPay của quán F&B
    payWithBuyerWallet(order.customerId, order.id, order.depositVnd);

    return order;
  });
}

export async function submitHarvestRequest(input: Omit<HarvestRequest, 'id' | 'customerId'>) {
  return mutate('DATA_CHANGED', state => {
    const customerId = entity(state.customers, state.session.activeCustomerId ?? '').id;
    actor(state, 'CUSTOMER', customerId);
    validDate(input.neededDate, state.demoNow);
    check(input.productName.trim() && Number.isSafeInteger(input.quantityKg) && input.quantityKg > 0, 'Nhập mặt hàng và khối lượng hợp lệ.');
    (state.harvestRequests ??= []).push({ ...input, productName: input.productName.trim(), id: `REQ-${state.nextId++}`, customerId });
  });
}
