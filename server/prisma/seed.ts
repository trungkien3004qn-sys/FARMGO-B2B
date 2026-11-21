import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Bắt đầu thiết lập cơ sở dữ liệu thực tế cho FARMGO B2B Enterprise...');

  // 1. Xóa toàn bộ đơn hàng và giao dịch cũ theo yêu cầu: "Hủy tất cả order để test từ đầu"
  await prisma.bioFertilizerOrder.deleteMany();
  await prisma.bioFertilizerProduct.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.shipmentOrder.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.greenVoucher.deleteMany();
  await prisma.greenPickup.deleteMany();
  await prisma.withdrawal.deleteMany();
  await prisma.claim.deleteMany();
  await prisma.escrowAllocation.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Đã xóa sạch toàn bộ đơn hàng và lịch sử cũ (Order count = 0).');

  const passwordHash = bcrypt.hashSync('123456', 10);

  // 2. Tạo các tài khoản người dùng: ADMIN, DRIVER, BUYERS, và các NHÀ VƯỜN thực tế gắn với nông sản
  const admin = await prisma.user.create({
    data: {
      id: 'usr-admin-01',
      email: 'admin@farmgo.vn',
      passwordHash,
      name: 'Ban Điều Hành Kho Hub Trung Tâm',
      role: 'ADMIN',
      companyName: 'FARMGO HQ Logistics & Điều Phối',
      phone: '0909000999',
      address: 'Kho Hub Trung Tâm, KCN Tân Bình, TP.HCM',
    },
  });

  const driver = await prisma.user.create({
    data: {
      id: 'usr-driver-01',
      email: 'driver@farmgo.vn',
      passwordHash,
      name: 'Tài xế Nguyễn Văn Minh (Đội xe 1)',
      role: 'DRIVER',
      phone: '0908246888',
      address: 'Đội xe tải lạnh 1.5 tấn - Kho Hub Tân Bình',
    },
  });

  // Nhà vườn 1: Nhà Vườn Chú Sáu (Đức Trọng, Lâm Đồng)
  const supplier1 = await prisma.user.create({
    data: {
      id: 'supplier-1',
      email: 'nhavuonchusau@farmgo.vn',
      passwordHash,
      name: 'Nhà Vườn Chú Sáu',
      role: 'SUPPLIER',
      companyName: 'Nông Trại Bơ & Nông Sản Chú Sáu',
      phone: '0918234567',
      address: 'Thôn Tân Hiệp, Xã Liên Hiệp, Đức Trọng, Lâm Đồng',
    },
  });

  // Nhà vườn 2: HTX Trái Cây Cái Bè (Tiền Giang)
  const supplier2 = await prisma.user.create({
    data: {
      id: 'supplier-2',
      email: 'htxcaibe@farmgo.vn',
      passwordHash,
      name: 'HTX Trái Cây Cái Bè',
      role: 'SUPPLIER',
      companyName: 'Hợp Tác Xã Trái Cây Xuất Khẩu Cái Bè',
      phone: '0903889922',
      address: 'Xã Hòa Hưng, Huyện Cái Bè, Tiền Giang',
    },
  });

  // Nhà vườn 3: HTX Nông Sản Sạch Đà Lạt (Xuân Thọ, Đà Lạt)
  const supplier3 = await prisma.user.create({
    data: {
      id: 'supplier-3',
      email: 'htxdalat@farmgo.vn',
      passwordHash,
      name: 'HTX Nông Sản Sạch Đà Lạt',
      role: 'SUPPLIER',
      companyName: 'Hợp Tác Xã Nông Sản Sạch Đà Lạt',
      phone: '0937654321',
      address: 'Thôn Đa Lộc, Xã Xuân Thọ, TP. Đà Lạt, Lâm Đồng',
    },
  });

  // Khách hàng F&B
  const buyer1 = await prisma.user.create({
    data: {
      id: 'customer-1',
      email: 'buyer1@farmgo.vn',
      passwordHash,
      name: 'The Coffee House (Flagship Cao Thắng)',
      role: 'BUYER',
      companyName: 'Công ty CP Seedcom F&B (The Coffee House)',
      phone: '02871082828',
      address: '86-88 Cao Thắng, Phường 4, Quận 3, TP.HCM',
    },
  });

  const buyer2 = await prisma.user.create({
    data: {
      id: 'customer-2',
      email: 'buyer2@farmgo.vn',
      passwordHash,
      name: 'Chuỗi Lẩu Haidilao Hotpot',
      role: 'BUYER',
      companyName: 'Công ty TNHH Haidilao Việt Nam',
      phone: '02836228888',
      address: 'Tầng 3, Vincom Center, 72 Lê Thánh Tôn, Bến Nghé, Quận 1, TP.HCM',
    },
  });

  const buyer3 = await prisma.user.create({
    data: {
      id: 'customer-3',
      email: 'buyer3@farmgo.vn',
      passwordHash,
      name: 'Phúc Long Coffee & Tea',
      role: 'BUYER',
      companyName: 'Công ty CP Phúc Long Heritage',
      phone: '02838228333',
      address: '42 Ngô Đức Kế, Bến Nghé, Quận 1, TP.HCM',
    },
  });

  // Nhà Sản Xuất Phân Bón Vi Sinh & Thu Mua Bã Hữu Cơ (Đối tác hữu cơ)
  const fertilizerProducer = await prisma.user.create({
    data: {
      id: 'usr-fertilizer-01',
      email: 'phanbon@farmgo.vn',
      passwordHash,
      name: 'Nhà Máy Phân Bón Vi Sinh FARMGO Bio',
      role: 'FERTILIZER',
      companyName: 'HTX Chế Biến Bã Hữu Cơ & Phân Bón Sinh Học',
      phone: '0988776655',
      address: 'Khu Nông Nghiệp Công Nghệ Cao, Củ Chi, TP.HCM',
    },
  });

  console.log('✅ Đã tạo các tài khoản người dùng thực tế (Nhà vườn Chú Sáu, HTX Cái Bè, HTX Đà Lạt, F&B Buyers, Nhà SX Phân bón FARMGO Bio)');

  // 3. CHỈ GIỮ 5 NÔNG SẢN THỰC TẾ, CHUẨN NGUỒN GỐC F&B
  const realProducts = [
    // 1. Sản phẩm của Nhà vườn Chú Sáu
    {
      id: 'avocado-034',
      supplierId: supplier1.id,
      name: 'Bơ sáp 034 Lâm Đồng (Cơm vàng dẻo sáp chuẩn F&B)',
      category: 'TRAI_CAY',
      unit: 'kg',
      priceVnd: 32000,
      stockKg: 350,
      origin: 'Đức Trọng, Lâm Đồng',
      storageTemp: '10-15°C',
      shelfLifeDays: 5,
      imageUrl: '/product-photos/avocado-034.webp',
      isActive: true,
    },

    // 2 & 3. Sản phẩm của HTX Trái Cây Cái Bè
    {
      id: 'mango-cat-hoa-loc',
      supplierId: supplier2.id,
      name: 'Xoài Cát Hòa Lộc Tiền Giang (OCOP 4 Sao Tuyển Chọn)',
      category: 'TRAI_CAY',
      unit: 'kg',
      priceVnd: 58000,
      stockKg: 250,
      origin: 'Cái Bè, Tiền Giang',
      storageTemp: '12-15°C',
      shelfLifeDays: 4,
      imageUrl: '/product-photos/mango-cat-hoa-loc.webp',
      isActive: true,
    },
    {
      id: 'orange-mekong',
      supplierId: supplier2.id,
      name: 'Cam Sành Vĩnh Long Mọng Nước (Chuyên Pha Chế Nước Ép)',
      category: 'TRAI_CAY',
      unit: 'kg',
      priceVnd: 22000,
      stockKg: 400,
      origin: 'Tam Bình, Vĩnh Long',
      storageTemp: '10-12°C',
      shelfLifeDays: 10,
      imageUrl: '/product-photos/orange.webp',
      isActive: true,
    },

    // 4 & 5. Sản phẩm của HTX Nông Sản Sạch Đà Lạt
    {
      id: 'tomato-dalat',
      supplierId: supplier3.id,
      name: 'Cà Chua Beef Đà Lạt (Dày cơm, mọng nước VietGAP)',
      category: 'RAU_CU',
      unit: 'kg',
      priceVnd: 26000,
      stockKg: 300,
      origin: 'Xuân Thọ, Đà Lạt',
      storageTemp: '8-12°C',
      shelfLifeDays: 6,
      imageUrl: '/product-photos/tomato.webp',
      isActive: true,
    },
    {
      id: 'carrot-dalat',
      supplierId: supplier3.id,
      name: 'Cà Rốt Rửa Sạch Đà Lạt (Củ tươi giòn ngọt tự nhiên)',
      category: 'RAU_CU',
      unit: 'kg',
      priceVnd: 18000,
      stockKg: 500,
      origin: 'Đơn Dương, Lâm Đồng',
      storageTemp: '4-8°C',
      shelfLifeDays: 14,
      imageUrl: '/product-photos/carrot.webp',
      isActive: true,
    },
  ];

  for (const p of realProducts) {
    await prisma.product.create({ data: p });
  }

  console.log(`✅ Đã nạp chính xác ${realProducts.length} nông sản chuẩn vào Database.`);

  // 4. Khởi tạo số dư ví ban đầu cho các bên
  await prisma.wallet.create({
    data: {
      userId: buyer1.id,
      availableBalanceVnd: 25000000,
      pendingEscrowVnd: 0,
      transactions: {
        create: [
          {
            type: 'TOPUP',
            amountVnd: 25000000,
            description: 'Nạp quỹ thanh toán B2B vào tài khoản Escrow (The Coffee House)',
            status: 'SUCCESS',
          },
        ],
      },
    },
  });

  await prisma.wallet.create({
    data: {
      userId: buyer2.id,
      availableBalanceVnd: 50000000,
      pendingEscrowVnd: 0,
    },
  });

  await prisma.wallet.create({
    data: {
      userId: supplier1.id,
      availableBalanceVnd: 0,
      pendingEscrowVnd: 0,
    },
  });

  await prisma.wallet.create({
    data: {
      userId: supplier2.id,
      availableBalanceVnd: 0,
      pendingEscrowVnd: 0,
    },
  });

  await prisma.wallet.create({
    data: {
      userId: supplier3.id,
      availableBalanceVnd: 0,
      pendingEscrowVnd: 0,
    },
  });

  console.log('✅ Đã nạp ví FarmGoPay / Ký Quỹ Escrow sẵn sàng.');
  console.log('🎉 Database hoàn toàn trống đơn hàng. Sẵn sàng cho người dùng test đặt đơn mới!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
