import { Link } from 'react-router-dom';
import { useRef, useState } from 'react';
import * as green from '../../services/greenService';
import { getCustomers, setDemoSession } from '../../services/demoService';
import { organicTypes, type GreenPickup } from '../../types/green';
import { useDemoData } from '../../components/shared/useDemoData';
import { ErrorMessage, LoadingSpinner } from '../../components/shared/Feedback';
import { GreenDialog, VoucherTile } from './GreenVoucherDialog';

const number = (value: number) => value.toLocaleString('vi-VN');
const statuses = { WAITING: 'Đang chờ gom', CONFIRMED: 'Đã xác nhận', EN_ROUTE: 'Xe đang tới', COMPLETE: 'Hoàn tất' };
const appointmentLabel = (value: string) => value.slice(11) + ' · ' + value.slice(0, 10).split('-').reverse().join('/');

export function FarmgoGreenPage() {
  const { data, error, run, busy } = useDemoData(async () => {
    const [account, customers] = await Promise.all([green.getGreenAccount(), getCustomers()]);
    return { ...account, customers };
  });
  const [filter, setFilter] = useState<keyof typeof statuses | 'all'>('all');
  const [expected, setExpected] = useState('');
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [dialogError, setDialogError] = useState('');
  const lock = useRef(false);
  const form = useRef<HTMLFormElement>(null);

  if (!data) return error ? <ErrorMessage message={error} /> : <LoadingSpinner />;
  const account = data;
  const visible = account.pickups.filter(row => filter === 'all' || row.status === filter);
  async function dialogAction(action: () => Promise<unknown>, success: string) {
    if (lock.current) return;
    lock.current = true;
    setDialogError('');
    try { await action(); setNotice(success); }
    catch (failure) { setDialogError(failure instanceof Error ? failure.message : 'Không lưu được dữ liệu.'); }
    finally { lock.current = false; }
  }
  return <div className="green-page">
    <header className="green-banner"><div><h1>FARMGO Xanh</h1><p>{account.customerName} · Thu gom bã hữu cơ</p><strong>1 kg = 2.000 Điểm Xanh · 2.000 đ giảm phí giao</strong></div>
      <button className="green-redeem" onClick={() => { setDialogError(''); setVoucherOpen(true); }}>Đổi voucher</button></header>
    <p className="green-muted">Thu gom và ưu đãi mô phỏng · <Link to="/htx">Cổng HTX Phân bón</Link></p>
    <label className="green-account-picker">Tài khoản mua mô phỏng <select value={account.customerId} disabled={busy} onChange={event => {
      const activeCustomerId = event.target.value;
      setNotice('');
      setExpected('');
      setFilter('all');
      void run(() => setDemoSession({ activeCustomerId }));
    }}>{account.customers.map(customer => <option key={customer.id} value={customer.id}>{customer.businessName}</option>)}</select></label>
    {error && <ErrorMessage message={error} />}
    {notice && <p role="status">{notice}</p>}
    <div className="green-metrics">
      <section><h2>Điểm Xanh khả dụng</h2><strong>{number(account.points)} điểm</strong></section>
      <section><h2>Đã bàn giao tháng này</h2><strong>{number(account.monthlyKg)} kg</strong></section>
    </div>
    <div className="green-tabs" role="group" aria-label="Lọc yêu cầu thu gom">
      <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>Tổng quan</button>
      {(Object.keys(statuses) as (keyof typeof statuses)[]).map(status => <button key={status} aria-pressed={filter === status}
        onClick={() => setFilter(status)}>{statuses[status]} ({account.pickups.filter(row => row.status === status).length})</button>)}
      <button onClick={() => form.current?.querySelector('input')?.focus()}>+ Thêm đơn mới</button>
    </div>
    <form ref={form} className="green-card green-form" key={account.customerId} onSubmit={async event => {
      event.preventDefault();
      const element = event.currentTarget;
      const fields = new FormData(element);
      const saved = await run(() => green.registerGreenPickup(account.customerId, {
        types: fields.getAll('types') as GreenPickup['types'], expectedKg: Number(fields.get('kg')),
        appointment: String(fields.get('appointment')), address: String(fields.get('address')),
      }));
      if (saved) { element.reset(); setExpected(''); setFilter('all'); setNotice('Đã đăng ký thu gom.'); }
    }}>
      <h2>Đăng ký thu gom bã hữu cơ</h2>
      <fieldset><legend>Loại bã hữu cơ</legend><div className="green-types">{organicTypes.map(type => <label key={type}><input type="checkbox" name="types" value={type} />{type}</label>)}</div></fieldset>
      <div className="green-fields">
        <label>Khối lượng dự kiến (kg)<input name="kg" type="number" min="1" value={expected} onChange={event => setExpected(event.target.value)} required /></label>
        <label>Thời gian bàn giao<input name="appointment" type="datetime-local" required /></label>
        <label>Địa chỉ thu gom<input name="address" defaultValue={account.addresses[0]?.address} required /></label>
      </div>
      <p>Dự kiến nhận <strong>{number((Number(expected) || 0) * green.greenRate)} Điểm Xanh</strong></p>
      <button className="green-primary" disabled={busy}>Đăng ký thu gom</button>
    </form>
    {[{ title: 'Yêu cầu đang xử lý', rows: visible.filter(row => row.status !== 'COMPLETE'), show: filter !== 'COMPLETE' },
      { title: 'Lịch sử bàn giao bã hữu cơ', rows: visible.filter(row => row.status === 'COMPLETE'), show: filter === 'all' || filter === 'COMPLETE' }].filter(group => group.show).map(group =>
      <section className="green-card" key={group.title}><h2>{group.title}</h2>
        {!group.rows.length && <p className="green-muted">Chưa có yêu cầu trong mục này.</p>}
        {group.rows.map(row => <article className="green-pickup" data-status={row.status} key={row.id}>
          <div><strong>{row.id} · {row.receivedAt ? 'Đã nhập xưởng' : statuses[row.status]}</strong><p>{row.types.join(' · ')}</p>
            <p>{row.status === 'COMPLETE' ? appointmentLabel(new Date(Date.parse(row.completedAt!) + 7 * 3600000).toISOString().slice(0, 16)) : appointmentLabel(row.appointment)} · {row.address}</p>
            <p>{number(row.actualKg ?? row.expectedKg)} kg · {row.status === 'COMPLETE' ? '+' : 'Dự kiến '}{number((row.actualKg ?? row.expectedKg) * green.greenRate)} điểm</p></div>
        </article>)}
      </section>)}
    {!!account.vouchers.length && <section className="green-card"><h2>Voucher của tôi</h2>{account.vouchers.map(row =>
      <VoucherTile key={row.id} value={row.valueVnd} action={<b>{row.usedOrderId ? 'Đã dùng' : 'Sẵn sàng'}</b>}>{row.id}</VoucherTile>)}</section>}
    {voucherOpen && <GreenDialog title="Đổi Điểm Xanh lấy voucher vận chuyển" close={() => setVoucherOpen(false)}>
      <p>Số dư hiện tại <b>{number(account.points)} Điểm Xanh</b></p>
      {dialogError && <ErrorMessage message={dialogError} />}
      {green.greenVoucherValues.map(value => <VoucherTile key={value} value={value} action={<button type="button" className="green-primary"
        disabled={account.points < value} onClick={() => void dialogAction(() => green.redeemGreenVoucher(account.customerId, value, crypto.randomUUID()), 'Đã đổi voucher vận chuyển.')}>Đổi ngay</button>}>
        Cần {number(value)} điểm{account.points < value && <div>Thiếu {number(value - account.points)} điểm</div>}
      </VoucherTile>)}
    </GreenDialog>}
  </div>;
}
