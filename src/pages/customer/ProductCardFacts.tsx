import type { CustomerProduct } from '../../types';
import { productRatings } from '../../mocks/productRatings';
import { ProductSuggestion } from './ProductSuggestion';
import { LucideIcon } from '../../components/shared/LucideIcon';

export function ProductCardFacts({ product }: { product: CustomerProduct }) {
  const rating = productRatings[product.id] ?? productRatings[product.commodityId];
  return <div className="market-card-facts">
    <div>{rating ? <><b><LucideIcon name="star" size={12} color="#f59e0b" fill="#f59e0b" /> {rating.score.toLocaleString('vi-VN')}</b>
      <span>Đã bán {Math.round(rating.count * 2.5).toLocaleString('vi-VN')} kg <small>(mẫu)</small></span></> : <span>Chưa có đánh giá</span>}</div>
    <span>{product.originLabel || product.supplier.regionLabel || 'Chưa cập nhật khu vực'}</span>
    <ProductSuggestion product={product} />
  </div>;
}
