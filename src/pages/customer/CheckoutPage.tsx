import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { CheckoutOptions, CheckoutQuote, DeliveryAddress, DeliverySlot } from '../../types';
import { getDeliveryAddresses, quoteCheckout, placeOrder, subscribeDemoData, getDemoClock, nextDeliveryDate } from '../../services/demoService';
import { useBuyerCart } from '../../components/shared/useBuyerCart';
import { useCatalog, money } from '../../components/shared/useCatalog';
import { FruitPhoto } from '../../components/shared/FruitPhoto';
import { getGreenAccount } from '../../services/greenService';
import { useDemoData } from '../../components/shared/useDemoData';
import { GreenDialog, VoucherTile } from './GreenVoucherDialog';
import { ErrorMessage, LoadingSpinner } from '../../components/shared/Feedback';

export function CheckoutPage() {
  const cart = useBuyerCart();
  const { products } = useCatalog();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isPayment = searchParams.get('step') === 'payment';
  const [checkoutOptions, setCheckoutOptions] = useState<CheckoutOptions>({orderMode:'SINGLE', carrier:'GHN', paymentMethod:'BANK', insurance:true});
  const [deliveryDate, setDeliveryDate] = useState('');
  const deliverySlot: DeliverySlot = 'MORNING';

  const green = useDemoData(getGreenAccount);
  const vouchers = green.data?.customerId === cart.customerId ? green.data?.vouchers.filter(row => !row.usedOrderId) ?? [] : [];
  const [voucherSelection, setVoucherSelection] = useState<{ customerId: string; id: string }>();
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [voucherDraft, setVoucherDraft] = useState('');
  const greenVoucherId = voucherSelection?.customerId === cart.customerId ? voucherSelection?.id : undefined;

  useEffect(() => {
    let live = true;
    const load = async () => {
      const value = nextDeliveryDate(await getDemoClock());
      if (live) setDeliveryDate(value);
    };
    void load();
    const off = subscribeDemoData(() => { void load(); });
    return () => { live = false; off(); };
  }, []);

  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [addressId, setAddressId] = useState('');
  const [quoteState, setQuoteState] = useState<{key: string; value?: CheckoutQuote; error?: string}>({key: ''});
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => subscribeDemoData(() => setRevision(value => value + 1)), []);
  useEffect(() => {
    let disposed = false;
    setAddresses([]); setAddressId('');
    if (cart.customerId) getDeliveryAddresses(cart.customerId).then(data => { if (!disposed) { setAddresses(data); setAddressId(data[0]?.id || ''); setError(undefined); } }).catch(err => { if (!disposed) setError(err instanceof Error ? err.message : 'Không tải được địa chỉ.'); });
    return () => { disposed = true; };
  }, [cart.customerId]);
  const key = JSON.stringify([cart.customerId, cart.items, addressId, deliveryDate, deliverySlot, checkoutOptions, greenVoucherId, revision, cart.ready]);
  useEffect(() => {
    let disposed = false;
    if (cart.ready && cart.items.length && addressId && deliveryDate) {
      quoteCheckout({ customerId: cart.customerId, deliveryAddressId: addressId, items: cart.items, deliveryDate, deliverySlot, checkoutOptions, greenVoucherId }).then(value => { if (!disposed) setQuoteState({key, value}); }).catch(err => { if (!disposed) setQuoteState({key, error: err instanceof Error ? err.message : 'Không tính được giá.'}); });
    }
    return () => { disposed = true; };
  }, [key, cart.ready, cart.items, cart.customerId, addressId, deliveryDate, deliverySlot, checkoutOptions, greenVoucherId]);
  const quote = quoteState.key === key ? quoteState.value : undefined;
  const requestError = quoteState.key === key ? quoteState.error : undefined;
  const place = async () => {
    if (!isPayment || !quote || submitting || !cart.ready) return;
    setSubmitting(true); setError(undefined);
    try {
      const fingerprint = JSON.stringify([cart.customerId,addressId,cart.items,deliveryDate,deliverySlot,checkoutOptions,greenVoucherId]);
      const storageKey = `farmgo-checkout-attempt-${cart.customerId}`;
      const previous = JSON.parse(localStorage.getItem(storageKey) || 'null') as {fingerprint:string; requestKey:string} | null;
      const attempt = previous?.fingerprint === fingerprint ? previous : {fingerprint,requestKey:crypto.randomUUID()};
      localStorage.setItem(storageKey,JSON.stringify(attempt));
      const order = await placeOrder({ requestKey: attempt.requestKey, customerId: cart.customerId, deliveryAddressId: addressId, items: cart.items, deliveryDate, deliverySlot, checkoutOptions, greenVoucherId });
      const cleared = cart.clear();
      if (cleared) { try { localStorage.removeItem(storageKey); } catch { /* Keep the key so retry remains idempotent. */ } }
      navigate(`/customer/orders/${order.id}`, {state: {placedTotal: order.totalVnd}});
    } catch (err) { setError(err instanceof Error ? err.message : 'Không tạo được đơn.'); }
    finally { setSubmitting(false); }
  };
  if (!cart.ready) return cart.error ? <ErrorMessage message={cart.error} /> : <LoadingSpinner />;
  if (!cart.items.length) return <div className="empty-panel"><h1>Giỏ hàng đang trống</h1><p>Chọn nguyên liệu từ danh mục để tạo đơn cho quán.</p><Link className="btn-primary" to="/customer/catalog">Chọn nguyên liệu</Link></div>;
  return <><div className="page-heading"><div><h1>{isPayment ? 'Thanh toán đơn hàng FARMGO B2B' : 'Kiểm tra đơn hàng'}</h1><p>{isPayment ? 'Chọn hình thức đặt và phương thức thanh toán mô phỏng.' : 'Kiểm tra sản phẩm, số lượng và địa chỉ trước khi thanh toán.'}</p></div><Link to="/customer/catalog">Chọn thêm nguyên liệu</Link></div>
    {(error || cart.error || requestError) && <ErrorMessage message={error || cart.error || requestError!} />}
    <div className="checkout-layout checkout-redesign"><div><section className="card"><h2>2. Danh sách mặt hàng đặt mua</h2>{cart.items.map(item => {
      const product = products.find(value => value.id === item.productId);
      const price = quote?.items.find(value => value.productId === item.productId);
      return <div className="cart-line" key={item.productId}><div className="cart-photo"><FruitPhoto id={product?.commodityId || item.productId} name={product?.name || price?.productName || 'Sản phẩm'} imageUrl={product?.imageUrl} /></div>
        <div className="cart-line-info"><strong>{product?.name || price?.productName || 'Sản phẩm chưa mở bán'}</strong><span>{product?.supplier.name || price?.supplierName || 'Thông tin NCC chưa có'}</span><span>{price ? `${money(price.unitPriceVnd)} /kg` : product ? `${money(product.publicPricePerKg)} /kg` : 'Không có báo giá hiện tại'}</span></div>
        <label className="cart-quantity">kg<input type="number" min={1} step={1} value={item.quantityKg} disabled={submitting} aria-label={`Số kg ${product?.name || item.productId}`} onChange={event => cart.quantity(item.productId, Number(event.target.value))} /></label><strong>{price ? money(price.lineTotalVnd) : '—'}</strong><button className="btn-secondary" disabled={submitting} aria-label={`Xóa ${product?.name || item.productId}`} onClick={() => cart.remove(item.productId)}>Xóa</button></div>;
    })}</section><section className="card"><h2>1. Thông tin người đặt &amp; địa chỉ nhận hàng</h2>{addresses.map(address => <label className="address-choice" key={address.id}><input type="radio" name="address" checked={addressId === address.id} onChange={() => setAddressId(address.id)} disabled={submitting} /><span><strong>{address.label}</strong><br />{address.address}</span></label>)}</section>
      {isPayment && <><section className="card"><h2>3. Lựa chọn hình thức đặt</h2><div className="checkout-options">{(['SINGLE','GROUP'] as const).map(value => <label key={value}><input type="radio" name="order-mode" disabled={submitting} checked={checkoutOptions.orderMode === value} onChange={() => setCheckoutOptions({...checkoutOptions, orderMode:value})}/><strong>{value === 'SINGLE' ? 'Đặt đơn riêng lẻ' : 'Ghép nhóm gom đơn'}</strong></label>)}</div>{checkoutOptions.orderMode === 'GROUP' && <p>Gom nhóm mô phỏng: cước 20.000đ, chưa ghép đơn thực tế.</p>}</section>
      <section className="card"><h2>4. Phương thức thanh toán</h2><div className="checkout-options">{(['BANK','COD','MOMO','ZALOPAY'] as const).map(value => <label key={value}><input type="radio" name="payment" disabled={submitting} checked={checkoutOptions.paymentMethod === value} onChange={() => setCheckoutOptions({...checkoutOptions, paymentMethod:value})}/><strong>{{BANK:'Thẻ / Ngân hàng',COD:'COD',MOMO:'MoMo',ZALOPAY:'ZaloPay'}[value]}</strong></label>)}</div><p>Tất cả phương thức đều mô phỏng thanh toán và Escrow, không thu tiền thật.</p></section>
      <section className="card checkout-insurance"><label><input type="checkbox" disabled={submitting} checked={checkoutOptions.insurance} onChange={e => setCheckoutOptions({...checkoutOptions,insurance:e.target.checked})}/><strong>5. Mua bảo hiểm đơn hàng nông sản 0,5%</strong></label><p>Phí mẫu tính trên tiền hàng. Chưa có dịch vụ bảo hiểm hay xử lý bồi thường thực tế.</p></section></>}</div>
      <section className="card checkout-summary">
        <h2>Tóm tắt đơn hàng</h2>
        <div><span>Ngày giao dự kiến</span><strong>{deliveryDate ? deliveryDate.split('-').reverse().join('/') : '—'}</strong></div>
        <div><span>Thời gian giao dự kiến</span><strong>05–07h</strong></div>
        {quote ? <>
        <div><span>Tiền hàng</span><strong>{money(quote.subtotalVnd)}</strong></div>
        <div><span>Phí vận chuyển ước tính<br /><small>(dữ liệu demo)</small></span><strong>{money(quote.shippingFeeVnd)}</strong></div>
        <div><span>Bảo hiểm nông sản (0,5%)</span><strong>{money(quote.insuranceFeeVnd || 0)}</strong></div>

        {quote.shippingDiscountVnd !== undefined && <div className="promo-discount-line"><span>Voucher FARMGO Xanh</span><strong>−{money(quote.shippingDiscountVnd)}</strong></div>}
      </> : !requestError && <LoadingSpinner text="Đang cập nhật báo giá…" />}
      <section className="checkout-voucher">
        <h3>Voucher vận chuyển</h3>
        {greenVoucherId && <p>Đã chọn <strong>{greenVoucherId}</strong></p>}
        <div className="green-picker-actions">
          <button type="button" className="btn-secondary" disabled={!quote || submitting} onClick={() => {
            setVoucherDraft(greenVoucherId ?? '');
            setVoucherOpen(true);
          }}>{greenVoucherId ? 'Đổi voucher' : 'Chọn voucher'}</button>
          {greenVoucherId && <button type="button" className="btn-secondary" disabled={submitting} onClick={() => setVoucherSelection(undefined)}>Bỏ voucher</button>}
        </div>
      </section>
      {quote && <div className="checkout-total"><span>Tổng cộng</span><strong>{money(quote.totalVnd)}</strong></div>}
      <p>Giá và phí được tính lại khi xác nhận đặt hàng.</p>{isPayment && <button className="btn-secondary" disabled={submitting} onClick={() => setSearchParams({})}>Quay lại kiểm tra đơn hàng</button>}<button className="btn-primary" disabled={submitting || !quote} onClick={isPayment ? place : () => { setSearchParams({step:'payment'}); window.scrollTo(0,0); }}>{submitting ? 'Đang tạo đơn…' : isPayment ? 'Xác nhận đặt hàng & thanh toán demo' : 'Tiếp tục thanh toán'}</button><small>Thanh toán và giữ tiền Escrow giả lập, không thu tiền thật.</small></section>
    </div>
    {voucherOpen && <GreenDialog title="Chọn voucher vận chuyển" close={() => setVoucherOpen(false)}>
      {green.error && <ErrorMessage message={green.error} />}
      {!green.data && !green.error && <LoadingSpinner />}
      {green.data && !vouchers.length && <p>Chưa có voucher khả dụng. <Link to="/customer/green">Đến FARMGO Xanh</Link></p>}
      {vouchers.map(row => <VoucherTile key={row.id} value={row.valueVnd} action={
        <input type="radio" name="green-voucher" aria-label={`Chọn voucher ${row.id}`} checked={voucherDraft === row.id}
          onChange={() => setVoucherDraft(row.id)} />
      }>{row.id} · Giảm {money(Math.min(row.valueVnd, quote?.shippingFeeVnd ?? 0))} cho đơn này</VoucherTile>)}
      {!!vouchers.length && <div className="green-picker-actions"><button className="green-primary" type="button"
        disabled={!vouchers.some(row => row.id === voucherDraft)} onClick={() => {
          setVoucherSelection({ customerId: cart.customerId, id: voucherDraft });
          setVoucherOpen(false);
        }}>Áp dụng</button></div>}
    </GreenDialog>}
    </>;
}
