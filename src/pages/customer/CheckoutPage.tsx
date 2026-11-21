import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { getBuyerWallet, payWithBuyerWallet, saveBuyerWallet } from '../../services/walletService';
import type { CheckoutOptions, CheckoutQuote, DeliveryAddress, DeliverySlot } from '../../types';
import {
  getDeliveryAddresses,
  saveCustomDeliveryAddress,
  quoteCheckout,
  placeOrder,
  subscribeDemoData,
  getDemoClock,
  nextDeliveryDate,
} from '../../services/demoService';
import { useBuyerCart } from '../../components/shared/useBuyerCart';
import { useCatalog, money } from '../../components/shared/useCatalog';
import { FruitPhoto } from '../../components/shared/FruitPhoto';
import { getGreenAccount } from '../../services/greenService';
import { useDemoData } from '../../components/shared/useDemoData';
import { GreenDialog, VoucherTile } from './GreenVoucherDialog';
import { ErrorMessage, LoadingSpinner } from '../../components/shared/Feedback';
import { LucideIcon } from '../../components/shared/LucideIcon';

export function CheckoutPage() {
  const cart = useBuyerCart();
  const { products } = useCatalog();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isPayment = searchParams.get('step') === 'payment';
  const [checkoutOptions, setCheckoutOptions] = useState<CheckoutOptions>({
    orderMode: 'SINGLE',
    carrier: 'GHN',
    paymentMethod: 'FARMGOPAY',
    insurance: true,
  });
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const deliverySlot: DeliverySlot = 'MORNING';

  const green = useDemoData(getGreenAccount);
  const vouchers =
    green.data?.customerId === cart.customerId
      ? green.data?.vouchers.filter(row => !row.usedOrderId) ?? []
      : [];
  const [voucherSelection, setVoucherSelection] = useState<{ customerId: string; id: string }>();
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [voucherDraft, setVoucherDraft] = useState('');
  const greenVoucherId =
    voucherSelection?.customerId === cart.customerId ? voucherSelection?.id : undefined;

  useEffect(() => {
    let live = true;
    const load = async () => {
      const value = nextDeliveryDate(await getDemoClock());
      if (live && value) setDeliveryDate(value);
    };
    void load();
    const off = subscribeDemoData(() => {
      void load();
    });
    return () => {
      live = false;
      off();
    };
  }, []);

  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [addressId, setAddressId] = useState('');
  const [addressMode, setAddressMode] = useState<'saved' | 'custom'>('saved');
  const [manualAddress, setManualAddress] = useState({
    label: '',
    address: '',
    phone: '',
  });

  const handleCustomAddressChange = async (field: 'label' | 'address' | 'phone', val: string) => {
    const next = { ...manualAddress, [field]: val };
    setManualAddress(next);
    if (next.address.trim().length >= 3) {
      try {
        const saved = await saveCustomDeliveryAddress({
          customerId: cart.customerId || 'customer-1',
          label: next.label.trim() || 'Địa chỉ nhập tay',
          address: next.address.trim(),
        });
        setAddresses(prev => [saved, ...prev.filter(a => a.id !== saved.id)]);
        setAddressId(saved.id);
      } catch (err) {
        console.error(err);
      }
    }
  };
  const [quoteState, setQuoteState] = useState<{
    key: string;
    value?: CheckoutQuote;
    error?: string;
  }>({ key: '' });
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => subscribeDemoData(() => setRevision(value => value + 1)), []);

  useEffect(() => {
    let disposed = false;
    if (cart.customerId) {
      getDeliveryAddresses(cart.customerId)
        .then(data => {
          if (!disposed) {
            setAddresses(data);
            setAddressId(prev => prev || data[0]?.id || '');
            setError(undefined);
          }
        })
        .catch(err => {
          if (!disposed) setError(err instanceof Error ? err.message : 'Không tải được địa chỉ.');
        });
    }
    return () => {
      disposed = true;
    };
  }, [cart.customerId]);

  const key = JSON.stringify([
    cart.customerId,
    cart.items,
    addressId,
    deliveryDate,
    deliverySlot,
    checkoutOptions,
    greenVoucherId,
    revision,
    cart.ready,
  ]);

  useEffect(() => {
    let disposed = false;
    if (cart.ready && cart.items.length && addressId && deliveryDate) {
      quoteCheckout({
        customerId: cart.customerId,
        deliveryAddressId: addressId,
        items: cart.items,
        deliveryDate,
        deliverySlot,
        checkoutOptions,
        greenVoucherId,
      })
        .then(value => {
          if (!disposed) setQuoteState({ key, value });
        })
        .catch(err => {
          if (!disposed)
            setQuoteState({ key, error: err instanceof Error ? err.message : 'Không tính được giá.' });
        });
    }
    return () => {
      disposed = true;
    };
  }, [key, cart.ready, cart.items, cart.customerId, addressId, deliveryDate, deliverySlot, checkoutOptions, greenVoucherId]);

  const quote = quoteState.key === key ? quoteState.value : undefined;
  const requestError = quoteState.key === key ? quoteState.error : undefined;

  const place = async () => {
    if (!isPayment || !quote || submitting || !cart.ready) return;
    setSubmitting(true);
    setError(undefined);
    try {
      const fingerprint = JSON.stringify([
        cart.customerId,
        addressId,
        cart.items,
        deliveryDate,
        deliverySlot,
        checkoutOptions,
        greenVoucherId,
      ]);
      const storageKey = `farmgo-checkout-attempt-${cart.customerId}`;
      const previous = JSON.parse(localStorage.getItem(storageKey) || 'null') as {
        fingerprint: string;
        requestKey: string;
      } | null;
      const attempt =
        previous?.fingerprint === fingerprint
          ? previous
          : { fingerprint, requestKey: crypto.randomUUID() };
      localStorage.setItem(storageKey, JSON.stringify(attempt));

      if (checkoutOptions.paymentMethod === 'FARMGOPAY') {
        const payRes = payWithBuyerWallet(cart.customerId, attempt.requestKey, quote.totalVnd);
        if (!payRes.success) {
          setError(payRes.message || 'Thanh toán qua Ví FarmGoPay thất bại.');
          setSubmitting(false);
          return;
        }
      }

      const order = await placeOrder({
        requestKey: attempt.requestKey,
        customerId: cart.customerId,
        deliveryAddressId: addressId,
        items: cart.items,
        deliveryDate,
        deliverySlot,
        checkoutOptions,
        greenVoucherId,
      });

      try {
        const bw = getBuyerWallet(cart.customerId);
        const txn = bw.transactions.find(t => t.orderId === attempt.requestKey);
        if (txn) {
          txn.orderId = order.id;
          txn.description = `Thanh toán 1-chạm đơn hàng FARMGO #${order.id} (Đã giữ ký quỹ Escrow)`;
          saveBuyerWallet(bw);
        }
      } catch {}

      const cleared = cart.clear();
      if (cleared) {
        try {
          localStorage.removeItem(storageKey);
        } catch {
          /* Keep key for idempotency */
        }
      }
      navigate(`/customer/orders/${order.id}`, { state: { placedTotal: order.totalVnd } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tạo được đơn.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!cart.ready) return cart.error ? <ErrorMessage message={cart.error} /> : <LoadingSpinner />;
  if (!cart.items.length) {
    return (
      <div className="taste-empty-state">
        <div className="empty-icon-wrap" aria-hidden="true">
          <LucideIcon name="shoppingCart" size={32} color="#94a3b8" />
        </div>
        <h1>Giỏ hàng nguyên liệu đang trống</h1>
        <p>Chọn các mặt hàng nông sản sỉ từ hợp tác xã để lên đơn cung ứng cho nhà hàng.</p>
        <Link className="btn-taste-reset" to="/customer/catalog">
          ← Đến Chợ Nông Sản Sỉ
        </Link>
      </div>
    );
  }

  return (
    <div className="taste-checkout-page"><div className="page-heading"><div><h1>{isPayment ? 'Thanh toán đơn hàng' : 'Kiểm tra giỏ hàng'}</h1><p>Kiểm tra nguyên liệu, địa chỉ nhận và phương thức thanh toán.</p></div></div>
      {/* Checkout Progress Stepper */}
      <div className="taste-checkout-stepper">
        <div className={`step-item ${!isPayment ? 'is-active' : 'is-completed'}`}>
          <span className="step-num">{isPayment ? <LucideIcon name="check" size={12} strokeWidth={3} /> : '1'}</span>
          <span className="step-label">Kiểm tra giỏ hàng &amp; Địa chỉ</span>
        </div>
        <div className="step-connector"></div>
        <div className={`step-item ${isPayment ? 'is-active' : ''}`}>
          <span className="step-num">2</span>
          <span className="step-label">Phương thức thanh toán &amp; Ký quỹ Escrow</span>
        </div>
      </div>

      {(error || cart.error || requestError) && (
        <ErrorMessage message={error || cart.error || requestError!} />
      )}

      <div className="taste-checkout-layout">
        {/* Left Column: Form Details & Items */}
        <div className="taste-checkout-main">
          {/* Step 1 Content: Cart Lines */}
          <section className="taste-checkout-card">
            <div className="checkout-card-header">
              <h2 style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <LucideIcon name="package" size={20} /> Danh sách nông sản đặt mua ({cart.items.length})
              </h2>
              <Link to="/customer/catalog" className="header-secondary-link">+ Thêm mặt hàng</Link>
            </div>

            <div className="cart-lines-list">
              <AnimatePresence mode="popLayout" initial={false}>
                {cart.items.map(item => {
                  const product = products.find(value => value.id === item.productId);
                  const price = quote?.items.find(value => value.productId === item.productId);
                  return (
                    <motion.div
                      className="taste-cart-row"
                      key={item.productId}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{
                        opacity: 0,
                        scale: 0.85,
                        transition: { duration: 0.22, ease: 'easeOut' },
                      }}
                      transition={{
                        layout: { type: 'spring', damping: 25, stiffness: 350 },
                        opacity: { duration: 0.2 },
                      }}
                    >
                      <div className="taste-cart-photo">
                        <FruitPhoto
                          id={product?.commodityId || item.productId}
                          name={product?.name || price?.productName || 'Sản phẩm'}
                          imageUrl={product?.imageUrl}
                        />
                      </div>
                      <div className="taste-cart-info">
                        <strong className="cart-item-name">
                          {product?.name || price?.productName || 'Nông sản B2B'}
                        </strong>
                        <span className="cart-item-supplier">
                          <LucideIcon name="building" size={14} /> {product?.supplier.name || price?.supplierName || 'Nhà cung cấp FARMGO'}
                        </span>
                        <span className="cart-item-unit-price">
                          Đơn giá: {price ? `${money(price.unitPriceVnd)}/kg` : product ? `${money(product.publicPricePerKg)}/kg` : '—'}
                        </span>
                      </div>

                      <div className="taste-cart-stepper-wrap">
                        <div className="qty-stepper-box">
                          <button
                            type="button"
                            className="qty-btn"
                            disabled={submitting || item.quantityKg <= 1}
                            onClick={() => cart.quantity(item.productId, Math.max(1, item.quantityKg - 5))}
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={item.quantityKg}
                            disabled={submitting}
                            onChange={e => cart.quantity(item.productId, Number(e.target.value))}
                            aria-label={`Số kg ${product?.name || item.productId}`}
                          />
                          <span className="qty-suffix">kg</span>
                          <button
                            type="button"
                            className="qty-btn"
                            disabled={submitting}
                            onClick={() => cart.quantity(item.productId, item.quantityKg + 5)}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="taste-cart-subtotal">
                        <strong className="line-total-num">
                          {price ? money(price.lineTotalVnd) : '—'}
                        </strong>
                      </div>

                      <button
                        type="button"
                        className="taste-cart-remove-btn"
                        disabled={submitting}
                        onClick={() => cart.remove(item.productId)}
                        title="Xóa khỏi đơn"
                      >
                        <LucideIcon name="trash" size={15} />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </section>

          {/* Delivery Address Section */}
          <section className="taste-checkout-card">
            <div className="checkout-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <h2><LucideIcon name="mapPin" size={18} /> Địa chỉ giao nhận &amp; Cơ sở nhận hàng</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setAddressMode('saved')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '8px',
                    border: addressMode === 'saved' ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
                    background: addressMode === 'saved' ? '#f0fdf4' : '#fff',
                    color: addressMode === 'saved' ? '#15803d' : '#64748b',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  📍 Địa chỉ có sẵn
                </button>
                <button
                  type="button"
                  onClick={() => setAddressMode('custom')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '8px',
                    border: addressMode === 'custom' ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
                    background: addressMode === 'custom' ? '#f0fdf4' : '#fff',
                    color: addressMode === 'custom' ? '#15803d' : '#64748b',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ✍️ Nhập tay địa chỉ mới
                </button>
              </div>
            </div>

            {addressMode === 'saved' ? (
              <div className="address-cards-grid">
                {addresses.map(address => (
                  <label
                    key={address.id}
                    className={`taste-address-card ${addressId === address.id ? 'is-selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={addressId === address.id}
                      onChange={() => setAddressId(address.id)}
                      disabled={submitting}
                    />
                    <div className="address-card-body">
                      <div className="address-label-row">
                        <strong className="address-label-title">{address.label}</strong>
                        {addressId === address.id && <span className="default-pill">Đang chọn</span>}
                      </div>
                      <p className="address-text">{address.address}</p>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '12px', border: '1.5px dashed #cbd5e1' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Tên quán / Cơ sở F&amp;B *
                    </label>
                    <input
                      value={manualAddress.label}
                      onChange={e => handleCustomAddressChange('label', e.target.value)}
                      placeholder="Ví dụ: The Coffee House - Chi nhánh Hai Bà Trưng"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Số điện thoại nhận hàng
                    </label>
                    <input
                      value={manualAddress.phone}
                      onChange={e => handleCustomAddressChange('phone', e.target.value)}
                      placeholder="Ví dụ: 0901234567"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Địa chỉ chi tiết nhận hàng (Số nhà, đường, phường, quận, TP) *
                  </label>
                  <input
                    value={manualAddress.address}
                    onChange={e => handleCustomAddressChange('address', e.target.value)}
                    placeholder="Ví dụ: 123 Hai Bà Trưng, Phường Bến Nghé, Quận 1, TP.HCM"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                  <small style={{ color: '#16a34a', display: 'block', marginTop: '6px', fontWeight: 500 }}>
                    💡 Địa chỉ nhập tay sẽ được tự động áp dụng trực tiếp cho đơn hàng này.
                  </small>
                </div>
              </div>
            )}
          </section>

          {/* Step 2 Content: Shipping Mode, Payment & Insurance */}
          {isPayment && (
            <>
              {/* Order Mode (Single vs Group) */}
              <section className="taste-checkout-card">
                <div className="checkout-card-header">
                  <h2><LucideIcon name="truck" size={18} /> Hình thức gom chuyến &amp; Vận chuyển</h2>
                </div>
                <div className="options-cards-grid">
                  <label
                    className={`taste-option-card ${checkoutOptions.orderMode === 'SINGLE' ? 'is-selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="order-mode"
                      disabled={submitting}
                      checked={checkoutOptions.orderMode === 'SINGLE'}
                      onChange={() => setCheckoutOptions({ ...checkoutOptions, orderMode: 'SINGLE' })}
                    />
                    <div className="option-body">
                      <strong><LucideIcon name="package" size={16} /> Đơn hàng riêng lẻ (Giao ngay)</strong>
                      <p>Giao trực tiếp từ vùng trồng đến quán từ 05:00 - 07:00 sáng mai.</p>
                    </div>
                  </label>

                  <label
                    className={`taste-option-card ${checkoutOptions.orderMode === 'GROUP' ? 'is-selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="order-mode"
                      disabled={submitting}
                      checked={checkoutOptions.orderMode === 'GROUP'}
                      onChange={() => setCheckoutOptions({ ...checkoutOptions, orderMode: 'GROUP' })}
                    />
                    <div className="option-body">
                      <strong><LucideIcon name="truck" size={16} /> Gom đơn nhóm khu vực (Tiết kiệm cước)</strong>
                      <p>Ghép chuyến cùng các quán lân cận trong bán kính 2km (Cước cố định 20.000đ).</p>
                    </div>
                  </label>
                </div>
              </section>

              {/* Payment Method Selector - ONLY ESCROW */}
              <section className="taste-checkout-card">
                <div className="checkout-card-header">
                  <h2><LucideIcon name="creditCard" size={18} /> Phương thức thanh toán Ký quỹ B2B</h2>
                </div>
                <div className="payment-options-list">
                  <div
                    className="taste-payment-tile is-selected"
                    style={{
                      border: '2px solid #16a34a',
                      background: '#f0fdf4',
                      padding: '18px',
                      borderRadius: '12px',
                    }}
                  >
                    <div className="payment-tile-content">
                      <div className="tile-title-row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="payment-icon" aria-hidden="true" style={{ fontSize: '1.4rem' }}>🛡️</span>
                        <strong style={{ fontSize: '1.05rem', color: '#15803d' }}>
                          Ký Quỹ FARMGO Escrow (Bảo chứng an toàn 100%)
                        </strong>
                        <span className="recommended-badge" style={{ background: '#16a34a', color: '#fff', marginLeft: 'auto' }}>
                          Bắt buộc
                        </span>
                      </div>
                      <p className="payment-tile-desc" style={{ color: '#166534', marginTop: '6px', lineHeight: '1.5' }}>
                        Hệ thống chỉ chấp nhận phương thức thanh toán ký quỹ: Tiền thanh toán được phong tỏa tại tài khoản trung gian ký quỹ bảo đảm. Chỉ khi quán F&amp;B nhận hàng và kiểm tra đạt chuẩn QC, hệ thống mới tiến hành giải ngân cho nhà vườn.
                      </p>
                    </div>
                  </div>
                </div>

                {/* FarmGoPay Balance Info box */}
                {checkoutOptions.paymentMethod === 'FARMGOPAY' && (() => {
                  const w = getBuyerWallet(cart.customerId);
                  const hasEnough = !quote || w.balanceVnd >= quote.totalVnd;
                  return (
                    <div className="farmgopay-balance-banner">
                      <div className="balance-info-row">
                        <span>Số dư Ví FarmGoPay hiện có:</span>
                        <strong className="balance-number">{money(w.balanceVnd)}</strong>
                        {hasEnough ? (
                          <span className="balance-status-badge is-ok"><LucideIcon name="checkCircle" size={14} /> Đủ số dư thanh toán</span>
                        ) : (
                          <span className="balance-status-badge is-low"><LucideIcon name="alertTriangle" size={14} /> Số dư chưa đủ</span>
                        )}
                      </div>
                      <p className="escrow-reassurance">
                        <LucideIcon name="shieldCheck" size={15} /> Tiền thanh toán được giữ an toàn tại tài khoản Escrow của FARMGO và tự động hoàn trả 100% nếu lô hàng không đúng cam kết.
                      </p>
                      {!hasEnough && (
                        <Link to="/customer/wallet" className="topup-link-btn">
                          + Nạp thêm tiền vào Ví FarmGoPay ngay →
                        </Link>
                      )}
                    </div>
                  );
                })()}
              </section>

              {/* Insurance Checkbox */}
              <section className="taste-checkout-card insurance-card">
                <label className="insurance-toggle-label">
                  <input
                    type="checkbox"
                    disabled={submitting}
                    checked={checkoutOptions.insurance}
                    onChange={e => setCheckoutOptions({ ...checkoutOptions, insurance: e.target.checked })}
                  />
                  <div className="insurance-copy">
                    <strong><LucideIcon name="shieldCheck" size={16} /> Bảo hiểm rủi ro nông sản &amp; Hư hỏng dập nát (0,5%)</strong>
                    <p>Được đổi trả hoặc đền bù 100% giá trị trong 24h đối với hàng dập, hỏng hoặc lỗi bảo quản.</p>
                  </div>
                </label>
              </section>
            </>
          )}
        </div>

        {/* Right Rail: Sticky Order Summary Card */}
        <aside className="taste-checkout-sidebar">
          <div className="taste-summary-card">
            <h2>Tóm tắt đơn hàng</h2>

            <div className="summary-delivery-meta">
              <div className="meta-row">
                <span>Ngày nhận hàng:</span>
                <strong>{deliveryDate ? deliveryDate.split('-').reverse().join('/') : '—'}</strong>
              </div>
              <div className="meta-row">
                <span>Khung giờ giao:</span>
                <strong>05:00 – 07:00 sáng</strong>
              </div>
            </div>

            <div className="summary-breakdown">
              {quote ? (
                <>
                  <div className="breakdown-row">
                    <span>Tổng tiền hàng ({cart.items.length} món)</span>
                    <strong className="num-val">{money(quote.subtotalVnd)}</strong>
                  </div>
                  <div className="breakdown-row">
                    <span>Cước vận chuyển</span>
                    <strong className="num-val">{money(quote.shippingFeeVnd)}</strong>
                  </div>
                  <div className="breakdown-row">
                    <span>Bảo hiểm nông sản (0,5%)</span>
                    <strong className="num-val">{money(quote.insuranceFeeVnd || 0)}</strong>
                  </div>
                  {quote.shippingDiscountVnd !== undefined && (
                    <div className="breakdown-row green-discount-row">
                      <span>Voucher FARMGO Xanh</span>
                      <strong className="num-val">−{money(quote.shippingDiscountVnd)}</strong>
                    </div>
                  )}
                </>
              ) : (
                !requestError && <LoadingSpinner text="Đang tính cước & ưu đãi..." />
              )}
            </div>

            {/* Green Voucher Selector */}
            <div className="summary-voucher-section">
              <span className="voucher-title"><LucideIcon name="leaf" size={16} /> Mã giảm giá FARMGO Xanh:</span>
              <div className="voucher-actions-row">
                <button
                  type="button"
                  className="btn-select-voucher"
                  disabled={!quote || submitting}
                  onClick={() => {
                    setVoucherDraft(greenVoucherId ?? '');
                    setVoucherOpen(true);
                  }}
                >
                  {greenVoucherId ? <><LucideIcon name="check" size={13} /> {greenVoucherId}</> : 'Chọn voucher xanh...'}
                </button>
                {greenVoucherId && (
                  <button
                    type="button"
                    className="btn-clear-voucher"
                    disabled={submitting}
                    onClick={() => setVoucherSelection(undefined)}
                  >
                    Bỏ
                  </button>
                )}
              </div>
            </div>

            {/* Total Row */}
            {quote && (
              <div className="summary-total-row">
                <span className="total-label">Tổng thanh toán</span>
                <div className="total-price-wrap">
                  <span className="total-num">{money(quote.totalVnd)}</span>
                  <small className="vat-hint">(Đã gồm thuế &amp; phí)</small>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="summary-cta-group">
              {isPayment ? (
                <>
                  <button
                    type="button"
                    className="btn-taste-place-order"
                    disabled={submitting || !quote}
                    onClick={place}
                  >
                    {submitting ? 'Đang tạo đơn & ký quỹ...' : (!quote ? 'Đang tính toán cước & giá...' : <><LucideIcon name="shieldCheck" size={16} /> Xác nhận đặt hàng & Ký quỹ</>)}
                  </button>
                  <button
                    type="button"
                    className="btn-taste-back"
                    disabled={submitting}
                    onClick={() => setSearchParams({})}
                  >
                    ← Quay lại kiểm tra đơn hàng
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn-taste-proceed"
                  disabled={submitting || !cart.items.length}
                  onClick={() => {
                    setSearchParams({ step: 'payment' });
                    window.scrollTo(0, 0);
                  }}
                >
                  Tiến hành thanh toán →
                </button>
              )}
            </div>

            <p className="summary-disclaimer">
              Thanh toán &amp; Quỹ ký quỹ Escrow được bảo chứng bởi hệ thống sàn nông sản FARMGO B2B.
            </p>
          </div>
        </aside>
      </div>

      {/* Green Voucher Dialog */}
      {voucherOpen && (
        <GreenDialog title="Chọn Voucher Vận Chuyển FARMGO Xanh" close={() => setVoucherOpen(false)}>
          {green.error && <ErrorMessage message={green.error} />}
          {!green.data && !green.error && <LoadingSpinner />}
          {green.data && !vouchers.length && (
            <div className="voucher-dialog-empty">
              <p>Bạn chưa có voucher đổi từ bã hữu cơ. Hãy tham gia chương trình thu gom bã để tích điểm!</p>
              <Link to="/customer/green" className="btn-taste-reset">
                Tìm hiểu FARMGO Xanh →
              </Link>
            </div>
          )}
          {vouchers.map(row => (
            <VoucherTile
              key={row.id}
              value={row.valueVnd}
              action={
                <input
                  type="radio"
                  name="green-voucher"
                  aria-label={`Chọn voucher ${row.id}`}
                  checked={voucherDraft === row.id}
                  onChange={() => setVoucherDraft(row.id)}
                />
              }
            >
              {row.id} · Giảm {money(Math.min(row.valueVnd, quote?.shippingFeeVnd ?? 0))} cước giao hàng
            </VoucherTile>
          ))}
          {Boolean(vouchers.length) && (
            <div className="green-picker-actions">
              <button
                className="btn-taste-add"
                type="button"
                disabled={!vouchers.some(row => row.id === voucherDraft)}
                onClick={() => {
                  setVoucherSelection({ customerId: cart.customerId, id: voucherDraft });
                  setVoucherOpen(false);
                }}
              >
                Áp dụng voucher này
              </button>
            </div>
          )}
        </GreenDialog>
      )}
    </div>
  );
}
