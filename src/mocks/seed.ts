import type {
  Commodity,
  Customer,
  DeliveryAddress,
  DemoSession,
  Order,
  ProductListing,
  Shipment,
  Supplier,
  SupplierConfirmation,
} from '../types/index';
import type { BusinessProfile, QualityReview, Claim } from '../types/index';
import type { EscrowAllocation, LedgerEntry, Withdrawal } from '../types/index';
import type { HarvestLot, HarvestRequest, Preorder } from '../types/preorder';

export interface DemoState {
  htxCommerce?: { products: import('../types/htx').HtxProduct[]; orders: import('../types/htx').HtxOrder[] };
  greenPickups?: import('../types/green').GreenPickup[];
  greenVouchers?: import('../types/green').GreenVoucher[];
  harvestLots?: HarvestLot[];
  preorders?: Preorder[];
  harvestRequests?: HarvestRequest[];
  version: 5;
  allocations: EscrowAllocation[];
  ledger: LedgerEntry[];
  withdrawals: Withdrawal[];
  operations: Record<string, { fingerprint: string; entityId: string }>;
  profiles: BusinessProfile[];
  qualityReviews: QualityReview[];
  claims: Claim[];
  demoNow: string;
  session: DemoSession;
  suppliers: Supplier[];
  customers: Customer[];
  addresses: DeliveryAddress[];
  products: ProductListing[];
  commodities: Commodity[];
  orders: Order[];
  confirmations: SupplierConfirmation[];
  shipments: Shipment[];
  nextId: number;
}

export const shippingFees: Readonly<Record<string, number>> = {
  'address-1': 30000,
  'address-2': 35000,
  'address-3': 30000,
};

export const commodities: Commodity[] = [
  { id: 'avocado-034', name: 'Bơ sáp 034', category: 'FRESH_FRUIT' },
  { id: 'mango-cat-hoa-loc', name: 'Xoài Cát Hòa Lộc', category: 'FRESH_FRUIT' },
  { id: 'orange', name: 'Cam sành', category: 'FRESH_FRUIT' },
  { id: 'tomato', name: 'Cà chua Beef', category: 'VEGETABLES' },
  { id: 'carrot', name: 'Cà rốt', category: 'VEGETABLES' },
];

export function addGovernance(state: DemoState): DemoState {
  return state;
}

export function createSeed(): DemoState {
  const demoNow = new Date().toISOString();
  const seed: DemoState = {
    version: 5,
    allocations: [],
    ledger: [],
    withdrawals: [],
    operations: {},
    profiles: [
      {
        id: 'customer-1',
        role: 'CUSTOMER',
        businessName: 'The Coffee House (Flagship Cao Thắng)',
        phone: '028.7108.2828',
        taxCode: 'MST-0312895678',
        contactName: 'Nguyễn Văn Minh',
        address: '86-88 Cao Thắng, Phường 4, Quận 3, TP.HCM',
        status: 'APPROVED',
        legacy: true,
      },
      {
        id: 'customer-2',
        role: 'CUSTOMER',
        businessName: 'Chuỗi Lẩu Haidilao Hotpot',
        phone: '028.3622.8888',
        taxCode: 'MST-0315891234',
        contactName: 'Trần Thị Mai',
        address: 'Tầng 3, Vincom Center, 72 Lê Thánh Tôn, Bến Nghé, Quận 1, TP.HCM',
        status: 'APPROVED',
        legacy: true,
      },
      {
        id: 'customer-3',
        role: 'CUSTOMER',
        businessName: 'Phúc Long Coffee & Tea',
        phone: '028.3822.8333',
        taxCode: 'MST-0302789123',
        contactName: 'Lê Hoàng Nam',
        address: '42 Ngô Đức Kế, Bến Nghé, Quận 1, TP.HCM',
        status: 'APPROVED',
        legacy: true,
      },
      {
        id: 'supplier-1',
        role: 'SUPPLIER',
        businessName: 'Nhà Vườn Chú Sáu',
        phone: '0918.234.567',
        taxCode: 'MST-5801456789',
        contactName: 'Chú Sáu (Nguyễn Văn Sáu)',
        address: 'Thôn Tân Hiệp, Xã Liên Hiệp, Huyện Đức Trọng, Lâm Đồng',
        capacityKg: 1500,
        status: 'APPROVED',
        legacy: true,
      },
      {
        id: 'supplier-2',
        role: 'SUPPLIER',
        businessName: 'HTX Trái Cây Cái Bè',
        phone: '0903.889.922',
        taxCode: 'MST-1201987654',
        contactName: 'Trần Văn Đức',
        address: 'Xã Hòa Hưng, Huyện Cái Bè, Tiền Giang',
        capacityKg: 2000,
        status: 'APPROVED',
        legacy: true,
      },
      {
        id: 'supplier-3',
        role: 'SUPPLIER',
        businessName: 'HTX Nông Sản Sạch Đà Lạt',
        phone: '0937.654.321',
        taxCode: 'MST-5802345678',
        contactName: 'Phạm Thị Lan',
        address: 'Thôn Đa Lộc, Xã Xuân Thọ, TP. Đà Lạt, Lâm Đồng',
        capacityKg: 2500,
        status: 'APPROVED',
        legacy: true,
      },
    ],
    qualityReviews: [
      { productId: 'avocado-034', supplierId: 'supplier-1', grade: 'A', yieldPercent: 95, status: 'APPROVED', revision: 1, submittedAt: demoNow, reviewedAt: demoNow },
      { productId: 'mango-cat-hoa-loc', supplierId: 'supplier-2', grade: 'A', yieldPercent: 92, status: 'APPROVED', revision: 1, submittedAt: demoNow, reviewedAt: demoNow },
      { productId: 'orange-mekong', supplierId: 'supplier-2', grade: 'A', yieldPercent: 90, status: 'APPROVED', revision: 1, submittedAt: demoNow, reviewedAt: demoNow },
      { productId: 'tomato-dalat', supplierId: 'supplier-3', grade: 'A', yieldPercent: 94, status: 'APPROVED', revision: 1, submittedAt: demoNow, reviewedAt: demoNow },
      { productId: 'carrot-dalat', supplierId: 'supplier-3', grade: 'A', yieldPercent: 96, status: 'APPROVED', revision: 1, submittedAt: demoNow, reviewedAt: demoNow },
    ],
    claims: [],
    demoNow,
    session: { role: 'CUSTOMER', activeSupplierId: 'supplier-1', activeCustomerId: 'customer-1' },
    suppliers: [
      {
        id: 'supplier-1',
        name: 'Nhà Vườn Chú Sáu',
        phone: '0918.234.567',
        gardenAddress: 'Thôn Tân Hiệp, Xã Liên Hiệp, Đức Trọng, Lâm Đồng',
        taxCode: 'MST-5801456789',
        regionLabel: 'Lâm Đồng',
      },
      {
        id: 'supplier-2',
        name: 'HTX Trái Cây Cái Bè',
        phone: '0903.889.922',
        gardenAddress: 'Xã Hòa Hưng, Huyện Cái Bè, Tiền Giang',
        taxCode: 'MST-1201987654',
        regionLabel: 'Tiền Giang',
      },
      {
        id: 'supplier-3',
        name: 'HTX Nông Sản Sạch Đà Lạt',
        phone: '0937.654.321',
        gardenAddress: 'Thôn Đa Lộc, Xã Xuân Thọ, TP. Đà Lạt, Lâm Đồng',
        taxCode: 'MST-5802345678',
        regionLabel: 'Lâm Đồng',
      },
    ],
    customers: [
      {
        id: 'customer-1',
        businessName: 'The Coffee House (Flagship Cao Thắng)',
        phone: '028.7108.2828',
        taxCode: 'MST-0312895678',
        deliveryAddressIds: ['address-1'],
      },
      {
        id: 'customer-2',
        businessName: 'Chuỗi Lẩu Haidilao Hotpot',
        phone: '028.3622.8888',
        taxCode: 'MST-0315891234',
        deliveryAddressIds: ['address-2'],
      },
      {
        id: 'customer-3',
        businessName: 'Phúc Long Coffee & Tea',
        phone: '028.3822.8333',
        taxCode: 'MST-0302789123',
        deliveryAddressIds: ['address-3'],
      },
    ],
    addresses: [
      {
        id: 'address-1',
        customerId: 'customer-1',
        label: 'The Coffee House - Flagship Cao Thắng',
        address: '86-88 Cao Thắng, Phường 4, Quận 3, TP.HCM',
        deliveryZone: 'Q3',
      },
      {
        id: 'address-2',
        customerId: 'customer-2',
        label: 'Haidilao Bếp Trung Tâm - Vincom Đồng Khởi',
        address: 'Tầng 3, Vincom Center, 72 Lê Thánh Tôn, Bến Nghé, Quận 1, TP.HCM',
        deliveryZone: 'Q1',
      },
      {
        id: 'address-3',
        customerId: 'customer-3',
        label: 'Phúc Long Coffee & Tea - Nguyễn Huệ',
        address: '42 Ngô Đức Kế, Bến Nghé, Quận 1, TP.HCM',
        deliveryZone: 'Q1',
      },
    ],
    // CHỈ ĐỂ ĐÚNG 5 NÔNG SẢN THỰC TẾ TRÊN SÀN
    products: [
      {
        id: 'avocado-034',
        commodityId: 'avocado-034',
        supplierId: 'supplier-1',
        name: 'Bơ sáp 034 Lâm Đồng (Cơm vàng dẻo sáp chuẩn F&B)',
        unit: 'kg',
        availableKg: 350,
        publicPricePerKg: 32000,
        uses: ['FRESH', 'SMOOTHIE'],
        originLabel: 'Đức Trọng, Lâm Đồng',
        packagingLabel: 'Thùng carton 10 kg',
        imageUrl: '/product-photos/avocado-034.webp',
        active: true,
      },
      {
        id: 'mango-cat-hoa-loc',
        commodityId: 'mango-cat-hoa-loc',
        supplierId: 'supplier-2',
        name: 'Xoài Cát Hòa Lộc Tiền Giang (OCOP 4 Sao Tuyển Chọn)',
        unit: 'kg',
        availableKg: 250,
        publicPricePerKg: 58000,
        uses: ['JUICE', 'SMOOTHIE', 'FRESH'],
        originLabel: 'Cái Bè, Tiền Giang',
        packagingLabel: 'Sọt thông minh 15 kg',
        imageUrl: '/product-photos/mango-cat-hoa-loc.webp',
        active: true,
      },
      {
        id: 'orange-mekong',
        commodityId: 'orange',
        supplierId: 'supplier-2',
        name: 'Cam Sành Vĩnh Long Mọng Nước (Chuyên Pha Chế Nước Ép)',
        unit: 'kg',
        availableKg: 400,
        publicPricePerKg: 22000,
        uses: ['JUICE', 'FRESH'],
        originLabel: 'Tam Bình, Vĩnh Long',
        packagingLabel: 'Sọt 25 kg',
        imageUrl: '/product-photos/orange.webp',
        active: true,
      },
      {
        id: 'tomato-dalat',
        commodityId: 'tomato',
        supplierId: 'supplier-3',
        name: 'Cà Chua Beef Đà Lạt (Dày cơm, mọng nước VietGAP)',
        unit: 'kg',
        availableKg: 300,
        publicPricePerKg: 26000,
        uses: ['JUICE', 'KITCHEN'],
        originLabel: 'Xuân Thọ, Đà Lạt',
        packagingLabel: 'Thùng 12 kg',
        imageUrl: '/product-photos/tomato.webp',
        active: true,
      },
      {
        id: 'carrot-dalat',
        commodityId: 'carrot',
        supplierId: 'supplier-3',
        name: 'Cà Rốt Rửa Sạch Đà Lạt (Củ tươi giòn ngọt tự nhiên)',
        unit: 'kg',
        availableKg: 500,
        publicPricePerKg: 18000,
        uses: ['JUICE', 'KITCHEN'],
        originLabel: 'Đơn Dương, Lâm Đồng',
        packagingLabel: 'Bao lưới 15 kg',
        imageUrl: '/product-photos/carrot.webp',
        active: true,
      },
    ],
    commodities: structuredClone(commodities),
    // HOÀN TOÀN TRỐNG ĐƠN HÀNG ĐỂ NGƯỜI DÙNG TỰ ĐẶT ĐƠN TEST TỪ ĐẦU
    orders: [],
    confirmations: [],
    shipments: [],
    greenPickups: [
      {
        id: 'FG-XANH-101',
        customerId: 'customer-1',
        types: ['Bã cà phê'],
        expectedKg: 25,
        actualKg: 25,
        appointment: '2026-11-20T08:30',
        address: '86-88 Cao Thắng, Phường 4, Quận 3, TP.HCM',
        status: 'COMPLETE',
        completedAt: demoNow,
        receivedAt: demoNow,
      },
      {
        id: 'FG-XANH-102',
        customerId: 'customer-1',
        types: ['Bã trái cây', 'Vỏ cam, chanh'],
        expectedKg: 15,
        appointment: '2026-11-21T09:00',
        address: '86-88 Cao Thắng, Phường 4, Quận 3, TP.HCM',
        status: 'WAITING',
      },
    ],
    greenVouchers: [
      {
        id: 'XANH-VOUCHER-50K',
        customerId: 'customer-1',
        valueVnd: 50000,
        requestKey: 'init-green-voucher-50k',
      },
    ],
    nextId: 105,
  };

  return seed;
}

export function addAdminShowcaseProducts(state: DemoState): DemoState {
  return state;
}

export function addAdminShowcaseProfiles(state: DemoState): DemoState {
  return state;
}

export function addAdminOperationsShowcase(state: DemoState): DemoState {
  return state;
}
