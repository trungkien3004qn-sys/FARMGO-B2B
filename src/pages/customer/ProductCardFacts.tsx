import type { CustomerProduct } from '../../types';
import { productRatings } from '../../mocks/productRatings';
import { ProductSuggestion } from './ProductSuggestion';

export function ProductCardFacts({ product }: { product: CustomerProduct }) {
  const rating = productRatings[product.id] ?? productRatings[product.commodityId];
  return <div className="market-card-facts">
    <div>{rating ? <><b><span aria-hidden="true">★</span> {rating.score.toLocaleString('vi-VN')}</b>
      <span>Đã bán {Math.round(rating.count * 2.5).toLocaleString('vi-VN')} kg <small>(mẫu)</small></span></> : <span>Chưa có đánh giá</span>}</div>
    <span>{product.originLabel || product.supplier.regionLabel || 'Chưa cập nhật khu vực'}</span>
    <ProductSuggestion product={product} />
  </div>;
}
