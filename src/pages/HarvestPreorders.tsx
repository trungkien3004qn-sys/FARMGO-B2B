import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import * as api from '../services/preorderService';
import { useDemoData } from '../components/shared/useDemoData';
import { ErrorMessage, LoadingSpinner } from '../components/shared/Feedback';
import { FruitPhoto } from '../components/shared/FruitPhoto';
import { money } from '../components/shared/useCatalog';
import { prepareProductPhoto } from '../components/shared/prepareProductPhoto';
import type { NewHarvestLot, PreorderStatus } from '../types/preorder';
import './harvest-preorders.css';

type Market = Awaited<ReturnType<typeof api.getPreorderMarket>>;
type Lot = Market['lots'][number];
type Order = Market['orders'][number];
type Panel = { kind: 'new' | 'request' } | { kind: 'lot' | 'buy' | 'close'; id: string } | { kind: 'order'; id: string };
const statuses: Record<PreorderStatus, string> = {
  PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận · Chờ cọc', DEPOSITED: 'Đặt cọc thành công',
};
const kg = (value: number) => value.toLocaleString('vi-VN') + ' kg';
const day = (value: string) => value.slice(0, 10).split('-').reverse().join('/');

function Dialog({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return <dialog ref={ref} className="harvest-dialog" aria-labelledby={id}
    onCancel={event => { event.preventDefault(); close(); }}>
    <header><h2 id={id}>{title}</h2><button type="button" aria-label="Đóng" onClick={close}>×</button></header>
    <div className="harvest-dialog-body">{children}</div>
  </dialog>;
}

function LotStats({ lot }: { lot: Lot }) {
  return <dl className="harvest-stats">
    <div><dt>Sản lượng dự kiến</dt><dd>{kg(lot.expectedKg)}</dd></div>
    <div><dt>Hao hụt ({lot.lossPercent}%)</dt><dd>{kg(lot.expectedKg - lot.capacity)}</dd></div>
    <div><dt>Được phép bán</dt><dd>{kg(lot.capacity)}</dd></div>
    <div><dt>Đã cọc ({lot.depositCount} đơn)</dt><dd>{kg(lot.booked)}</dd></div>
    <div><dt>Lượng còn lại</dt><dd>{kg(lot.remaining)}</dd></div>
  </dl>;
}

function LotPhoto({ lot }: { lot: Lot }) {
  return <div className="harvest-photo">
    <FruitPhoto id={lot.productId} name={lot.productName} imageUrl={lot.imageUrl} />
    <span>{lot.grade}{lot.vietGap ? ' · VietGAP' : ''}</span>
  </div>;
}

function OrderSummary({ order, lot, seller }: { order: Order; lot: Lot; seller?: boolean }) {
  return <div className="harvest-order-summary">
    <div><small>{order.id} · {lot.id}</small><strong>{lot.productName} · {kg(order.quantityKg)}</strong>
      <span>{seller ? order.customerName ?? order.customerId : lot.supplierName} · Thu hoạch {day(lot.harvestDate)}</span></div>
    <div><span className="harvest-badge">{statuses[order.status]}</span>
      <span>Giá trị {money(order.totalVnd)}</span>
      <strong>{order.status === 'DEPOSITED' ? 'Đã ký quỹ' : 'Ký quỹ dự kiến'} {money(order.depositVnd)}</strong>
    </div>
  </div>;
}

export function HarvestPreorders({ seller = false }: { seller?: boolean }) {
  const { data, error } = useDemoData(() => api.getPreorderMarket(seller ? 'seller' : 'buyer'));
  const [panel, setPanel] = useState<Panel>();
  const [filter, setFilter] = useState('all');
  const [orderFilter, setOrderFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const requestKey = useRef('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [otp, setOtp] = useState('');

  function show(next?: Panel) {
    setFormError('');
    setOtp('');
    if (next?.kind === 'buy') {
      setQuantity(1);
      requestKey.current = crypto.randomUUID();
    }
    setPanel(next);
  }

  async function run(action: () => Promise<unknown>, after: () => void) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setFormError('');
    try { await action(); after(); }
    catch (failure) { setFormError(failure instanceof Error ? failure.message : 'Không lưu được dữ liệu.'); }
    finally { lock.current = false; setBusy(false); }
  }

  if (!data) return error ? <ErrorMessage message={error} /> : <LoadingSpinner />;
  const lots = data.lots.filter(lot => seller
    ? filter === 'all' || (filter === 'closed' ? !!lot.completedAt : !lot.completedAt)
    : !lot.completedAt && (filter === 'all' || (filter === 'vietgap' ? lot.vietGap : lot.grade === 'Loại 1')));
  const order = panel?.kind === 'order' ? data.orders.find(row => row.id === panel.id) : undefined;
  const lotId = order?.lotId ?? (panel && 'id' in panel ? panel.id : undefined);
  const lot = data.lots.find(row => row.id === lotId);
  const filters = seller ? [['all', 'Tất cả lô'], ['open', 'Lô đang đăng'], ['closed', 'Lô đã hoàn tất']]
    : [['all', 'Tất cả loại'], ['grade', 'Loại 1'], ['vietgap', 'VietGAP']];
  const shownOrders = data.orders.filter(row => orderFilter === 'all' || row.status === orderFilter);

  function submitLot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const file = fields.get('photo');
    void run(async () => {
      const imageUrl = file instanceof File && file.size ? await prepareProductPhoto(file) : undefined;
      await api.publishHarvestLot({
        title: String(fields.get('title')), productId: String(fields.get('product')),
        region: String(fields.get('region')), harvestDate: String(fields.get('date')),
        expectedKg: Number(fields.get('kg')), lossPercent: Number(fields.get('loss')),
        pricePerKg: Number(fields.get('price')), grade: fields.get('grade') as NewHarvestLot['grade'],
        color: fields.get('color') as NewHarvestLot['color'], imageUrl,
      });
    }, () => { show(); setNotice('Đã mở đặt trước cho lô hàng.'); });
  }

  return <main className={`harvest-page${seller ? ' harvest-seller' : ''}`}>
    <header className="harvest-banner"><div>
      <h1>{seller ? 'Đăng bán trước thu hoạch' : 'Lô hàng đặt trước từ nhà vườn'}</h1>
      <p>{seller ? 'Quản lý sản lượng dự kiến, hao hụt và đơn đặt cọc theo từng lô.' : 'Chọn lô sắp thu hoạch và ký quỹ 10% sau khi xác nhận đơn.'}</p>
    </div><button type="button" onClick={() => show({ kind: seller ? 'new' : 'request' })}>{seller ? '+ Thêm lô mới' : '+ Yêu cầu riêng'}</button></header>
    <p className="harvest-caption">Đặt trước và ký quỹ mô phỏng</p>
    {error && <ErrorMessage message={error} />}
    {notice && <p role="status">{notice}</p>}
    <div className="harvest-section-head"><h2>{seller ? 'Lô của nhà vườn' : 'Lô đang mở đặt trước'}</h2>
      <div className="harvest-filters" role="group" aria-label="Lọc lô hàng">{filters.map(([key, label]) =>
        <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}</div>
    </div>
    {!lots.length && <p className="harvest-empty">Chưa có lô phù hợp.</p>}
    <div className="harvest-grid">
      {lots.map(row => <article key={row.id} className="harvest-lot" data-color={row.color} data-closed={!!row.completedAt}>
        <header><span>{row.id}</span><strong>{row.title}</strong><small>{row.completedAt ? 'Đã hoàn tất' : 'Thu hoạch ' + day(row.harvestDate)}</small></header>
        <LotPhoto lot={row} />
        <div className="harvest-lot-body">
          <h3>{row.productName}</h3>
          <p>{row.supplierName} · {row.region}</p>
          <p><strong>{money(row.pricePerKg)}/kg</strong> · Đăng {day(row.postedAt)}</p>
          <LotStats lot={row} />
          <div className="harvest-actions">
            <button type="button" onClick={() => show({ kind: 'lot', id: row.id })}>Chi tiết lô hàng</button>
            {seller ? !row.completedAt && <button type="button" className="harvest-primary" onClick={() => show({ kind: 'close', id: row.id })}>Hoàn tất lô</button>
              : <button type="button" className="harvest-primary" disabled={row.remaining === 0} onClick={() => show({ kind: 'buy', id: row.id })}>{row.remaining ? 'Đặt trước' : 'Đã hết lượng đặt trước'}</button>}
          </div>
        </div>
      </article>)}
    </div>
    {!seller && <section>
      <div className="harvest-section-head"><h2>Đơn đặt trước của tôi ({data.orders.length})</h2>
        <div className="harvest-filters" role="group" aria-label="Lọc đơn đặt trước">{[['all', 'Tất cả'], ...Object.entries(statuses)].map(([key, label]) =>
          <button key={key} type="button" aria-pressed={orderFilter === key} onClick={() => setOrderFilter(key)}>{label}</button>)}</div>
      </div>
      {!shownOrders.length && <p className="harvest-empty">Chưa có đơn trong mục này.</p>}
      {shownOrders.map(row => {
        const matched = data.lots.find(value => value.id === row.lotId);
        return matched && <article className="harvest-order" data-color={matched.color} key={row.id}>
          <OrderSummary order={row} lot={matched} />
          <button type="button" onClick={() => show({ kind: 'order', id: row.id })}>Chi tiết đơn</button>
        </article>;
      })}
    </section>}
    {!!data.requests.length && <section className="harvest-requests"><h2>{seller ? 'Nhu cầu đặt trước từ bên mua' : 'Yêu cầu riêng của tôi'}</h2>
      {data.requests.map(row => <article className="harvest-order" key={row.id}>
        <strong>{row.productName} · {kg(row.quantityKg)}</strong>
        <span>{row.id} · Ngày cần {day(row.neededDate)}</span>{row.note && <p>{row.note}</p>}
      </article>)}
    </section>}
    {panel && <Dialog key={panel.kind} close={() => { if (!lock.current) show(); }} title={
      panel.kind === 'new' ? 'Thêm lô mới' : panel.kind === 'request' ? 'Yêu cầu riêng'
        : panel.kind === 'buy' ? 'Đặt trước lô hàng' : panel.kind === 'close' ? 'Hoàn tất lô'
          : panel.kind === 'order' ? 'Chi tiết đơn đặt trước' : 'Chi tiết lô hàng'
    }>
      {formError && <ErrorMessage message={formError} />}
      {panel.kind === 'new' && <form onSubmit={submitLot}>
        <fieldset disabled={busy} className="harvest-form">
          <label>Tên lô<input name="title" required /></label>
          <label>Sản phẩm<select name="product" required><option value="">Chọn sản phẩm</option>{data.products.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
          <label>Vùng trồng<input name="region" required /></label>
          <label>Ngày dự kiến thu hoạch<input name="date" type="date" min={data.today} required /></label>
          <label>Sản lượng dự kiến (kg)<input name="kg" type="number" min="1" required /></label>
          <label>Hao hụt (%)<input name="loss" type="number" min="0" max="99" defaultValue="10" required /></label>
          <label>Giá (đ/kg)<input name="price" type="number" min="1" required /></label>
          <label>Phân loại<select name="grade"><option>Loại 1</option><option>Loại 2</option></select></label>
          <label>Màu nhận diện<select name="color"><option value="gold">Vàng</option><option value="green">Xanh lá</option><option value="red">Đỏ</option></select></label>
          <label>Ảnh lô hàng<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" /></label>
          <button className="harvest-primary">Mở đặt trước</button>
        </fieldset>
      </form>}
      {panel.kind === 'request' && <form onSubmit={event => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        void run(() => api.submitHarvestRequest({ productName: String(fields.get('product')), quantityKg: Number(fields.get('kg')),
          neededDate: String(fields.get('date')), note: String(fields.get('note')).trim() }), () => { show(); setNotice('Đã gửi yêu cầu riêng.'); });
      }}><fieldset disabled={busy} className="harvest-form">
        <label>Mặt hàng<input name="product" required /></label><label>Khối lượng (kg)<input name="kg" type="number" min="1" required /></label>
        <label>Ngày cần hàng<input name="date" type="date" min={data.today} required /></label><label>Ghi chú<textarea name="note" /></label>
        <button className="harvest-primary">Gửi yêu cầu</button>
      </fieldset></form>}
      {lot && panel.kind === 'lot' && <>
        <div className="harvest-detail-grid">
          <div><LotPhoto lot={lot} /><section><h3>Nhà vườn</h3><p>{lot.supplierName} · {lot.region}</p></section></div>
          <div><section><h3>Thông tin lô</h3><p>{lot.id} · {lot.title}</p><p>Thu hoạch dự kiến {day(lot.harvestDate)}</p></section>
            <section><h3>Sản phẩm</h3><p>{lot.productName} · {lot.grade}</p><p>Đăng {day(lot.postedAt)} · <b>{money(lot.pricePerKg)}/kg</b></p></section></div>
        </div>
        <LotStats lot={lot} />
        {seller ? <section><h3>Đơn đặt trước</h3>{data.orders.filter(row => row.lotId === lot.id).map(row => <OrderSummary key={row.id} order={row} lot={lot} seller />)}
          {!data.orders.some(row => row.lotId === lot.id) && <p>Chưa có đơn đặt trước.</p>}</section>
          : <button className="harvest-primary" disabled={lot.remaining === 0} onClick={() => show({ kind: 'buy', id: lot.id })}>{lot.remaining ? 'Đặt trước' : 'Đã hết lượng đặt trước'}</button>}
      </>}
      {lot && panel.kind === 'close' && <>
        <p>Đóng nhận đơn và tiền cọc mới cho lô <b>{lot.title}</b>?</p>
        <button className="harvest-primary" disabled={busy} onClick={() => void run(() => api.completeHarvestLot(lot.id), () => { show(); setNotice('Đã hoàn tất lô.'); })}>Xác nhận hoàn tất</button>
      </>}
      {lot && panel.kind === 'buy' && <form className="harvest-form" onSubmit={event => {
        event.preventDefault();
        void run(async () => {
          const created = await api.createPreorder(lot.id, quantity, requestKey.current);
          show({ kind: 'order', id: created.id });
        }, () => {});
      }}>
        <p>{lot.title} · {money(lot.pricePerKg)}/kg · Còn {kg(lot.remaining)}</p>
        <label>Khối lượng đặt (kg)<input type="number" min="1" max={lot.remaining} value={quantity || ''} onChange={event => setQuantity(Number(event.target.value))} required /></label>
        <p>Giá trị {money(quantity * lot.pricePerKg)} · Ký quỹ 10% {money(api.depositFor(quantity * lot.pricePerKg))}</p>
        <button className="harvest-primary" disabled={busy || !lot.remaining}>Tạo đơn đặt trước</button>
      </form>}
      {lot && order && <>
        <OrderSummary order={order} lot={lot} />
        {order.verification && <p>Đã xác nhận bằng {order.verification}</p>}
        {lot.completedAt && order.status !== 'DEPOSITED' && <p>Lô đã đóng nhận xác nhận và đặt cọc.</p>}
        {!lot.completedAt && order.status === 'PENDING' && <form className="harvest-form" onSubmit={event => {
          event.preventDefault(); void run(() => api.confirmPreorder(order.id, 'OTP', otp), () => setOtp(''));
        }}>
          <label>Mã OTP mô phỏng<input inputMode="numeric" maxLength={6} value={otp} onChange={event => setOtp(event.target.value)} required /></label>
          <p>Mã thử {api.preorderOtp}</p>
          <button className="harvest-primary" disabled={busy}>Xác nhận OTP</button>
          <button type="button" disabled={busy} onClick={() => void run(() => api.confirmPreorder(order.id, 'QR', ''), () => setOtp(''))}>Mô phỏng xác nhận QR</button>
        </form>}
        {!lot.completedAt && order.status === 'CONFIRMED' && <button className="harvest-primary" disabled={busy}
          onClick={() => void run(() => api.depositPreorder(order.id), () => {})}>Ký quỹ mô phỏng {money(order.depositVnd)}</button>}
      </>}
    </Dialog>}
  </main>;
}
