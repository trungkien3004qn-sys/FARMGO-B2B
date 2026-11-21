import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDemoData } from '../components/shared/useDemoData';
import * as api from '../services/demoService';
import { useCatalog, money } from '../components/shared/useCatalog';
import { FruitPhoto } from '../components/shared/FruitPhoto';
import { LoadingSpinner, ErrorMessage } from '../components/shared/Feedback';
import { SmartQrCode } from '../components/shared/SmartQrCode';
import { LucideIcon } from '../components/shared/LucideIcon';
import './farm-bio.css';

interface FarmBioData {
  farmName: string;
  tagline: string;
  ownerName: string;
  phone: string;
  gardenAddress: string;
  farmScale: string;
  altitude: string;
  foundedYear: string;
  vietGapCode: string;
  story: string;
  facebookUrl: string;
  zaloUrl: string;
  tiktokUrl: string;
  coverImage?: string;
}

export function FarmBioPage() {
  const { supplierId } = useParams<{ supplierId: string }>();
  const [showQrModal, setShowQrModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const state = useDemoData(async () => {
    const [suppliers, profiles] = await Promise.all([
      api.getSuppliers(),
      api.getBusinessProfiles(),
    ]);
    return { suppliers, profiles };
  });

  const { products, loading, error } = useCatalog();

  const targetId = supplierId || 'sup-dalat-clean';
  const supplier = state.data?.suppliers.find(s => s.id === targetId) || state.data?.suppliers[0];

  // Load custom profile if saved by seller
  const storageKey = `farmgo-seller-profile-${supplier?.id || 'default'}`;
  const customBio: FarmBioData = useMemo(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (saved) return saved;
    } catch {
      /* ignore */
    }

    // Default rich bio data tailored for Dalat Clean Farm
    if (supplier?.id === 'sup-mekong-fruit') {
      return {
        farmName: 'HTX Trái Cây Hữu Cơ Hòa Lộc & Chợ Lách',
        tagline: 'Vùng trồng Xoài Cát Hòa Lộc & Sầu Riêng OCOP 4 Sao đạt chuẩn xuất khẩu F&B',
        ownerName: 'Võ Thành Long (Bảy Long)',
        phone: '0939 888 999',
        gardenAddress: 'Ấp Hòa Lộc, Xã Xuân Hòa, Huyện Kế Sách, Tỉnh Sóc Trăng (Vựa Cái Mơn, Bến Tre)',
        farmScale: '28 Hecta',
        altitude: 'Phù sa ven sông Tiền',
        foundedYear: '2016',
        vietGapCode: 'VietGAP-MK-2023-4412',
        story: 'Với 28 hecta đất phù sa cổ màu mỡ ven sông Tiền, Hợp tác xã duy trì phương pháp bao trái sinh học 100%, không sử dụng thuốc kích chín và đảm bảo độ brix (độ ngọt tự nhiên) đạt chuẩn trước ngày thu hoạch.',
        facebookUrl: 'https://facebook.com/traicayhoaloc.farmgo',
        zaloUrl: 'https://zalo.me/0939888999',
        tiktokUrl: 'https://tiktok.com/@nongdanhoaloc',
      };
    }

    return {
      farmName: supplier?.name || 'HTX Nông Sản Sạch Đà Lạt (Xuân Thọ)',
      tagline: 'Chuyên canh Bơ sáp 034, Cà chua bi & Rau củ ôn đới chuẩn VietGAP cho chuỗi F&B',
      ownerName: 'Nguyễn Văn Năm (Chú Năm)',
      phone: supplier?.phone || '0918 234 567',
      gardenAddress: supplier?.gardenAddress || 'Tổ 5, Thôn Lạc Trường, Xã Xuân Thọ, TP. Đà Lạt, Tỉnh Lâm Đồng',
      farmScale: '15 Hecta',
      altitude: '1.500m so với mực nước biển',
      foundedYear: '2018',
      vietGapCode: 'VietGAP-BDL-2024-8839',
      story: 'Tọa lạc tại vùng cao nguyên Xuân Thọ quanh năm sương mù mát lạnh, nông trại tận dụng nguồn nước suối đầu nguồn tự nhiên và phân bón hữu cơ vi sinh tuần hoàn từ bã cà phê FarmGo Xanh. Mỗi quả bơ, trái cà chua đều được tuyển chọn kỹ lưỡng để đạt tỷ lệ phần dùng được (Yield) cao nhất cho quán.',
      facebookUrl: 'https://facebook.com/nongsandalat.farmgo',
      zaloUrl: 'https://zalo.me/0918234567',
      tiktokUrl: 'https://tiktok.com/@vuonbodalat034',
    };
  }, [storageKey, supplier]);

  const farmProducts = useMemo(() => {
    return products.filter(p => p.supplierId === (supplier?.id || 'sup-dalat-clean'));
  }, [products, supplier]);

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: customBio.farmName,
        text: customBio.tagline,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!state.data || loading) return <LoadingSpinner />;
  if (state.error || error) return <ErrorMessage message={state.error || error!} />;

  return (
    <div className="farm-bio-viewport">
      {/* Mobile Card Container */}
      <div className="farm-bio-card-wrapper">
        {/* Cover Photo Banner */}
        <div className="farm-bio-cover">
          <div className="cover-badge-top">
            <span className="platform-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <LucideIcon name="leaf" size={13} /> FARMGO VERIFIED FARM
            </span>
            <button 
              type="button" 
              className="btn-qr-trigger" 
              onClick={() => setShowQrModal(true)}
              title="Xem mã QR của nhà vườn"
              aria-label="Xem mã QR"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <LucideIcon name="qrCode" size={14} /> Mã QR
            </button>
          </div>
        </div>

        {/* Avatar & Header */}
        <div className="farm-bio-header">
          <div className="farm-avatar-ring">
            <span className="avatar-initial" aria-hidden="true">
              {customBio.ownerName.charAt(0) || 'F'}
            </span>
            <span className="verified-check" title="Nông trại đã kiểm duyệt VietGAP">
              <LucideIcon name="check" size={12} strokeWidth={3} />
            </span>
          </div>

          <h1 className="farm-title-text">{customBio.farmName}</h1>
          <p className="farm-tagline-text">{customBio.tagline}</p>
          <div className="farm-owner-label">
            <span>Đại diện: <strong>{customBio.ownerName}</strong></span>
            <span>•</span>
            <span>HTX thành lập: {customBio.foundedYear}</span>
          </div>

          {/* Metric Badges Pills */}
          <div className="farm-metrics-pills">
            <span className="bio-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <LucideIcon name="sprout" size={13} color="#15803d" /> {customBio.farmScale}
            </span>
            <span className="bio-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <LucideIcon name="mountain" size={13} color="#0369a1" /> {customBio.altitude}
            </span>
            <span className="bio-pill cert-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <LucideIcon name="shieldCheck" size={13} color="#b45309" /> {customBio.vietGapCode}
            </span>
          </div>
        </div>

        {/* Omnichannel Action Buttons (Biolink style) */}
        <div className="farm-bio-links-section">
          <a 
            href={customBio.zaloUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="bio-action-link link-zalo"
          >
            <span className="link-icon"><LucideIcon name="messageCircle" size={20} /></span>
            <div className="link-label-wrap">
              <strong>Nhắn tin Zalo với Chủ Vườn</strong>
              <small>Tư vấn báo giá sỉ &amp; mẫu thử ({customBio.phone})</small>
            </div>
            <span className="link-arrow">→</span>
          </a>

          <a 
            href={customBio.facebookUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="bio-action-link link-facebook"
          >
            <span className="link-icon"><LucideIcon name="globe" size={20} /></span>
            <div className="link-label-wrap">
              <strong>Fanpage Nông Trại Facebook</strong>
              <small>Xem cập nhật vụ mùa &amp; hình ảnh nhật ký canh tác</small>
            </div>
            <span className="link-arrow">→</span>
          </a>

          <a 
            href={customBio.tiktokUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="bio-action-link link-tiktok"
          >
            <span className="link-icon"><LucideIcon name="music" size={20} /></span>
            <div className="link-label-wrap">
              <strong>Kênh TikTok Nhà Nông</strong>
              <small>Xem video thực địa thu hoạch &amp; đóng gói tại vườn</small>
            </div>
            <span className="link-arrow">→</span>
          </a>

          <a 
            href={`tel:${customBio.phone}`} 
            className="bio-action-link link-hotline"
          >
            <span className="link-icon"><LucideIcon name="phone" size={20} /></span>
            <div className="link-label-wrap">
              <strong>Hotline Đón Xe Hàng &amp; Vận Chuyển</strong>
              <small>{customBio.phone} (Gọi trực tiếp)</small>
            </div>
            <span className="link-arrow">→</span>
          </a>
        </div>

        {/* Farm Story Section */}
        <section className="farm-story-card">
          <div className="story-heading">
            <span className="story-icon"><LucideIcon name="bookOpen" size={20} /></span>
            <h2>Câu Chuyện Vùng Trồng</h2>
          </div>
          <p className="story-content-text">
            {customBio.story}
          </p>
          <div className="farm-address-box">
            <span className="address-icon"><LucideIcon name="mapPin" size={16} /></span>
            <span>{customBio.gardenAddress}</span>
          </div>
        </section>

        {/* Catalog of Wholesale Produce from this Farm */}
        <section className="farm-products-showcase">
          <div className="showcase-header-row">
            <h2>Nông Sản Sỉ Cung Ứng ({farmProducts.length})</h2>
            <Link to="/customer/catalog" className="view-market-link">Xem chợ sỉ →</Link>
          </div>

          <div className="bio-products-list">
            {farmProducts.map(p => (
              <Link 
                key={p.id} 
                to={`/customer/products/${p.id}`} 
                className="bio-product-item"
              >
                <div className="bio-product-thumb">
                  <FruitPhoto id={p.commodityId} name={p.name} imageUrl={p.imageUrl} />
                </div>
                <div className="bio-product-details">
                  <strong className="bio-product-name">{p.name}</strong>
                  <span className="bio-product-spec">{p.packagingLabel || 'Thùng tiêu chuẩn F&B'}</span>
                  <div className="bio-product-price">
                    <span className="price-num">{money(p.publicPricePerKg)}</span>
                    <small>/kg</small>
                  </div>
                </div>
                <div className="bio-product-cta">
                  <span>Đặt sỉ →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Share & Bottom Actions */}
        <div className="farm-bio-footer-actions">
          <button type="button" className="btn-share-bio" onClick={handleShare} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            {copied ? (
              <><LucideIcon name="check" size={16} /> Đã sao chép link!</>
            ) : (
              <><LucideIcon name="share2" size={16} /> Chia sẻ hồ sơ nông trại</>
            )}
          </button>
          <button type="button" className="btn-open-qr" onClick={() => setShowQrModal(true)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <LucideIcon name="qrCode" size={16} /> Mở mã QR dán thùng
          </button>
        </div>

        <footer className="farm-bio-footer">
          <img src="/farmgo-logo.png" alt="FARMGO B2B" height="20" />
          <p>Hồ sơ định danh số được xác thực bởi <strong>FARMGO B2B Supply Chain</strong></p>
        </footer>
      </div>

      {/* QR Modal Popup */}
      {showQrModal && (
        <div className="bio-qr-modal-backdrop" onClick={() => setShowQrModal(false)}>
          <div className="bio-qr-modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-top-row">
              <h3>Mã QR Thông Minh Nhà Vườn</h3>
              <button 
                type="button" 
                className="btn-modal-close" 
                onClick={() => setShowQrModal(false)}
                aria-label="Đóng popup"
              >
                <LucideIcon name="x" size={18} />
              </button>
            </div>
            <p className="modal-desc">
              Quét mã này bằng điện thoại hoặc Zalo để mở ngay Trang Hồ Sơ Số của <strong>{customBio.farmName}</strong>.
            </p>

            <SmartQrCode 
              url={currentUrl || `http://localhost:5173/farm/${supplier?.id || 'sup-dalat-clean'}`}
              farmName={customBio.farmName}
              size={240}
            />

            <div className="modal-print-tip" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LucideIcon name="lightbulb" size={18} color="#d97706" /> <div><strong>Gợi ý:</strong> In tem QR này dán lên từng sọt bơ hoặc thùng hàng gửi cho nhà hàng để chứng minh nguồn gốc xuất xứ!</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
