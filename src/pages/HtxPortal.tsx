import { useState, type FormEvent } from 'react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { ErrorMessage, LoadingSpinner } from '../components/shared/Feedback';
import { useDemoData } from '../components/shared/useDemoData';
import { money } from '../components/shared/useCatalog';
import { prepareProductPhoto } from '../components/shared/prepareProductPhoto';
import * as green from '../services/greenService';
import * as shop from '../services/htxService';
import type { HtxOrder, HtxProduct } from '../types/htx';
import './htx.css';

const stages = [
  ['WAITING', 'Chờ xác nhận', 'Kiểm tra yêu cầu thu gom của quán.'],
  ['CONFIRMED', 'Đã xác nhận', 'Điều xe đến địa chỉ đã đăng ký.'],
  ['EN_ROUTE', 'Điều xe', 'Cân và xác nhận bàn giao tại quán.'],
  ['COMPLETE', 'Kiểm đếm thành công', 'Đã cộng Điểm Xanh, đang chờ nhập xưởng.'],
  ['RECEIVED', 'Hoàn tất đơn hàng', 'Khối lượng thực tế đã nhập xưởng.'],
] as const;
const pickupIcons = ['◷', '✓', '⇢', '⚖', '⌂'];
const orderLabels = { PENDING: 'Chờ xử lý', SHIPPING: 'Đang giao', DELIVERED: 'Đã giao', CANCELLED: 'Đã hủy' };
const num = (value: number) => value.toLocaleString('vi-VN');
const time = (value: string) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
type Pickup = Awaited<ReturnType<typeof green.getHtxPickups>>[number];
const stageOf = (row: Pickup) => row.receivedAt ? 'RECEIVED' : row.status;
type Run = (action: () => Promise<unknown>) => Promise<boolean>;

function PickupActions({ row, busy, run }: { row: Pickup; busy: boolean; run: Run }) {
  const [weigh, setWeigh] = useState(false);
  if (row.status === 'WAITING') return <button disabled={busy} onClick={() => void run(() => green.confirmGreenPickup(row.id))}>Xác nhận yêu cầu</button>;
  if (row.status === 'CONFIRMED') return <button disabled={busy} onClick={() => void run(() => green.dispatchGreenPickup(row.id))}>Điều xe mô phỏng</button>;
  if (row.status === 'COMPLETE') return row.receivedAt
    ? <span>Nhập xưởng {time(row.receivedAt)}</span>
    : <button disabled={busy} onClick={() => void run(() => green.receiveGreenPickup(row.id))}>Xác nhận nhập xưởng</button>;
  if (!weigh) return <button onClick={() => setWeigh(true)}>Kiểm đếm tại quán</button>;
  return <form className="htx-form" onSubmit={async event => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const method = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'QR' ? 'QR' : 'OTP';
    if (await run(() => green.completeGreenPickup(row.id, Number(fields.get('kg')), method, String(fields.get('otp'))))) setWeigh(false);
  }}>
    <label>Khối lượng cân thực tế (kg)<input name="kg" type="number" min="1" required defaultValue={row.expectedKg} /></label>
    <label>OTP mô phỏng<input name="otp" inputMode="numeric" maxLength={6} placeholder={green.greenOtp} /></label>
    <div className="htx-actions"><button value="OTP" disabled={busy}>Xác nhận OTP</button><button value="QR" disabled={busy}>Mô phỏng quét QR</button></div>
  </form>;
}

function Dispatch({ rows, busy, run }: { rows: Pickup[]; busy: boolean; run: Run }) {
  const [filter, setFilter] = useState('all');
  const filtered = rows.filter(row => filter === stageOf(row));
  return <>
    <header className="htx-heading"><span className="htx-kicker">Vận hành thu gom tuần hoàn</span><h1>Bảng tin Điều phối thu gom</h1><p>Theo dõi từ lúc quán đăng ký đến khi bã hữu cơ được nhập xưởng.</p></header>
    <div className="htx-tabs" aria-label="Trạng thái thu gom" role="group">
      <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>Tổng quan</button>
      {stages.map(([id, title]) => <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{title} · {rows.filter(row => stageOf(row) === id).length}</button>)}
    </div>
    {filter === 'all' ? <>
      <div className="htx-metrics">{stages.map(([id, title, note], index) =>
        <button key={id} data-stage={id} onClick={() => setFilter(id)}><span className="htx-metric-top"><i aria-hidden="true">{pickupIcons[index]}</i><span>Xem danh sách →</span></span><strong>{rows.filter(row => stageOf(row) === id).length}</strong><b>{title}</b><span>{note}</span></button>)}</div>
      <section className="htx-card"><h2>Luồng xử lý đơn thu gom</h2>
        <ol className="htx-workflow">{stages.map(([id, title, note], index) => <li key={id} data-stage={id}><b>Bước {index + 1} · {title}</b><span>{note}</span></li>)}</ol>
      </section>
    </>
      : <section className="htx-card"><h2>{stages.find(([id]) => id === filter)?.[1]}</h2>
        {!filtered.length && <p>Chưa có yêu cầu ở trạng thái này.</p>}
        {filtered.map(row => <article className="htx-row" key={row.id}><div>
          <small>{row.id}</small><h3>{row.customerName}</h3><p>{row.address}</p>
          <p>{row.appointment.replace('T', ' · ')} · {row.types.join(', ')}</p>
          <p>Dự kiến {num(row.expectedKg)} kg{row.actualKg !== undefined && ` · Đã cân ${num(row.actualKg)} kg`}</p>
        </div><PickupActions row={row} busy={busy} run={run} /></article>)}
      </section>}
  </>;
}

function Recovery({ rows }: { rows: Pickup[] }) {
  const weighed = rows.filter(row => row.status === 'COMPLETE');
  const received = weighed.filter(row => row.receivedAt);
  const sumKg = (values: Pickup[]) => values.reduce((sum, row) => sum + (row.actualKg ?? 0), 0);
  return <>
    <header className="htx-heading"><span className="htx-kicker">Đối soát khối lượng và Điểm Xanh</span><h1>Lượng thu hồi tại nhà máy HTX</h1><p>Đối soát khối lượng đã cân, đã nhập xưởng và Điểm Xanh đã cấp.</p></header>
    <div className="htx-metrics">{[
      ['Đã cân tại quán', num(sumKg(weighed)) + ' kg'], ['Đang chở về', num(sumKg(weighed) - sumKg(received)) + ' kg'],
      ['Đã nhập xưởng', num(sumKg(received)) + ' kg'], ['Điểm Xanh đã cấp', num(sumKg(weighed) * green.greenRate)],
    ].map(([label, value]) => <div key={label}><b>{label}</b><strong>{value}</strong></div>)}</div>
    <div className="htx-grid htx-recovery">
      <section className="htx-card"><h2>Nhật ký nhập xưởng</h2>
        {!received.length && <p>Chưa có chuyến nhập xưởng.</p>}
        {received.map(row => <article className="htx-row" key={row.id}><div><b>{row.id} · {row.customerName}</b><p>{row.types.join(', ')}</p><p>{time(row.receivedAt!)}</p></div><strong>{num(row.expectedKg)} kg dự kiến · {num(row.actualKg!)} kg thực tế</strong></article>)}
      </section>
      <section className="htx-card"><h2>Sổ Điểm Xanh đối tác F&B</h2>
        {!weighed.length && <p>Chưa có chuyến đã cân.</p>}
        {weighed.map(row => <article className="htx-row" key={row.id}><div><b>{row.customerName}</b><p>{row.id} · {row.receivedAt ? 'Đã nhập xưởng' : 'Đang chở về'}</p></div><strong>+{num(row.actualKg! * green.greenRate)} điểm</strong></article>)}
      </section>
    </div>
  </>;
}

function Store({ products, busy, run }: { products: HtxProduct[]; busy: boolean; run: Run }) {
  const [edit, setEdit] = useState<HtxProduct | 'new'>();
  const current = edit === 'new' ? undefined : edit;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const file = fields.get('image');
    const saved = await run(async () => {
      const imageUrl = file instanceof File && file.size ? await prepareProductPhoto(file) : current?.imageUrl;
      await shop.saveHtxProduct({
        name: String(fields.get('name')), category: String(fields.get('category')), packaging: String(fields.get('packaging')),
        description: String(fields.get('description')), priceVnd: Number(fields.get('price')), stock: Number(fields.get('stock')), imageUrl,
      }, current?.id);
    });
    if (saved) setEdit(undefined);
  }
  return <>
    <header className="htx-heading htx-shop-heading"><div><h1>Gian hàng vật tư nông nghiệp sinh học</h1><p>Quản lý phân bón hữu cơ và chế phẩm sinh học.</p></div><button onClick={() => setEdit('new')}>Thêm sản phẩm mới</button></header>
    {edit && <section className="htx-card"><h2>{current ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h2>
      <form key={current?.id ?? 'new'} className="htx-form" onSubmit={submit}>
        <label>Tên sản phẩm<input name="name" required defaultValue={current?.name} /></label>
        <label>Loại sản phẩm<input name="category" required defaultValue={current?.category} /></label>
        <label>Quy cách<input name="packaging" required defaultValue={current?.packaging} /></label>
        <label>Đơn giá (đ)<input name="price" type="number" min="1" required defaultValue={current?.priceVnd} /></label>
        <label>Tồn kho<input name="stock" type="number" min="0" required defaultValue={current?.stock} /></label>
        <label>Ảnh sản phẩm<input name="image" type="file" accept="image/jpeg,image/png,image/webp" /></label>
        <label>Mô tả<textarea name="description" defaultValue={current?.description} /></label>
        <div className="htx-actions"><button disabled={busy}>Lưu sản phẩm</button><button type="button" disabled={busy} onClick={() => setEdit(undefined)}>Hủy</button></div>
      </form>
    </section>}
    <div className="htx-grid htx-products">{products.map(product => <article className="htx-card" key={product.id}>
      <div className="htx-product-image">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} loading="lazy" /> : <strong>{product.name}</strong>}<span className="htx-product-category">{product.category}</span><span className="htx-product-status" data-active={product.active}>{product.active ? 'Đang mở bán' : 'Đã ẩn'}</span></div>
      <h2>{product.name}</h2><p className="htx-product-description">{product.description}</p>
      <p>{product.packaging} · Tồn kho {num(product.stock)}</p><strong>{money(product.priceVnd)}</strong>
      <div className="htx-actions"><button onClick={() => setEdit(product)}>Sửa</button><button disabled={busy} onClick={() => void run(() => shop.setHtxProductActive(product.id, !product.active))}>{product.active ? 'Ẩn' : 'Mở bán lại'}</button></div>
    </article>)}</div>
  </>;
}

function Orders({ orders, now, busy, run }: { orders: HtxOrder[]; now: string; busy: boolean; run: Run }) {
  const [filter, setFilter] = useState('all');
  const rows = orders.filter(row => filter === 'all' || row.status === filter);
  const revenue = orders.filter(row => row.status === 'DELIVERED').reduce((sum, row) => sum + row.quantity * row.priceVnd, 0);
  const day = (value: string) => new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  return <>
    <header className="htx-heading htx-orders-heading"><div><h1>Quản lý đơn hàng nông nghiệp</h1><p>Theo dõi đơn vật tư và doanh thu từ đơn đã giao.</p></div>
      <div className="htx-order-metrics"><div><span>Đơn hôm nay</span><strong>{orders.filter(row => day(row.placedAt) === day(now)).length} đơn</strong></div><div><span>Doanh thu đơn đã giao</span><strong>{money(revenue)}</strong></div></div></header>
    <div className="htx-tabs" role="group" aria-label="Lọc đơn vật tư">
      {[['all', 'Tất cả đơn'], ...Object.entries(orderLabels)].map(([id, label]) => <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}
    </div>
    <div className="htx-table"><table><thead><tr>{['Mã đơn', 'Nhà vườn', 'Sản phẩm', 'Số lượng', 'Đơn giá', 'Thành tiền', 'Ngày đặt', 'Trạng thái', 'Thao tác'].map(label => <th key={label}>{label}</th>)}</tr></thead>
      <tbody>{rows.map(row => <tr key={row.id}>
        <td>{row.id}</td><td>{row.customer}</td><td>{row.productName}</td><td>{row.quantity}</td><td>{money(row.priceVnd)}</td><td>{money(row.quantity * row.priceVnd)}</td><td>{time(row.placedAt)}</td><td><b className="htx-order-status" data-status={row.status}>{orderLabels[row.status]}</b></td>
        <td><div className="htx-actions">{row.status === 'PENDING' && <>
          <button disabled={busy} onClick={() => void run(() => shop.advanceHtxOrder(row.id, 'SHIPPING'))}>Xử lý</button>
          <button disabled={busy} onClick={() => void run(() => shop.advanceHtxOrder(row.id, 'CANCELLED'))}>Hủy đơn</button>
        </>}{row.status === 'SHIPPING' && <button disabled={busy} onClick={() => void run(() => shop.advanceHtxOrder(row.id, 'DELIVERED'))}>Xác nhận đã giao</button>}</div></td>
      </tr>)}</tbody></table>{!rows.length && <p>Chưa có đơn ở trạng thái này.</p>}</div>
  </>;
}

export function HtxPortal() {
  const { data, error, busy, run } = useDemoData(async () => {
    const [pickups, commerce] = await Promise.all([green.getHtxPickups(), shop.getHtxCommerce()]);
    return { pickups, ...commerce };
  });
  return <div className="htx-layout">
    <aside><Link className="htx-brand" to="/htx">FARMGO <span>HTX</span></Link><p>Vận hành thu gom tuần hoàn</p>
      <div className="htx-identity"><span aria-hidden="true">HTX</span><strong>HTX Phân bón FARMGO</strong></div>
      <nav aria-label="Điều hướng HTX">
        <small>Vận hành & tuần hoàn</small>
        <NavLink to="/htx" end>Điều phối thu gom {!!data?.pickups.some(row => row.status === 'WAITING') && <b>{data.pickups.filter(row => row.status === 'WAITING').length}</b>}</NavLink><NavLink to="/htx/recovery">Lượng thu hồi được</NavLink>
        <small>Thương mại đầu ra</small><NavLink to="/htx/store">Gian hàng của tôi</NavLink><NavLink to="/htx/orders">Quản lý đơn hàng</NavLink>
      </nav><Link to="/customer/green">Về FARMGO Xanh</Link>
    </aside>
    <main><p className="htx-context">Cổng HTX Phân bón · Dữ liệu và thao tác mô phỏng</p>
      {error && <ErrorMessage message={error} />}
      {!data && !error && <LoadingSpinner />}
      {data && <Routes>
        <Route index element={<Dispatch rows={data.pickups} busy={busy} run={run} />} />
        <Route path="recovery" element={<Recovery rows={data.pickups} />} />
        <Route path="store" element={<Store products={data.products} busy={busy} run={run} />} />
        <Route path="orders" element={<Orders orders={data.orders} now={data.now} busy={busy} run={run} />} />
        <Route path="*" element={<Link to="/htx">Về điều phối thu gom</Link>} />
      </Routes>}
    </main>
  </div>;
}
