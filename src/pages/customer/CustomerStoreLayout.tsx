import { useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useBuyerCart } from '../../components/shared/useBuyerCart';
import './customer-store.css';

const buyerLinks = [
  ['/customer', 'Chợ', 'M3 10h18l-2-6H5zM5 10v10h14V10M9 20v-6h6v6'],
  ['/customer/preorders', 'Đặt trước', 'M4 6h16v14H4zM8 3v6m8-6v6M4 10h16m-8 3v4m-2-2h4'],
  ['/customer/checkout', 'Giỏ hàng', 'M3 5h2l2 10h12l2-7H6m3 11h.01m8 0h.01'],
  ['/customer/orders', 'Đơn hàng', 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6m-6 4h6'],
  ['/customer/green', 'FARMGO Xanh', 'm8 6 2-3 3 1 2 4m-3-1 3 1 1-3m3 5 2 4-2 3h-4m2-3-2 3 2 2m-5-1H6l-2-4 2-3m-3 1 3-1 1 3'],
  ['/customer/profile', 'Tài khoản', 'M4 21v-2a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0'],
] as const;

export function CustomerStoreLayout({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const cart = useBuyerCart();
  return <div className="customer-store">
    <div className="store-topbar"><div><span>Nông sản cho quán • Dữ liệu mô phỏng</span><div><Link to="/customer/catalog">Khám phá FARMGO</Link><Link to="/supplier">Dành cho người bán</Link></div></div></div>
    <header className="store-search-header"><Link className="store-logo" to="/customer"><img src="/farmgo-logo.png" alt="FARMGO"/><span>Nguồn hàng cho F&B</span></Link><Link className="store-category-link" to="/customer/catalog"><span aria-hidden="true">▦</span> Danh mục</Link><form role="search" onSubmit={event => { event.preventDefault(); navigate(`/customer/catalog?q=${encodeURIComponent(query.trim())}`); }}><label className="sr-only" htmlFor="store-search">Tìm nguyên liệu</label><input id="store-search" type="search" placeholder="Tìm kiếm sản phẩm, nhà cung cấp" value={query} onChange={event => setQuery(event.target.value)}/><button type="submit" aria-label="Tìm kiếm">⌕</button></form><nav className="buyer-icon-nav" aria-label="Mua sắm">
      {buyerLinks.map(([to, label, path]) => <NavLink key={to} to={to} end={to === '/customer'}>
        <span className="buyer-nav-icon"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={path} /></svg>
        {to === '/customer/checkout' && cart.items.length > 0 && <b aria-label={cart.items.length + ' mặt hàng'}>{cart.items.length}</b>}</span>
        {label}
      </NavLink>)}
    </nav></header>
    <div className="store-content">{children}</div>
  </div>;
}
