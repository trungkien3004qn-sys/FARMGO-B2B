import { useState } from 'react';
import { useDemoData } from '../../components/shared/useDemoData';
import * as api from '../../services/demoService';
import { ErrorMessage, LoadingSpinner } from '../../components/shared/Feedback';
import { SmartQrCode } from '../../components/shared/SmartQrCode';
import { Link } from 'react-router-dom';
import { LucideIcon } from '../../components/shared/LucideIcon';

interface FormState {
  farmName: string;
  tagline: string;
  ownerName: string;
  phone: string;
  taxCode: string;
  gardenAddress: string;
  vietGapCode: string;
  vietGapExpiry: string;
  hasVatInvoice: boolean;
  farmScale: string;
  altitude: string;
  foundedYear: string;
  story: string;
  facebookUrl: string;
  zaloUrl: string;
  tiktokUrl: string;
}

export function SellerProfile() {
  const [activeTab, setActiveTab] = useState<'legal' | 'bio'>('bio');

  const s = useDemoData(async () => ({
    session: await api.getDemoSession(),
    profiles: await api.getBusinessProfiles(),
    suppliers: await api.getSuppliers(),
  }));

  const supplier = s.data?.suppliers.find(p => p.id === s.data?.session.activeSupplierId);
  const profile = s.data?.profiles.find(p => p.id === s.data?.session.activeSupplierId);

  const storageKey = `farmgo-seller-profile-${s.data?.session.activeSupplierId || 'default'}`;
  const [form, setForm] = useState<FormState | null>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (saved && typeof saved.farmName === 'string') return saved as FormState;
    } catch {
      /* fallback to defaults */
    }
    return null;
  });

  const defaults: FormState = {
    farmName:
      supplier && supplier.name !== 'Nhà vườn Chú Sáu'
        ? supplier.name
        : 'HTX Nông Sản Sạch Đà Lạt (Xuân Thọ)',
    tagline: 'Chuyên canh Bơ sáp 034, Cà chua bi & Rau củ ôn đới chuẩn VietGAP cho chuỗi F&B',
    ownerName:
      profile && profile.contactName && profile.contactName !== 'Chú Sáu'
        ? profile.contactName
        : 'Nguyễn Văn Năm (Chú Năm)',
    phone:
      supplier && supplier.phone && supplier.phone !== '0900000001'
        ? supplier.phone
        : '0918 234 567',
    taxCode:
      supplier && supplier.taxCode && supplier.taxCode !== 'DEMO-MST-NCC-01'
        ? supplier.taxCode
        : '5801234567',
    gardenAddress:
      supplier && supplier.gardenAddress && supplier.gardenAddress !== 'Vườn demo, Lâm Đồng'
        ? supplier.gardenAddress
        : 'Tổ 5, Thôn Lạc Trường, Xã Xuân Thọ, TP. Đà Lạt, Tỉnh Lâm Đồng (Kho tiếp vận Pleiku, Tỉnh Gia Lai)',
    vietGapCode: 'VietGAP-BDL-2024-8839',
    vietGapExpiry: '2027',
    hasVatInvoice: true,
    farmScale: '15 Hecta',
    altitude: '1.500m so với mực nước biển',
    foundedYear: '2018',
    story: 'Tọa lạc tại vùng cao nguyên Xuân Thọ quanh năm sương mù mát lạnh, nông trại tận dụng nguồn nước suối đầu nguồn tự nhiên và phân bón hữu cơ vi sinh tuần hoàn từ bã cà phê FarmGo Xanh. Mỗi quả bơ, trái cà chua đều được tuyển chọn kỹ lưỡng để đạt tỷ lệ phần dùng được (Yield) cao nhất cho quán.',
    facebookUrl: 'https://facebook.com/nongsandalat.farmgo',
    zaloUrl: 'https://zalo.me/0918234567',
    tiktokUrl: 'https://tiktok.com/@vuonbodalat034',
  };

  const f = form ?? defaults;
  const [message, setMessage] = useState('');

  const handleSave = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(f));
      setMessage('Đã lưu cập nhật hồ sơ trang trại & mã QR thành công!');
      setTimeout(() => setMessage(''), 4000);
    } catch {
      setMessage('Không lưu được cập nhật. Vui lòng thử lại.');
    }
  };

  const update = (patch: Partial<FormState>) => {
    const next = { ...f, ...patch };
    setForm(next);
    setMessage('');
  };

  if (!s.data) return s.error ? <ErrorMessage message={s.error} /> : <LoadingSpinner />;

  const bioUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/farm/${s.data.session.activeSupplierId || 'sup-dalat-clean'}`
    : `http://localhost:5173/farm/${s.data.session.activeSupplierId || 'sup-dalat-clean'}`;

  return (
    <div className="seller-profile-wrapper">
      <section className="seller-panel seller-profile-farm">
        <div className="page-heading">
          <div>
            <h1>Hồ Sơ Nông Trại &amp; Định Danh Số</h1>
            <p>Thông tin và mã QR minh bạch giúp quán F&B và thực khách tìm hiểu về quy trình canh tác sạch.</p>
          </div>
          <div className="heading-actions">
            <Link to={`/farm/${s.data.session.activeSupplierId || 'sup-dalat-clean'}`} target="_blank" className="btn-secondary">
              <LucideIcon name="qrCode" size={14} /> Xem trang Bio di động ↗
            </Link>
            <button className="btn-primary" type="button" onClick={handleSave}>
              Lưu thay đổi
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="seller-profile-tabs" role="tablist">
          <button
            type="button"
            className={`profile-tab-btn ${activeTab === 'bio' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('bio')}
          >
            <LucideIcon name="leaf" size={14} /> Hồ sơ số &amp; Tem QR Nhà Vườn (Smart Bio-Link)
          </button>
          <button
            type="button"
            className={`profile-tab-btn ${activeTab === 'legal' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('legal')}
          >
            <LucideIcon name="building" size={14} /> Thông tin kinh doanh &amp; Pháp lý
          </button>
        </div>

        {message && <p role="status" className="farm-save-msg">{message}</p>}
        {s.error && <ErrorMessage message={s.error} />}

        {/* TAB 1: SMART BIO-LINK & QR CODE */}
        {activeTab === 'bio' && (
          <div className="bio-tab-layout">
            {/* Left: Bio Settings Form */}
            <div className="bio-settings-col">
              <h3 className="section-subheading">1. Định danh &amp; Kênh Mạng Xã Hội</h3>
              
              <div className="form-grid">
                <label>
                  <span className="farm-field-label">Tên thương hiệu trang trại</span>
                  <input
                    type="text"
                    value={f.farmName}
                    onChange={e => update({ farmName: e.target.value })}
                  />
                </label>
                <label>
                  <span className="farm-field-label">Chủ nhiệm HTX / Đại diện</span>
                  <input
                    type="text"
                    value={f.ownerName}
                    onChange={e => update({ ownerName: e.target.value })}
                  />
                </label>
              </div>

              <label className="farm-field-full">
                <span className="farm-field-label">Khẩu hiệu / Giới thiệu một dòng (Tagline)</span>
                <input
                  type="text"
                  value={f.tagline}
                  onChange={e => update({ tagline: e.target.value })}
                  placeholder="Ví dụ: Chuyên canh Bơ sáp 034 đạt chuẩn VietGAP cho chuỗi F&B"
                />
              </label>

              <div className="form-grid">
                <label>
                  <span className="farm-field-label">Quy mô diện tích (Hecta)</span>
                  <input
                    type="text"
                    value={f.farmScale}
                    onChange={e => update({ farmScale: e.target.value })}
                    placeholder="VD: 15 Hecta"
                  />
                </label>
                <label>
                  <span className="farm-field-label">Độ cao / Thổ nhưỡng vùng trồng</span>
                  <input
                    type="text"
                    value={f.altitude}
                    onChange={e => update({ altitude: e.target.value })}
                    placeholder="VD: 1.500m so với mực nước biển"
                  />
                </label>
              </div>

              <h3 className="section-subheading" style={{ marginTop: 20 }}>2. Liên kết mạng xã hội (Tích hợp vào Mã QR)</h3>
              
              <div className="social-inputs-grid">
                <label>
                  <span className="farm-field-label"><LucideIcon name="messageCircle" size={14} /> Đường dẫn Zalo tư vấn (Zalo me / OA)</span>
                  <input
                    type="url"
                    value={f.zaloUrl}
                    onChange={e => update({ zaloUrl: e.target.value })}
                    placeholder="https://zalo.me/0918234567"
                  />
                </label>

                <label>
                  <span className="farm-field-label"><LucideIcon name="globe" size={14} /> Fanpage Facebook nhà vườn</span>
                  <input
                    type="url"
                    value={f.facebookUrl}
                    onChange={e => update({ facebookUrl: e.target.value })}
                    placeholder="https://facebook.com/nongsandalat.farmgo"
                  />
                </label>

                <label>
                  <span className="farm-field-label"><LucideIcon name="music" size={14} /> Kênh TikTok nhật ký nhà nông</span>
                  <input
                    type="url"
                    value={f.tiktokUrl}
                    onChange={e => update({ tiktokUrl: e.target.value })}
                    placeholder="https://tiktok.com/@vuonbodalat034"
                  />
                </label>

                <label>
                  <span className="farm-field-label"><LucideIcon name="phone" size={14} /> Hotline tư vấn quán</span>
                  <input
                    type="tel"
                    value={f.phone}
                    onChange={e => update({ phone: e.target.value })}
                    placeholder="0918 234 567"
                  />
                </label>
              </div>

              <label className="farm-field-full" style={{ marginTop: 12 }}>
                <span className="farm-field-label"><LucideIcon name="bookOpen" size={14} /> Câu chuyện vùng trồng &amp; Triết lý nông nghiệp sạch</span>
                <textarea
                  rows={4}
                  value={f.story}
                  onChange={e => update({ story: e.target.value })}
                  placeholder="Chia sẻ về nguồn nước, thổ nhưỡng, quy trình thu hái..."
                />
              </label>

              <div className="seller-actions" style={{ marginTop: 16 }}>
                <button className="btn-primary" type="button" onClick={handleSave}>
                  Lưu &amp; Cập nhật Mã QR
                </button>
              </div>
            </div>

            {/* Right: Smart QR & Print Label Card */}
            <div className="bio-qr-col">
              <div className="smart-qr-hero-card">
                <div className="qr-card-header">
                  <h3><LucideIcon name="qrCode" size={18} /> Mã QR Thông Minh Nhà Vườn</h3>
                  <span className="live-pill">Hồ sơ mô phỏng</span>
                </div>
                <p className="qr-card-desc">
                  Mã QR này tích hợp toàn bộ Facebook, Zalo, TikTok và hồ sơ vùng trồng của bạn.
                </p>

                <SmartQrCode
                  url={bioUrl}
                  farmName={f.farmName}
                  size={210}
                />

                <div className="qr-usage-guide">
                  <strong><LucideIcon name="lightbulb" size={15} /> Cách sử dụng hiệu quả:</strong>
                  <ul>
                    <li>Bấm nút <strong>"Tải tem in dán thùng hàng"</strong> ở trên để in tem khổ A6.</li>
                    <li>Dán tem lên từng sọt bơ, thùng carton giao đến quán cà phê/nhà hàng.</li>
                    <li>Chủ quán hoặc thực khách tại quán quét mã sẽ thấy câu chuyện và fanpage của vườn.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LEGAL & TAX INFO */}
        {activeTab === 'legal' && (
          <div className="farm-profile-form">
            <div className="form-grid">
              <label>
                <span className="farm-field-label">Tên trang trại / nhà vườn</span>
                <input
                  type="text"
                  value={f.farmName}
                  onChange={e => update({ farmName: e.target.value })}
                  placeholder="Nhập tên trang trại / nhà vườn"
                />
              </label>
              <label>
                <span className="farm-field-label">Chủ hộ / Người đại diện</span>
                <input
                  type="text"
                  value={f.ownerName}
                  onChange={e => update({ ownerName: e.target.value })}
                  placeholder="Họ và tên người đại diện"
                />
              </label>
            </div>

            <div className="form-grid">
              <label>
                <span className="farm-field-label">Số điện thoại liên hệ pick-up</span>
                <input
                  type="tel"
                  value={f.phone}
                  onChange={e => update({ phone: e.target.value })}
                  placeholder="Số điện thoại đón xe hàng"
                />
              </label>
              <label>
                <span className="farm-field-label">Mã số thuế / MST hộ kinh doanh</span>
                <input
                  type="text"
                  value={f.taxCode}
                  onChange={e => update({ taxCode: e.target.value })}
                  placeholder="Mã số thuế đăng ký"
                />
              </label>
            </div>

            <label className="farm-address-field">
              <span className="farm-field-label">Địa chỉ chi tiết vườn (để xe tải tới lấy hàng)</span>
              <input
                type="text"
                value={f.gardenAddress}
                onChange={e => update({ gardenAddress: e.target.value })}
                placeholder="Địa chỉ cụ thể kèm hướng dẫn đường xe tải"
              />
            </label>

            <div className="farm-badges">
              <div className="farm-badge farm-badge-gap">
                <div className="farm-badge-header">
                  <div className="farm-badge-title">
                    <span className="farm-shield-icon" aria-hidden="true"><LucideIcon name="shieldCheck" size={18} /></span>
                    <strong>Chứng nhận VietGAP / GlobalGAP</strong>
                  </div>
                  <span className="farm-badge-tag">Thông tin khai báo</span>
                </div>
                <small>Mã số: {f.vietGapCode} (Hiệu lực đến {f.vietGapExpiry})</small>
              </div>

              <label className="farm-badge farm-badge-vat">
                <div className="farm-badge-header">
                  <input
                    type="checkbox"
                    checked={f.hasVatInvoice}
                    onChange={e => update({ hasVatInvoice: e.target.checked })}
                  />
                  <strong>Có Khả Năng Xuất Hóa Đơn VAT Điện Tử</strong>
                </div>
                <small>Thu hút các chuỗi nhà hàng lớn và khách sạn 5 sao đặt hàng sỉ.</small>
              </label>
            </div>

            <div className="seller-actions">
              <button className="btn-primary btn-save-farm" type="button" onClick={handleSave}>
                Lưu Cập Nhật Hồ Sơ
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
