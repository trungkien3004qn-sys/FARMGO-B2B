import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { api, getStoredUser, clearStoredAuth } from '../../services/apiClient';
import type { BackendUser } from '../../services/apiClient';
import { setDemoSession } from '../../services/demoService';
import { signInDemoPortal } from '../../services/portalSessionService';

import { AppIcon, type AppIconName } from '../../components/shared/AppIcon';

type RoleCategory = 'BUYER' | 'SUPPLIER' | 'FERTILIZER' | 'DRIVER' | 'ADMIN';

export function UnifiedAuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [accountRevision, setAccountRevision] = useState(0);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState('');
  const [currentUser, setCurrentUser] = useState<BackendUser | null>(getStoredUser());
  const [selectedRole, setSelectedRole] = useState<RoleCategory>('BUYER');
  const [authMode, setAuthMode] = useState<'quick' | 'login' | 'register'>(location.pathname === '/register' ? 'register' : 'quick');
  const [accounts, setAccounts] = useState<BackendUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Đăng nhập
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('123456');

  // Form Đăng ký
  const [regName, setRegName] = useState('');
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regPassword, setRegPassword] = useState('123456');

  // Load danh sách tài khoản từ Backend Database
  useEffect(() => {
    let isMounted = true;
    setAccountsLoading(true);
    setAccountsError('');
    api.getAccounts()
      .then(data => {
        if (isMounted) setAccounts(data);
      })
      .catch(err => {
        if (isMounted) setAccountsError(err instanceof Error ? err.message : 'Không tải được danh sách tài khoản.');
      })
      .finally(() => { if (isMounted) setAccountsLoading(false); });
    return () => { isMounted = false; };
  }, [accountRevision]);

  // Chuyển hướng đúng đến trang làm việc của từng vai trò
  const handleRedirectByRole = async (user: BackendUser) => {
    if (user.role === 'SUPPLIER') {
      await setDemoSession({ role: 'SUPPLIER', activeSupplierId: user.id });
      navigate('/supplier/products', { replace: true });
    } else if (user.role === 'BUYER') {
      await setDemoSession({ role: 'CUSTOMER', activeCustomerId: user.id });
      navigate('/customer', { replace: true });
    } else if (user.role === 'FERTILIZER') {
      navigate('/htx', { replace: true });
    } else if (user.role === 'DRIVER') {
      try { signInDemoPortal('transport', user.email, '123456'); } catch { /* ignore */ }
      navigate('/transport/dashboard', { replace: true });
    } else if (user.role === 'ADMIN') {
      try { signInDemoPortal('admin', user.email, '123456'); } catch { /* ignore */ }
      navigate('/admin', { replace: true });
    }
  };

  // Đăng nhập nhanh
  const handleQuickLogin = async (acc: BackendUser) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(acc.email, '123456');
      setCurrentUser(res.user);
      setSuccessMsg(`Đăng nhập thành công: ${acc.name}!`);
      setTimeout(() => {
        handleRedirectByRole(res.user);
      }, 400);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập không thành công.');
    } finally {
      setLoading(false);
    }
  };

  // Đăng nhập thủ công
  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(loginEmail, loginPassword);
      setCurrentUser(res.user);
      setSuccessMsg('Đăng nhập thành công! Đang chuyển hướng...');
      setTimeout(() => {
        handleRedirectByRole(res.user);
      }, 400);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Email hoặc mật khẩu không chính xác.');
    } finally {
      setLoading(false);
    }
  };

  // Đăng ký tài khoản mới
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail || !regName) {
      setError('Vui lòng điền đầy đủ email và họ tên người đại diện.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.register({
        email: regEmail,
        password: regPassword,
        name: regName,
        role: selectedRole,
        companyName: regCompanyName,
        phone: regPhone,
        address: regAddress,
      });
      setCurrentUser(res.user);
      setSuccessMsg(`Tạo tài khoản ${regName} thành công! Đang vào hệ thống...`);
      api.getAccounts().then(setAccounts).catch(() => {});
      setTimeout(() => {
        handleRedirectByRole(res.user);
      }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tạo được tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearStoredAuth();
    setCurrentUser(null);
    setSuccessMsg('Đã đăng xuất.');
  };

  // Lọc tài khoản theo loại người dùng được chọn
  const roleAccounts = accounts.filter(acc => acc.role === selectedRole);

  const roleInfo: Record<RoleCategory, { title: string; desc: string }> = {
    BUYER: {
      title: 'Khách hàng doanh nghiệp F&B',
      desc: 'Khám phá nguồn nông sản tươi, so sánh giá công khai, đặt mua nguyên liệu và đăng ký thu gom bã hữu cơ tuần hoàn.',
    },
    SUPPLIER: {
      title: 'Nhà vườn & Hợp tác xã nông sản',
      desc: 'Quản lý nông sản, cập nhật giá sỉ công khai, tiếp nhận đơn đặt hàng từ các quán F&B và dùng ví mua phân bón hữu cơ.',
    },
    FERTILIZER: {
      title: 'Nhà sản xuất phân bón & Chế phẩm sinh học',
      desc: 'Đơn vị thu mua bã hữu cơ từ các quán F&B, quản lý xưởng ủ men vi sinh và bán phân bón hữu cơ/trùn quế cho các nhà vườn.',
    },
    DRIVER: {
      title: 'Đơn vị vận chuyển (Logistics 2 chiều)',
      desc: 'Chiều đi giao nông sản đến quán F&B, chiều về tiện chuyến thu gom bã hữu cơ chở về xưởng nhà máy phân bón.',
    },
    ADMIN: {
      title: 'Ban điều hành hệ thống sàn FARMGO',
      desc: 'Điều phối đơn hàng, kiểm duyệt chất lượng nông sản, quản lý quỹ sàn và phân bổ hoa hồng minh bạch.',
    },
  };
  const roles: { role: RoleCategory; icon: AppIconName; label: string; description: string }[] = [
    { role: 'BUYER', icon: 'building', label: 'Bên mua F&B', description: 'Đặt sỉ nông sản & bán bã' },
    { role: 'SUPPLIER', icon: 'leaf', label: 'Nhà vườn / HTX', description: 'Cung cấp nông sản sạch' },
    { role: 'FERTILIZER', icon: 'recycle', label: 'Nhà SX Phân Bón', description: 'Thu mua bã & bán phân' },
    { role: 'DRIVER', icon: 'truck', label: 'Vận chuyển', description: 'Giao nông sản & gom bã' },
    { role: 'ADMIN', icon: 'shield', label: 'Quản trị sàn', description: 'Điều phối và đối soát' },
  ];
  return <main className="unified-auth">
    <div className="unified-auth-inner">
      <header className="unified-auth-heading"><img src="/farmgo-logo.png" alt="FARMGO" width={120} height={68}/><h1>Chọn không gian làm việc</h1><p>Đăng nhập FARMGO theo vai trò của bạn trong chuỗi cung ứng nông sản.</p></header>
      {currentUser && <div className="unified-session"><span>Phiên hiện tại: <strong>{currentUser.name}</strong></span><div className="action-row"><button className="btn-primary" type="button" onClick={() => void handleRedirectByRole(currentUser)}>Tiếp tục làm việc</button><button className="btn-secondary" type="button" onClick={handleLogout}>Đăng xuất</button></div></div>}
      {error && <div className="fg-feedback is-error" role="alert">{error}</div>}
      {successMsg && <p className="fg-feedback" role="status">{successMsg}</p>}
      <section aria-label="Chọn phân hệ" className="unified-role-grid">
        {roles.map((item) => {
          const isSelected = selectedRole === item.role;
          return (
            <button
              key={item.role}
              type="button"
              className="unified-role"
              aria-pressed={isSelected}
              onClick={() => {
                setSelectedRole(item.role);
                setError(null);
                if (item.role === 'ADMIN' && authMode === 'register') setAuthMode('login');
              }}
            >
              {isSelected && (
                <motion.div
                  layoutId="subsystem-active-highlight"
                  className="subsystem-active-highlight"
                  transition={{ type: 'spring', damping: 28, stiffness: 400 }}
                />
              )}
              <AppIcon name={item.icon} />
              <strong>{item.label}</strong>
              <span>{item.description}</span>
            </button>
          );
        })}
      </section>
      <section className="unified-auth-panel" aria-labelledby="auth-role-title">
        <div className="unified-panel-heading"><h2 id="auth-role-title">{roleInfo[selectedRole].title}</h2><p>{roleInfo[selectedRole].desc}</p></div>
        <div className="unified-auth-tabs" role="group" aria-label="Cách đăng nhập">
          <button type="button" aria-pressed={authMode==='quick'} onClick={()=>{setAuthMode('quick');setError(null);}}>Tài khoản có sẵn</button>
          <button type="button" aria-pressed={authMode==='login'} onClick={()=>{setAuthMode('login');setError(null);}}>Đăng nhập</button>
          {selectedRole!=='ADMIN' && <button type="button" aria-pressed={authMode==='register'} onClick={()=>{setAuthMode('register');setError(null);}}>Đăng ký mới</button>}
        </div>
        {authMode==='quick' && <div aria-busy={accountsLoading}>
          {accountsLoading ? <p role="status">Đang tải danh sách tài khoản…</p> : accountsError ? <div className="fg-feedback is-error" role="alert"><span>Không tải được danh sách tài khoản. Bạn có thể thử lại hoặc đăng nhập bằng email.</span><button type="button" className="btn-secondary" onClick={()=>setAccountRevision(n=>n+1)}>Thử lại</button></div> : roleAccounts.length ? <div className="unified-account-grid">{roleAccounts.map(acc=><article className="unified-account" key={acc.id}><h3>{acc.name}</h3>{acc.companyName&&<p>{acc.companyName}</p>}<span>{acc.email}</span>{acc.address&&<small>{acc.address}</small>}<button className="btn-primary" type="button" disabled={loading} onClick={()=>void handleQuickLogin(acc)}>{loading?'Đang đăng nhập…':'Đăng nhập tài khoản'}</button></article>)}</div> : <div className="fg-empty"><h3>Chưa có tài khoản trong phân hệ này</h3><p>Chọn đăng nhập bằng email hoặc tạo tài khoản mới.</p></div>}
        </div>}
        {authMode==='login' && <form className="unified-auth-form" onSubmit={handleManualLogin}>
          <label htmlFor="auth-email">Email tài khoản<input id="auth-email" type="email" autoComplete="username" required value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} placeholder="Nhập email tài khoản"/></label>
          <label htmlFor="auth-password">Mật khẩu<input id="auth-password" type="password" autoComplete="current-password" required value={loginPassword} onChange={e=>setLoginPassword(e.target.value)}/></label>
          <button type="submit" className="btn-primary" disabled={loading}>{loading?'Đang đăng nhập…':'Đăng nhập'}</button>
        </form>}
        {authMode==='register' && selectedRole!=='ADMIN' && <form className="unified-auth-form" onSubmit={handleRegister}>
          <p className="unified-required-note">Các trường có dấu * là bắt buộc.</p>
          <div className="form-grid">
            <label htmlFor="reg-name">Họ tên người đại diện *<input id="reg-name" autoComplete="name" required value={regName} onChange={e=>setRegName(e.target.value)}/></label>
            <label htmlFor="reg-company">Tên nhà vườn / quán F&B<input id="reg-company" autoComplete="organization" value={regCompanyName} onChange={e=>setRegCompanyName(e.target.value)}/></label>
            <label htmlFor="reg-email">Email đăng nhập *<input id="reg-email" type="email" autoComplete="email" required value={regEmail} onChange={e=>setRegEmail(e.target.value)}/></label>
            <label htmlFor="reg-phone">Số điện thoại<input id="reg-phone" type="tel" autoComplete="tel" value={regPhone} onChange={e=>setRegPhone(e.target.value)}/></label>
          </div>
          <label htmlFor="reg-address">Địa chỉ vườn / trụ sở<input id="reg-address" autoComplete="street-address" value={regAddress} onChange={e=>setRegAddress(e.target.value)}/></label>
          <label htmlFor="reg-password">Mật khẩu *<input id="reg-password" type="password" autoComplete="new-password" required value={regPassword} onChange={e=>setRegPassword(e.target.value)}/></label>
          <button type="submit" className="btn-primary" disabled={loading}>{loading?'Đang tạo tài khoản…':'Tạo tài khoản'}</button>
        </form>}
      </section>
    </div>
  </main>;
}
