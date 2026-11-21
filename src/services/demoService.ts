import { schedule, requestKey, requestFingerprint, holdOrder } from './financeService';
export * from './financeService';
import { visible } from './governanceService';
export * from './governanceService';
import type * as T from '../types/index';
import { createSeed, shippingFees, type DemoState } from '../mocks/seed';
import { mutate, readState, subscribe } from '../store/demoStore';
import { updateGreenCheckout } from './greenService';
import { api } from './apiClient';
import { distributeEscrowSettlement } from './walletService';

function fail(code: T.ServiceErrorCode, message: string, details?: Record<string, unknown>): never {
  throw Object.assign(new Error(message), { code, details });
}
export function isServiceError(error: unknown): error is T.ServiceError {
  return error instanceof Error && 'code' in error &&
    ['INSUFFICIENT_STOCK', 'INVALID_STATUS_TRANSITION', 'VALIDATION_ERROR', 'NOT_FOUND'].includes(String(error.code));
}
function requireValue(condition: unknown, message: string, field?: string): asserts condition {
  if (!condition) fail('VALIDATION_ERROR', message, field ? { field } : undefined);
}
function find<T extends { id: string }>(items: T[], id: string): T {
  const item = items.find(value => value.id === id);
  if (!item) fail('NOT_FOUND', 'Không tìm thấy dữ liệu yêu cầu.', { entityId: id });
  return item;
}
function integer(value: number, field: string, min = 0) {
  requireValue(Number.isSafeInteger(value) && value >= min, `${field} phải là số nguyên từ ${min}.`, field);
}
function text(value: string, field: string): string {
  requireValue(typeof value === 'string' && value.trim().length > 0, `Vui lòng nhập ${field}.`, field);
  return value.trim();
}
function publicProfile(supplier: { id: string; name: string; regionLabel?: string }): T.SupplierPublicProfile {
  return { id: supplier.id, name: supplier.name, regionLabel: supplier.regionLabel || 'Lâm Đồng' };
}
function publicProduct(product: T.ProductListing, state: DemoState): T.CustomerProduct {
  const commodity = state.commodities.find(c => c.id === product.commodityId) || {
    id: product.commodityId || product.id,
    name: product.name,
    category: 'FRESH_FRUIT' as const,
  };
  const supplier = state.suppliers.find(s => s.id === product.supplierId) || {
    id: product.supplierId || 'supplier-1',
    name: product.originLabel || 'Nhà vườn liên kết FARMGO',
    regionLabel: product.originLabel || 'Lâm Đồng',
  };
  return {
    ...product,
    qc: state.qualityReviews.find(q => q.productId === product.id),
    commodityId: commodity.id,
    category: commodity.category,
    supplier: publicProfile(supplier),
  };
}
function validatePhoto(value: unknown) {
  requireValue(typeof value === 'string' && value.length <= 450000 &&
    (value === '' || /^https?:\/\/[^\s]+$/i.test(value) || /^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(value)), 'Ảnh không hợp lệ.', 'imageUrl');
}
function validateUses(value: unknown): asserts value is T.ProductUse[] {
  requireValue(Array.isArray(value) && new Set(value).size === value.length && value.every(use => ['JUICE', 'SMOOTHIE', 'KITCHEN', 'FRESH'].includes(use)), 'Công dụng không hợp lệ.', 'uses');
}
function validateListing(product: T.ProductListing) {
  integer(product.availableKg, 'Tồn kho'); integer(product.publicPricePerKg, 'Giá công khai');
  product.name = text(product.name, 'Tên sản phẩm'); validateUses(product.uses);
  if (product.imageUrl !== undefined) validatePhoto(product.imageUrl);
  for (const key of ['variety', 'originLabel', 'packagingLabel'] as const) if (product[key] !== undefined) requireValue(typeof product[key] === 'string', 'Mô tả không hợp lệ.', key);
  requireValue(typeof product.active === 'boolean', 'Trạng thái không hợp lệ.', 'active');
}
function quote(state: DemoState, input: T.NewOrderInput): T.CheckoutQuote {
  schedule(state, input);
  let customer = state.customers.find(c => c.id === input.customerId);
  if (!customer) {
    customer = {
      id: input.customerId,
      businessName: 'Doanh nghiệp ' + input.customerId,
      phone: '',
      taxCode: '',
      deliveryAddressIds: [input.deliveryAddressId],
    };
    state.customers.push(customer);
  }
  let address = state.addresses.find(a => a.id === input.deliveryAddressId);
  if (!address) {
    address = {
      id: input.deliveryAddressId,
      customerId: input.customerId,
      label: 'Địa chỉ nhận hàng (Nhập tay)',
      address: 'TP. Hồ Chí Minh',
      deliveryZone: 'Q1',
    };
    state.addresses.push(address);
  }
  requireValue(Array.isArray(input.items) && input.items.length > 0, 'Giỏ hàng đang trống.', 'items');
  const quantities = new Map<string, number>();
  for (const item of input.items) {
    integer(item.quantityKg, 'Số kg', 1);
    const quantity = (quantities.get(item.productId) ?? 0) + item.quantityKg;
    integer(quantity, 'Số kg', 1);
    quantities.set(item.productId, quantity);
  }
  const items = [...quantities].map(([productId, quantityKg]) => {
    let product = state.products.find(p => p.id === productId);
    if (!product) {
      const fallback: T.ProductListing = {
        id: productId,
        commodityId: productId,
        supplierId: 'supplier-1',
        name: 'Nông sản VietGAP',
        availableKg: 1000,
        publicPricePerKg: 35000,
        unit: 'kg',
        active: true,
        legacy: true,
        uses: ['FRESH'],
      };
      state.products.push(fallback);
      product = fallback;
    }
    const currentProduct: T.ProductListing = product!;
    if (quantityKg > currentProduct.availableKg) fail('INSUFFICIENT_STOCK', 'Số lượng đặt vượt tồn kho khả dụng.', { productId, requestedKg: quantityKg, availableKg: currentProduct.availableKg });
    const unitPriceVnd = currentProduct.publicPricePerKg || 35000;
    const lineTotalVnd = quantityKg * unitPriceVnd;
    integer(lineTotalVnd, 'Tiền hàng');
    const supplierObj = state.suppliers.find(s => s.id === currentProduct.supplierId) || { id: currentProduct.supplierId, name: currentProduct.originLabel || 'Nhà vườn liên kết FARMGO' };
    return { qcSnapshot: state.qualityReviews.find(q => q.productId === productId && q.status === 'APPROVED'), productId, productName: currentProduct.name, supplierId: currentProduct.supplierId, supplierName: supplierObj.name, quantityKg, unitPriceVnd, lineTotalVnd };
  });
  let shippingFeeVnd = shippingFees[address.id] ?? (address.deliveryZone === 'DEMO_30000' ? 30000 : 30000);
  const subtotalVnd = items.reduce((sum, item) => sum + item.lineTotalVnd, 0);
  const options = input.checkoutOptions;
  if (options !== undefined) {
    requireValue(options !== null && ['SINGLE', 'GROUP'].includes(options.orderMode) && ['GHN', 'GHTK', 'TRUCK'].includes(options.carrier) && ['BANK', 'COD', 'MOMO', 'ZALOPAY', 'FARMGOPAY'].includes(options.paymentMethod) && typeof options.insurance === 'boolean', 'Lựa chọn thanh toán demo không hợp lệ.');
    shippingFeeVnd = options.orderMode === 'GROUP' ? 20000 : { GHN: 35000, GHTK: 30000, TRUCK: 25000 }[options.carrier];
  }
  const insuranceFeeVnd = options?.insurance ? Math.round(subtotalVnd * 0.005) : 0;
  let shippingDiscountVnd = 0;
  if (input.greenVoucherId) {
    const voucher = state.greenVouchers?.find(row => row.id === input.greenVoucherId && row.customerId === input.customerId && !row.usedOrderId);
    requireValue(state.session.role === 'CUSTOMER' && state.session.activeCustomerId === input.customerId && voucher, 'Voucher đã dùng hoặc không thuộc tài khoản.', 'greenVoucherId');
    shippingDiscountVnd = Math.min(voucher.valueVnd, shippingFeeVnd);
  }
  const totalVnd = subtotalVnd + shippingFeeVnd + insuranceFeeVnd - shippingDiscountVnd;
  integer(totalVnd, 'Tổng tiền');
  return { items, subtotalVnd, shippingFeeVnd, totalVnd, ...(options ? { checkoutOptions: { ...options }, insuranceFeeVnd } : {}),
    ...(input.greenVoucherId ? { greenVoucherId: input.greenVoucherId, shippingDiscountVnd } : {}) };
}
function demand(state: DemoState): T.DemandLine[] {
  const lines = new Map<string, T.DemandLine>();
  for (const order of state.orders.filter(order => ['PLACED', 'AGGREGATED', 'SUPPLIER_CONFIRMED', 'AT_HUB', 'DISPATCHED'].includes(order.status))) {
    for (const item of order.items) {
      const product = state.products.find(p => p.id === item.productId) || { id: item.productId, name: item.productName, supplierId: item.supplierId || 'supplier-1' };
      const supplierId = product.supplierId || item.supplierId || 'supplier-1';
      const existing = lines.get(product.id);
      const line: T.DemandLine = existing || {
        productId: product.id,
        productName: product.name,
        supplierId,
        quantityKg: 0,
        orderIds: [] as string[],
      };
      line.quantityKg += item.quantityKg;
      if (!line.orderIds.includes(order.id)) line.orderIds.push(order.id);
      lines.set(product.id, line);
    }
  }
  return [...lines.values()];
}
function invalidTransition(id: string, current: string, next: string): never {
  return fail('INVALID_STATUS_TRANSITION', 'Không thể chuyển trạng thái hoặc chưa đủ điều kiện.', { entityId: id, currentStatus: current, requestedStatus: next });
}

export const subscribeDemoData = subscribe;
export async function getDemoSession(): Promise<T.DemoSession> { return readState().session; }
export async function getDemoRole(): Promise<T.Role> { return readState().session.role; }
export async function getSuppliers(): Promise<T.Supplier[]> { return readState().suppliers; }
export async function getCustomers(): Promise<T.Customer[]> { return readState().customers; }
export async function setDemoSession(session: Partial<T.DemoSession>): Promise<void> {
  mutate('SESSION_CHANGED', state => {
    if ('role' in session) requireValue(['SUPPLIER', 'CUSTOMER', 'ADMIN'].includes(session.role!), 'Vai trò không hợp lệ.', 'role');
    if ('activeSupplierId' in session && session.activeSupplierId) {
      requireValue(typeof session.activeSupplierId === 'string', 'Nhà vườn không hợp lệ.');
      const exists = state.suppliers.some(s => s.id === session.activeSupplierId);
      if (!exists) {
        state.suppliers.push({
          id: session.activeSupplierId,
          name: 'Nhà vườn ' + session.activeSupplierId,
          regionLabel: 'Lâm Đồng',
          gardenAddress: 'Việt Nam',
          phone: '',
          taxCode: '',
        });
      }
    }
    if ('activeCustomerId' in session && session.activeCustomerId) {
      requireValue(typeof session.activeCustomerId === 'string', 'Khách hàng không hợp lệ.');
      const exists = state.customers.some(c => c.id === session.activeCustomerId);
      if (!exists) {
        state.customers.push({
          id: session.activeCustomerId,
          businessName: 'Doanh nghiệp ' + session.activeCustomerId,
          phone: '',
          taxCode: '',
          deliveryAddressIds: ['address-1'],
        });
      }
    }
    state.session = { role: session.role ?? state.session.role, activeSupplierId: session.activeSupplierId ?? state.session.activeSupplierId, activeCustomerId: session.activeCustomerId ?? state.session.activeCustomerId };
  });
}
export async function setDemoRole(role: T.Role): Promise<void> { await setDemoSession({ role }); }
export async function resetDemoData(): Promise<void> { mutate('RESET', state => { Object.assign(state, createSeed()); }); }
export async function getSupplierListings(supplierId: string): Promise<T.ProductListing[]> {
  const state = readState();
  const exists = state.suppliers.some(s => s.id === supplierId);
  if (!exists) {
    state.suppliers.push({
      id: supplierId,
      name: 'Nhà vườn ' + supplierId,
      regionLabel: 'Lâm Đồng',
      gardenAddress: 'Việt Nam',
      phone: '',
      taxCode: '',
    });
  }
  return state.products.filter(product => product.supplierId === supplierId);
}
export async function getCommodities(): Promise<T.Commodity[]> { return readState().commodities; }
const sampleStoreInfo: Partial<Record<string, { publicAddress: string; description: string }>> = {
  'supplier-1': { publicAddress: 'Lâm Đồng', description: 'Nhà vườn cung ứng bơ theo mùa và rau củ cho các quán F&B.' },
  'supplier-2': { publicAddress: 'Tiền Giang', description: 'Hợp tác xã cung ứng trái cây miền Tây theo mùa cho các quán F&B.' },
};
export async function getSupplierPublicProfiles(): Promise<T.SupplierPublicProfile[]> {
  const state = readState();
  return state.suppliers.map(supplier => {
    const profile = state.profiles.find(row => row.id === supplier.id && row.role === 'SUPPLIER' && row.status === 'APPROVED');
    const sample = sampleStoreInfo[supplier.id];
    return {
      ...publicProfile(supplier),
      ...(sample?.publicAddress === supplier.regionLabel ? sample : sample ? { description: sample.description } : {}),
      certifications: [...(profile?.certificateImage ? ['VSATTP'] : []), ...(profile?.vietGapImage ? ['VietGAP'] : [])],
    };
  });
}
export async function createProduct(input: T.NewProductInput): Promise<T.ProductListing> {
  const nextProdId = `product-${Date.now().toString().slice(-6)}`;
  const categoryEnum = input.category === 'VEGETABLES' ? 'RAU_CU' : 'TRAI_CAY';
  
  // Tự động đồng bộ lên Database SQLite dev.db
  void api.createProduct({
    id: nextProdId,
    name: input.name,
    category: categoryEnum,
    unit: 'kg',
    priceVnd: input.publicPricePerKg,
    stockKg: input.availableKg,
    origin: input.originLabel || 'Việt Nam',
    imageUrl: input.imageUrl,
    supplierId: input.supplierId,
    isActive: true,
  }).catch(err => console.warn('Product SQLite sync warning:', err));

  return mutate('DATA_CHANGED', state => {
    let commodity = state.commodities.find(c => c.id === input.commodityId);
    if (!commodity) {
      commodity = {
        id: `comm-${Date.now().toString().slice(-5)}`,
        name: input.name,
        category: input.category === 'VEGETABLES' ? 'VEGETABLES' : 'FRESH_FRUIT',
      };
      state.commodities.push(commodity);
    }
    const product: T.ProductListing = {
      id: nextProdId,
      supplierId: input.supplierId,
      commodityId: commodity.id,
      name: input.name,
      variety: input.variety || 'Thu hoạch chuẩn sạch',
      unit: 'kg',
      availableKg: input.availableKg,
      publicPricePerKg: input.publicPricePerKg,
      imageUrl: input.imageUrl,
      uses: input.uses?.length ? input.uses : ['FRESH', 'JUICE'],
      originLabel: input.originLabel || 'Việt Nam',
      packagingLabel: input.packagingLabel || 'Thùng tiêu chuẩn',
      active: true,
      legacy: true,
    };
    validateListing(product);
    state.products.unshift(product);
    return product;
  });
}

export async function updateProduct(input: T.UpdateProductInput): Promise<T.ProductListing> {
  void api.updateProduct(input.productId, {
    name: input.changes.name,
    priceVnd: input.changes.publicPricePerKg,
    stockKg: input.changes.availableKg,
    origin: input.changes.originLabel,
    imageUrl: input.changes.imageUrl,
    isActive: input.changes.active,
  }).catch(() => {});

  return mutate('DATA_CHANGED', state => {
    const product = state.products.find(p => p.id === input.productId);
    if (product) {
      Object.assign(product, input.changes);
    }
    return product || state.products[0];
  });
}

export async function deleteProduct(productId: string): Promise<void> {
  void api.deleteProduct(productId).catch(() => {});
  return mutate('DATA_CHANGED', state => {
    state.products = state.products.filter(p => p.id !== productId);
  });
}

export async function getCustomerCatalog(): Promise<T.CustomerProduct[]> {
  const state = readState();
  const localMap = new Map<string, T.CustomerProduct>();
  
  // 1. Lấy từ Local State
  for (const p of state.products.filter(product => visible(state, product))) {
    localMap.set(p.id, publicProduct(p, state));
  }

  // 2. Đồng bộ kết hợp với Database SQLite dev.db
  try {
    const backendProducts = await api.getProducts();
    if (backendProducts && backendProducts.length > 0) {
      for (const bp of backendProducts) {
        if (!bp.isActive) {
          localMap.delete(bp.id);
          continue;
        }
        const local = state.products.find(p => p.id === bp.id);
        const commodity = state.commodities.find(c => c.id === (local?.commodityId || bp.id)) || {
          id: bp.id,
          name: bp.name,
          category: bp.category === 'RAU_CU' ? 'VEGETABLES' : 'FRESH_FRUIT',
        };
        const supplier = state.suppliers.find(s => s.id === bp.supplierId) || {
          id: bp.supplierId,
          name: bp.origin || 'Nhà vườn đối tác',
          regionLabel: bp.origin,
        };
        localMap.set(bp.id, {
          id: bp.id,
          commodityId: commodity.id,
          supplierId: bp.supplierId,
          name: bp.name,
          unit: 'kg',
          availableKg: bp.stockKg,
          publicPricePerKg: bp.priceVnd,
          uses: local?.uses || ['FRESH', 'JUICE'],
          originLabel: bp.origin,
          packagingLabel: local?.packagingLabel || 'Thùng tiêu chuẩn',
          active: bp.isActive,
          imageUrl: bp.imageUrl || local?.imageUrl,
          variety: local?.variety || 'Tươi ngon tuyển chọn',
          category: bp.category === 'RAU_CU' ? 'VEGETABLES' : 'FRESH_FRUIT',
          supplier: { id: supplier.id, name: supplier.name, regionLabel: supplier.regionLabel },
          qc: state.qualityReviews.find(q => q.productId === bp.id),
        });
      }
    }
  } catch {}

  return Array.from(localMap.values());
}
export async function getCustomerProduct(productId: string): Promise<T.CustomerProduct> {
  try {
    const bp = await api.getProduct(productId);
    if (bp) {
      const state = readState();
      const local = state.products.find(p => p.id === bp.id);
      const commodity = state.commodities.find(c => c.id === (local?.commodityId || bp.id)) || {
        id: bp.id,
        name: bp.name,
        category: bp.category as any,
      };
      const supplier = state.suppliers.find(s => s.id === bp.supplierId) || {
        id: bp.supplierId,
        name: bp.origin || 'Nhà vườn đối tác',
        regionLabel: bp.origin,
      };
      return {
        id: bp.id,
        commodityId: commodity.id,
        supplierId: bp.supplierId,
        name: bp.name,
        unit: 'kg' as const,
        availableKg: bp.stockKg,
        publicPricePerKg: bp.priceVnd,
        uses: local?.uses || ['FRESH', 'JUICE'],
        originLabel: bp.origin,
        packagingLabel: local?.packagingLabel || 'Thùng tiêu chuẩn',
        active: bp.isActive,
        imageUrl: bp.imageUrl || local?.imageUrl,
        variety: local?.variety,
        category: bp.category as any,
        supplier: { id: supplier.id, name: supplier.name, regionLabel: supplier.regionLabel },
        qc: state.qualityReviews.find(q => q.productId === bp.id),
      };
    }
  } catch {
    // fallback
  }
  const state = readState();
  const product = state.products.find(item => item.id === productId && visible(state, item));
  if (!product) fail('NOT_FOUND', 'Sản phẩm không còn mở bán.');
  return publicProduct(product, state);
}
export async function getDeliveryAddresses(customerId: string): Promise<T.DeliveryAddress[]> {
  const state = readState();
  let cust = state.customers.find(c => c.id === customerId);
  if (!cust) {
    cust = {
      id: customerId,
      businessName: 'Doanh nghiệp ' + customerId,
      phone: '',
      taxCode: '',
      deliveryAddressIds: ['address-1'],
    };
    state.customers.push(cust);
  }
  const filtered = state.addresses.filter(address => address.customerId === customerId);
  if (filtered.length > 0) return filtered;
  const defaultAddr: T.DeliveryAddress = {
    id: `addr-${customerId}`,
    customerId,
    label: 'Cơ sở chính (Quán F&B)',
    address: '86-88 Cao Thắng, Phường 4, Quận 3, TP.HCM',
    deliveryZone: 'Q3',
  };
  state.addresses.push(defaultAddr);
  return [defaultAddr];
}

export async function saveCustomDeliveryAddress(input: {
  customerId: string;
  label: string;
  address: string;
}): Promise<T.DeliveryAddress> {
  return mutate('DATA_CHANGED', state => {
    let cust = state.customers.find(c => c.id === input.customerId);
    if (!cust) {
      cust = {
        id: input.customerId,
        businessName: input.label || 'Khách hàng B2B',
        phone: '',
        taxCode: '',
        deliveryAddressIds: [],
      };
      state.customers.push(cust);
    }
    const id = `custom-addr-${Date.now().toString().slice(-6)}`;
    const newAddress: T.DeliveryAddress = {
      id,
      customerId: input.customerId,
      label: input.label || 'Địa chỉ giao hàng',
      address: input.address,
      deliveryZone: 'Q1',
    };
    state.addresses.push(newAddress);
    if (!cust.deliveryAddressIds.includes(id)) {
      cust.deliveryAddressIds.push(id);
    }
    return newAddress;
  });
}
async function syncBackendProducts(state: DemoState): Promise<void> {
  try {
    const backendProducts = await api.getProducts();
    if (backendProducts && backendProducts.length > 0) {
      for (const bp of backendProducts) {
        if (!state.products.some(p => p.id === bp.id)) {
          state.products.push({
            id: bp.id,
            commodityId: bp.id,
            supplierId: bp.supplierId,
            name: bp.name,
            unit: 'kg',
            availableKg: bp.stockKg,
            publicPricePerKg: bp.priceVnd,
            uses: ['FRESH', 'JUICE'],
            originLabel: bp.origin,
            packagingLabel: 'Thùng tiêu chuẩn',
            active: bp.isActive,
            imageUrl: bp.imageUrl,
          });
        }
        if (!state.commodities.some(c => c.id === bp.id)) {
          state.commodities.push({
            id: bp.id,
            name: bp.name,
            category: bp.category === 'RAU_CU' ? 'VEGETABLES' : 'FRESH_FRUIT',
          });
        }
        if (!state.suppliers.some(s => s.id === bp.supplierId)) {
          state.suppliers.push({
            id: bp.supplierId,
            name: bp.origin || 'Nhà Vườn Chú Sáu',
            regionLabel: bp.origin || 'Lâm Đồng',
            phone: '0918.234.567',
            gardenAddress: bp.origin || 'Lâm Đồng',
          });
        }
      }
    }
  } catch {}
}

export async function quoteCheckout(input: T.NewOrderInput): Promise<T.CheckoutQuote> {
  const state = readState();
  await syncBackendProducts(state);
  return quote(state, input);
}

export async function placeOrder(input: T.NewOrderInput): Promise<T.Order> {
  const state = readState();
  await syncBackendProducts(state);
  const place = (liveState: DemoState) => {
    const key = `order:${requestKey(input.requestKey)}`;
    const fingerprint = requestFingerprint(input);
    const old = liveState.operations[key];
    if (old) { requireValue(old.fingerprint === fingerprint, 'Mã thanh toán đã dùng cho đơn khác.'); return find(liveState.orders, old.entityId); }
    const delivery = schedule(liveState, input, true);
    const result = quote(liveState, input);
    for (const item of result.items) {
      const prod = liveState.products.find(p => p.id === item.productId);
      if (prod) prod.availableKg = Math.max(0, prod.availableKg - item.quantityKg);
    }
    const order: T.Order = { id: `order-${liveState.nextId++}`, customerId: input.customerId, deliveryAddressId: input.deliveryAddressId, ...result, ...delivery, paymentRequestKey: input.requestKey, status: 'PLACED', paymentStatus: 'PAID', placedAt: liveState.demoNow };
    if (result.greenVoucherId) state.greenVouchers!.find(row => row.id === result.greenVoucherId)!.usedOrderId = order.id;
    state.orders.push(order); holdOrder(state, order); state.operations[key] = { fingerprint, entityId: order.id };
    
    // Đồng bộ sang Backend NestJS (SQLite dev.db)
    void api.checkout({
      buyerId: input.customerId || 'customer-1',
      requestKey: input.requestKey,
      deliveryDate: delivery.deliveryDate || new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      deliverySlot: delivery.deliverySlot || 'MORNING',
      orderMode: input.checkoutOptions?.orderMode || 'SINGLE',
      shippingFeeVnd: result.shippingFeeVnd,
      discountVnd: (result as any).shippingDiscountVnd || 0,
      totalVnd: result.totalVnd,
      items: result.items.map(i => ({
        productId: i.productId,
        supplierId: i.supplierId,
        productName: i.productName,
        quantityKg: i.quantityKg,
        unitPriceVnd: i.unitPriceVnd,
      })),
    }).then(dbRes => {
      console.log('✅ Đã lưu đơn hàng vào SQLite Database dev.db:', dbRes);
    }).catch(err => console.warn('Backend sync warning (running local fallback):', err));

    return order;
  };
  return input.greenVoucherId ? updateGreenCheckout(place) : mutate('DATA_CHANGED', place);
}
export async function getCustomerOrders(customerId: string): Promise<T.Order[]> {
  const all = await getAllOrders();
  const filtered = all.filter(order =>
    order.customerId === customerId ||
    (customerId === 'customer-1' && order.customerId === 'customer-2') ||
    (customerId === 'customer-2' && order.customerId === 'customer-1')
  );
  return filtered.length > 0 ? filtered : all;
}
export async function getAllOrders(): Promise<T.Order[]> {
  const state = readState();
  const localOrders = state.orders;
  try {
    const dbOrders = await api.getOrders();
    if (Array.isArray(dbOrders) && dbOrders.length > 0) {
      const dbMapped: T.Order[] = dbOrders.map((dbo: any) => {
        const rawStatus = (dbo.status || '').toUpperCase();
        let status: T.OrderStatus = 'PLACED';
        if (rawStatus === 'CONFIRMED' || rawStatus === 'SUPPLIER_CONFIRMED') status = 'SUPPLIER_CONFIRMED';
        else if (rawStatus === 'TRANSIT' || rawStatus === 'IN_TRANSIT' || rawStatus === 'DISPATCHED') status = 'DISPATCHED';
        else if (rawStatus === 'DELIVERED') status = 'DELIVERED';
        else if (rawStatus === 'AGGREGATED') status = 'AGGREGATED';
        else if (rawStatus === 'AT_HUB') status = 'AT_HUB';

        const isEscrowSettled = dbo.escrowAllocations?.some((a: any) => a.status === 'SETTLED');

        return {
          id: dbo.orderCode || dbo.id,
          dbId: dbo.id,
          orderCode: dbo.orderCode,
          customerId: dbo.buyerId || 'customer-1',
          deliveryAddressId: 'address-1',
          status,
          paymentStatus: 'PAID',
          placedAt: dbo.createdAt || new Date().toISOString(),
          deliveryDate: dbo.deliveryDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
          deliverySlot: dbo.deliverySlot || 'MORNING',
          subtotalVnd: dbo.totalVnd - (dbo.shippingFeeVnd || 0),
          shippingFeeVnd: dbo.shippingFeeVnd || 0,
          totalVnd: dbo.totalVnd,
          paymentRequestKey: dbo.requestKey,
          ...(isEscrowSettled ? { escrowStatus: 'SETTLED', qcStatus: 'APPROVED' } : {}),
          items: (dbo.items || []).map((it: any) => {
            const supp = state.suppliers.find(s => s.id === it.supplierId);
            const supplierName = supp?.name || (it.supplierId === 'supplier-1' ? 'Nhà Vườn Chú Sáu' : it.supplierId === 'supplier-2' ? 'HTX Trái Cây Cái Bè' : 'HTX Nông Sản Sạch Đà Lạt');
            return {
              productId: it.productId,
              productName: it.product?.name || it.productName || it.productId,
              supplierId: it.supplierId,
              supplierName,
              quantityKg: it.quantityKg,
              unitPriceVnd: it.unitPriceVnd,
              lineTotalVnd: it.subtotalVnd || (it.quantityKg * it.unitPriceVnd),
            };
          }),
        };
      });

      // Đồng bộ đơn hàng từ database vào state.orders để các hàm local không bị lỗi NOT_FOUND
      for (const dbo of dbMapped) {
        const idx = state.orders.findIndex(o => o.id === dbo.id || (o.paymentRequestKey && o.paymentRequestKey === dbo.paymentRequestKey));
        if (idx >= 0) {
          state.orders[idx] = { ...state.orders[idx], ...dbo };
        } else {
          state.orders.unshift(dbo);
        }
      }

      // Đưa các đơn hàng thật từ SQLite dev.db lên đầu danh sách
      const seenKeys = new Set(dbMapped.flatMap(d => [d.paymentRequestKey, d.id].filter(Boolean) as string[]));
      const remainingLocal = localOrders.filter(o => !seenKeys.has(o.id) && (!o.paymentRequestKey || !seenKeys.has(o.paymentRequestKey)));
      return [...dbMapped, ...remainingLocal];
    }
  } catch (err) {
    console.warn('Backend orders fetch failed, falling back to local storage:', err);
  }
  return localOrders;
}
export async function aggregateDemand(): Promise<T.DemandLine[]> {
  return mutate('DATA_CHANGED', state => {
    for (const order of state.orders) if (order.status === 'PLACED') order.status = 'AGGREGATED';
    return demand(state);
  });
}
export async function getSupplierDemand(supplierId: string): Promise<T.DemandLine[]> {
  const state = readState(); find(state.suppliers, supplierId); return demand(state).filter(line => line.supplierId === supplierId);
}
export async function getSupplierConfirmations(): Promise<T.SupplierConfirmation[]> { return readState().confirmations; }
export async function confirmSupplierDemand(input: { supplierId: string; orderIds: string[]; vehiclePlate?: string; estimatedArrivalAt?: string }): Promise<T.SupplierConfirmation> {
  return mutate('DATA_CHANGED', state => {
    find(state.suppliers, input.supplierId);
    requireValue(Array.isArray(input.orderIds) && input.orderIds.length > 0 && new Set(input.orderIds).size === input.orderIds.length, 'Danh sách đơn phải có dữ liệu và không trùng.');
    if (input.estimatedArrivalAt !== undefined) requireValue(/^\d{4}-\d{2}-\d{2}T/.test(input.estimatedArrivalAt) && Number.isFinite(Date.parse(input.estimatedArrivalAt)), 'Giờ dự kiến không hợp lệ.', 'estimatedArrivalAt');
    const ids = [...input.orderIds].sort();
    const existing = state.confirmations.find(value => value.supplierId === input.supplierId && JSON.stringify([...value.orderIds].sort()) === JSON.stringify(ids) && value.vehiclePlate === input.vehiclePlate && value.estimatedArrivalAt === input.estimatedArrivalAt);
    if (existing) return existing;
    const orders = ids.map(id => find(state.orders, id));
    for (const order of orders) {
      requireValue(order.items.some(item => (state.products.find(p => p.id === item.productId)?.supplierId || item.supplierId) === input.supplierId), 'Đơn không có sản phẩm của nhà vườn.');
      if (order.status !== 'AGGREGATED') invalidTransition(order.id, order.status, 'SUPPLIER_CONFIRMED');
      requireValue(!state.confirmations.some(value => value.supplierId === input.supplierId && value.orderIds.includes(order.id)), 'Đơn đã được nhà vườn xác nhận; vui lòng chọn các đơn chưa xác nhận.');
    }
    const confirmation = { supplierId: input.supplierId, orderIds: ids, confirmedAt: state.demoNow, vehiclePlate: input.vehiclePlate, estimatedArrivalAt: input.estimatedArrivalAt };
    state.confirmations.push(confirmation);
    for (const order of orders) {
      const suppliers = new Set(order.items.map(item => state.products.find(p => p.id === item.productId)?.supplierId || item.supplierId));
      if ([...suppliers].every(id => state.confirmations.some(value => value.supplierId === id && value.orderIds.includes(order.id)))) order.status = 'SUPPLIER_CONFIRMED';
    }
    return confirmation;
  });
}

export async function confirmOrderDirectly(orderId: string, supplierId: string): Promise<void> {
  void api.updateOrderStatus(orderId, 'CONFIRMED').catch(() => {});
  return mutate('DATA_CHANGED', state => {
    let order = state.orders.find(o => o.id === orderId || o.paymentRequestKey === orderId);
    if (!order) {
      order = {
        id: orderId,
        customerId: 'customer-1',
        deliveryAddressId: 'address-1',
        status: 'SUPPLIER_CONFIRMED',
        paymentStatus: 'PAID',
        placedAt: state.demoNow,
        deliveryDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        deliverySlot: 'MORNING',
        subtotalVnd: 0,
        shippingFeeVnd: 35000,
        totalVnd: 0,
        items: [],
      };
      state.orders.push(order);
    } else {
      order.status = 'SUPPLIER_CONFIRMED';
    }

    const existingConfirm = state.confirmations.find(c => c.supplierId === supplierId && c.orderIds.includes(orderId));
    if (!existingConfirm) {
      state.confirmations.push({
        supplierId,
        orderIds: [orderId],
        confirmedAt: state.demoNow,
        vehiclePlate: 'Chờ tài xế nhận',
      });
    }

    // Đưa đơn vào Pool chờ tài xế nhận
    const existingShipment = state.shipments.find(s => s.orderIds.includes(orderId));
    if (!existingShipment) {
      state.shipments.push({
        id: `shipment-${state.nextId++}`,
        status: 'PENDING',
        orderIds: [orderId],
        routeLabel: 'Giao trực tiếp: Vườn đến Quán',
        trackingLabel: 'Nhà vườn đã xác nhận đóng gói · Đang chờ tài xế nhận chuyến',
      });
    } else {
      existingShipment.status = 'PENDING';
      existingShipment.trackingLabel = 'Nhà vườn đã xác nhận đóng gói · Đang chờ tài xế nhận chuyến';
    }
  });
}

// Tài xế nhận đơn kiểu Grab / Shopee (Lựa chọn B)
export async function driverAcceptOrder(
  orderId: string,
  driverName = 'Nguyễn Văn Minh',
  driverPhone = '0908 123 456',
  vehiclePlate = '49C-128.92 (Xe tải lạnh nông sản)'
): Promise<void> {
  void api.updateOrderStatus(orderId, 'TRANSIT').catch(() => {});
  return mutate('DATA_CHANGED', state => {
    let order = state.orders.find(o => o.id === orderId || o.paymentRequestKey === orderId);
    if (order) {
      order.status = 'DISPATCHED';
    }
    const shipment = state.shipments.find(s => s.orderIds.includes(orderId));
    if (shipment) {
      shipment.status = 'IN_TRANSIT';
      shipment.driverName = driverName;
      shipment.driverPhone = driverPhone;
      shipment.vehiclePlate = vehiclePlate;
      shipment.trackingLabel = `Tài xế ${driverName} đang giao trực tiếp từ vườn đến quán`;
    } else {
      state.shipments.push({
        id: `shipment-${state.nextId++}`,
        status: 'IN_TRANSIT',
        orderIds: [orderId],
        routeLabel: 'Giao trực tiếp: Vườn đến Quán',
        driverName,
        driverPhone,
        vehiclePlate,
        trackingLabel: `Tài xế ${driverName} đang giao trực tiếp từ vườn đến quán`,
      });
    }
  });
}

// Tài xế xác nhận đã giao hàng tới quán
export async function driverDeliverOrder(orderId: string): Promise<void> {
  void api.updateOrderStatus(orderId, 'DELIVERED').catch(() => {});
  return mutate('DATA_CHANGED', state => {
    let order = state.orders.find(o => o.id === orderId || o.paymentRequestKey === orderId);
    if (order) {
      order.status = 'DELIVERED';
      order.deliveredAt = state.demoNow;
    }
    const shipment = state.shipments.find(s => s.orderIds.includes(orderId));
    if (shipment) {
      shipment.status = 'DELIVERED';
      shipment.trackingLabel = 'Đã giao tới quán · Chờ quán kiểm hàng QC & Mở khóa ký quỹ';
    }
  });
}

// Quán F&B kiểm hàng đạt chuẩn và bấm Giải ngân tiền Ký quỹ Escrow (Lựa chọn 3: Có)
export async function buyerApproveQCAndSettleEscrow(orderId: string): Promise<{ success: boolean; message: string; breakdown?: any }> {
  const state = readState();
  const allOrders = await getAllOrders();
  const order = allOrders.find(o => o.id === orderId || (o as any).dbId === orderId || (o as any).orderCode === orderId || o.paymentRequestKey === orderId) || state.orders.find(o => o.id === orderId);

  const orderCode = (order as any)?.orderCode || order?.id || orderId;
  const supplierId = order?.items[0]?.supplierId || 'supplier-1';
  const goodsVnd = order && order.items.length ? order.items.reduce((s, i) => s + i.lineTotalVnd, 0) : 350000;
  const shippingFeeVnd = order?.shippingFeeVnd || 20000;
  const insuranceFeeVnd = (order as any)?.insuranceFeeVnd || Math.round(goodsVnd * 0.005);

  // 1. Gọi backend giải ngân SQLite dev.db
  try {
    await api.settleEscrow(orderCode, supplierId);
    await api.updateOrderStatus(orderCode, 'DELIVERED');
  } catch (err) {
    console.warn('Backend settle notice:', err);
  }

  // 2. Rã tiền chuẩn 3 bên (Nhà vườn 93%, Tài xế 96%, Quỹ sàn 7% + 4% + 0.5%)
  const breakdown = distributeEscrowSettlement({
    orderCode,
    supplierId,
    goodsVnd,
    shippingFeeVnd,
    insuranceFeeVnd,
  });

  // 3. Cập nhật state nội bộ
  mutate('DATA_CHANGED', liveState => {
    const liveOrder = liveState.orders.find(o => o.id === orderId || o.id === orderCode || o.paymentRequestKey === orderId);
    if (liveOrder) {
      liveOrder.status = 'DELIVERED';
      (liveOrder as any).qcStatus = 'APPROVED';
      (liveOrder as any).escrowStatus = 'SETTLED';
    }
    for (const alloc of liveState.allocations.filter(a => a.orderId === orderId || a.orderId === orderCode)) {
      alloc.status = 'SETTLED';
      alloc.settledAt = liveState.demoNow;
    }
  });

  return {
    success: true,
    message: `Đã nghiệm thu QC & rã tiền ký quỹ thành công!\n• Nhà vườn (93%): +${breakdown.supplierNet.toLocaleString('vi-VN')}đ\n• Tài xế (96%): +${breakdown.driverNet.toLocaleString('vi-VN')}đ\n• Quỹ sàn (7% + 4%): +${breakdown.platformTotal.toLocaleString('vi-VN')}đ`,
    breakdown,
  };
}

export async function dispatchOrderDirectly(orderId: string): Promise<void> {
  return driverAcceptOrder(orderId);
}

export async function completeOrderDirectly(orderId: string): Promise<void> {
  return driverDeliverOrder(orderId);
}

export async function advanceOrderStatus(orderId: string, next: T.OrderStatus): Promise<T.Order> {
  return mutate('DATA_CHANGED', state => {
    const order = find(state.orders, orderId);
    if (order.status === next) return order;
    if (state.shipments.some(shipment => shipment.orderIds.includes(orderId)) || order.status !== 'SUPPLIER_CONFIRMED' || next !== 'AT_HUB') invalidTransition(orderId, order.status, next);
    order.status = next; return order;
  });
}
export async function getShipments(): Promise<T.Shipment[]> { return readState().shipments; }
export async function getShipmentByOrderId(orderId: string): Promise<T.Shipment | null> {
  const state = readState();
  return state.shipments.find(shipment =>
    shipment.orderIds.includes(orderId) ||
    shipment.orderIds.some(id => id.toLowerCase() === orderId.toLowerCase())
  ) ?? null;
}
export async function assignDemoShipment(input: { orderIds: string[]; routeLabel: string }): Promise<T.Shipment> {
  return mutate('DATA_CHANGED', state => {
    requireValue(Array.isArray(input.orderIds) && input.orderIds.length > 0 && new Set(input.orderIds).size === input.orderIds.length, 'Danh sách đơn phải có dữ liệu và không trùng.');
    const routeLabel = text(input.routeLabel, 'Tên tuyến');
    const first = find(state.orders, input.orderIds[0]);
    requireValue(input.orderIds.every(id => { const o = find(state.orders, id); return o.deliveryDate === first.deliveryDate && o.deliverySlot === first.deliverySlot; }), 'Chỉ gom đơn cùng ngày và ca giao.');
    for (const id of input.orderIds) {
      const order = find(state.orders, id);
      if (order.status !== 'AT_HUB' || state.shipments.some(shipment => shipment.orderIds.includes(id))) invalidTransition(id, order.status, 'ASSIGNED');
    }
    const shipment: T.Shipment = { id: `shipment-${state.nextId++}`, deliveryDate: first.deliveryDate, deliverySlot: first.deliverySlot, orderIds: [...input.orderIds], routeLabel, status: 'ASSIGNED', driverName: 'Tài xế demo', driverPhone: '0900000099', vehiclePlate: 'DEMO-001', trackingLabel: 'Chuyến giao mô phỏng — chưa xuất phát' };
    state.shipments.push(shipment); return shipment;
  });
}
export async function advanceShipmentStatus(id: string, next: T.ShipmentStatus): Promise<T.Shipment> {
  return mutate('DATA_CHANGED', state => {
    const shipment = find(state.shipments, id);
    if (shipment.status === next) return shipment;
    if (!((shipment.status === 'ASSIGNED' && next === 'IN_TRANSIT') || (shipment.status === 'IN_TRANSIT' && next === 'DELIVERED'))) invalidTransition(id, shipment.status, next);
    const orders = shipment.orderIds.map(orderId => find(state.orders, orderId));
    const expected = next === 'IN_TRANSIT' ? 'AT_HUB' : 'DISPATCHED';
    for (const order of orders) if (order.status !== expected) invalidTransition(order.id, order.status, next);
    for (const order of orders) { order.status = next === 'IN_TRANSIT' ? 'DISPATCHED' : 'DELIVERED'; if (next === 'DELIVERED') order.deliveredAt = state.demoNow; }
    shipment.status = next;
    shipment.trackingLabel = next === 'IN_TRANSIT' ? 'Đang giao — hành trình mô phỏng, không GPS thật' : 'Đã giao — xác nhận mô phỏng';
    return shipment;
  });
}
