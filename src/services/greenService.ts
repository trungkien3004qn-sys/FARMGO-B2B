import { mutate, readState } from '../store/demoStore';
import { actor, check, entity } from './governanceService';
import { demoDate, requestKey } from './financeService';
import { organicTypes, type GreenPickup } from '../types/green';
import type { DemoState } from '../mocks/seed';

export const greenRate = 2000;
export const greenVoucherValues = [50000, 100000] as const;
export const greenOtp = '000000';
type PickupInput = Pick<GreenPickup, 'types' | 'expectedKg' | 'appointment' | 'address'>;
const validKg = (kg: number) => Number.isSafeInteger(kg) && kg > 0 && Number.isSafeInteger(kg * greenRate);
export const updateGreenCheckout = <T>(action: (state: DemoState) => T) => {
  const save = () => mutate('DATA_CHANGED', action, true);
  return typeof navigator !== 'undefined' && navigator.locks ? navigator.locks.request('farmgo-green-checkout', save) : Promise.resolve().then(save);
};
const update = updateGreenCheckout;

function snapshot(state: DemoState, customerId: string) {
  const pickups = (state.greenPickups ?? []).filter(row => row.customerId === customerId).reverse();
  const vouchers = (state.greenVouchers ?? []).filter(row => row.customerId === customerId).reverse();
  const completed = pickups.filter(row => row.status === 'COMPLETE');
  const points = completed.reduce((sum, row) => sum + row.actualKg! * greenRate, 0) - vouchers.reduce((sum, row) => sum + row.valueVnd, 0);
  const month = demoDate(state.demoNow).slice(0, 7);
  const monthlyKg = completed.reduce((sum, row) => sum + (demoDate(row.completedAt!).startsWith(month) ? row.actualKg! : 0), 0);
  return { pickups, vouchers, points, monthlyKg, customerId, today: demoDate(state.demoNow),
    customerName: state.customers.find(row => row.id === customerId)?.businessName,
    addresses: state.addresses.filter(row => row.customerId === customerId) };
}

export async function getGreenAccount() {
  const state = readState();
  return snapshot(state, state.session.activeCustomerId ?? '');
}

export async function registerGreenPickup(customerId: string, input: PickupInput) {
  return update(state => {
    actor(state, 'CUSTOMER', customerId);
    const { types, expectedKg, appointment, address } = input;
    const pickupTime = Date.parse(appointment + ':00+07:00');
    check(types.length > 0 && types.every(type => organicTypes.includes(type)), 'Chọn loại bã hữu cơ.');
    check(validKg(expectedKg) && address.trim(), 'Nhập khối lượng nguyên dương và địa chỉ.');
    check(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(appointment) && pickupTime > Date.parse(state.demoNow) &&
      new Date(pickupTime + 7 * 3600000).toISOString().slice(0, 16) === appointment, 'Chọn thời gian bàn giao hợp lệ trong tương lai.');
    const row: GreenPickup = { ...input, types: [...new Set(types)], address: address.trim(),
      id: `FG-XANH-${state.nextId++}`, customerId, status: 'WAITING' };
    (state.greenPickups ??= []).push(row);
    return row;
  });
}

export async function getHtxPickups() {
  const state = readState();
  return (state.greenPickups ?? []).map(row => ({
    ...row, customerName: state.customers.find(customer => customer.id === row.customerId)?.businessName ?? row.customerId,
  })).reverse();
}

export async function confirmGreenPickup(id: string) {
  return update(state => {
    const pickup = entity(state.greenPickups ?? [], id);
    check(pickup.status === 'WAITING', 'Yêu cầu không còn chờ xác nhận.');
    pickup.status = 'CONFIRMED';
  });
}

export async function dispatchGreenPickup(id: string) {
  return update(state => {
    const pickup = entity(state.greenPickups ?? [], id);
    check(pickup.status === 'CONFIRMED', 'Xác nhận yêu cầu trước khi điều xe.');
    pickup.status = 'EN_ROUTE';
  });
}

export async function receiveGreenPickup(id: string) {
  return update(state => {
    const pickup = entity(state.greenPickups ?? [], id);
    check(pickup.status === 'COMPLETE', 'Cần kiểm đếm trước khi nhập xưởng.');
    pickup.receivedAt ??= state.demoNow;
  });
}

export async function completeGreenPickup(id: string, kg: number, method: 'OTP' | 'QR', code = '') {
  return update(state => {
    const pickup = entity(state.greenPickups ?? [], id);
    if (pickup.status === 'COMPLETE') return pickup;
    check(pickup.status === 'EN_ROUTE' && validKg(kg), 'Cần nhập khối lượng cân thực tế hợp lệ khi xe đang tới.');
    check(method === 'QR' || (method === 'OTP' && code === greenOtp), 'Mã OTP mô phỏng chưa đúng.');
    check(Number.isSafeInteger(snapshot(state, pickup.customerId).points + kg * greenRate), 'Số điểm vượt giới hạn.');
    pickup.actualKg = kg;
    pickup.completedAt = state.demoNow;
    pickup.status = 'COMPLETE';
    return pickup;
  });
}

export async function redeemGreenVoucher(customerId: string, valueVnd: number, key: string) {
  return update(state => {
    actor(state, 'CUSTOMER', customerId);
    requestKey(key);
    const vouchers = state.greenVouchers ??= [];
    const previous = vouchers.find(row => row.customerId === customerId && row.requestKey === key);
    if (previous) {
      check(previous.valueVnd === valueVnd, 'Mã yêu cầu đã được dùng cho mệnh giá khác.');
      return previous;
    }
    check(greenVoucherValues.some(value => value === valueVnd), 'Mệnh giá voucher không hợp lệ.');
    check(snapshot(state, customerId).points >= valueVnd, 'Số Điểm Xanh không đủ.');
    const voucher = { id: `XANH-${state.nextId++}`, customerId, valueVnd, requestKey: key };
    vouchers.push(voucher);
    return voucher;
  });
}
