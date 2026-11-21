import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getBuyerWallet, topUpBuyerWallet, type BuyerWallet } from '../../services/walletService';
import { money } from '../../components/shared/useCatalog';
import { LucideIcon } from '../../components/shared/LucideIcon';
import { MotionModal } from '../../components/shared/MotionModal';
import { EscrowModal } from '../../components/shared/EscrowModal';
import './farmgo-wallet.css';

export function FarmGoPayPage() {
  const [wallet, setWallet] = useState<BuyerWallet>(() => getBuyerWallet());
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [escrowModalOpen, setEscrowModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState(1000000);
  const [customAmount, setCustomAmount] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setWallet(getBuyerWallet());
    };
    window.addEventListener('farmgo-wallet-updated', handleUpdate);
    return () => window.removeEventListener('farmgo-wallet-updated', handleUpdate);
  }, []);

  const handleTopUp = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = customAmount ? Number(customAmount) : topUpAmount;
    if (!finalAmount || finalAmount < 50000) {
      alert('Số tiền nạp tối thiểu là 50.000đ');
      return;
    }
    const updated = topUpBuyerWallet(wallet.customerId, finalAmount, 'Chuyển khoản VietQR tức thì');
    setWallet(updated);
    setTopUpOpen(false);
    setCustomAmount('');
    setNotice(`Nạp thành công ${money(finalAmount)} vào Ví FarmGoPay! Số dư hiện tại: ${money(updated.balanceVnd)}`);
    setTimeout(() => setNotice(null), 5000);
  };

  return (
    <div className="farmgo-wallet-page">
      <div className="page-heading">
        <div>
          <h1>Ví Điện Tử FarmGoPay</h1>
          <p>Thanh toán nguyên liệu F&B 1-chạm &amp; Bảo vệ tiền hàng bằng cơ chế Ký Quỹ Escrow an toàn 100%.</p>
        </div>
        <div className="heading-actions">
          <Link to="/customer/checkout" className="btn-secondary">Đến giỏ hàng</Link>
          <button className="btn-primary" onClick={() => setTopUpOpen(true)}>+ Nạp tiền vào ví</button>
        </div>
      </div>

      {notice && (
        <div className="wallet-alert-success" role="status">
          <span><LucideIcon name="check" size={16} /> {notice}</span>
        </div>
      )}

      {/* Thẻ số dư ví phong cách ShopeePay */}
      <div className="wallet-hero-grid">
        <div className="wallet-card-primary">
          <div className="wallet-card-header">
            <div className="wallet-brand-badge">
              <span className="wallet-icon"><LucideIcon name="creditCard" size={24} /></span>
              <strong>Ví FarmGoPay</strong>
            </div>
            <span className="wallet-status-badge">Đã liên kết</span>
          </div>

          <div className="wallet-balance-row">
            <span className="wallet-label">Số dư khả dụng</span>
            <div className="wallet-amount">{money(wallet.balanceVnd)}</div>
          </div>

          <div className="wallet-actions-bar">
            <button className="btn-wallet-topup" onClick={() => setTopUpOpen(true)}>
              ↑ Nạp tiền ngay
            </button>
            <Link to="/customer/catalog" className="btn-wallet-pay">
              <LucideIcon name="shoppingBag" size={16} /> Mua nguyên liệu
            </Link>
          </div>
        </div>

        <div className="wallet-escrow-info card">
          <div className="escrow-header">
            <span className="escrow-shield"><LucideIcon name="shieldCheck" size={22} /></span>
            <h3>Bảo vệ Ký Quỹ Escrow FarmGoPay</h3>
          </div>
          <ul className="escrow-features">
            <li>
              <strong>100% Tiền Được Giữ An Toàn:</strong> Tiền thanh toán không chuyển ngay cho nhà vườn, mà giữ ở tài khoản ký quỹ trung gian.
            </li>
            <li>
              <strong>Cửa Sổ Khiếu Nại 2 Giờ:</strong> Sau khi nhận hàng, quán có 2h để kiểm tra độ tươi, cân nặng và báo dập héo.
            </li>
            <li>
              <strong>Hoàn Tiền 1 Chạm:</strong> Khi yêu cầu đền bù được duyệt, tiền lập tức hoàn thẳng về Ví FarmGoPay của quán trong 30 giây!
            </li>
          </ul>
          <button
            type="button"
            className="btn-secondary"
            style={{ marginTop: '14px', fontSize: '0.86rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setEscrowModalOpen(true)}
          >
            <LucideIcon name="shieldCheck" size={15} /> Xem cơ chế bảo vệ Ký Quỹ Escrow (Spring Physics)
          </button>
        </div>
      </div>

      {/* Lịch sử giao dịch */}
      <div className="wallet-history-section card">
        <div className="history-header">
          <h2>Lịch sử biến động số dư</h2>
          <span className="txn-count">{wallet.transactions.length} giao dịch</span>
        </div>

        {wallet.transactions.length === 0 ? (
          <div className="empty-panel">Chưa có giao dịch nào phát sinh trên ví này.</div>
        ) : (
          <div className="wallet-table-responsive">
            <table className="wallet-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Mã giao dịch</th>
                  <th>Loại hình</th>
                  <th>Chi tiết</th>
                  <th style={{ textAlign: 'right' }}>Biến động</th>
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
                        <span className={`txn-badge txn-${txn.type.toLowerCase()}`}>
                          {txn.type === 'TOPUP' && 'Nạp ví'}
                          {txn.type === 'PAYMENT' && 'Thanh toán'}
                          {txn.type === 'REFUND' && 'Hoàn tiền'}
                        </span>
                      </td>
                      <td className="cell-desc">
                        {txn.description}
                        {txn.orderId && (
                          <Link to={`/customer/orders/${txn.orderId}`} className="txn-order-link">
                            [Xem đơn #{txn.orderId}]
                          </Link>
                        )}
                      </td>
                      <td className={`cell-amount ${isPositive ? 'amount-plus' : 'amount-minus'}`} style={{ textAlign: 'right' }}>
                        {isPositive ? `+${money(txn.amountVnd)}` : money(txn.amountVnd)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="status-success-chip">Thành công</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal nạp tiền với Motion Spring Physics và AnimatePresence */}
      <MotionModal
        isOpen={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        title="Nạp tiền vào Ví Ký Quỹ FarmGoPay"
        maxWidth="540px"
      >
        <form onSubmit={handleTopUp} className="wallet-topup-form">
          <label>Chọn nhanh mệnh giá:</label>
          <div className="preset-amounts-grid">
            {[500000, 1000000, 2000000, 5000000, 10000000].map((amt) => (
              <button
                type="button"
                key={amt}
                className={`preset-btn ${topUpAmount === amt && !customAmount ? 'active' : ''}`}
                onClick={() => {
                  setTopUpAmount(amt);
                  setCustomAmount('');
                }}
              >
                {money(amt)}
              </button>
            ))}
          </div>

          <div className="custom-amount-field">
            <label htmlFor="custom-amt">Hoặc nhập số tiền khác (VNĐ):</label>
            <input
              id="custom-amt"
              type="number"
              placeholder="Ví dụ: 1500000"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              min="50000"
              step="50000"
            />
          </div>

          <div className="vietqr-sim-box">
            <div className="vietqr-badge"><LucideIcon name="zap" size={14} /> Thanh toán VietQR Napas 24/7</div>
            <div className="vietqr-details">
              <div><span>Ngân hàng:</span> <strong>MB Bank (Quân Đội)</strong></div>
              <div><span>Số tài khoản:</span> <strong>99998888FARMGO</strong></div>
              <div><span>Chủ tài khoản:</span> <strong>FARMGO VIETNAM ESCROW</strong></div>
              <div>
                <span>Số tiền nạp:</span>{' '}
                <strong className="qr-price">
                  {money(customAmount ? Number(customAmount) : topUpAmount)}
                </strong>
              </div>
            </div>
          </div>

          <div className="wallet-modal-footer">
            <button type="button" className="btn-secondary" onClick={() => setTopUpOpen(false)}>
              Hủy
            </button>
            <button type="submit" className="btn-primary">
              Xác nhận nạp tiền mô phỏng
            </button>
          </div>
        </form>
      </MotionModal>

      {/* Modal bảo chứng Ký Quỹ Escrow với Spring Physics và AnimatePresence */}
      <EscrowModal
        isOpen={escrowModalOpen}
        onClose={() => setEscrowModalOpen(false)}
        onProceedTopUp={() => setTopUpOpen(true)}
      />
    </div>
  );
}
