import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { OrderItem } from '../../types';
import {
  getClaims, getAllOrders, getDeliveryAddresses, getDemoClock, getDemoSession, getShipmentByOrderId, buyerApproveQCAndSettleEscrow,
} from '../../services/demoService';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { LoadingSpinner, ErrorMessage } from '../../components/shared/Feedback';
import { FruitPhoto } from '../../components/shared/FruitPhoto';
import { money, useCatalog } from '../../components/shared/useCatalog';
import { useDemoData } from '../../components/shared/useDemoData';
import { canClaim } from './orderClaimEligibility';
import './buyer-orders.css';

const carrierNames = { GHN: 'GHN Express', GHTK: 'GHTK Logi', TRUCK: 'Xe tải thường' };
const paymentNames = { FARMGOPAY: 'Ví FarmGoPay (1-chạm)', BANK: 'Thẻ / Ngân hàng', COD: 'COD', MOMO: 'MoMo', ZALOPAY: 'ZaloPay' };
const dateTime = (date: string) => new Date(date).toLocaleString('vi-VN');

export function OrderDetailContent({ id }: { id: string }) {
  const [copyMessage, setCopyMessage] = useState('');
  const [qcActionLoading, setQcActionLoading] = useState(false);
  const [qcSuccessMsg, setQcSuccessMsg] = useState('');
  const { products } = useCatalog();
  const s = useDemoData(async () => {
    const session = await getDemoSession();
    const allOrders = await getAllOrders();
    const cleanId = (id || '').replace(/^#/, '').trim().toLowerCase();
    let order = allOrders.find(candidate => {
      const cId = (candidate.id || '').replace(/^#/, '').trim().toLowerCase();
      const cDbId = ((candidate as any).dbId || '').trim().toLowerCase();
      const cCode = ((candidate as any).orderCode || '').replace(/^#/, '').trim().toLowerCase();
      const cReq = (candidate.paymentRequestKey || '').trim().toLowerCase();
      return (
        cId === cleanId ||
        cDbId === cleanId ||
        cCode === cleanId ||
        cReq === cleanId ||
        (cleanId && (cId.includes(cleanId) || cleanId.includes(cId)))
      );
    });
    if (!order && allOrders.length > 0) {
      order = allOrders[0];
    }
    if (!order) return null;
    const customerId = order.customerId || session.activeCustomerId || 'customer-1';
    const [shipment, addresses, now, claims] = await Promise.all([
      getShipmentByOrderId(order.id), getDeliveryAddresses(customerId), getDemoClock(), getClaims(),
    ]);
    return {
      order, shipment, address: addresses.find(candidate => candidate.id === order.deliveryAddressId),
      eligible: session.role === 'CUSTOMER' && canClaim(order, claims, now),
    };
  });

  const { data, error } = s;

  if (error) return <ErrorMessage message={error} />;
  if (data === undefined) return <LoadingSpinner />;
  if (data === null) {
    return (
      <div className="empty-panel" style={{ padding: '36px 24px', textAlign: 'center', background: '#ffffff', border: '1px solid #ded7cb', borderRadius: '14px', marginTop: '16px' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', color: '#22261f' }}>Chưa tìm thấy dữ liệu đơn hàng</h3>
        <p style={{ margin: '0 0 20px', color: '#5a5c53', fontSize: '0.95rem' }}>
          Đơn hàng này có thể chưa được lưu vào cơ sở dữ liệu hoặc phiên làm việc đã được đặt lại.
        </p>
        <Link 
          to="/customer/orders" 
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minHeight: '44px', padding: '10px 20px', background: '#2e5b44', color: '#ffffff', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}
        >
          Quay lại danh sách đơn hàng
        </Link>
      </div>
    );
  }

  const { order, shipment, address, eligible } = data;

  const handleApproveQC = async () => {
    setQcActionLoading(true);
    setQcSuccessMsg('');
    try {
      const res = await buyerApproveQCAndSettleEscrow(order.id);
      setQcSuccessMsg(res.message);
      await s.run(async () => {
        const allOrders = await getAllOrders();
        const updated = allOrders.find(candidate => candidate.id === order.id);
        if (updated) {
          (order as any).qcStatus = 'APPROVED';
          (order as any).escrowStatus = 'SETTLED';
        }
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Nghiệm thu thất bại.');
    } finally {
      setQcActionLoading(false);
    }
  };
  const groups = new Map<string, OrderItem[]>();
  for (const item of order.items) {
    const key = item.supplierId || item.supplierName || '';
    const items = groups.get(key) ?? [];
    items.push(item);
    groups.set(key, items);
  }
  const productsById = new Map(products.map(product => [product.id, product]));
  const slot = order.deliverySlot === 'MORNING' ? '05–07h' : order.deliverySlot === 'AFTERNOON' ? '13–15h' : '';
  const date = order.deliveryDate?.split('-').reverse().join('/');
  const schedule = [date, slot].filter(Boolean).join(' · ');
  const carrier = order.checkoutOptions && carrierNames[order.checkoutOptions.carrier];
  const claimPath = '/customer/claims?orderId=' + encodeURIComponent(order.id);

  async function copyId() {
    try {
      await navigator.clipboard.writeText(id);
      setCopyMessage('Đã sao chép mã đơn.');
    } catch {
      setCopyMessage('Không thể sao chép. Bạn có thể chọn mã đơn để sao chép.');
    }
  }

  return (
    <div className="buyer-detail-content">
      {order.status === 'DELIVERED' && (order as any).qcStatus !== 'APPROVED' && (
        <section style={{ background: '#f0fdf4', border: '2px solid #16a34a', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <strong style={{ color: '#15803d', fontSize: '1.05rem', display: 'block', marginBottom: '4px' }}>
                🛡️ Hàng đã giao tới quán · Vui lòng kiểm hàng QC & Mở khóa ký quỹ
              </strong>
              <p style={{ color: '#166534', margin: 0, fontSize: '0.9rem' }}>
                Nếu nông sản đạt chuẩn chất lượng cam kết, bạn vui lòng bấm xác nhận để hệ thống giải ngân tiền ký quỹ về cho nhà vườn.
              </p>
            </div>
            <button
              type="button"
              className="btn-primary"
              style={{ background: '#16a34a', borderColor: '#16a34a', padding: '10px 18px', fontWeight: 700 }}
              disabled={qcActionLoading}
              onClick={handleApproveQC}
            >
              {qcActionLoading ? 'Đang giải ngân…' : '✅ Nghiệm thu đạt chuẩn - Mở khóa Escrow'}
            </button>
          </div>
          {qcSuccessMsg && <p style={{ color: '#15803d', fontWeight: 600, marginTop: '8px' }}>{qcSuccessMsg}</p>}
        </section>
      )}

      {order.status === 'DELIVERED' && (order as any).qcStatus === 'APPROVED' && (
        <section style={{ background: '#eff6ff', border: '1.5px solid #3b82f6', padding: '14px 18px', borderRadius: '12px', marginBottom: '16px' }}>
          <strong style={{ color: '#1d4ed8', fontSize: '0.95rem' }}>
            🎉 Đơn hàng đã được nghiệm thu QC thành công &amp; Tiền ký quỹ đã giải ngân cho nhà vườn!
          </strong>
        </section>
      )}

      <section className="buyer-detail-status" aria-label="Trạng thái đơn">
        <StatusBadge status={order.status} />
        {order.deliveredAt ? <p>Giao thành công vào {dateTime(order.deliveredAt)}</p> :
          schedule && <p>Lịch giao: {schedule}</p>}
      </section>

      <section className="buyer-detail-section">
        <h3>Thông tin vận chuyển</h3>
        {carrier && <p><strong>{carrier}</strong></p>}
        {schedule && order.deliveredAt && <p>Ca giao: {schedule}</p>}
        {shipment ? (
          <>
            <p>{shipment.routeLabel} <StatusBadge status={shipment.status} /></p>
            {shipment.trackingLabel && <p>{shipment.trackingLabel}</p>}
            {[shipment.driverName, shipment.driverPhone, shipment.vehiclePlate].filter(Boolean).length > 0 && (
              <p>{[shipment.driverName, shipment.driverPhone, shipment.vehiclePlate].filter(Boolean).join(' · ')}</p>
            )}
          </>
        ) : <p>Chưa có thông tin theo dõi vận chuyển.</p>}
        <h3 className="buyer-detail-address-title">Địa chỉ nhận hàng</h3>
        {address ? <p><strong>{address.label}</strong><br />{address.address}</p> : <p>Chưa có thông tin địa chỉ.</p>}
      </section>

      <section className="buyer-detail-section">
        <h3>Mặt hàng</h3>
        {[...groups].map(([key, items]) => (
          <div className="buyer-order-group" key={key}>
            <h4>{items[0].supplierName || key || 'Chưa rõ nhà cung cấp'}</h4>
            <ul>
              {items.map((item, index) => {
                const product = productsById.get(item.productId);
                const qc = item.qcSnapshot;
                return (
                  <li className="buyer-order-item" key={item.productId + '-' + index}>
                    <FruitPhoto id={product?.commodityId ?? item.productId} name={item.productName} imageUrl={product?.imageUrl} />
                    <div>
                      <strong>{item.productName}</strong>
                      <p>{item.quantityKg.toLocaleString('vi-VN')} kg · {money(item.unitPriceVnd)}/kg</p>
                      {qc && <p>QC lúc đặt: {qc.grade} · Yield {qc.yieldPercent}%{qc.brix != null && ' · Brix ' + qc.brix}</p>}
                    </div>
                    <strong className="buyer-order-line-total">{money(item.lineTotalVnd)}</strong>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <details className="buyer-detail-totals">
          <summary>Tổng thanh toán <strong>{money(order.totalVnd)}</strong></summary>
          <dl>
            <div><dt>Tiền hàng</dt><dd>{money(order.subtotalVnd)}</dd></div>
            <div><dt>Phí giao</dt><dd>{money(order.shippingFeeVnd)}</dd></div>
            {!!order.shippingDiscountVnd && <div><dt>Voucher FARMGO Xanh</dt><dd>−{money(order.shippingDiscountVnd)}</dd></div>}
            {!!order.insuranceFeeVnd && <div><dt>Bảo hiểm</dt><dd>{money(order.insuranceFeeVnd)}</dd></div>}
          </dl>
        </details>
      </section>

      <section className="buyer-detail-section">
        <h3>Thông tin đơn</h3>
        <div className="buyer-detail-reference">
          <span>Mã đơn <strong>{order.id}</strong></span>
          <button type="button" className="btn-secondary" onClick={copyId}>Sao chép</button>
        </div>
        <div role="status">{copyMessage}</div>
        <p>Đặt lúc: {dateTime(order.placedAt)}</p>
        {order.checkoutOptions && <p>Phương thức thanh toán: {paymentNames[order.checkoutOptions.paymentMethod]}</p>}
        {order.paymentRequestKey && <p>Đã giữ tiền qua Escrow</p>}
      </section>

      <section className="buyer-detail-section">
        <h3>Hỗ trợ</h3>
        {eligible && order.deliveredAt && <p>Hạn gửi khiếu nại: {dateTime(new Date(Date.parse(order.deliveredAt) + 7_200_000).toISOString())}</p>}
        <div className="buyer-detail-support">
          {eligible && <Link className="btn-primary" to={claimPath}>Gửi khiếu nại</Link>}
          <Link to="/customer/claims">Xem khiếu nại</Link>
          <Link to="/customer/finance">Xem tài chính</Link>
        </div>
      </section>
    </div>
  );
}

export function OrderDetailPage() {
  const { id: paramId } = useParams<{ id: string }>();
  const id = paramId || (typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : '') || 'latest';
  return (
    <div className="buyer-detail-page">
      <Link to="/customer/orders">← Quay lại danh sách đơn hàng</Link>
      <h1>Thông tin đơn hàng</h1>
      <OrderDetailContent key={id} id={id} />
    </div>
  );
}
