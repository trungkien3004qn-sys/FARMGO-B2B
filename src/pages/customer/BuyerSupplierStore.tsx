import { HarvestDates } from '../../components/shared/HarvestDates';
import { ProductCardFacts } from './ProductCardFacts';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getSupplierPublicProfiles } from '../../services/demoService';
import { getPreorderMarket } from '../../services/preorderService';
import { useDemoData } from '../../components/shared/useDemoData';
import { useCatalog, money } from '../../components/shared/useCatalog';
import { useBuyerCart } from '../../components/shared/useBuyerCart';
import { FruitPhoto } from '../../components/shared/FruitPhoto';
import { ErrorMessage, LoadingSpinner } from '../../components/shared/Feedback';
import { StoreProductCard } from './StoreProductCard';
import { ProductSellerChat } from './ProductSellerChat';
import { saleReferencePrice } from './saleReferencePrices';
import './buyer-supplier-store.css';

const tabs = [['all', 'Tổng quan'], ['products', 'Tất cả sản phẩm'], ['sale', 'Đang giảm giá'], ['preorders', 'Đặt trước']] as const;

function FollowShop({ customerId, supplierId }: { customerId: string; supplierId: string }) {
  const key = 'farmgo-follow-shop:' + JSON.stringify([customerId, supplierId]);
  const [followed, setFollowed] = useState(() => {
    try { return localStorage.getItem(key) === '1'; } catch { return false; }
  });
  const [error, setError] = useState(false);
  return <div><button className="btn-secondary" type="button" aria-pressed={followed} onClick={() => {
    try {
      if (followed) localStorage.removeItem(key);
      else localStorage.setItem(key, '1');
      setFollowed(!followed);
      setError(false);
    } catch { setError(true); }
  }}>{followed ? '✓ Đang theo dõi' : '+ Theo dõi'}</button>
  {error && <p role="alert">Không lưu được trạng thái theo dõi.</p>}</div>;
}

export function BuyerSupplierStore() {
  const { supplierId } = useParams();
  return <SupplierStore key={supplierId} supplierId={supplierId} />;
}

function SupplierStore({ supplierId }: { supplierId?: string }) {
  const [tab, setTab] = useState<typeof tabs[number][0]>('all');
  const [query, setQuery] = useState('');
  const cart = useBuyerCart();
  const { products, loading, error } = useCatalog();
  const shop = useDemoData(async () => {
    const [profiles, market] = await Promise.all([getSupplierPublicProfiles(), getPreorderMarket('buyer')]);
    return { profiles, lots: market.lots };
  });
  if (shop.error || error) return <ErrorMessage message={shop.error || error!} />;
  if (!shop.data || loading) return <LoadingSpinner />;
  const supplier = shop.data.profiles.find(profile => profile.id === supplierId);
  if (!supplier) return <section className="empty-panel"><h1>Không tìm thấy gian hàng</h1><Link to="/customer/catalog">Về danh mục</Link></section>;

  const inventory = products.filter(product => product.supplierId === supplier.id);
  const term = query.trim().toLocaleLowerCase('vi');
  const matches = (...values: string[]) => values.join(' ').toLocaleLowerCase('vi').includes(term);
  const visible = inventory.filter(product => matches(product.name));
  const sales = visible.flatMap(product => {
    const reference = saleReferencePrice(product.id);
    return product.publicPricePerKg < reference ? [{ product, reference }] : [];
  });
  const lots = shop.data.lots.filter(lot => lot.supplierId === supplier.id && !lot.completedAt && matches(lot.title, lot.productName, lot.id));
  const accountKey = JSON.stringify([cart.customerId, supplier.id]);

  return <div className="buyer-shop">
    <header className="buyer-shop-header">
      <div className="buyer-shop-identity">
        <span className="buyer-shop-avatar" aria-hidden="true">{supplier.name.charAt(0)}</span>
        <div><h1>{supplier.name}</h1><p>Gian hàng nhà vườn</p></div>
        {cart.ready && cart.customerId && <div className="buyer-shop-actions">
          <FollowShop key={accountKey} customerId={cart.customerId} supplierId={supplier.id} />
          <ProductSellerChat key={'chat:' + accountKey} customerId={cart.customerId} supplier={supplier} />
        </div>}
      </div>
      <dl className="buyer-shop-facts">
        <div><dt>Mặt hàng đang mở bán</dt><dd>{inventory.length}</dd></div>
        {supplier.regionLabel && <div><dt>Vùng trồng</dt><dd>{supplier.regionLabel}</dd></div>}
      </dl>
      <label>Tìm trong gian hàng<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
    </header>
    <div className="buyer-shop-tabs" role="group" aria-label="Nội dung gian hàng">
      {tabs.map(([id, label]) => <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}
    </div>
    {tab === 'all' && <img className="buyer-shop-banner" src={import.meta.env.BASE_URL + 'banners/farmgo-delivery.jpg'} alt="FARMGO · Nguồn hàng từ vườn, đặt hàng tận nơi" width={1672} height={941} />}
    {(tab === 'all' || tab === 'products') && <section><h2>Tất cả sản phẩm</h2>
      {visible.length ? <div className="market-grid">{visible.map(product => <StoreProductCard key={product.id} product={product} />)}</div>
        : <p>Chưa có sản phẩm phù hợp.</p>}
    </section>}
    {(tab === 'all' || tab === 'sale') && <section><h2>Đang giảm giá</h2>
      {sales.length ? <div className="sale-grid">{sales.map(({ product, reference }) => <Link className="sale-product" key={product.id} to={`/customer/products/${encodeURIComponent(product.id)}`}>
        <div className="sale-photo"><FruitPhoto id={product.commodityId} name={product.name} imageUrl={product.imageUrl} /></div>
        <strong>{product.name}</strong><div className="sale-price">{money(product.publicPricePerKg)}/kg <del>{money(reference)}/kg</del></div>
        <ProductCardFacts product={product} /><small>Giá so sánh mẫu</small>
      </Link>)}</div> : <p>Chưa có sản phẩm giảm giá phù hợp.</p>}
    </section>}
    {(tab === 'all' || tab === 'preorders') && <section><h2>Đặt trước</h2>
      {lots.length ? <div className="sale-grid">{lots.map(lot => <article className="buyer-shop-lot" key={lot.id}>
        <div className="sale-photo"><FruitPhoto id={lot.productId} name={lot.productName} imageUrl={lot.imageUrl} /></div>
        <h3>{lot.title}</h3><strong>{money(lot.pricePerKg)}/kg</strong>
        <HarvestDates postedAt={lot.postedAt} harvestDate={lot.harvestDate} />
        <p>{lot.remaining > 0 ? `Còn ${lot.remaining.toLocaleString('vi-VN')} kg` : 'Đã hết lượng nhận đặt'}</p>
        <Link to={`/customer/preorders?lot=${encodeURIComponent(lot.id)}`}>Chi tiết lô →</Link>
      </article>)}</div> : <p>Chưa có lô đặt trước phù hợp.</p>}
    </section>}
  </div>;
}
