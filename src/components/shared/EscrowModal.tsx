import { MotionModal } from './MotionModal';
import { LucideIcon } from './LucideIcon';

export interface EscrowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedTopUp?: () => void;
}

/**
 * EscrowModal — Hộp thoại Ký Quỹ & Bảo Chứng An Toàn FarmGo Escrow
 * Bung mở tự nhiên với Spring Physics scale 0.95 -> 1.0 và AnimatePresence.
 */
export function EscrowModal({ isOpen, onClose, onProceedTopUp }: EscrowModalProps) {
  return (
    <MotionModal isOpen={isOpen} onClose={onClose} title="Cơ Chế Bảo Chứng Ký Quỹ Escrow" maxWidth="580px">
      <div className="escrow-modal-badge">
        <LucideIcon name="shieldCheck" size={16} /> FARMGO ESCROW GUARANTEE 100%
      </div>
      
      <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: 1.6, margin: '8px 0 16px' }}>
        Hệ thống ký quỹ thông minh bảo vệ tuyệt đối dòng tiền của <strong>Bên mua F&B</strong> và đảm bảo nguồn thanh toán đúng hạn cho <strong>Nhà vườn / HTX</strong>.
      </p>

      <ul className="escrow-terms-list">
        <li>
          <div className="escrow-term-icon">
            <LucideIcon name="lock" size={16} />
          </div>
          <div>
            <strong>1. Nạp ký quỹ an toàn</strong>
            <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '0.84rem' }}>
              Khoản tiền thanh toán được phong tỏa trong tài khoản Escrow độc lập mở tại ngân hàng MB Bank đối tác.
            </p>
          </div>
        </li>
        <li>
          <div className="escrow-term-icon">
            <LucideIcon name="truck" size={16} />
          </div>
          <div>
            <strong>2. Đóng gói &amp; Vận chuyển kiểm nghiệm</strong>
            <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '0.84rem' }}>
              Nhà vườn giao hàng kèm chứng từ xuất xứ và mã QR truy xuất. Đơn vị vận chuyển xác nhận lộ trình thực tế.
            </p>
          </div>
        </li>
        <li>
          <div className="escrow-term-icon">
            <LucideIcon name="checkCircle" size={16} />
          </div>
          <div>
            <strong>3. Nghiệm thu &amp; Giải ngân tức thì</strong>
            <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '0.84rem' }}>
              Chỉ khi bên mua kiểm tra đạt tiêu chuẩn quy định, hệ thống mới tự động giải ngân tiền về ví nhà vườn trong 30 giây.
            </p>
          </div>
        </li>
        <li>
          <div className="escrow-term-icon">
            <LucideIcon name="alertTriangle" size={16} />
          </div>
          <div>
            <strong>4. Bảo hiểm dập nát &amp; Hoàn cọc 24h</strong>
            <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '0.84rem' }}>
              Bất kỳ khiếu nại về tỉ lệ hư hao vượt chuẩn đều được hoàn tiền hoặc cấn trừ trực tiếp ngay trên tài khoản ký quỹ.
            </p>
          </div>
        </li>
      </ul>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
        <button
          type="button"
          className="btn-secondary"
          onClick={onClose}
          style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
        >
          Đã hiểu
        </button>
        {onProceedTopUp && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              onClose();
              onProceedTopUp();
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '8px' }}
          >
            <LucideIcon name="wallet" size={15} /> Nạp ví ký quỹ ngay
          </button>
        )}
      </div>
    </MotionModal>
  );
}
