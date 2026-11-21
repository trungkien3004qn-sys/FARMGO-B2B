import { useEffect, useState } from 'react';
import { resetDemoData, subscribeDemoData } from '../../services/demoService';
import { resetCartStorage } from './useBuyerCart';
import { api } from '../../services/apiClient';
import '../../styles/theme.css';

export function DemoModeBanner() {
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    const check = async () => {
      const ok = await api.checkHealth();
      if (active) setBackendOnline(ok);
    };
    void check();
    const timer = setInterval(check, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => subscribeDemoData(event => {
    if (event.type === 'RESET') void resetCartStorage().catch(() => setError('Không xóa được giỏ demo. Vui lòng tải lại trang.'));
  }), []);

  const handleReset = async () => {
    setResetting(true);
    setError('');
    try {
      await resetDemoData();
      await resetCartStorage();
    } catch (err) {
      console.error('Lỗi reset dữ liệu mẫu:', err);
      setError('Không đặt lại được dữ liệu demo. Dữ liệu hiện tại được giữ nguyên.');
    } finally {
      setResetting(false);
      setConfirmReset(false);
    }
  };

  return (
    <div className="demo-banner-slim">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span className="tag">FARMGO B2B</span>
        <span>Nền tảng Nông sản Chuẩn Hóa & Ký Quỹ Escrow</span>
        {backendOnline === true && (
          <a
            href="http://localhost:3000/api/docs"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 8px',
              borderRadius: '999px',
              background: '#dcfce7',
              color: '#15803d',
              fontSize: '12px',
              fontWeight: 600,
              textDecoration: 'none',
              border: '1px solid #bbf7d0',
            }}
            title="Bấm để mở tài liệu Swagger API Backend"
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
            Backend: Online (NestJS :3000)
          </a>
        )}
        {backendOnline === false && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 8px',
              borderRadius: '999px',
              background: '#fef3c7',
              color: '#92400e',
              fontSize: '12px',
              fontWeight: 600,
              border: '1px solid #fde68a',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d97706', display: 'inline-block' }} />
            Backend: Offline (Chạy chế độ Demo độc lập)
          </span>
        )}
        {error && <span role="alert">{error}</span>}
      </div>
      <div className="demo-reset-actions">
        {confirmReset ? <>
          <span>Khôi phục toàn bộ dữ liệu demo?</span>
          <button type="button" className="btn-reset-slim" onClick={handleReset} disabled={resetting}>{resetting ? 'Đang đặt lại…' : 'Xác nhận đặt lại'}</button>
          <button type="button" className="btn-reset-slim" onClick={() => setConfirmReset(false)} disabled={resetting}>Giữ dữ liệu hiện tại</button>
        </> :
        <button
          type="button"
          className="btn-reset-slim"
          onClick={() => setConfirmReset(true)}
          disabled={resetting}
          title="Khôi phục lại danh sách mặt hàng và đơn mẫu ban đầu"
        >
          {resetting ? 'Đang đặt lại...' : 'Đặt lại dữ liệu mẫu'}
        </button>
        }
      </div>
    </div>
  );
}
