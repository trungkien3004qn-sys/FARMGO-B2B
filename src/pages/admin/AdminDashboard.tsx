import { useState } from 'react';
import { NavLink, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { FinancePage } from '../FinancePage';
import { ApprovalsPage } from './ApprovalsPage';
import { QualityPage } from '../QualityPage';
import { ClaimsPage } from '../ClaimsPage';
import { PricingPage } from './PricingPage';
import { AdminOrdersPage } from './AdminOrdersPage';
import { AggregatePage } from './AggregatePage';
import { LabelsPage } from './LabelsPage';
import { ShipmentsPage } from './ShipmentsPage';
import { AdminSuppliersPage } from './AdminSuppliersPage';
import { HubProductPhotos } from '../../components/shared/HubProductPhotos';
import * as api from '../../services/demoService';
import { useDemoData } from '../../components/shared/useDemoData';
import { money } from '../../components/shared/useCatalog';
import './admin-dashboard.css';
import { AppIcon, type AppIconName } from '../../components/shared/AppIcon';
import { LucideIcon } from '../../components/shared/LucideIcon';

const navigation = [
  { title: 'Quản trị hệ thống', items: [
    { to: '/admin/approvals', label: 'Duyệt Doanh Nghiệp F&B', mark: 'building' },
    { to: '/admin/suppliers', label: 'Nhà cung cấp', mark: 'sprout' },
    { to: '/admin/quality', label: 'Kiểm duyệt nhà cung cấp', mark: 'shieldCheck' },
    { to: '/admin/claims', label: 'Khiếu nại SLA 2h', mark: 'alertTriangle' },
    { to: '/admin/shipments', label: 'Đơn hàng & Milk-Run', mark: 'truck' },
    { to: '/admin/finance', label: 'Đối soát & Ví Escrow', mark: 'wallet' },
  ] },
];

const pageTitles: Record<string, string> = {
  '/admin': 'Tổng quan vận hành', '/admin/approvals': 'Duyệt doanh nghiệp',
  '/admin/suppliers': 'Nhà cung cấp', '/admin/quality': 'Kiểm duyệt nhà cung cấp',
  '/admin/claims': 'Khiếu nại', '/admin/orders': 'Đơn hàng',
  '/admin/aggregate': 'Gom nhu cầu', '/admin/shipments': 'Đơn hàng & Milk-Run',
  '/admin/products': 'Danh mục & giá', '/admin/labels': 'Tem sọt',
  '/admin/finance': 'Tiền & đối soát',
};

export function AdminDashboard({ displayName, onSignOut }: { displayName: string; onSignOut: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? pageTitles['/admin/approvals'];

  return <HubProductPhotos><div className="freso-admin-shell">
    <a className="portal-skip-link" href="#admin-main">Đến nội dung chính</a><aside className="admin-console-sidebar" data-open={menuOpen}>
      <div className="admin-console-brand"><img className="admin-console-logo" src="/farmgo-logo.png" alt="FARMGO"/><span><strong>Trung tâm điều hành <b>HQ</b></strong><small>FruitHub · Dữ liệu mô phỏng</small></span></div>
      <button className="portal-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="admin-navigation" onClick={() => setMenuOpen(open => !open)}><AppIcon name={menuOpen ? 'close' : 'menu'}/>{menuOpen ? 'Đóng menu' : 'Điều hướng'}</button>
      <div className="admin-console-profile"><span className="admin-profile-avatar">{displayName.slice(0, 1).toUpperCase()}</span><span className="admin-profile-copy"><strong>{displayName}</strong><small>Head of Operations & QC</small></span><i/><button className="admin-sidebar-signout" onClick={onSignOut} aria-label="Đăng xuất"><LucideIcon name="logOut" size={14}/></button></div>
      <nav id="admin-navigation" aria-label="Điều hướng Admin" className="admin-console-nav">
        {navigation.map(group => <section key={group.title} className="admin-nav-group">
          <h2>{group.title}</h2>
          {group.items.map(item => <NavLink key={item.to} to={item.to} onClick={() => setMenuOpen(false)} className={({ isActive }) => `admin-console-link${isActive ? ' active' : ''}`}>
            <AppIcon name={item.mark as AppIconName}/><span>{item.label}</span>
          </NavLink>)}
        </section>)}
      </nav>
      <button className="admin-mobile-signout" type="button" onClick={onSignOut}>Đăng xuất</button>
      <div className="admin-sidebar-foot"><div><span>FARMGO Engine</span><strong><i/> MÔ PHỎNG</strong></div><div><span>Chế độ</span><strong>Mô phỏng</strong></div><small>Không kết nối dịch vụ thật</small></div>
    </aside>
    <section className="admin-console-main">
      <header className="admin-console-topbar"><div className="admin-topbar-inner"><div className="admin-topbar-crumb"><span><LucideIcon name="zap" size={13} /> CENTRAL SYSTEM</span><i>/</i><strong>{title}</strong></div><AdminTopbarActions/></div></header>
      <main className="admin-console-content" id="admin-main" tabIndex={-1}><div className="admin-page-wrapper"><Routes>
        <Route path="finance" element={<FinancePage/>}/><Route path="claims" element={<ClaimsPage/>}/>
        <Route path="quality" element={<QualityPage/>}/><Route path="approvals" element={<ApprovalsPage/>}/>
        <Route index element={<Navigate to="/admin/approvals" replace/>}/><Route path="products" element={<PricingPage/>}/>
        <Route path="suppliers" element={<AdminSuppliersPage/>}/><Route path="orders" element={<AdminOrdersPage/>}/>
        <Route path="aggregate" element={<AggregatePage/>}/><Route path="labels" element={<LabelsPage/>}/>
        <Route path="shipments" element={<ShipmentsPage/>}/><Route path="*" element={<Navigate to="/admin" replace/>}/>
      </Routes></div></main>
    </section>
  </div></HubProductPhotos>;
}

function AdminTopbarActions() {
  const state = useDemoData(api.getFinance);
  const [batchMessage, setBatchMessage] = useState('');
  const escrowVnd = state.data?.allocations.filter(allocation => allocation.status === 'HELD').reduce((total, allocation) => total + allocation.goodsVnd - allocation.refundedVnd, 0) ?? 0;
  const runBatch = async () => {
    setBatchMessage('');
    const success = await state.run(async () => {
      const demand = await api.aggregateDemand();
      setBatchMessage(`Đã gom nhu cầu thành ${demand.length} nhóm.`);
    });
    if (!success) setBatchMessage('');
  };

  return <div className="admin-topbar-actions">
    <div className="admin-escrow-chip"><i/>Tổng tiền hàng đang giữ: <strong>{state.data ? money(escrowVnd) : 'Đang tải…'}</strong></div>
    <button className="admin-batch-button" onClick={() => void runBatch()} disabled={state.busy} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
      <LucideIcon name="zap" size={14}/> Chạy Batch 21h00
    </button>
    {(state.error || batchMessage) && <span className={state.error ? 'admin-topbar-feedback is-error' : 'admin-topbar-feedback'} role="status">{state.error || batchMessage}</span>}
  </div>;
}
