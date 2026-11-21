import { useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useDemoData } from '../../components/shared/useDemoData';
import * as api from '../../services/demoService';
import './seller.css';
import { AppIcon, type AppIconName } from '../../components/shared/AppIcon';
import { LucideIcon } from '../../components/shared/LucideIcon';

export function SellerLayout({ children }: { children: ReactNode }) {
  const state = useDemoData(async () => ({ session: await api.getDemoSession(), suppliers: await api.getSuppliers() }));
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const navigate = useNavigate();
  const supplier = state.data?.suppliers.find(item => item.id === state.data?.session.activeSupplierId);
  const links = [
    ['/supplier', 'clock', 'Tổng quan & tài chính'],
    ['/supplier/wallet', 'creditCard', 'Ví FarmGoPay'],
    ['/supplier/products', 'package', 'Sản phẩm & báo giá'],
    ['/supplier/htx-products', 'recycle', 'Sàn Phân Bón Vi Sinh'],
    ['/supplier/preorders', 'sprout', 'Đăng bán trước thu hoạch'],
    ['/supplier/orders', 'clipboardList', 'Xử lý đơn hàng'],
    ['/supplier/quality', 'shieldCheck', 'Chất lượng & QC'],
    ['/supplier/claims', 'alertTriangle', 'Khiếu nại & bồi thường'],
    ['/supplier/reviews', 'star', 'Đánh giá & phản hồi'],
    ['/supplier/profile', 'building', 'Thông tin nhà vườn'],
  ];
  return <div className="seller-shell">
    <a className="portal-skip-link" href="#seller-main">Đến nội dung chính</a>
    <aside className="seller-sidebar" data-open={menuOpen}>
      <Link to="/supplier" className="seller-brand">
        <img src="/farmgo-logo.png" alt="FARMGO"/>
        <div><strong>FARMGO <em>Seller</em></strong><small>Cổng quản lý nhà cung cấp</small></div>
      </Link>
      <button className="portal-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="seller-navigation" onClick={() => setMenuOpen(open => !open)}>
        <AppIcon name={menuOpen ? 'close' : 'menu'}/>
        {menuOpen ? 'Đóng menu' : 'Điều hướng'}
      </button>
      <div className="seller-identity">
        <span>{supplier?.name.charAt(0) || 'N'}</span>
        <div><strong>{supplier?.name || 'Nhà cung cấp'}</strong><small>● Tài khoản mô phỏng</small></div>
      </div>
      <nav aria-label="Điều hướng seller" id="seller-navigation">
        {links.map(([to,icon,label]) => (
          <NavLink key={to} to={to} end={to === '/supplier'} onClick={() => setMenuOpen(false)}>
            <AppIcon name={icon as AppIconName} size={16}/>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="seller-side-extra">
        <Link to="/customer">Xem cửa hàng</Link>
      </div>
      <footer>Hệ thống FARMGO B2B<small>Dữ liệu và thao tác mô phỏng</small></footer>
    </aside>
    <div className="seller-workspace">
      <header className="seller-topbar">
        <form role="search" onSubmit={event => { event.preventDefault(); navigate(`/supplier/products?q=${encodeURIComponent(query.trim())}`); }}>
          <label className="sr-only" htmlFor="seller-search">Tìm sản phẩm hoặc mã SKU</label>
          <input id="seller-search" placeholder="Tìm sản phẩm, mã SKU, báo giá…" value={query} onChange={event => setQuery(event.target.value)}/>
          <button aria-label="Tìm kiếm"><LucideIcon name="search" size={16}/></button>
        </form>
        <button className="seller-notify" onClick={() => setNotice('Thông báo mô phỏng: có yêu cầu đặt nông sản mới. Không gửi SMS và không tạo đơn hàng.')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <LucideIcon name="bell" size={15}/> Giả lập thông báo đơn mới
        </button>
        <Link className="seller-user" to="/supplier/profile">
          <span>{supplier?.name.charAt(0) || 'N'}</span>
          <div><strong>{supplier?.name || 'Nhà cung cấp'}</strong><small>{supplier?.regionLabel || 'Hồ sơ doanh nghiệp'}</small></div>
        </Link>
      </header>
      {notice && <div className="seller-notice" role="status">
        {notice}
        <button onClick={() => setNotice('')} aria-label="Đóng thông báo"><LucideIcon name="x" size={14}/></button>
      </div>}
      {state.error && <p role="alert">{state.error}</p>}
      <div className="seller-content" id="seller-main" tabIndex={-1}>{children}</div>
      <footer className="seller-footer">
        <div><strong>FARMGO Seller</strong><span>Cổng quản lý nhà cung cấp · Dữ liệu mô phỏng</span></div>
        <Link to="/customer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          Mở cửa hàng FARMGO <LucideIcon name="arrowUpRight" size={14}/>
        </Link>
        <small>© {new Date().getFullYear()} FARMGO · Giao diện demo</small>
      </footer>
    </div>
  </div>;
}
