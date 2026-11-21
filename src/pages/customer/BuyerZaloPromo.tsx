import { useState } from 'react';

export function BuyerZaloPromo() {
  const [phone, setPhone] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  return (
    <section className="zalo-promo-demo" aria-labelledby="zalo-promo-title">
      <div><span className="zalo-promo-kicker">BẢNG GIÁ SỈ NÔNG SẢN</span><h2 id="zalo-promo-title">Nhận báo giá nông sản hằng ngày qua Zalo OA</h2><p>Cập nhật biến động giá sỉ tại vườn, lịch thu hoạch VietGAP sớm nhất cho quán F&B.</p></div>
      <form onSubmit={event => { event.preventDefault(); const normalized = phone.replace(/[\s().-]/g, ''); if (!/^\+?\d{9,12}$/.test(normalized)) { setPhoneError('Vui lòng nhập số điện thoại hợp lệ (9–12 chữ số).'); setSubscribed(false); return; } setPhoneError(''); setSubscribed(true); }}>
        <label htmlFor="zalo-promo-phone">Số điện thoại Zalo</label><div className="zalo-promo-input"><input id="zalo-promo-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="Ví dụ: 0901234567" value={phone} onChange={event => { setPhone(event.target.value); setSubscribed(false); setPhoneError(''); }} aria-describedby="zalo-promo-status"/><button type="submit">Đăng ký nhận báo giá</button></div>
        <div id="zalo-promo-status" aria-live="polite">{phoneError && <span className="zalo-promo-error">{phoneError}</span>}{subscribed && <span className="zalo-promo-success">Đã đăng ký thành công! FARMGO B2B sẽ gửi bảng giá sỉ và danh mục hàng mới mỗi sáng.</span>}</div>
      </form>
    </section>
  );
}
