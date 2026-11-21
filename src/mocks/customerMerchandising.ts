import type { DemoState } from './seed';

export const productConditions: Readonly<Record<string, string>> = {
  'avocado-034': 'Bơ già chuẩn độ sáp, 2–3 ngày tới độ dẻo ngon nhất',
  'mango-cat-hoa-loc': 'Chín bói tự nhiên, thơm đậm đà, da vàng ươm',
  'orange-mekong': 'Trái mọng nước, vỏ mỏng, chuyên pha chế nước ép',
  'tomato-dalat': 'Cà chua dày cơm, đỏ mọng, ngọt thanh tự nhiên',
  'carrot-dalat': 'Củ tươi giòn, rửa sạch đất, bảo quản lạnh',
};

export const featuredProductIds = ['avocado-034', 'mango-cat-hoa-loc', 'orange-mekong', 'tomato-dalat', 'carrot-dalat'];

export function addCustomerProducts(_state: DemoState): void {
  // Chỉ dùng danh mục sản phẩm chuẩn thực tế từ seed / Database
}
