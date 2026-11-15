import { useState } from 'react';

export function BuyerZaloPromo() {
  const [phone, setPhone] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  return (
    <section className="zalo-promo-demo" aria-labelledby="zalo-promo-title">
      <div><span className="zalo-promo-kicker">ƯU ĐÃI FARMGO</span><h2 id="zalo-promo-title">Nhận tin khuyến mãi qua Zalo</h2><p>Đăng ký nhận thông báo ưu đãi nông sản dành cho quán của bạn.</p><small>Mô phỏng demo — không kết nối Zalo thật, số điện thoại không được gửi đi hoặc lưu lại.</small></div>
      <form onSubmit={event => { event.preventDefault(); const normalized = phone.replace(/[\s().-]/g, ''); if (!/^\+?\d{9,12}$/.test(normalized)) { setPhoneError('Vui lòng nhập số điện thoại hợp lệ (9–12 chữ số).'); setSubscribed(false); return; } setPhoneError(''); setSubscribed(true); }}>
        <label htmlFor="zalo-promo-phone">Số điện thoại</label><div className="zalo-promo-input"><input id="zalo-promo-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="Ví dụ: 0901234567" value={phone} onChange={event => { setPhone(event.target.value); setSubscribed(false); setPhoneError(''); }} aria-describedby="zalo-promo-status"/><button type="submit">Đăng ký nhận tin demo</button></div>
        <div id="zalo-promo-status" aria-live="polite">{phoneError && <span className="zalo-promo-error">{phoneError}</span>}{subscribed && <span className="zalo-promo-success">Đăng ký demo thành công! Tin khuyến mãi mẫu: Ưu đãi nông sản tuần này — xem giá và tồn hàng đang mở bán trên FARMGO.</span>}</div>
      </form>
    </section>
  );
}
