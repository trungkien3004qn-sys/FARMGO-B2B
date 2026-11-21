import { Fragment, useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useBuyerCart } from '../../components/shared/useBuyerCart';
import './customer-store.css';
import './home-storefront.css';
import { BuyerNotifications } from './BuyerNotifications';
import { StoreIcon } from './StoreIcon';
import { clearStoredAuth, getStoredUser } from '../../services/apiClient';
import { setDemoSession } from '../../services/demoService';
import { AppIcon } from '../../components/shared/AppIcon';

const buyerLinks = [
  ['/customer', 'Chợ', 'M3 10h18l-2-6H5zM5 10v10h14V10M9 20v-6h6v6'],
  ['/customer/preorders', 'Đặt trước', 'M4 6h16v14H4zM8 3v6m8-6v6M4 10h16m-8 3v4m-2-2h4'],
  ['/customer/checkout', 'Giỏ hàng', 'M3 5h2l2 10h12l2-7H6m3 11h.01m8 0h.01'],
  ['/customer/orders', 'Đơn hàng', 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6m-6 4h6'],
  ['/customer/wallet', 'Ví FarmGoPay', 'M3 10h18M7 15h1m4 0h5M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z'],
  ['/customer/green', 'FARMGO Xanh', 'm8 6 2-3 3 1 2 4m-3-1 3 1 1-3m3 5 2 4-2 3h-4m2-3-2 3 2 2m-5-1H6l-2-4 2-3m-3 1 3-1 1 3'],
  ['/customer/profile', 'Tài khoản', 'M4 21v-2a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0'],
] as const;

export function CustomerStoreLayout({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const cart = useBuyerCart();
  const user = getStoredUser();

  async function logout() {
    clearStoredAuth();
    try {
      await setDemoSession({ role: 'CUSTOMER', activeSupplierId: undefined, activeCustomerId: undefined });
    } finally {
      navigate('/login', { replace: true });
    }
  }

  return <div className="customer-store">
    <a className="store-skip-link" href="#store-main-content">Đến nội dung chính</a>
    <div className="store-topbar"><div><span>Nguồn sỉ nông sản trực tiếp từ nhà vườn cho F&B · Hotline: 1900 6868</span><nav aria-label="Liên kết tài khoản"><Link to="/htx">Cổng HTX Phân Bón</Link><Link to="/supplier">Dành cho người bán</Link><Link to="/login">{user ? 'Đổi tài khoản' : 'Đăng nhập'}</Link>{user && <button type="button" onClick={() => { void logout().catch(() => {}); }}>Đăng xuất</button>}</nav></div></div>
    <header className="store-search-header"><button className="store-mobile-menu" type="button" aria-expanded={menuOpen} aria-controls="buyer-navigation" onClick={()=>setMenuOpen(open=>!open)}><AppIcon name={menuOpen ? 'close' : 'menu'}/>{menuOpen ? 'Đóng menu' : 'Điều hướng'}</button><Link className="store-logo" to="/customer"><img src="/farmgo-logo.png" alt="FARMGO" width={110} height={62}/><span>Nguồn hàng cho F&B</span></Link><Link className="store-category-link" to="/customer/catalog"><StoreIcon name="grid"/> Danh mục</Link><form role="search" onSubmit={event => { event.preventDefault(); navigate(`/customer/catalog?q=${encodeURIComponent(query.trim())}`); }}><label className="store-visually-hidden" htmlFor="store-search">Tìm sản phẩm hoặc nhà cung cấp</label><input id="store-search" type="search" placeholder="Tìm sản phẩm, nhà cung cấp…" value={query} onChange={event => setQuery(event.target.value)}/><button type="submit" aria-label="Tìm kiếm"><StoreIcon name="search"/></button></form><nav id="buyer-navigation" data-open={menuOpen} className="buyer-icon-nav" aria-label="Mua sắm">
      {buyerLinks.map(([to, label, path]) => <Fragment key={to}>
        {to === '/customer/profile' && <BuyerNotifications key={cart.customerId} customerId={cart.customerId} />}
        <NavLink to={to} end={to === '/customer'} onClick={()=>setMenuOpen(false)}>
        <span className="buyer-nav-icon"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={path} /></svg>
        {to === '/customer/checkout' && cart.items.length > 0 && <b aria-label={cart.items.length + ' mặt hàng'}>{cart.items.length}</b>}</span>
        {label}
      </NavLink></Fragment>)}
    </nav></header>
    <div className="store-content" id="store-main-content" tabIndex={-1}>{children}</div>
  </div>;
}
