import { useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LucideIcon } from './LucideIcon';

export interface MotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: string;
  showCloseButton?: boolean;
}

/**
 * MotionModal — Modal dialog áp dụng Spring Physics tự nhiên
 * Hiệu ứng bung nhẹ nhàng từ scale 0.95 -> 1.0 kèm fade in (opacity 0 -> 1)
 * Đóng tự động và gỡ khỏi DOM mượt mà bằng AnimatePresence
 */
export function MotionModal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = '540px',
  showCloseButton = true,
}: MotionModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="motion-modal-root" role="dialog" aria-modal="true" aria-label={title || 'Hộp thoại'}>
          {/* Backdrop mờ dần 0 -> 1 */}
          <motion.div
            className="motion-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={onClose}
          />

          {/* Hộp thoại bung nhẹ với Spring Physics: scale 0.95 -> 1.0 */}
          <div className="motion-modal-wrapper" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <motion.div
              className="motion-modal-content"
              style={{ maxWidth }}
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 6 }}
              transition={{
                type: 'spring',
                damping: 26,
                stiffness: 350,
                mass: 0.6,
              }}
            >
              {title && (
                <div className="escrow-modal-header">
                  <h2>{title}</h2>
                  {showCloseButton && (
                    <button
                      type="button"
                      className="escrow-modal-close-btn"
                      onClick={onClose}
                      aria-label="Đóng hộp thoại"
                    >
                      <LucideIcon name="x" size={18} />
                    </button>
                  )}
                </div>
              )}
              {children}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
