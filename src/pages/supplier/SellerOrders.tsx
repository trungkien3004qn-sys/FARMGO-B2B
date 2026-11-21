import { Link } from 'react-router-dom';
import { useId, useRef, useState } from 'react';
import type { OrderStatus, ShipmentStatus } from '../../types';
import * as api from '../../services/demoService';
import { useDemoData } from '../../components/shared/useDemoData';
import { money } from '../../components/shared/useCatalog';
import { LoadingSpinner, ErrorMessage } from '../../components/shared/Feedback';
import { LucideIcon } from '../../components/shared/LucideIcon';
import './seller-order-card.css';

const dateTime = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh',
});
const quantity = new Intl.NumberFormat('vi-VN');
// Matches the four-digit code accepted by the transport pickup demo.
const pickupPin = '1234';

function HandoverButton({ orderId }: { orderId: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();

  return <>
    <button type="button" className="btn-primary seller-handover-button" onClick={() => dialog.current?.showModal()}>
      Hiện QR / PIN bàn giao xe
    </button>
    <dialog ref={dialog} className="seller-listing-dialog seller-handover-dialog" aria-labelledby={title}>
      <header>
        <h2 id={title}>QR / PIN bàn giao xe</h2>
        <button type="button" className="btn-secondary" aria-label="Đóng popup" onClick={() => dialog.current?.close()}>×</button>
      </header>
      <div className="seller-handover-content">
        <p>Mã đơn <b>{orderId}</b></p>
        <svg viewBox="0 0 24 24" width="92" height="92" aria-hidden="true">
          <path fill="currentColor" d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4zm14 0h4v4h-4v-4zm-4 4h4v4h-4v-4zm4-4h-4v-4h4v4zm0-6h4v2h-4v-2zm-6 0h2v4h-2v-4z" />
        </svg>
        <p>PIN bàn giao <b className="seller-handover-pin">{pickupPin}</b></p>
        <p>Nhập PIN tại mục Lấy hàng trên trang giao nhận. Hình QR chỉ dùng để minh họa thao tác quét.</p>
      </div>
    </dialog>
  </>;
}

const stages = [
  { key: 'pending', label: 'Chờ xác nhận' },
  { key: 'preparing', label: 'Đang soạn hàng / chuẩn bị' },
  { key: 'transport', label: 'Chờ vận chuyển' },
  { key: 'tracking', label: 'Đang giao hàng / tracking' },
  { key: 'completed', label: 'Hoàn thành' },
] as const;

type Stage = typeof stages[number]['key'];

function orderStage(status: OrderStatus, shipment: ShipmentStatus | undefined, confirmed: boolean): Stage {
  if (status === 'DELIVERED' || shipment === 'DELIVERED') return 'completed';
  if (status === 'DISPATCHED' || shipment === 'IN_TRANSIT') return 'tracking';
  if (status === 'AT_HUB' || shipment === 'ASSIGNED') return 'transport';
  if (confirmed || status === 'SUPPLIER_CONFIRMED') return 'preparing';
  return 'pending';
}

export function SellerOrders() {
  const [filter, setFilter] = useState<Stage | 'all'>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const s = useDemoData(async () => {
    const session = await api.getDemoSession();
    const [allOrders, customers, confirmations, shipments, demand, suppliers] = await Promise.all([
      api.getAllOrders(), api.getCustomers(), api.getSupplierConfirmations(), api.getShipments(),
      api.getSupplierDemand(session.activeSupplierId!), api.getSuppliers(),
    ]);
    const orders = selectedSupplier === 'all'
      ? allOrders
      : allOrders.filter(order => order.items.some(item => item.supplierId === selectedSupplier));
    const customerIds = new Set(orders.map(order => order.customerId));
    const addressLists = await Promise.all(customers.filter(customer => customerIds.has(customer.id))
      .map(customer => api.getDeliveryAddresses(customer.id)));
    const addresses = new Map(addressLists.flat().map(address => [address.id, address]));
    return { session, allOrders, orders, customers, confirmations, shipments, demand, addresses, suppliers };
  });
  if (!s.data) return s.error ? <ErrorMessage message={s.error} /> : <LoadingSpinner />;
  const { session, allOrders, orders, customers, confirmations, shipments, addresses, suppliers } = s.data;
  const id = session.activeSupplierId!;
  const confirmationByOrder = new Map(confirmations.filter(c => c.supplierId === id)
    .flatMap(confirmation => confirmation.orderIds.map(orderId => [orderId, confirmation] as const)));
  const shipmentByOrder = new Map(shipments.flatMap(shipment => shipment.orderIds.map(orderId => [orderId, shipment] as const)));
  const rows = orders.map(order => {
    const shipment = shipmentByOrder.get(order.id);
    const confirmation = confirmationByOrder.get(order.id);
    return { order, shipment, confirmation, stage: orderStage(order.status, shipment?.status, Boolean(confirmation)) };
  });
  const visible = filter === 'all' ? rows : rows.filter(row => row.stage === filter);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Xử lý đơn hàng B2B</h1>
          <p>Tiếp nhận đơn từ các quán F&B và chuẩn bị đóng gói giao hàng.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => void s.refresh()}
            style={{
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #16a34a',
              background: '#f0fdf4',
              color: '#15803d',
              fontWeight: 600,
              fontSize: '0.82rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <LucideIcon name="refreshCw" size={14} /> Làm mới từ DB
          </button>
          <span className="seller-chip" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 600 }}>
            ● Đồng bộ thời gian thực SQLite dev.db
          </span>
        </div>
      </div>
      {s.error && <ErrorMessage message={s.error} />}

      {/* Supplier selection filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <LucideIcon name="building" size={14} /> Bộ lọc nhà vườn:
        </span>
        <button
          type="button"
          onClick={() => setSelectedSupplier('all')}
          style={{
            cursor: 'pointer',
            padding: '6px 14px',
            borderRadius: '20px',
            border: selectedSupplier === 'all' ? '2px solid #16a34a' : '1px solid #cbd5e1',
            background: selectedSupplier === 'all' ? '#16a34a' : '#fff',
            color: selectedSupplier === 'all' ? '#fff' : '#334155',
            fontWeight: 600,
            fontSize: '0.85rem',
            transition: 'all 0.15s ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <LucideIcon name="globe" size={14} /> Tất cả nhà vườn ({allOrders.length} đơn)
        </button>
        {suppliers.map(sup => (
          <button
            key={sup.id}
            type="button"
            onClick={() => setSelectedSupplier(sup.id)}
            style={{
              cursor: 'pointer',
              padding: '6px 14px',
              borderRadius: '20px',
              border: selectedSupplier === sup.id ? '2px solid #16a34a' : '1px solid #cbd5e1',
              background: selectedSupplier === sup.id ? '#16a34a' : '#fff',
              color: selectedSupplier === sup.id ? '#fff' : '#334155',
              fontWeight: 600,
              fontSize: '0.85rem',
              transition: 'all 0.15s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <LucideIcon name="leaf" size={14} /> {sup.name}
          </button>
        ))}
      </div>

      <div className="seller-order-filters" role="group" aria-label="Lọc đơn hàng theo tiến độ">
        {[{ key: 'all', label: 'Tất cả đơn' } as const, ...stages].map(({ key, label }) => (
          <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>
            {label} <span>{key === 'all' ? rows.length : rows.filter(row => row.stage === key).length}</span>
          </button>
        ))}
      </div>
      <p className="seller-order-count" role="status">{visible.length} đơn hàng</p>
      {!visible.length && <div className="seller-panel seller-empty">Chưa có đơn hàng trong mục này.</div>}
      {visible.map(({ order, shipment, confirmation, stage }) => {
        const items = selectedSupplier === 'all' ? order.items : order.items.filter(item => item.supplierId === selectedSupplier);
        const address = addresses.get(order.deliveryAddressId);
        const slot = order.deliverySlot === 'MORNING' ? '05:00–07:00' : order.deliverySlot === 'AFTERNOON' ? '13:00–15:00' : '';
        const canShowHandover = stage === 'preparing' || stage === 'transport';
        const current = stages.find(item => item.key === stage)!;
        const statusLabel = stage === 'transport'
          ? shipment?.status === 'ASSIGNED' ? 'Đã phân công chuyến' : 'Đã tới điểm gom'
          : current.label;
        return (
          <article className="seller-order seller-order-card seller-panel" key={order.id} aria-label={`Đơn ${order.id}`}>
            <header className="seller-order-card-head">
              <div className="seller-order-card-id">
                <h2>{order.id}</h2>
                <span className="seller-order-status" data-stage={stage}>{statusLabel}</span>
              </div>
              {order.deliveredAt ? (
                <p>Đã giao <time dateTime={order.deliveredAt}>{dateTime.format(new Date(order.deliveredAt))}</time></p>
              ) : order.deliveryDate && (
                <p>Lịch giao <time dateTime={order.deliveryDate}>{order.deliveryDate.split('-').reverse().join('/')}</time>{slot && ` · ${slot}`}</p>
              )}
            </header>
            <div className="seller-order-card-grid">
              <section>
                <h3>Khách hàng</h3>
                <p><b>{customers.find(customer => customer.id === order.customerId)?.businessName || 'The Coffee House (Flagship Cao Thắng)'}</b></p>
                <p>{address?.address || '86-88 Cao Thắng, Phường 4, Quận 3, TP.HCM'}</p>
              </section>
              <section>
                <h3>Sản phẩm và số lượng</h3>
                <ul>
                  {items.map(item => (
                    <li key={item.productId || Math.random()}>
                      <b>{item.productName}</b>
                      <span>{quantity.format(item.quantityKg)} kg · {money(item.lineTotalVnd)}</span>
                    </li>
                  ))}
                </ul>
                {items.length > 1 && <p>Tổng <b>{quantity.format(items.reduce((sum, item) => sum + item.quantityKg, 0))} kg</b> · <b>{money(items.reduce((sum, item) => sum + item.lineTotalVnd, 0))}</b></p>}
              </section>
              <section>
                <h3>Tài xế và phương tiện</h3>
                {shipment?.driverName ? (
                  <>
                    <p><b>🚗 {shipment.driverName}</b></p>
                    {shipment.vehiclePlate && <p>Biển số: {shipment.vehiclePlate}</p>}
                    {shipment.trackingLabel && <p style={{ color: '#0284c7', fontSize: '0.85rem' }}>{shipment.trackingLabel}</p>}
                  </>
                ) : stage === 'preparing' ? (
                  <p style={{ color: '#d97706', fontWeight: 600, fontSize: '0.9rem' }}>
                    ⏳ Đã đóng gói · Chờ tài xế nhận đơn trên sàn B2B Pool...
                  </p>
                ) : confirmation?.vehiclePlate ? (
                  <p>Xe về điểm gom <b>{confirmation.vehiclePlate}</b></p>
                ) : <p>Chưa có thông tin xe</p>}
              </section>
            </div>
            <footer>
              <span>Mã đơn: <b>{order.id}</b> · Đặt lúc <time dateTime={order.placedAt}>{dateTime.format(new Date(order.placedAt))}</time></span>
              <div className="seller-order-card-actions">
                {canShowHandover && <HandoverButton orderId={order.id} />}
                {stage === 'pending' && (
                  <button
                    className="btn-primary"
                    disabled={s.busy}
                    onClick={() => void s.run(() => api.confirmOrderDirectly(order.id, items[0]?.supplierId || id))}
                  >
                    <LucideIcon name="check" size={14} /> Xác nhận đơn hàng
                  </button>
                )}
                {stage === 'preparing' && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#d97706', fontWeight: 600 }}>
                      Đang chờ tài xế nhận chuyến
                    </span>
                    <button
                      className="btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                      disabled={s.busy}
                      onClick={() => void s.run(() => api.dispatchOrderDirectly(order.id))}
                      title="Gán nhanh tài xế Nguyễn Văn Minh để test nhanh"
                    >
                      <LucideIcon name="truck" size={13} /> Gán nhanh tài xế Minh
                    </button>
                  </div>
                )}
                {(stage === 'transport' || stage === 'tracking') && (
                  <button
                    className="btn-primary"
                    style={{ background: '#16a34a', borderColor: '#16a34a' }}
                    disabled={s.busy}
                    onClick={() => void s.run(() => api.completeOrderDirectly(order.id))}
                  >
                    <LucideIcon name="checkCircle" size={14} /> Đã giao tới quán
                  </button>
                )}
                {order.status === 'DELIVERED' && (
                  <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.85rem' }}>
                    {(order as any).qcStatus === 'APPROVED' ? '✅ Đã nghiệm thu & Tiền đã về ví' : '📦 Đã giao tới quán · Chờ quán nghiệm thu'}
                  </span>
                )}
                <Link className="btn-secondary" to="/supplier/demand">Chi tiết cung ứng</Link>
              </div>
            </footer>
          </article>
        );
      })}
    </>
  );
}
