import { AccessibleDialog } from '../../components/shared/AccessibleDialog';
import { useState, useEffect } from 'react';
import { useDemoData } from '../../components/shared/useDemoData';
import { ErrorMessage, LoadingSpinner } from '../../components/shared/Feedback';
import { money } from '../../components/shared/useCatalog';
import { getHtxCommerce } from '../../services/htxService';
import { getSupplierWallet, purchaseBioFertilizerWithWallet, type SupplierWallet } from '../../services/walletService';
import type { HtxProduct } from '../../types/htx';
import * as api from '../../services/demoService';
import { LucideIcon } from '../../components/shared/LucideIcon';
import './seller-htx-market.css';

interface LocalFertilizerOrder {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  totalVnd: number;
  paymentMethod: 'WALLET' | 'COD';
  placedAt: string;
  status: 'PENDING' | 'DELIVERING' | 'DELIVERED';
}

const STORAGE_ORDERS_KEY = 'farmgo_supplier_fertilizer_orders';

export function SellerHtxProducts() {
  const { data, error } = useDemoData(getHtxCommerce);
  const session = useDemoData(api.getDemoSession);
  const supplierId = session.data?.activeSupplierId || 'SUP-001';

  const [wallet, setWallet] = useState<SupplierWallet>(() => getSupplierWallet(supplierId));
  const [selectedProduct, setSelectedProduct] = useState<HtxProduct | null>(null);
  const [orderQty, setOrderQty] = useState(5);
  const [paymentMethod, setPaymentMethod] = useState<'WALLET' | 'COD'>('WALLET');
  const [gardenAddress, setGardenAddress] = useState('Vườn Bưởi Da Xanh, Xã Hoài Ân, Tỉnh Bình Định');
  const [orders, setOrders] = useState<LocalFertilizerOrder[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_ORDERS_KEY}_${supplierId}`);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [
      {
        id: 'DH-PB-101',
        productId: 'HTX-HC',
        productName: 'Phân viên nén hữu cơ Quy Nhơn (25 kg)',
        quantity: 10,
        totalVnd: 1650000,
        paymentMethod: 'WALLET',
        placedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        status: 'DELIVERED',
      },
      {
        id: 'DH-PB-102',
        productId: 'HTX-VS',
        productName: 'Phân vi sinh ủ men bã cà phê (10 kg)',
        quantity: 5,
        totalVnd: 475000,
        paymentMethod: 'WALLET',
        placedAt: new Date(Date.now() - 86400000).toISOString(),
        status: 'DELIVERING',
      },
    ];
  });

  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setWallet(getSupplierWallet(supplierId));
    const handleUpdate = () => {
      setWallet(getSupplierWallet(supplierId));
    };
    window.addEventListener('farmgo-supplier-wallet-updated', handleUpdate);
    return () => window.removeEventListener('farmgo-supplier-wallet-updated', handleUpdate);
  }, [supplierId]);

  const saveOrders = (updated: LocalFertilizerOrder[]) => {
    setOrders(updated);
    try {
      localStorage.setItem(`${STORAGE_ORDERS_KEY}_${supplierId}`, JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const totalVnd = selectedProduct.priceVnd * orderQty;

    if (paymentMethod === 'WALLET') {
      const res = purchaseBioFertilizerWithWallet(supplierId, selectedProduct.name, orderQty, totalVnd);
      if (!res.success) {
        setNotice({ type: 'error', text: res.message });
        return;
      }
      setWallet(getSupplierWallet(supplierId));
    }

    const newOrder: LocalFertilizerOrder = {
      id: `DH-PB-${Math.floor(100 + Math.random() * 900)}`,
      productId: selectedProduct.id,
      productName: `${selectedProduct.name} (${selectedProduct.packaging})`,
      quantity: orderQty,
      totalVnd,
      paymentMethod,
      placedAt: new Date().toISOString(),
      status: 'PENDING',
    };

    saveOrders([newOrder, ...orders]);
    setSelectedProduct(null);
    setNotice({
      type: 'success',
      text: `Đã đặt mua thành công ${orderQty} bao/gói ${selectedProduct.name}! ${paymentMethod === 'WALLET' ? 'Đã khấu trừ trực tiếp ví FarmGoPay.' : 'Thanh toán COD khi nhận hàng.'}`,
    });
    setTimeout(() => setNotice(null), 6000);
  };

  const markDelivered = (orderId: string) => {
    const updated = orders.map((o) => (o.id === orderId ? { ...o, status: 'DELIVERED' as const } : o));
    saveOrders(updated);
    setNotice({ type: 'success', text: `Đã xác nhận nhận phân bón đơn #${orderId} tại vườn!` });
    setTimeout(() => setNotice(null), 4000);
  };

  const products = data?.products.filter((product) => product.active) ?? [];

  return (
    <section className="seller-htx-marketplace">
      <header className="page-heading">
        <div>
          <h1>Sàn Phân Bón Vi Sinh &amp; Chế Phẩm HTX (Kinh Tế Tuần Hoàn)</h1>
          <p>
            Phân hữu cơ đã ủ hoai mục từ phụ phẩm F&B thu gom từ hệ sinh thái FARMGO. Tái tạo dinh dưỡng đất với chi phí tiết kiệm.
          </p>
        </div>
      </header>

      {notice && (
        <div className={`market-alert ${notice.type === 'success' ? 'market-alert-success' : 'market-alert-error'}`} role="status">
          {notice.text}
        </div>
      )}

      {/* Box thông tin số dư ví & quyền lợi */}
      <div className="wallet-strip-card">
        <div className="wallet-strip-left">
          <span className="strip-icon"><LucideIcon name="creditCard" size={20} /></span>
          <div>
            <strong>Ví FarmGoPay Nhà Vườn:</strong> Số dư khả dụng hiện có{' '}
            <span className="strip-balance">{money(wallet.availableBalanceVnd)}</span>
          </div>
        </div>
        <div className="wallet-strip-right">
          <span className="strip-tag"><LucideIcon name="check" size={13} /> Miễn cước xe tải HTX chở về vườn</span>
          <span className="strip-tag"><LucideIcon name="check" size={13} /> Khấu trừ ví 1-chạm không mất phí rút</span>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}
      {!data && !error && <LoadingSpinner />}
      {data && !products.length && <p className="seller-panel">HTX hiện chưa có sản phẩm phân bón mở bán.</p>}

      {/* Danh mục sản phẩm phân bón */}
      <div className="fertilizer-cards-grid">
        {products.map((product) => (
          <article className="fertilizer-card" key={product.id}>
            <div className="fertilizer-badge">Chuẩn hữu cơ HTX</div>
            <div className="fertilizer-photo-box">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} loading="lazy" />
              ) : (
                <span className="fertilizer-category-chip">{product.category}</span>
              )}
            </div>

            <div className="fertilizer-body">
              <h3>{product.name}</h3>
              <p className="fertilizer-desc">{product.description}</p>
              
              <div className="fertilizer-meta-row">
                <span className="meta-packaging"><LucideIcon name="package" size={14} /> {product.packaging}</span>
                <span className="meta-stock">
                  {product.stock > 0 ? `Tồn kho: ${product.stock} bao/gói` : 'Tạm hết hàng'}
                </span>
              </div>

              <div className="fertilizer-footer">
                <div className="fertilizer-price">{money(product.priceVnd)}</div>
                <button
                  type="button"
                  className="btn-primary btn-buy-fertilizer"
                  disabled={product.stock <= 0}
                  onClick={() => {
                    setSelectedProduct(product);
                    setOrderQty(5);
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <LucideIcon name="sprout" size={15} /> Đặt mua cho vườn
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Lịch sử các đơn đặt phân bón của nhà vườn */}
      <div className="card orders-history-card">
        <div className="history-header">
          <h2>Đơn mua phân bón của nhà vườn</h2>
          <span className="txn-count">{orders.length} đơn hàng</span>
        </div>

        {orders.length === 0 ? (
          <div className="empty-panel">Nhà vườn chưa đặt mua phân bón từ HTX.</div>
        ) : (
          <div className="wallet-table-responsive">
            <table className="wallet-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Thời gian đặt</th>
                  <th>Sản phẩm</th>
                  <th>Số lượng</th>
                  <th>Tổng tiền</th>
                  <th>Hình thức thanh toán</th>
                  <th>Trạng thái giao</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td><code>{o.id}</code></td>
                    <td className="cell-time">{new Date(o.placedAt).toLocaleString('vi-VN')}</td>
                    <td><strong>{o.productName}</strong></td>
                    <td>{o.quantity} bao/gói</td>
                    <td><strong className="text-green">{money(o.totalVnd)}</strong></td>
                    <td>
                      {o.paymentMethod === 'WALLET' ? (
                        <span className="badge-wallet-pay" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <LucideIcon name="creditCard" size={13} /> Ví FarmGoPay
                        </span>
                      ) : (
                        <span className="badge-cod-pay" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <LucideIcon name="banknote" size={13} /> COD
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`status-pill status-${o.status.toLowerCase()}`}>
                        {o.status === 'PENDING' && 'Chờ HTX xếp xe'}
                        {o.status === 'DELIVERING' && 'Xe tải đang giao'}
                        {o.status === 'DELIVERED' && 'Đã nhận tại vườn'}
                      </span>
                    </td>
                    <td>
                      {o.status === 'DELIVERING' && (
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={() => markDelivered(o.id)}
                        >
                          Xác nhận đã nhận
                        </button>
                      )}
                      {o.status === 'DELIVERED' && <span className="text-muted">Hoàn tất</span>}
                      {o.status === 'PENDING' && <span className="text-muted">Đang chuẩn bị</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal đặt mua phân bón */}
      {selectedProduct && (
        <AccessibleDialog title="Đặt mua vật tư HTX" close={() => setSelectedProduct(null)}>
            <div className="wallet-modal-header">
              <h3>Đặt mua phân hữu cơ &amp; chế phẩm</h3>
              <button type="button" aria-label="Đóng hộp thoại" className="btn-close" onClick={() => setSelectedProduct(null)}>
                <LucideIcon name="x" size={16} />
              </button>
            </div>

            <form onSubmit={handlePlaceOrder} className="fertilizer-order-form">
              <div className="order-prod-summary">
                <strong>{selectedProduct.name}</strong>
                <span>Quy cách: {selectedProduct.packaging} • Đơn giá: {money(selectedProduct.priceVnd)}</span>
              </div>

              <div className="form-group">
                <label htmlFor="order-qty">Số lượng đặt mua:</label>
                <div className="qty-picker">
                  <button type="button" onClick={() => setOrderQty(Math.max(1, orderQty - 1))}>−</button>
                  <input
                    id="order-qty"
                    type="number"
                    min="1"
                    max={selectedProduct.stock}
                    value={orderQty}
                    onChange={(e) => setOrderQty(Math.max(1, Number(e.target.value)))}
                  />
                  <button type="button" onClick={() => setOrderQty(Math.min(selectedProduct.stock, orderQty + 1))}>+</button>
                  <span className="qty-unit">{selectedProduct.packaging}</span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="garden-addr">Địa chỉ vườn giao phân bón:</label>
                <input
                  id="garden-addr"
                  type="text"
                  value={gardenAddress}
                  onChange={(e) => setGardenAddress(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Phương thức thanh toán:</label>
                <div className="payment-options-col">
                  <label className={`payment-choice-card ${paymentMethod === 'WALLET' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="fert-payment"
                      checked={paymentMethod === 'WALLET'}
                      onChange={() => setPaymentMethod('WALLET')}
                    />
                    <div className="choice-info">
                      <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <LucideIcon name="creditCard" size={14} /> Khấu trừ Ví FarmGoPay Nhà Vườn (Khuyên dùng)
                      </strong>
                      <span>
                        Số dư khả dụng: <b className="text-green">{money(wallet.availableBalanceVnd)}</b> • Không mất phí rút
                      </span>
                    </div>
                  </label>

                  <label className={`payment-choice-card ${paymentMethod === 'COD' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="fert-payment"
                      checked={paymentMethod === 'COD'}
                      onChange={() => setPaymentMethod('COD')}
                    />
                    <div className="choice-info">
                      <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <LucideIcon name="banknote" size={14} /> Thanh toán tiền mặt (COD) khi nhận tại vườn
                      </strong>
                      <span>Tài xế xe tải HTX thu tiền khi giao hàng</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Tóm tắt thanh toán */}
              <div className="order-calc-box">
                <div className="calc-row">
                  <span>Tiền phân bón ({orderQty} x {money(selectedProduct.priceVnd)}):</span>
                  <strong>{money(orderQty * selectedProduct.priceVnd)}</strong>
                </div>
                <div className="calc-row">
                  <span>Cước xe tải HTX hỗ trợ thành viên:</span>
                  <strong className="text-green">0đ (Miễn phí)</strong>
                </div>
                <div className="calc-total-row">
                  <span>Tổng thanh toán:</span>
                  <span className="total-val">{money(orderQty * selectedProduct.priceVnd)}</span>
                </div>
              </div>

              <div className="wallet-modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setSelectedProduct(null)}>
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={paymentMethod === 'WALLET' && wallet.availableBalanceVnd < orderQty * selectedProduct.priceVnd}
                >
                  Xác nhận đặt mua
                </button>
              </div>
            </form>
        </AccessibleDialog>
      )}
    </section>
  );
}
