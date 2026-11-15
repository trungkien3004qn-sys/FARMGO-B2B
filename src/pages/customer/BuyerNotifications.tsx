import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCustomerOrders } from '../../services/demoService';
import { getPreorderMarket } from '../../services/preorderService';
import { getGreenAccount, greenRate } from '../../services/greenService';
import { useDemoData } from '../../components/shared/useDemoData';
import { money } from '../../components/shared/useCatalog';
import { ErrorMessage, LoadingSpinner } from '../../components/shared/Feedback';

const orderLabels = { PLACED: 'Đã đặt đơn', AGGREGATED: 'Đã gom đơn', SUPPLIER_CONFIRMED: 'Nhà vườn đã xác nhận',
  AT_HUB: 'Hàng đã tới điểm gom', DISPATCHED: 'Đang giao hàng', DELIVERED: 'Đã giao hàng' };
const preorderLabels = { PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận, chờ cọc', DEPOSITED: 'Đã đặt cọc' };

type Notice = { id: string; title: string; description: string; href: string; date?: string };
type Receipt = { viewedAt: number; read: boolean };
type Receipts = Record<string, Receipt>;

async function loadNotices(customerId: string): Promise<Notice[]> {
  const [orders, market, green] = await Promise.all([getCustomerOrders(customerId), getPreorderMarket('buyer'), getGreenAccount()]);
  return [
    ...orders.map(order => ({ id: `order:${order.id}:${order.status}`, title: orderLabels[order.status],
      description: order.id, href: `/customer/orders/${encodeURIComponent(order.id)}`,
      date: order.deliveredAt ?? (order.status === 'PLACED' ? order.placedAt : undefined) })),
    ...market.orders.filter(order => order.customerId === customerId).map(order => ({
      id: `preorder:${order.id}:${order.status}`, title: preorderLabels[order.status],
      description: `Đơn đặt trước ${order.id}`, href: `/customer/preorders?order=${encodeURIComponent(order.id)}`, date: order.depositedAt,
    })),
    ...green.pickups.filter(row => row.customerId === customerId && row.actualKg !== undefined && row.status === 'COMPLETE').map(row => ({
      id: `green:${row.id}`, title: 'Đã cộng Điểm Xanh', description: `+${((row.actualKg ?? 0) * greenRate).toLocaleString('vi-VN')} điểm · ${row.id}`,
      href: '/customer/green', date: row.completedAt,
    })),
    ...green.vouchers.filter(row => row.customerId === customerId).map(row => ({
      id: `voucher:${row.id}`, title: 'Đã đổi voucher vận chuyển', description: `${row.id} · ${money(row.valueVnd)}`, href: '/customer/green',
    })),
  ];
}

function readReceipts(key: string): Receipts {
  try { return JSON.parse(localStorage.getItem(key) ?? '{}') ?? {}; } catch { return {}; }
}

export function BuyerNotifications({ customerId }: { customerId: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const key = 'farmgo-buyer-notifications:' + customerId;
  const [readOverrides, setReadOverrides] = useState<Receipts>({});
  const [storageError, setStorageError] = useState(false);
  const snapshot = useDemoData(async () => {
    if (!customerId) return [];
    const notices = await loadNotices(customerId);
    const receipts = readReceipts(key);
    const now = Date.now();
    let changed = false;
    for (const notice of notices) {
      if (receipts[notice.id]) continue;
      receipts[notice.id] = { viewedAt: now, read: false };
      changed = true;
    }
    if (changed) {
      try { localStorage.setItem(key, JSON.stringify(receipts)); } catch { /* Read state can still be used for this session. */ }
    }
    return notices.map(notice => ({ ...notice, receipt: receipts[notice.id] }))
      .sort((a, b) => (b.date ? Date.parse(b.date) : b.receipt.viewedAt) - (a.date ? Date.parse(a.date) : a.receipt.viewedAt));
  });
  const notices = snapshot.data ?? [];
  const isRead = (notice: typeof notices[number]) => (readOverrides[notice.id] ?? notice.receipt).read;
  const unread = notices.filter(notice => !isRead(notice)).length;
  function markRead(items: typeof notices) {
    const updates = Object.fromEntries(items.map(notice => [notice.id, { ...notice.receipt, read: true }]));
    setReadOverrides(current => ({ ...current, ...updates }));
    try {
      localStorage.setItem(key, JSON.stringify({ ...readReceipts(key), ...updates }));
      setStorageError(false);
    } catch { setStorageError(true); }
  }
  return <>
    <button className="buyer-notification-trigger" type="button" aria-haspopup="dialog" aria-label={unread ? `Thông báo, ${unread} chưa đọc` : 'Thông báo'} onClick={() => dialog.current?.showModal()}>
      <span className="buyer-nav-icon"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0" /></svg>
        {unread > 0 && <b aria-hidden="true">{unread > 99 ? '99+' : unread}</b>}</span>
      Thông báo
    </button>
    <dialog className="buyer-notification-panel" ref={dialog} aria-label="Thông báo tài khoản" onClick={event => {
      if (event.target === event.currentTarget) dialog.current?.close();
    }}>
      <div className="buyer-notification-body">
        <header><h2>Thông báo tài khoản</h2><button type="button" className="btn-secondary" aria-label="Đóng thông báo" autoFocus onClick={() => dialog.current?.close()}>×</button></header>
        {storageError && <p role="status">Trình duyệt chưa lưu được trạng thái đã đọc.</p>}
        {snapshot.error && <ErrorMessage message={snapshot.error} />}
        {!snapshot.data && !snapshot.error && <LoadingSpinner />}
        {snapshot.data && !notices.length && <p>Bạn chưa có thông báo.</p>}
        {unread > 0 && <button className="btn-secondary" type="button" onClick={() => markRead(notices)}>Đánh dấu tất cả đã đọc</button>}
        <ul>{notices.map(notice => <li key={notice.id} data-unread={!isRead(notice)}>
          <Link to={notice.href} onClick={() => { markRead([notice]); dialog.current?.close(); }}>
            <strong>{notice.title}</strong><span>{notice.description}</span>
            {!isRead(notice) && <small>Chưa đọc</small>}
          </Link>
        </li>)}</ul>
      </div>
    </dialog>
  </>;
}
