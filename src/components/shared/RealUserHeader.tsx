import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { clearStoredAuth, getStoredUser } from '../../services/apiClient';
import { setDemoSession } from '../../services/demoService';
import { LucideIcon } from './LucideIcon';

interface SubsystemTab {
  id: string;
  label: string;
  icon: 'shoppingBag' | 'leaf' | 'truck' | 'shield';
  path: string;
  match: (path: string) => boolean;
}

const SUBSYSTEM_TABS: SubsystemTab[] = [
  {
    id: 'buyer',
    label: 'Bên mua',
    icon: 'shoppingBag',
    path: '/customer',
    match: (p) => p.startsWith('/customer'),
  },
  {
    id: 'supplier',
    label: 'Nhà vườn',
    icon: 'leaf',
    path: '/supplier',
    match: (p) => p.startsWith('/supplier'),
  },
  {
    id: 'transport',
    label: 'Vận chuyển',
    icon: 'truck',
    path: '/transport/dashboard',
    match: (p) => p.startsWith('/transport'),
  },
  {
    id: 'admin',
    label: 'Quản trị',
    icon: 'shield',
    path: '/admin',
    match: (p) => p.startsWith('/admin'),
  },
];

export function RealUserHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getStoredUser();

  const currentTab = SUBSYSTEM_TABS.find((tab) => tab.match(location.pathname))?.id || 'buyer';

  async function logout() {
    clearStoredAuth();
    try {
      await setDemoSession({ role: 'CUSTOMER', activeSupplierId: undefined, activeCustomerId: undefined });
    } catch {
      /* Authentication is cleared even if the demo reset fails. */
    }
    navigate('/login', { replace: true });
  }

  return (
    <header className="account-header">
      <Link
        className="account-brand"
        to={
          user?.role === 'SUPPLIER'
            ? '/supplier'
            : user?.role === 'FERTILIZER'
            ? '/htx'
            : user?.role === 'DRIVER'
            ? '/transport/dashboard'
            : user?.role === 'ADMIN'
            ? '/admin'
            : '/customer'
        }
      >
        <img src="/farmgo-logo.png" width={72} height={40} alt="FARMGO" />
        <span>Nền tảng nông sản B2B</span>
      </Link>

      {/* Thanh trượt chuyển Tab Phân Hệ với Motion layoutId */}
      <nav className="header-subsystem-bar" aria-label="Chuyển đổi phân hệ làm việc">
        {SUBSYSTEM_TABS.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <Link
              key={tab.id}
              to={tab.path}
              className={`header-subsystem-tab ${isActive ? 'is-active' : ''}`}
            >
              {isActive && (
                <motion.div
                  layoutId="header-subsystem-indicator"
                  className="header-subsystem-indicator"
                  transition={{
                    type: 'spring',
                    stiffness: 420,
                    damping: 32,
                    mass: 0.8,
                  }}
                />
              )}
              <LucideIcon name={tab.icon} size={15} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="account-actions">
        {user && (
          <span className="account-name" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <LucideIcon name="user" size={15} />
            {user.name}
          </span>
        )}
        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <LucideIcon name={user ? 'refreshCw' : 'logIn'} size={15} />
          {user ? 'Đổi tài khoản' : 'Đăng nhập'}
        </Link>
        {user && (
          <button
            type="button"
            onClick={() => void logout()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          >
            <LucideIcon name="logOut" size={15} />
            Đăng xuất
          </button>
        )}
      </div>
    </header>
  );
}
