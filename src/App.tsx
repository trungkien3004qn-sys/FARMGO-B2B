import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SupplierDashboard } from './pages/supplier/SupplierDashboard';
import { CustomerMarketplace } from './pages/customer/CustomerMarketplace';
import { AdminPortalApp, TransportPortalApp } from './pages/auth/PortalApps';
import { HtxPortal } from './pages/HtxPortal';
import { FarmBioPage } from './pages/FarmBioPage';
import { UnifiedAuthPage } from './pages/auth/UnifiedAuthPage';
import { RealUserHeader } from './components/shared/RealUserHeader';
import { MotionScoreBadge } from './components/shared/MotionScoreBadge';
import { getStoredUser } from './services/apiClient';

export default function App() {
  const location = useLocation();
  const currentUser = getStoredUser();

  // 1. Nếu đang ở trang Đăng nhập / Đăng ký
  if (location.pathname === '/login' || location.pathname === '/register') {
    return (
      <>
        <UnifiedAuthPage />
        <MotionScoreBadge />
      </>
    );
  }

  // 2. Cổng riêng của HTX hoặc Farm Bio
  if (location.pathname === '/htx' || location.pathname.startsWith('/htx/')) {
    return (
      <div className="app-container">
        <RealUserHeader />
        <main className="app-main">
          <Routes><Route path="/htx/*" element={<HtxPortal />} /></Routes>
        </main>
      </div>
    );
  }

  if (location.pathname.startsWith('/farm')) {
    return (
      <div className="app-container">
        <RealUserHeader />
        <main className="app-main">
          <Routes>
            <Route path="/farm/:supplierId" element={<FarmBioPage />} />
            <Route path="/farm" element={<FarmBioPage />} />
          </Routes>
        </main>
      </div>
    );
  }

  // 3. Phân hệ Admin & Vận chuyển (Giao diện chuyên biệt)
  if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/transport')) {
    return (
      <Routes>
        <Route path="/admin/*" element={<AdminPortalApp />} />
        <Route path="/transport/*" element={<TransportPortalApp />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // 4. Nếu chưa đăng nhập bất kỳ tài khoản nào mà vào trang chủ hoặc phân hệ: Tự động điều hướng về /login
  if (!currentUser && (location.pathname === '/' || location.pathname === '/supplier' || location.pathname === '/customer')) {
    return <Navigate to="/login" replace />;
  }

  // 5. Xác định trang chủ theo vai trò khi vào trang gốc "/"
  const getRoleHomePage = () => {
    if (!currentUser) return '/login';
    if (currentUser.role === 'SUPPLIER') return '/supplier/products';
    if (currentUser.role === 'FERTILIZER') return '/htx';
    if (currentUser.role === 'DRIVER') return '/transport/dashboard';
    if (currentUser.role === 'ADMIN') return '/admin';
    return '/customer';
  };

  const isSellerApp = location.pathname.startsWith('/supplier');
  const isCustomerApp = location.pathname.startsWith('/customer');

  return (
    <div className={`app-container ${isCustomerApp ? 'customer-app' : isSellerApp ? 'seller-app' : ''}`}>
      {/* Header chuẩn Web thực tế (Không có banner demo, không có nút reset dữ liệu) */}
      <RealUserHeader />

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to={getRoleHomePage()} replace />} />
          <Route path="/login" element={<UnifiedAuthPage />} />
          <Route path="/register" element={<UnifiedAuthPage />} />
          <Route path="/supplier/*" element={<SupplierDashboard />} />
          <Route path="/customer/*" element={<CustomerMarketplace />} />
          <Route
            path="*"
            element={<Navigate to={getRoleHomePage()} replace />}
          />
        </Routes>
      </main>

      {/* Floating MotionScore Audit Badge (100/100 GPU Compositor) */}
      <MotionScoreBadge />
    </div>
  );
}
