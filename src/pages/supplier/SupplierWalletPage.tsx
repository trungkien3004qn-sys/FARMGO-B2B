import { AccessibleDialog } from '../../components/shared/AccessibleDialog';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSupplierWallet, withdrawSupplierWallet, type SupplierWallet } from '../../services/walletService';
import { useDemoData } from '../../components/shared/useDemoData';
import * as api from '../../services/demoService';
import { money } from '../../components/shared/useCatalog';
import { LucideIcon } from '../../components/shared/LucideIcon';
import './seller-wallet.css';

export function SupplierWalletPage() {
  const session = useDemoData(api.getDemoSession);
  const supplierId = session.data?.activeSupplierId || 'SUP-001';

  const [wallet, setWallet] = useState<SupplierWallet>(() => getSupplierWallet(supplierId));
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState('2000000');
  const [bankName, setBankName] = useState('Vietcombank');
  const [accountNumber, setAccountNumber] = useState('1012384759');
  const [accountHolder, setAccountHolder] = useState('NGUYEN VAN VUON');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setWallet(getSupplierWallet(supplierId));
    };
    window.addEventListener('farmgo-supplier-wallet-updated', handleUpdate);
    return () => window.removeEventListener('farmgo-supplier-wallet-updated', handleUpdate);
  }, [supplierId]);

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const withdrawAmt = Number(amount);
    const res = withdrawSupplierWallet(supplierId, withdrawAmt, bankName, accountNumber);
    if (!res.success) {
      setMessage({ type: 'error', text: res.message });
      return;
    }
    setWallet(getSupplierWallet(supplierId));
    setWithdrawOpen(false);
    setMessage({ type: 'success', text: res.message });
    setTimeout(() => setMessage(null), 6000);
  };

  return (
    <div className="seller-wallet-page">
      <header className="page-heading">
        <div>
          <h1>Ví Doanh Thu &amp; Ký Quỹ Nhà Vườn (FarmGoPay Seller)</h1>
          <p>Quản lý dòng tiền bán hàng B2B, số dư ký quỹ Escrow chờ giải ngân và rút tiền ngân hàng.</p>
        </div>
        <div className="heading-actions">
          <Link to="/supplier/htx-products" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <LucideIcon name="sprout" size={15} /> Mua phân bón HTX
          </Link>
          <button className="btn-primary" onClick={() => setWithdrawOpen(true)}>
            ↓ Rút tiền về ngân hàng
          </button>
        </div>
      </header>

      {message && (
        <div className={`wallet-alert ${message.type === 'success' ? 'wallet-alert-success' : 'wallet-alert-error'}`} role="status">
          {message.text}
        </div>
      )}

      {/* Grid 3 thẻ tài chính */}
      <div className="seller-wallet-overview-grid">
        <div className="seller-stat-card card-highlight">
          <div className="stat-label">
            <span>Số dư khả dụng (Đã quyết toán)</span>
            <span className="tooltip-badge" title="Tiền đơn hàng đã giao thành công và hoàn tất cửa sổ SLA 2h, đã trừ 3% phí sàn.">ℹ</span>
          </div>
          <div className="stat-value text-green">{money(wallet.availableBalanceVnd)}</div>
          <div className="stat-desc">Sẵn sàng rút về tài khoản hoặc mua phân bón HTX</div>
        </div>

        <div className="seller-stat-card">
          <div className="stat-label">
            <span>Đang giữ ký quỹ (Pending Escrow)</span>
            <span className="tooltip-badge" title="Tiền các đơn hàng đang trên đường vận chuyển hoặc đang trong 2h khách kiểm hàng.">
              <LucideIcon name="hourglass" size={12} />
            </span>
          </div>
          <div className="stat-value text-amber">{money(wallet.pendingEscrowVnd)}</div>
          <div className="stat-desc">Tự động giải ngân sau 2h giao nhận nếu không có khiếu nại</div>
        </div>

        <div className="seller-stat-card">
          <div className="stat-label">
            <span>Tổng tiền đã rút</span>
          </div>
          <div className="stat-value text-slate">{money(wallet.totalWithdrawnVnd)}</div>
          <div className="stat-desc">Đã chuyển khoản thành công qua cổng NAPAS 24/7</div>
        </div>
      </div>

      {/* Banner Khép kín vòng tuần hoàn sinh học */}
      <div className="circular-economy-banner">
        <div className="banner-icon">
          <LucideIcon name="recycle" size={32} />
        </div>
        <div className="banner-content">
          <h3>Kinh tế tuần hoàn: Tái sử dụng doanh thu để nuôi dưỡng đất</h3>
          <p>
            Nhà vườn có thể dùng <strong>Số dư khả dụng ({money(wallet.availableBalanceVnd)})</strong> để mua phân hữu cơ vi sinh &amp; chế phẩm từ HTX Green. Không mất phí rút tiền, ưu đãi giá gốc và xe tải HTX chở giao tận vườn khi đến thu gom nông sản đợt kế tiếp!
          </p>
          <Link to="/supplier/htx-products" className="btn-circular-action">
            Khám phá Sàn Phân Bón Vi Sinh →
          </Link>
        </div>
      </div>

      {/* Lịch sử dòng tiền */}
      <div className="card">
        <div className="history-header">
          <h2>Biến động số dư ví Nhà Vườn</h2>
          <span className="txn-count">{wallet.transactions.length} giao dịch</span>
        </div>

        <div className="wallet-table-responsive">
          <table className="wallet-table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Mã giao dịch</th>
                <th>Phân loại</th>
                <th>Nội dung</th>
                <th style={{ textAlign: 'right' }}>Số tiền</th>
                <th style={{ textAlign: 'center' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {wallet.transactions.map((txn) => {
                const isPositive = txn.amountVnd > 0;
                return (
                  <tr key={txn.id}>
                    <td className="cell-time">{new Date(txn.timestamp).toLocaleString('vi-VN')}</td>
                    <td className="cell-code"><code>{txn.id}</code></td>
                    <td>
                      <span className={`txn-badge txn-${txn.type.toLowerCase().replace('_', '-')}`}>
                        {txn.type === 'SETTLEMENT' && 'Quyết toán'}
                        {txn.type === 'WITHDRAW' && 'Rút tiền'}
                        {txn.type === 'FERTILIZER_PURCHASE' && 'Mua phân bón'}
                      </span>
                    </td>
                    <td>{txn.description}</td>
                    <td className={`cell-amount ${isPositive ? 'amount-plus' : 'amount-minus'}`} style={{ textAlign: 'right' }}>
                      {isPositive ? `+${money(txn.amountVnd)}` : money(txn.amountVnd)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="status-success-chip">Đã xử lý</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal rút tiền */}
      {withdrawOpen && (
        <AccessibleDialog title="Rút tiền về tài khoản ngân hàng" close={() => setWithdrawOpen(false)}>
            <div className="wallet-modal-header">
              <h3>Rút tiền về tài khoản ngân hàng</h3>
              <button type="button" aria-label="Đóng hộp thoại" className="btn-close" onClick={() => setWithdrawOpen(false)}>
                <LucideIcon name="x" size={16} />
              </button>
            </div>

            <form onSubmit={handleWithdraw} className="seller-withdraw-form">
              <div className="balance-hint">
                Số dư khả dụng hiện tại: <strong>{money(wallet.availableBalanceVnd)}</strong>
              </div>

              <div className="form-group">
                <label htmlFor="bank-select">Ngân hàng thụ hưởng:</label>
                <select id="bank-select" value={bankName} onChange={(e) => setBankName(e.target.value)}>
                  <option value="Vietcombank">Vietcombank (Ngoại thương Việt Nam)</option>
                  <option value="Techcombank">Techcombank (Kỹ thương)</option>
                  <option value="BIDV">BIDV (Đầu tư &amp; Phát triển)</option>
                  <option value="Agribank">Agribank (Nông nghiệp &amp; PT Nông thôn)</option>
                  <option value="Vietinbank">Vietinbank (Công thương)</option>
                  <option value="MBBank">MB Bank (Quân đội)</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="acc-num">Số tài khoản:</label>
                <input id="acc-num" type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} required />
              </div>

              <div className="form-group">
                <label htmlFor="acc-holder">Tên chủ tài khoản (không dấu):</label>
                <input id="acc-holder" type="text" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value.toUpperCase())} required />
              </div>

              <div className="form-group">
                <label htmlFor="withdraw-amt">Số tiền muốn rút (VNĐ):</label>
                <input
                  id="withdraw-amt"
                  type="number"
                  min="100000"
                  max={wallet.availableBalanceVnd}
                  step="50000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
                <div className="preset-chips">
                  {[1000000, 2000000, 5000000].filter(val => val <= wallet.availableBalanceVnd).map(val => (
                    <button type="button" key={val} className="chip-btn" onClick={() => setAmount(String(val))}>
                      {money(val)}
                    </button>
                  ))}
                  <button type="button" className="chip-btn" onClick={() => setAmount(String(wallet.availableBalanceVnd))}>
                    Rút toàn bộ
                  </button>
                </div>
              </div>

              <div className="napas-info-box">
                <small style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <LucideIcon name="zap" size={13} /> Chuyển khoản liên ngân hàng 24/7 qua cổng NAPAS. Miễn phí rút tiền cho thành viên HTX FARMGO.
                </small>
              </div>

              <div className="wallet-modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setWithdrawOpen(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn-primary" disabled={wallet.availableBalanceVnd < 100000}>
                  Xác nhận rút tiền
                </button>
              </div>
            </form>
        </AccessibleDialog>
      )}
    </div>
  );
}
