import type { CustomerProduct } from '../../types';

const uses = {
  JUICE: 'nước ép',
  SMOOTHIE: 'sinh tố',
  KITCHEN: 'món chế biến tại bếp',
  FRESH: 'món dùng tươi',
};

export function ProductSuggestion({ product, full = false }: { product: CustomerProduct; full?: boolean }) {
  const options = [...new Set(product.uses)].slice(0, 2).map(use => uses[use]);
  if (!options.length) return null;
  const text = `${product.name} phù hợp cho ${options.join(' hoặc ')}.`;
  return <p className={`product-suggestion${full ? ' is-full' : ''}`} title={full ? undefined : text}>
    <b>Gợi ý AI (mẫu)</b><span>{text}</span>
  </p>;
}
