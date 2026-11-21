import { useEffect, useState } from 'react';
import { LucideIcon } from './LucideIcon';

interface SmartQrCodeProps {
  url: string;
  farmName: string;
  size?: number;
}

export function SmartQrCode({ url, farmName, size = 220 }: SmartQrCodeProps) {
  const [copied, setCopied] = useState(false);
  const [imageState, setImageState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(url)}`;
  useEffect(() => {
    setImageState('loading');
    const timer = window.setTimeout(() => setImageState(current => current === 'loading' ? 'error' : current), 8000);
    return () => window.clearTimeout(timer);
  }, [qrUrl, attempt]);

  const handleCopyLink = () => {
    setMessage('');
    if (!navigator.clipboard) { setMessage('Hãy chọn và sao chép đường dẫn bên dưới.'); return; }
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => setMessage('Không sao chép được tự động. Hãy chọn đường dẫn và sao chép thủ công.'));
  };

  const handlePrint = () => {
    if (imageState !== 'ready') return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) { setMessage('Trình duyệt đã chặn cửa sổ in. Hãy cho phép cửa sổ bật lên và thử lại.'); return; }
    const htmlEntities: Record<string, string> = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
    const safeFarmName = farmName.replace(/[&<>"']/g, value => htmlEntities[value]);
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Tem QR Nông Sản - ${safeFarmName}</title>
          <style>
            @page { size: A6 portrait; margin: 10mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; color: #0f172a; margin: 0; padding: 15px; }
            .label-box { border: 2.5px solid #166534; border-radius: 14px; padding: 18px 14px; max-width: 380px; margin: 0 auto; }
            .brand-header { font-size: 13px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 1px; }
            .farm-name { font-size: 18px; font-weight: 800; margin: 6px 0; color: #0f172a; }
            .badge { display: inline-block; background: #dcfce7; color: #166534; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; margin-bottom: 12px; }
            .qr-frame { margin: 8px auto; width: 200px; height: 200px; padding: 6px; border: 1px solid #cbd5e1; border-radius: 10px; }
            .qr-frame img { width: 100%; height: 100%; }
            .scan-callout { font-size: 13px; font-weight: 700; color: #166534; margin: 8px 0 3px; }
            .sub-desc { font-size: 11px; color: #64748b; line-height: 1.4; }
            .footer-note { font-size: 9.5px; color: #94a3b8; margin-top: 14px; border-top: 1px dashed #cbd5e1; padding-top: 8px; }
          </style>
        </head>
        <body>
          <div class="label-box">
            <div class="brand-header">FARMGO · Nông Sản Minh Bạch</div>
            <div class="farm-name">${safeFarmName}</div>
            <div class="badge">HỒ SƠ NHÀ VƯỜN</div>
            <div class="qr-frame">
              <img src="${qrUrl}" alt="Mã QR Nhà Vườn" />
            </div>
            <div class="scan-callout">QUÉT MÃ XEM HỒ SƠ NÔNG TRẠI</div>
            <div class="sub-desc">Xem thông tin vùng trồng và hồ sơ nhà vườn.</div>
            <div class="footer-note">Tem dán thùng nông sản sỉ FARMGO B2B · Tiêu chuẩn F&B</div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="smart-qr-container">
      <div className="qr-preview-box">
        {imageState === 'error' ? <div className="qr-unavailable" role="status"><strong>Chưa tải được mã QR</strong><p>Bạn vẫn có thể mở hoặc sao chép liên kết hồ sơ.</p><button type="button" className="btn-secondary" onClick={() => setAttempt(value => value + 1)}>Tải lại mã QR</button></div> : <img
          key={attempt}
          src={qrUrl} 
          alt={`Mã QR ${farmName}`} 
          width={size} 
          height={size}
          className="qr-image"
          onLoad={() => setImageState('ready')}
          onError={() => setImageState('error')}
        />}
        {imageState === 'loading' && <span className="qr-loading" role="status">Đang tải mã QR…</span>}
        {imageState === 'ready' && <div className="qr-badge-overlay">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><LucideIcon name="leaf" size={13} /> FARMGO</span>
        </div>}
      </div>

      <div className="qr-details-block">
        {imageState === 'loading' && <p className="qr-loading" role="status">Đang tải mã QR…</p>}
        {message && <p className="fg-feedback" role="status">{message}</p>}
        <span className="qr-target-url-label">Đường dẫn định danh:</span>
        <code className="qr-target-code">{url}</code>

        <div className="qr-buttons-row">
          <button 
            type="button" 
            className="btn-qr-action btn-copy-link" 
            onClick={handleCopyLink}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            {copied ? <><LucideIcon name="check" size={14} /> Đã sao chép link!</> : <><LucideIcon name="clipboardList" size={14} /> Sao chép liên kết</>}
          </button>
          
          <button 
            type="button" 
            className="btn-qr-action btn-print-label" 
            onClick={handlePrint}
            disabled={imageState !== 'ready'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <LucideIcon name="printer" size={14} /> Tải tem in dán thùng hàng
          </button>
        </div>
      </div>
    </div>
  );
}
