import { useDemoData } from '../../components/shared/useDemoData';
import { ErrorMessage, LoadingSpinner } from '../../components/shared/Feedback';
import { money } from '../../components/shared/useCatalog';
import { getHtxCommerce } from '../../services/htxService';

export function SellerHtxProducts() {
  const { data, error } = useDemoData(getHtxCommerce);
  const products = data?.products.filter(product => product.active) ?? [];
  return <section className="seller-htx-products">
    <header className="page-heading"><div><h1>Phân bón HTX</h1><p>Danh mục phân bón hữu cơ và chế phẩm sinh học đang mở bán.</p></div></header>
    {error && <ErrorMessage message={error} />}
    {!data && !error && <LoadingSpinner />}
    {data && !products.length && <p className="seller-panel">HTX chưa có sản phẩm đang mở bán.</p>}
    <div className="seller-htx-grid">{products.map(product => <article className="seller-panel" key={product.id}>
      <div className="seller-htx-photo">{product.imageUrl
        ? <img src={product.imageUrl} alt={product.name} loading="lazy" />
        : <span>{product.category}</span>}</div>
      <h2>{product.name}</h2>
      <p>{product.description}</p><p>{product.packaging} · {product.stock > 0 ? `Còn ${product.stock.toLocaleString('vi-VN')} sản phẩm` : 'Tạm hết hàng'}</p>
      <strong>{money(product.priceVnd)}</strong>
    </article>)}</div>
  </section>;
}
