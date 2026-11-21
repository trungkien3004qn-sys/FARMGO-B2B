import { ProductCardFacts } from './ProductCardFacts';
import { saleReferencePrice } from './saleReferencePrices';
import { SupplierStoreCard } from './SupplierStoreCard';
import { StoreProductCard } from './StoreProductCard';
import { featuredProductIds } from '../../mocks/customerMerchandising';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useCatalog, money } from '../../components/shared/useCatalog';
import { FruitPhoto } from '../../components/shared/FruitPhoto';
import { ErrorMessage, LoadingSpinner } from '../../components/shared/Feedback';
import { productRatings } from '../../mocks/productRatings';
import { productConditions } from '../../mocks/customerMerchandising';
import { StoreIcon } from './StoreIcon';

const banners = [
  { image: 'farmgo-circular.jpg', label: 'Nông nghiệp tuần hoàn: Phụ phẩm bã hữu cơ cho nhà máy chế biến', href: '/customer/green' },
  { image: 'farmgo-market.jpg', label: 'Bảng giá sỉ vụ mùa: Giao dịch trực tiếp với 120+ nhà vườn', href: '/customer/catalog' },
  { image: 'farmgo-delivery.jpg', label: 'Giao hàng tận nơi 24h: Nông sản tươi giữ trọn độ ngon cho bếp', href: '/customer/catalog' },
  { image: 'farmgo-connection.jpg', label: 'Bảo chứng ký quỹ: Thanh toán minh bạch qua ví FarmGoPay', href: '/customer/catalog' },
] as const;

export function BuyerHomePage() {
  const { products, loading, error, retry } = useCatalog();
  const [activeBanner, setActiveBanner] = useState(0);
  const [bannerPaused, setBannerPaused] = useState(false);
  const [bannerInteracting, setBannerInteracting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (bannerPaused || bannerInteracting || reducedMotion) return;
    const timer = window.setInterval(() => setActiveBanner(current => (current + 1) % banners.length), 5000);
    return () => window.clearInterval(timer);
  }, [bannerPaused, bannerInteracting, reducedMotion]);
  const [filter, setFilter] = useState({ distance: '', rating: '', ripeness: '', price: '', category: '', area: '' });
  const areas = [...new Set(products.map(product => product.supplier.regionLabel).filter((value): value is string => Boolean(value)))];
  const filteredProducts = products.filter(product =>
    (!filter.distance || (filter.distance === 'near' ? ['Q1', 'Q3'].includes(product.supplier.regionLabel || '') : filter.distance === 'middle' ? ['Tiền Giang', 'Lâm Đồng'].includes(product.supplier.regionLabel || '') : !['Q1', 'Q3', 'Tiền Giang', 'Lâm Đồng'].includes(product.supplier.regionLabel || ''))) &&
    (!filter.rating || ((productRatings[product.id] ?? productRatings[product.commodityId])?.score ?? 0) >= Number(filter.rating)) &&
    (!filter.ripeness || (productConditions[product.id] || '').toLocaleLowerCase('vi').includes(filter.ripeness.toLocaleLowerCase('vi'))) &&
    (!filter.price || (filter.price === 'low' ? product.publicPricePerKg < 30000 : filter.price === 'mid' ? product.publicPricePerKg >= 30000 && product.publicPricePerKg < 60000 : product.publicPricePerKg >= 60000)) &&
    (!filter.category || product.category === filter.category) && (!filter.area || product.supplier.regionLabel === filter.area));
  const banner = banners[activeBanner];
  const hasFilters = Object.values(filter).some(Boolean);
  const resetFilters = () => setFilter({ distance: '', rating: '', ripeness: '', price: '', category: '', area: '' });
  return <div className="buyer-home">
    <div className="home-intro">
      <div>
        <h1>Nguồn nông sản sạch từ 120+ hợp tác xã &amp; nhà vườn</h1>
        <p>Giá sỉ vụ mùa ổn định cho quán F&amp;B. Giao tận bếp trong 24 giờ, bảo chứng thanh toán qua ví FarmGoPay.</p>
      </div>
      <Link className="home-primary-action" to="/customer/catalog">Xem 85+ nguồn hàng đang mở bán</Link>
    </div>
    <section className="store-showcase" aria-label="Khám phá nông sản">
      <nav className="store-category-menu" aria-label="Danh mục nông sản">
        <h2>Chọn theo danh mục</h2>
        <Link to="/customer/catalog?category=VEGETABLES"><StoreIcon name="leaf"/> Rau củ quả sạch <StoreIcon name="chevronRight"/></Link>
        <Link to="/customer/catalog?category=FRESH_FRUIT"><StoreIcon name="fruit"/> Trái cây chín vụ <StoreIcon name="chevronRight"/></Link>
        <Link to="/customer/catalog"><StoreIcon name="basket"/> Tất cả mặt hàng <StoreIcon name="chevronRight"/></Link>
      </nav>
      <div className="store-main-banner" role="region" aria-label="Giới thiệu FARMGO" aria-roledescription="carousel" onMouseEnter={() => setBannerInteracting(true)} onMouseLeave={event => setBannerInteracting(event.currentTarget.contains(document.activeElement))} onFocusCapture={() => setBannerInteracting(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setBannerInteracting(event.currentTarget.matches(':hover')); }} onKeyDown={event => { if (event.key === 'ArrowRight') { event.preventDefault(); setActiveBanner(current => (current + 1) % banners.length); } if (event.key === 'ArrowLeft') { event.preventDefault(); setActiveBanner(current => (current + banners.length - 1) % banners.length); } }}>
        <Link className="store-banner-image" to={banner.href}>
          <img src={import.meta.env.BASE_URL + 'banners/' + banner.image} alt={banner.label} width={1672} height={941} fetchPriority="high" decoding="async" />
        </Link>
        <div className="store-banner-controls" aria-label="Điều khiển banner"><button type="button" className="store-banner-arrow" aria-label="Banner trước" onClick={() => setActiveBanner(current => (current + banners.length - 1) % banners.length)}><StoreIcon name="chevronLeft"/></button><div className="store-banner-pagination">{banners.map((item, index) => <button key={item.image} type="button" className={index === activeBanner ? 'active' : ''} aria-label={`Chuyển đến banner ${index + 1}: ${item.label}`} aria-current={index === activeBanner ? 'true' : undefined} onClick={() => setActiveBanner(index)}><span/></button>)}</div><button type="button" className="store-banner-arrow" aria-label="Banner tiếp theo" onClick={() => setActiveBanner(current => (current + 1) % banners.length)}><StoreIcon name="chevronRight"/></button>{!reducedMotion && <button className="store-banner-pause" type="button" aria-label={bannerPaused ? 'Bật tự chuyển banner' : 'Dừng tự chuyển banner'} aria-pressed={bannerPaused} onClick={() => setBannerPaused(paused => !paused)}><StoreIcon name={bannerPaused ? 'play' : 'pause'}/></button>}</div>
      </div>
      <div className="store-side-banners">
        <Link to="/customer/catalog?category=FRESH_FRUIT" className="store-promo-fruit">
          <span>Tuyển chọn cho F&amp;B</span>
          <strong>Trái cây tươi chín cây<br/>Chuẩn độ ngọt cho quán</strong>
          <span>Bảng giá trái cây ›</span>
        </Link>
        <Link to="/customer/catalog?category=VEGETABLES" className="store-promo-veg">
          <span>Cung ứng hằng ngày</span>
          <strong>Rau củ tươi VietGAP<br/>Giao sớm cho gian bếp</strong>
          <span>Bảng giá rau củ ›</span>
        </Link>
      </div>
    </section>

    {!loading && products.some(p => saleReferencePrice(p.id) > 0) && (
      <section className="store-sale">
        <div className="sale-heading">
          <h2>Nông sản trợ giá vụ mùa · FLASH SALE</h2>
          <span>Chiết khấu trực tiếp từ nhà vườn · Số lượng có hạn</span>
        </div>
        <div className="sale-grid">
          {products.filter(p => saleReferencePrice(p.id) > 0).map(product => {
            const original = saleReferencePrice(product.id);
            return (
              <Link className="sale-product" key={product.id} to={`/customer/products/${product.id}`}>
                <div className="sale-photo">
                  <FruitPhoto id={product.commodityId} name={product.name} imageUrl={product.imageUrl}/>
                  {original > product.publicPricePerKg && <b>-{Math.round((1 - product.publicPricePerKg / original) * 100)}%</b>}
                </div>
                <strong>{product.name}</strong>
                <div className="sale-price">
                  {money(product.publicPricePerKg)}/kg {original > product.publicPricePerKg && <del>{money(original)}</del>}
                </div>
                <ProductCardFacts product={product} />
                <small>{product.availableKg > 0 ? `Còn ${product.availableKg} kg tại kho` : 'Tạm hết hàng'}</small>
              </Link>
            );
          })}
        </div>
      </section>
    )}
    <section className="home-catalog-section" aria-labelledby="home-catalog-title" aria-busy={loading}>
      <div className="section-heading">
        <div>
          <h2 id="home-catalog-title">Khám phá nguồn hàng theo mùa vụ</h2>
          <p>Số lượng tồn khả dụng và giá sỉ cập nhật trực tiếp từ dữ liệu nhà vườn.</p>
        </div>
        <Link to="/customer/catalog">Xem tất cả mặt hàng</Link>
      </div>
      <div className="catalog-filter-row home-catalog-filters" aria-label="Lọc nguồn hàng"><label>Khoảng cách<select value={filter.distance} onChange={event => setFilter(previous => ({ ...previous, distance: event.target.value }))}><option value="">Tất cả</option><option value="near">Gần (Q1/Q3)</option><option value="middle">Vừa (Tiền Giang/Lâm Đồng)</option><option value="far">Khu vực khác</option></select></label><label>Đánh giá sao<select value={filter.rating} onChange={event => setFilter(previous => ({ ...previous, rating: event.target.value }))}><option value="">Tất cả</option><option value="4">Từ 4 sao</option><option value="4.5">Từ 4,5 sao</option><option value="4.8">Từ 4,8 sao</option></select></label><label>Độ chín<select value={filter.ripeness} onChange={event => setFilter(previous => ({ ...previous, ripeness: event.target.value }))}><option value="">Tất cả</option>{[...new Set(Object.values(productConditions))].map(value => <option key={value} value={value}>{value}</option>)}</select></label><label>Mức giá<select value={filter.price} onChange={event => setFilter(previous => ({ ...previous, price: event.target.value }))}><option value="">Tất cả</option><option value="low">Dưới 30.000đ/kg</option><option value="mid">30.000–59.999đ/kg</option><option value="high">Từ 60.000đ/kg</option></select></label><label>Danh mục<select value={filter.category} onChange={event => setFilter(previous => ({ ...previous, category: event.target.value }))}><option value="">Tất cả</option><option value="FRESH_FRUIT">Trái cây tươi</option><option value="VEGETABLES">Rau củ quả</option></select></label><label>Phường/Xã<select value={filter.area} onChange={event => setFilter(previous => ({ ...previous, area: event.target.value }))}><option value="">Tất cả khu vực</option>{areas.map(value => <option key={value} value={value}>{value}</option>)}</select></label></div>
      {!loading && !error && <div className="home-results"><p className="result-count" role="status">{filteredProducts.length > 16 ? `Hiển thị 16 trên ${filteredProducts.length} mặt hàng phù hợp` : `${filteredProducts.length} mặt hàng phù hợp`}</p>{hasFilters && <button className="home-filter-reset" type="button" onClick={resetFilters}>Xóa bộ lọc</button>}</div>}
      {error ? <ErrorMessage message={error} onRetry={retry} /> : loading ? <LoadingSpinner /> : filteredProducts.length ? <div className="market-grid home-market-grid">{filteredProducts.sort((a,b) => { const rank = (id: string) => { const index = featuredProductIds.indexOf(id); return index < 0 ? 99 : index; }; return rank(a.id) - rank(b.id); }).slice(0, 16).map(product => <StoreProductCard key={product.id} product={product}/>)}</div> : <div className="empty-panel"><h3>{hasFilters ? 'Không có mặt hàng phù hợp' : 'Chưa có nguồn hàng đang mở bán'}</h3><p>{hasFilters ? 'Thử chọn lại bộ lọc để xem thêm nguồn hàng.' : 'Bạn có thể tải lại danh sách hoặc quay lại sau.'}</p><button className="btn-secondary" type="button" onClick={hasFilters ? resetFilters : retry}>{hasFilters ? 'Xóa bộ lọc' : 'Tải lại nguồn hàng'}</button></div>}
    </section>
    <section className="store-suppliers">
      <h2>Mạng lưới <span>hợp tác xã &amp; nhà vườn</span> uy tín</h2>
      <div className="supplier-grid">{[...new Map(products.map(product => [product.supplier.id, product.supplier])).values()].map(supplier => <SupplierStoreCard key={supplier.id} supplier={supplier} products={products.filter(product => product.supplierId === supplier.id)}/>)}</div>
    </section>
    <footer className="store-footer">
      <div className="store-footer-main">
        <section className="store-footer-brand" aria-label="Thông tin FARMGO">
          <Link className="store-footer-logo" to="/customer" aria-label="FARMGO — Trang chủ">
            <img src="/farmgo-logo.png" alt="FARMGO" />
            <span>Nguồn hàng cho F&B</span>
          </Link>
          <h2>Kết nối với chúng tôi</h2>
          <p>Nguồn nông sản từ nhà vườn, dành cho gian bếp chuyên nghiệp.</p>
        </section>

        <section className="store-footer-column">
          <h2>Hỗ trợ khách hàng</h2>
          <div className="store-footer-contact">
            <span>Tư vấn đặt hàng</span>
            <strong>1900 0000</strong>
            <small>Thông tin liên hệ mẫu</small>
          </div>
          <div className="store-footer-contact">
            <span>Hỗ trợ và góp ý</span>
            <strong>hotro@farmgo.example</strong>
            <small>Thông tin liên hệ mẫu</small>
          </div>
          <Link to="/customer/claims">Gửi yêu cầu hỗ trợ</Link>
        </section>

        <section className="store-footer-column">
          <h2>Về FARMGO</h2>
          <p>Nền tảng kết nối nguồn cung nông sản với nhà hàng và quán F&amp;B.</p>
          <Link to="/customer/catalog">Khám phá nguồn hàng</Link>
          <Link to="/supplier">Dành cho nhà cung cấp</Link>
          <Link to="/htx">Cổng HTX Phân Bón</Link>
        </section>

        <section className="store-footer-column">
          <h2>Thông tin</h2>
          <Link to="/customer/catalog">Danh mục sản phẩm</Link>
          <Link to="/customer/orders">Đơn hàng của tôi</Link>
          <Link to="/customer/profile">Hồ sơ doanh nghiệp</Link>
          <Link to="/customer/finance">Tài chính và đối soát</Link>
        </section>

        <section className="store-footer-column store-footer-partners">
          <h2>Thanh toán</h2>
          <div className="store-footer-logos" aria-label="Các phương thức thanh toán mô phỏng">
            <span className="store-footer-logo-tile store-footer-logo-bank" aria-label="Chuyển khoản ngân hàng">BANK</span>
            <span className="store-footer-logo-tile store-footer-logo-cod" aria-label="Thanh toán khi nhận hàng">COD</span>
            <span className="store-footer-logo-tile"><img src="/partner-logos/momo.svg" alt="MoMo" /></span>
            <span className="store-footer-logo-tile"><img src="/partner-logos/zalopay.png" alt="ZaloPay" /></span>
          </div>
          <h2 className="store-footer-shipping-title">Đơn vị giao nhận</h2>
          <div className="store-footer-logos" aria-label="Đơn vị giao nhận mô phỏng">
            <span className="store-footer-logo-tile store-footer-ghn"><img src="/partner-logos/ghn.png" alt="" /><b>GHN</b></span>
            <span className="store-footer-logo-tile store-footer-ghtk"><img src="/partner-logos/ghtk.svg" alt="GHTK" /></span>
          </div>
          <small className="store-footer-simulation-note">Thanh toán và giao nhận mô phỏng</small>
        </section>
      </div>
      <div className="store-footer-bottom">
        <span>© FARMGO · Kết nối nhà vườn và quán F&amp;B</span>
        <span>Thông tin liên hệ mẫu</span>
        <a href={import.meta.env.BASE_URL + 'product-photos/credits.md'} target="_blank" rel="noreferrer">Nguồn ảnh sản phẩm</a>
      </div>
    </footer>
  </div>;
}
