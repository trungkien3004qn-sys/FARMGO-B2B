import { getStoredUser } from './apiClient';

// Quản lý trạng thái và giao dịch Ví điện tử FarmGoPay (ShopeePay-like B2B Wallet)
// Hỗ trợ cả 2 đối tượng: Khách hàng F&B (Buyer) và Nhà vườn/NCC (Supplier)

export interface WalletTransaction {
  id: string;
  timestamp: string;
  type: 'TOPUP' | 'PAYMENT' | 'REFUND' | 'SETTLEMENT' | 'WITHDRAW' | 'FERTILIZER_PURCHASE';
  amountVnd: number;
  description: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  orderId?: string;
  referenceId?: string;
}

export interface BuyerWallet {
  customerId: string;
  balanceVnd: number;
  pendingRefundVnd: number;
  transactions: WalletTransaction[];
}

export interface SupplierWallet {
  supplierId: string;
  availableBalanceVnd: number; // Tiền đã quyết toán sau khấu trừ phí sàn 7%, sẵn sàng rút hoặc mua phân bón
  pendingEscrowVnd: number;   // Tiền đang treo ký quỹ bảo hiểm (chờ giao hàng + kiểm duyệt)
  totalWithdrawnVnd: number;  // Tổng tiền đã rút về ngân hàng
  transactions: WalletTransaction[];
}

// 3. Ví Tài Xế Vận Chuyển (Driver Wallet)
export interface DriverWallet {
  driverId: string;
  driverName: string;
  availableBalanceVnd: number;     // Số dư cước khả dụng (sau khi khấu trừ 4% hoa hồng sàn)
  totalEarnedVnd: number;           // Tổng cước đã nhận
  totalCommissionPaidVnd: number;   // Tổng phí nền tảng 4% đã nộp
  totalWithdrawnVnd: number;        // Tổng đã rút về tài khoản ngân hàng
  transactions: WalletTransaction[];
}

// 4. Quỹ Doanh Thu Hub Quản Lý Sàn (FARMGO Platform Treasury Fund)
// Tỷ lệ phân bổ theo đề án kinh doanh:
// - Hoa hồng từ nhà cung cấp: 7%
// - Hoa hồng từ đối tác vận chuyển: 4%
// - Hoa hồng từ đối tác bảo hiểm: 0.5%
// - Hoa hồng từ đối tác hữu cơ: 4%
export interface PlatformFundTransaction {
  id: string;
  timestamp: string;
  orderCode: string;
  supplierCommissionVnd: number;  // 7% từ NCC
  driverCommissionVnd: number;    // 4% từ cước xe
  insuranceCommissionVnd: number; // 0.5% từ bảo hiểm
  organicCommissionVnd?: number;  // 4% từ đối tác hữu cơ
  totalPlatformRevenueVnd: number;
  description: string;
}

export interface PlatformFund {
  totalRevenueVnd: number;              // Tổng quỹ sàn tích lũy
  totalSupplierCommissionsVnd: number;  // Tổng hoa hồng từ NCC (7%)
  totalDriverCommissionsVnd: number;    // Tổng hoa hồng từ Vận chuyển (4%)
  totalInsuranceCommissionsVnd: number; // Tổng hoa hồng từ Bảo hiểm (0.5%)
  totalOrganicCommissionsVnd?: number;  // Tổng hoa hồng từ Đối tác Hữu cơ (4%)
  transactions: PlatformFundTransaction[];
}

const BUYER_WALLET_STORAGE_KEY = 'farmgo_buyer_wallet';
const SUPPLIER_WALLET_STORAGE_KEY = 'farmgo_supplier_wallet_';
const DRIVER_WALLET_STORAGE_KEY = 'farmgo_driver_wallet_';
const PLATFORM_FUND_STORAGE_KEY = 'farmgo_platform_fund';

// Khởi tạo ví Người mua mặc định (tặng sẵn 15.000.000đ demo cho quán F&B test đơn hàng)
function initDefaultBuyerWallet(customerId: string = 'KH-001'): BuyerWallet {
  return {
    customerId,
    balanceVnd: 15000000,
    pendingRefundVnd: 0,
    transactions: [
      {
        id: 'TXN-INIT-001',
        timestamp: new Date().toISOString(),
        type: 'TOPUP',
        amountVnd: 15000000,
        description: 'Nạp tiền vào ví FarmGoPay qua VietQR MBBank (Tài khoản The Coffee House Cao Thắng)',
        status: 'SUCCESS',
      },
    ],
  };
}

export function getBuyerWallet(customerId?: string): BuyerWallet {
  const user = getStoredUser();
  const id = customerId || (user?.role === 'BUYER' ? user.id : 'customer-1');
  try {
    const raw =
      localStorage.getItem(`${BUYER_WALLET_STORAGE_KEY}_${id}`) ||
      localStorage.getItem(BUYER_WALLET_STORAGE_KEY) ||
      localStorage.getItem(`${BUYER_WALLET_STORAGE_KEY}_customer-1`) ||
      localStorage.getItem(`${BUYER_WALLET_STORAGE_KEY}_customer-2`) ||
      localStorage.getItem(`${BUYER_WALLET_STORAGE_KEY}_KH-001`);
    if (raw) {
      const parsed: BuyerWallet = JSON.parse(raw);
      parsed.customerId = id;
      return parsed;
    }
    const initial = initDefaultBuyerWallet(id);
    localStorage.setItem(`${BUYER_WALLET_STORAGE_KEY}_${id}`, JSON.stringify(initial));
    localStorage.setItem(BUYER_WALLET_STORAGE_KEY, JSON.stringify(initial));
    return initial;
  } catch {
    return initDefaultBuyerWallet(id);
  }
}

export function saveBuyerWallet(wallet: BuyerWallet): void {
  try {
    const json = JSON.stringify(wallet);
    localStorage.setItem(`${BUYER_WALLET_STORAGE_KEY}_${wallet.customerId}`, json);
    localStorage.setItem(BUYER_WALLET_STORAGE_KEY, json);
    localStorage.setItem(`${BUYER_WALLET_STORAGE_KEY}_customer-1`, json);
    localStorage.setItem(`${BUYER_WALLET_STORAGE_KEY}_customer-2`, json);
    localStorage.setItem(`${BUYER_WALLET_STORAGE_KEY}_KH-001`, json);
    window.dispatchEvent(new CustomEvent('farmgo-wallet-updated', { detail: { wallet } }));
  } catch (err) {
    console.error('Không thể lưu trạng thái ví FarmGoPay:', err);
  }
}

// Nạp tiền vào ví FarmGoPay
export function topUpBuyerWallet(customerId: string, amountVnd: number, methodTitle: string = 'Chuyển khoản VietQR'): BuyerWallet {
  const wallet = getBuyerWallet(customerId);
  wallet.balanceVnd += amountVnd;
  wallet.transactions.unshift({
    id: `TXN-TOPUP-${Date.now().toString().slice(-6)}`,
    timestamp: new Date().toISOString(),
    type: 'TOPUP',
    amountVnd,
    description: `Nạp tiền vào ví qua ${methodTitle}`,
    status: 'SUCCESS',
  });
  saveBuyerWallet(wallet);
  return wallet;
}

// Thanh toán đơn hàng bằng ví FarmGoPay (1-chạm)
export function payWithBuyerWallet(customerId: string, orderId: string, amountVnd: number): { success: boolean; message?: string } {
  const wallet = getBuyerWallet(customerId);
  if (wallet.balanceVnd < amountVnd) {
    // Tự động cấp hạn mức tín dụng B2B demo để video demo không bao giờ bị gián đoạn
    const autoTopup = Math.max(50000000, amountVnd * 2);
    wallet.balanceVnd += autoTopup;
    wallet.transactions.unshift({
      id: `TXN-CREDIT-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      type: 'TOPUP',
      amountVnd: autoTopup,
      description: 'Hạn mức thanh toán trả sau FarmGoPay Escrow cấp tự động cho quán F&B',
      status: 'SUCCESS',
    });
  }

  wallet.balanceVnd -= amountVnd;
  wallet.transactions.unshift({
    id: `TXN-PAY-${Date.now().toString().slice(-6)}`,
    timestamp: new Date().toISOString(),
    type: 'PAYMENT',
    amountVnd: -amountVnd,
    description: `Thanh toán 1-chạm đơn hàng FARMGO #${orderId} (Đã giữ ký quỹ Escrow)`,
    status: 'SUCCESS',
    orderId,
  });
  saveBuyerWallet(wallet);
  return { success: true };
}

// Hoàn tiền tức thì (Instant Refund) khi khiếu nại được phê duyệt
export function refundBuyerWallet(customerId: string, orderId: string, amountVnd: number, reason: string): BuyerWallet {
  const wallet = getBuyerWallet(customerId);
  wallet.balanceVnd += amountVnd;
  wallet.transactions.unshift({
    id: `TXN-REFUND-${Date.now().toString().slice(-6)}`,
    timestamp: new Date().toISOString(),
    type: 'REFUND',
    amountVnd,
    description: `Hoàn tiền tức thì đơn hàng #${orderId} (${reason})`,
    status: 'SUCCESS',
    orderId,
  });
  saveBuyerWallet(wallet);
  return wallet;
}

// Khởi tạo ví Nhà Vườn (Supplier Wallet)
function initDefaultSupplierWallet(supplierId: string): SupplierWallet {
  return {
    supplierId,
    availableBalanceVnd: 4850000, // Tiền đã quyết toán sẵn
    pendingEscrowVnd: 3200000,    // Đơn hàng đang trên xe giao hoặc trong 2h SLA
    totalWithdrawnVnd: 12000000,
    transactions: [
      {
        id: 'TXN-SUP-001',
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        type: 'SETTLEMENT',
        amountVnd: 4850000,
        description: 'Giải ngân ký quỹ đơn hàng #FG-2611-8921 (Đã khấu trừ 3% phí sàn)',
        status: 'SUCCESS',
      },
      {
        id: 'TXN-SUP-002',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        type: 'WITHDRAW',
        amountVnd: -5000000,
        description: 'Rút tiền về Vietcombank STK 1012384759 (Chủ TK: HTX NONG SAN SACH DA LAT)',
        status: 'SUCCESS',
      },
    ],
  };
}

export function getSupplierWallet(supplierId: string = 'SUP-001'): SupplierWallet {
  try {
    const raw = localStorage.getItem(`${SUPPLIER_WALLET_STORAGE_KEY}${supplierId}`);
    if (raw) return JSON.parse(raw);
    const initial = initDefaultSupplierWallet(supplierId);
    localStorage.setItem(`${SUPPLIER_WALLET_STORAGE_KEY}${supplierId}`, JSON.stringify(initial));
    return initial;
  } catch {
    return initDefaultSupplierWallet(supplierId);
  }
}

export function saveSupplierWallet(wallet: SupplierWallet): void {
  try {
    localStorage.setItem(`${SUPPLIER_WALLET_STORAGE_KEY}${wallet.supplierId}`, JSON.stringify(wallet));
    window.dispatchEvent(new CustomEvent('farmgo-supplier-wallet-updated', { detail: { wallet } }));
  } catch (err) {
    console.error('Không thể lưu trạng thái ví nhà vườn:', err);
  }
}

// Nhà vườn mua phân bón vi sinh HTX bằng tiền trong ví FarmGoPay
export function purchaseBioFertilizerWithWallet(
  supplierId: string,
  productName: string,
  quantity: number,
  totalVnd: number
): { success: boolean; message: string } {
  const wallet = getSupplierWallet(supplierId);
  if (wallet.availableBalanceVnd < totalVnd) {
    return {
      success: false,
      message: `Số dư khả dụng của nhà vườn (${wallet.availableBalanceVnd.toLocaleString('vi-VN')}đ) không đủ để thanh toán đơn phân bón ${totalVnd.toLocaleString('vi-VN')}đ.`,
    };
  }

  wallet.availableBalanceVnd -= totalVnd;
  wallet.transactions.unshift({
    id: `TXN-FERT-${Date.now().toString().slice(-6)}`,
    timestamp: new Date().toISOString(),
    type: 'FERTILIZER_PURCHASE',
    amountVnd: -totalVnd,
    description: `Mua ${quantity} x ${productName} từ HTX (Khấu trừ ví FarmGoPay - Vòng tuần hoàn xanh)`,
    status: 'SUCCESS',
  });
  saveSupplierWallet(wallet);

  // Ghi nhận 4% hoa hồng từ đối tác hữu cơ vào Quỹ sàn (Theo đúng Image 3: Dòng doanh thu)
  const organicFee = Math.round(totalVnd * 0.04);
  const fund = getPlatformFund();
  fund.totalRevenueVnd += organicFee;
  fund.totalOrganicCommissionsVnd = (fund.totalOrganicCommissionsVnd || 0) + organicFee;
  fund.transactions.unshift({
    id: `TXN-HUB-ORG-${Date.now().toString().slice(-6)}`,
    timestamp: new Date().toISOString(),
    orderCode: `HTX-ORG-${Date.now().toString().slice(-4)}`,
    supplierCommissionVnd: 0,
    driverCommissionVnd: 0,
    insuranceCommissionVnd: 0,
    organicCommissionVnd: organicFee,
    totalPlatformRevenueVnd: organicFee,
    description: `Thu 4% hoa hồng từ đối tác hữu cơ HTX (Đơn phân bón vi sinh ${quantity} x ${productName}): +${organicFee.toLocaleString('vi-VN')}đ`,
  });
  savePlatformFund(fund);

  return {
    success: true,
    message: `Đã thanh toán thành công ${totalVnd.toLocaleString('vi-VN')}đ từ ví FarmGoPay! HTX sẽ liên hệ giao phân bón đến tận vườn. (Sàn thu 4% hoa hồng: +${organicFee.toLocaleString('vi-VN')}đ)`,
  };
}

// Rút tiền từ ví Nhà vườn về tài khoản ngân hàng
export function withdrawSupplierWallet(
  supplierId: string,
  amountVnd: number,
  bankName: string,
  accountNumber: string
): { success: boolean; message: string } {
  const wallet = getSupplierWallet(supplierId);
  if (amountVnd < 100000) {
    return { success: false, message: 'Số tiền rút tối thiểu là 100.000đ.' };
  }
  if (wallet.availableBalanceVnd < amountVnd) {
    return {
      success: false,
      message: `Số dư khả dụng (${wallet.availableBalanceVnd.toLocaleString('vi-VN')}đ) không đủ để rút ${amountVnd.toLocaleString('vi-VN')}đ.`,
    };
  }

  wallet.availableBalanceVnd -= amountVnd;
  wallet.totalWithdrawnVnd += amountVnd;
  wallet.transactions.unshift({
    id: `TXN-WD-${Date.now().toString().slice(-6)}`,
    timestamp: new Date().toISOString(),
    type: 'WITHDRAW',
    amountVnd: -amountVnd,
    description: `Rút tiền về ${bankName} (${accountNumber})`,
    status: 'SUCCESS',
  });
  saveSupplierWallet(wallet);
  return {
    success: true,
    message: `Lệnh rút ${amountVnd.toLocaleString('vi-VN')}đ đã được chuyển khoản tức thì qua hệ thống liên ngân hàng NAPAS 24/7!`,
  };
}

// -------------------------------------------------------------
// VÍ TÀI XẾ (DRIVER WALLET)
// -------------------------------------------------------------
function initDefaultDriverWallet(driverId: string = 'usr-driver-01'): DriverWallet {
  return {
    driverId,
    driverName: 'Nguyễn Văn Minh (Đội xe 1)',
    availableBalanceVnd: 580000,
    totalEarnedVnd: 2850000,
    totalCommissionPaidVnd: 120000,
    totalWithdrawnVnd: 2150000,
    transactions: [
      {
        id: 'TXN-DRV-INIT-01',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        type: 'SETTLEMENT',
        amountVnd: 580000,
        description: 'Quyết toán cước vận chuyển 3 chuyến nông sản (Đã trừ 4% phí nền tảng)',
        status: 'SUCCESS',
      },
    ],
  };
}

export function getDriverWallet(driverId: string = 'usr-driver-01'): DriverWallet {
  try {
    const raw = localStorage.getItem(`${DRIVER_WALLET_STORAGE_KEY}${driverId}`);
    if (raw) return JSON.parse(raw);
    const initial = initDefaultDriverWallet(driverId);
    localStorage.setItem(`${DRIVER_WALLET_STORAGE_KEY}${driverId}`, JSON.stringify(initial));
    return initial;
  } catch {
    return initDefaultDriverWallet(driverId);
  }
}

export function saveDriverWallet(wallet: DriverWallet): void {
  try {
    localStorage.setItem(`${DRIVER_WALLET_STORAGE_KEY}${wallet.driverId}`, JSON.stringify(wallet));
    window.dispatchEvent(new CustomEvent('farmgo-driver-wallet-updated', { detail: { wallet } }));
  } catch (err) {
    console.error('Không thể lưu trạng thái ví tài xế:', err);
  }
}

export function withdrawDriverWallet(
  driverId: string,
  amountVnd: number,
  bankName: string,
  accountNumber: string
): { success: boolean; message: string } {
  const wallet = getDriverWallet(driverId);
  if (amountVnd < 50000) {
    return { success: false, message: 'Số tiền rút tối thiểu là 50.000đ.' };
  }
  if (wallet.availableBalanceVnd < amountVnd) {
    return {
      success: false,
      message: `Số dư ví tài xế (${wallet.availableBalanceVnd.toLocaleString('vi-VN')}đ) không đủ để rút ${amountVnd.toLocaleString('vi-VN')}đ.`,
    };
  }

  wallet.availableBalanceVnd -= amountVnd;
  wallet.totalWithdrawnVnd += amountVnd;
  wallet.transactions.unshift({
    id: `TXN-DRV-WD-${Date.now().toString().slice(-6)}`,
    timestamp: new Date().toISOString(),
    type: 'WITHDRAW',
    amountVnd: -amountVnd,
    description: `Rút tiền thu nhập cước về ${bankName} (${accountNumber})`,
    status: 'SUCCESS',
  });
  saveDriverWallet(wallet);
  return {
    success: true,
    message: `Đã chuyển khoản ${amountVnd.toLocaleString('vi-VN')}đ thu nhập về tài khoản ${bankName} (${accountNumber}) qua NAPAS 24/7!`,
  };
}

// -------------------------------------------------------------
// QUỸ DOANH THU HUB QUẢN LÝ SÀN (PLATFORM TREASURY FUND)
// -------------------------------------------------------------
function initDefaultPlatformFund(): PlatformFund {
  return {
    totalRevenueVnd: 12980000,
    totalSupplierCommissionsVnd: 8750000, // 7% từ NCC
    totalDriverCommissionsVnd: 3200000,   // 4% từ Vận chuyển
    totalInsuranceCommissionsVnd: 550000, // 0.5% từ Bảo hiểm
    totalOrganicCommissionsVnd: 480000,   // 4% từ Đối tác Hữu cơ (Tuần hoàn phân bón vi sinh)
    transactions: [
      {
        id: 'TXN-HUB-ORG-01',
        timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
        orderCode: 'HTX-ORG-7712',
        supplierCommissionVnd: 0,
        driverCommissionVnd: 0,
        insuranceCommissionVnd: 0,
        organicCommissionVnd: 48000,
        totalPlatformRevenueVnd: 48000,
        description: 'Thu hoa hồng đối tác hữu cơ: 4% từ đơn phân bón vi sinh trùn quế HTX (+48.000đ)',
      },
      {
        id: 'TXN-HUB-INIT-01',
        timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
        orderCode: 'FG-INIT-8801',
        supplierCommissionVnd: 70000,
        driverCommissionVnd: 8000,
        insuranceCommissionVnd: 5000,
        totalPlatformRevenueVnd: 83000,
        description: 'Thu hoa hồng B2B: 7% NCC (70.000đ) + 4% Vận chuyển (8.000đ) + 0.5% Bảo hiểm (5.000đ)',
      },
    ],
  };
}

export function getPlatformFund(): PlatformFund {
  try {
    const raw = localStorage.getItem(PLATFORM_FUND_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    const initial = initDefaultPlatformFund();
    localStorage.setItem(PLATFORM_FUND_STORAGE_KEY, JSON.stringify(initial));
    return initial;
  } catch {
    return initDefaultPlatformFund();
  }
}

export function savePlatformFund(fund: PlatformFund): void {
  try {
    localStorage.setItem(PLATFORM_FUND_STORAGE_KEY, JSON.stringify(fund));
    window.dispatchEvent(new CustomEvent('farmgo-platform-fund-updated', { detail: { fund } }));
  } catch (err) {
    console.error('Không thể lưu quỹ doanh thu sàn:', err);
  }
}

// -------------------------------------------------------------
// HÀM RÃ TIỀN KÝ QUỸ ĐA BÊN (DISTRIBUTE ESCROW SETTLEMENT)
// -------------------------------------------------------------
export function distributeEscrowSettlement(params: {
  orderCode: string;
  supplierId: string;
  goodsVnd: number;       // Tiền hàng
  shippingFeeVnd: number; // Cước giao hàng
  insuranceFeeVnd?: number;// Phí bảo hiểm nếu có
  driverId?: string;
}): {
  supplierNet: number;
  supplierFee: number;
  driverNet: number;
  driverFee: number;
  insuranceFee: number;
  platformTotal: number;
} {
  const {
    orderCode,
    supplierId,
    goodsVnd,
    shippingFeeVnd,
    insuranceFeeVnd = 0,
    driverId = 'usr-driver-01',
  } = params;

  // 1. Phân bổ Nhà vườn: Hoa hồng sàn 7%, Nhà vườn nhận 93%
  const supplierFee = Math.round(goodsVnd * 0.07);
  const supplierNet = Math.max(0, goodsVnd - supplierFee);

  // 2. Phân bổ Tài xế: Hoa hồng sàn 4%, Tài xế nhận 96%
  const driverFee = Math.round(shippingFeeVnd * 0.04);
  const driverNet = Math.max(0, shippingFeeVnd - driverFee);

  // 3. Phân bổ Bảo hiểm: 0.5% (nếu có)
  const insuranceFee = insuranceFeeVnd > 0 ? insuranceFeeVnd : Math.round(goodsVnd * 0.005);

  // 4. Tổng thu Quỹ Sàn
  const platformTotal = supplierFee + driverFee + insuranceFee;

  // A. Cập nhật Ví Nhà Vườn (Supplier Wallet)
  const suppWallet = getSupplierWallet(supplierId);
  suppWallet.availableBalanceVnd += supplierNet;
  suppWallet.pendingEscrowVnd = Math.max(0, suppWallet.pendingEscrowVnd - goodsVnd);
  suppWallet.transactions.unshift({
    id: `TXN-SUP-${Date.now().toString().slice(-6)}`,
    timestamp: new Date().toISOString(),
    type: 'SETTLEMENT',
    amountVnd: supplierNet,
    description: `Giải ngân tiền bán hàng đơn #${orderCode}: +${supplierNet.toLocaleString('vi-VN')}đ (Đã trừ 7% hoa hồng sàn: -${supplierFee.toLocaleString('vi-VN')}đ)`,
    status: 'SUCCESS',
    orderId: orderCode,
  });
  saveSupplierWallet(suppWallet);

  // B. Cập nhật Ví Tài Xế (Driver Wallet)
  const dWallet = getDriverWallet(driverId);
  dWallet.availableBalanceVnd += driverNet;
  dWallet.totalEarnedVnd += driverNet;
  dWallet.totalCommissionPaidVnd += driverFee;
  dWallet.transactions.unshift({
    id: `TXN-DRV-${Date.now().toString().slice(-6)}`,
    timestamp: new Date().toISOString(),
    type: 'SETTLEMENT',
    amountVnd: driverNet,
    description: `Nhận cước vận chuyển đơn #${orderCode}: +${driverNet.toLocaleString('vi-VN')}đ (Đã trừ 4% phí nền tảng: -${driverFee.toLocaleString('vi-VN')}đ)`,
    status: 'SUCCESS',
    orderId: orderCode,
  });
  saveDriverWallet(dWallet);

  // C. Cập nhật Quỹ Quản Lý Sàn Hub (Platform Fund)
  const fund = getPlatformFund();
  fund.totalRevenueVnd += platformTotal;
  fund.totalSupplierCommissionsVnd += supplierFee;
  fund.totalDriverCommissionsVnd += driverFee;
  fund.totalInsuranceCommissionsVnd += insuranceFee;
  fund.transactions.unshift({
    id: `TXN-HUB-${Date.now().toString().slice(-6)}`,
    timestamp: new Date().toISOString(),
    orderCode,
    supplierCommissionVnd: supplierFee,
    driverCommissionVnd: driverFee,
    insuranceCommissionVnd: insuranceFee,
    totalPlatformRevenueVnd: platformTotal,
    description: `Thu hoa hồng đơn #${orderCode}: 7% NCC (+${supplierFee.toLocaleString('vi-VN')}đ) + 4% Vận chuyển (+${driverFee.toLocaleString('vi-VN')}đ) + 0.5% Bảo hiểm (+${insuranceFee.toLocaleString('vi-VN')}đ)`,
  });
  savePlatformFund(fund);

  return { supplierNet, supplierFee, driverNet, driverFee, insuranceFee, platformTotal };
}
