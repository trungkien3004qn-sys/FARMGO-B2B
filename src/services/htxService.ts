import { readState } from '../store/demoStore';
import { check, entity, photo } from './governanceService';
import { updateGreenCheckout } from './greenService';
import type { DemoState } from '../mocks/seed';
import type { HtxOrder, HtxProduct, HtxProductInput } from '../types/htx';

function commerce(state: DemoState) {
  const products: HtxProduct[] = [
    { id: 'HTX-HC', name: 'Phân viên nén hữu cơ Quy Nhơn', category: 'Phân bón hữu cơ', description: 'Phân viên từ nguyên liệu hữu cơ đã ủ', packaging: 'Bao 25 kg', priceVnd: 165000, stock: 140, active: true },
    { id: 'HTX-VS', name: 'Phân vi sinh ủ men bã cà phê', category: 'Chế phẩm vi sinh', description: 'Chế phẩm vi sinh từ bã cà phê', packaging: 'Bao 10 kg', priceVnd: 95000, stock: 85, active: true },
    { id: 'HTX-TR', name: 'Chế phẩm Trichoderma', category: 'Nấm đối kháng', description: 'Chế phẩm sinh học cho nhà vườn', packaging: 'Hộp 1 kg', priceVnd: 75000, stock: 42, active: true },
    { id: 'HTX-UM', name: 'Men ủ phụ phẩm hữu cơ', category: 'Chế phẩm vi sinh', description: 'Dùng ủ phụ phẩm nhà vườn.', packaging: 'Gói 500 g', priceVnd: 45000, stock: 20, active: false },
  ];
  const orders: HtxOrder[] = [
    { id: 'DH-8924', customer: 'Vườn Rau Hữu Cơ Tuy Phước', quantity: 10, productId: products[0].id, productName: products[0].name, priceVnd: products[0].priceVnd, placedAt: state.demoNow, status: 'PENDING' },
    { id: 'DH-8923', customer: 'HTX Bưởi Da Xanh Hoài Ân', quantity: 15, productId: products[2].id, productName: products[2].name, priceVnd: products[2].priceVnd, placedAt: state.demoNow, status: 'PENDING' },
    { id: 'DH-8920', customer: 'Nông Trại Dưa Lưới An Nhơn', quantity: 12, productId: products[1].id, productName: products[1].name, priceVnd: products[1].priceVnd, placedAt: state.demoNow, status: 'SHIPPING' },
    { id: 'DH-8915', customer: 'Nhà Vườn Hoa Kiểng Bình Định', quantity: 6, productId: products[0].id, productName: products[0].name, priceVnd: products[0].priceVnd, placedAt: state.demoNow, status: 'DELIVERED' },
    { id: 'DH-8914', customer: 'Vườn Rau Hữu Cơ Tuy Phước', quantity: 4, productId: products[3].id, productName: products[3].name, priceVnd: products[3].priceVnd, placedAt: state.demoNow, status: 'CANCELLED' },
  ];
  if (!state.htxCommerce) return { products, orders };
  const saved = state.htxCommerce;
  saved.products.push(...products.filter(row => !saved.products.some(existing => existing.id === row.id)));
  saved.orders.push(...orders.filter(row => !saved.orders.some(existing => existing.id === row.id)));
  return saved;
}

export async function getHtxCommerce() {
  const state = readState();
  return { ...commerce(state), now: state.demoNow };
}

export async function saveHtxProduct(input: HtxProductInput, id?: string) {
  return updateGreenCheckout(state => {
    const { products } = state.htxCommerce = commerce(state);
    check([input.name, input.category, input.packaging].every(value => value.trim()), 'Nhập tên, loại hàng và quy cách.');
    check(Number.isSafeInteger(input.priceVnd) && input.priceVnd > 0 && Number.isSafeInteger(input.stock) && input.stock >= 0, 'Giá và tồn kho phải là số nguyên hợp lệ.');
    if (input.imageUrl) photo(input.imageUrl);
    const values = { ...input, name: input.name.trim(), category: input.category.trim(), packaging: input.packaging.trim(), description: input.description.trim() };
    if (id) Object.assign(entity(products, id), values);
    else products.push({ ...values, id: `HTX-${state.nextId++}`, active: true });
  });
}

export async function setHtxProductActive(id: string, active: boolean) {
  return updateGreenCheckout(state => {
    const { products } = state.htxCommerce = commerce(state);
    entity(products, id).active = active;
  });
}

export async function advanceHtxOrder(id: string, status: 'SHIPPING' | 'CANCELLED' | 'DELIVERED') {
  return updateGreenCheckout(state => {
    const { orders, products } = state.htxCommerce = commerce(state);
    const order = entity(orders, id);
    if (order.status === status) return;
    check(order.status === 'PENDING' ? status !== 'DELIVERED' : order.status === 'SHIPPING' && status === 'DELIVERED', 'Đơn không hỗ trợ thao tác này.');
    if (status === 'SHIPPING') {
      const product = entity(products, order.productId);
      check(product.stock >= order.quantity, 'Sản phẩm không đủ tồn kho.');
      product.stock -= order.quantity;
    }
    order.status = status;
  });
}
