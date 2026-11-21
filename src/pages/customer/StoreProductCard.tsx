import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { CustomerProduct } from '../../types';
import { FruitPhoto } from '../../components/shared/FruitPhoto';
import { money, categoryLabels } from '../../components/shared/useCatalog';
import { useBuyerCart } from '../../components/shared/useBuyerCart';
import { ProductCardFacts } from './ProductCardFacts';
import { ProductCondition } from './ProductCondition';
import { StoreIcon } from './StoreIcon';
import { LucideIcon } from '../../components/shared/LucideIcon';

interface StoreProductCardProps {
  product: CustomerProduct;
  compareCount?: number;
}

export function StoreProductCard({ product, compareCount }: StoreProductCardProps) {
  const cart = useBuyerCart();
  const [quantity, setQuantity] = useState<number>(10);
  const [justAdded, setJustAdded] = useState(false);
  const certification = product.supplier.certifications?.[0];

  const isOutOfStock = product.availableKg <= 0;
  const isInputValid = Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= product.availableKg;

  const handleAddToCart = () => {
    if (!cart.ready || isOutOfStock || !isInputValid) return;
    const ok = cart.add(product.id, quantity);
    if (ok) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1600);
    }
  };

  const handleStep = (delta: number) => {
    setQuantity(prev => {
      const next = (prev || 0) + delta;
      if (next < 1) return 1;
      if (next > product.availableKg) return product.availableKg;
      return next;
    });
  };

  return (
    <article className="market-card taste-product-card" data-category={product.category}>
      {/* Photo Frame with Trust Badge */}
      <div className="card-media-wrapper">
        <Link 
          to={`/customer/products/${product.id}`} 
          className="product-photo-link" 
          aria-label={`Xem chi tiết ${product.name} từ ${product.supplier.name}`}
        >
          <FruitPhoto id={product.commodityId} name={product.name} imageUrl={product.imageUrl} />
        </Link>
        
        {/* Floating Trust Badge */}
        {certification && <div className="card-cert-badge badge-certification"><span className="badge-text">{certification}</span></div>}

        {/* Stock pill if low or out */}
        {isOutOfStock ? (
          <div className="card-status-pill pill-out">Tạm hết hàng</div>
        ) : product.availableKg < 100 ? (
          <div className="card-status-pill pill-low">Chỉ còn {product.availableKg} kg</div>
        ) : null}
      </div>

      {/* Card Content Body */}
      <div className="market-card-body">
        {/* Category & Condition Row */}
        <div className="card-meta-row">
          <span className="product-category-pill">{categoryLabels[product.category] || 'Nông sản'}</span>
          <ProductCondition id={product.id} />
        </div>

        {/* Product Title */}
        <h3 className="card-product-title">
          <Link to={`/customer/products/${product.id}`} title={product.name}>
            {product.name}
          </Link>
        </h3>

        {/* Supplier Info */}
        <div className="card-supplier-row" title={`Nhà cung cấp: ${product.supplier.name}`}>
          <StoreIcon name="building"/>
          <span className="supplier-name-text">{product.supplier.name}</span>
        </div>

        {/* Packaging / Spec details */}
        <p className="card-spec-text">
          {product.packagingLabel || 'Chưa có thông tin đóng gói'}
        </p>

        {/* Ratings & Facts */}
        <ProductCardFacts product={product} />

        {/* Price & Inventory Block */}
        <div className="card-price-inventory-block">
          <div className="card-price-wrap">
            <span className="card-price-tag">Giá sỉ B2B</span>
            <div className="market-price">
              <span className="price-num">{money(product.publicPricePerKg)}</span>
              <small className="price-unit">/kg</small>
            </div>
          </div>
          <div className="card-stock-wrap">
            <span className="stock-label">
              {product.availableKg > 0 ? (
                <>Sẵn kho: <strong>{product.availableKg.toLocaleString('vi-VN')}</strong> kg</>
              ) : (
                <span className="stock-empty">Liên hệ nhập thêm</span>
              )}
            </span>
          </div>
        </div>

        {/* Quantity Stepper & Add to Cart button */}
        <div className="product-buy taste-buy-action">
          <div className="qty-stepper-box" role="group" aria-label={`Số lượng kg ${product.name}`}>
            <button 
              type="button" 
              className="qty-btn qty-minus" 
              onClick={() => handleStep(-5)} 
              disabled={isOutOfStock || quantity <= 1}
              aria-label="Giảm 5 kg"
              title="Giảm 5 kg"
            >
              −
            </button>
            <input 
              id={`qty-${product.id}`}
              type="number" 
              min={1} 
              max={product.availableKg} 
              step={1}
              disabled={isOutOfStock}
              value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
              aria-label={`Số kg mua ${product.name}`}
              aria-invalid={!isOutOfStock && !isInputValid}
              aria-describedby={!isOutOfStock && !isInputValid ? `qty-error-${product.id}` : undefined}
            />
            <span className="qty-suffix">kg</span>
            <button 
              type="button" 
              className="qty-btn qty-plus" 
              onClick={() => handleStep(5)} 
              disabled={isOutOfStock || quantity >= product.availableKg}
              aria-label="Tăng 5 kg"
              title="Tăng 5 kg"
            >
              +
            </button>
          </div>

          <button 
            type="button" 
            className={`btn-taste-add ${justAdded ? 'is-added' : ''}`}
            disabled={!cart.ready || isOutOfStock || !isInputValid}
            onClick={handleAddToCart}
            aria-label={isOutOfStock ? `${product.name} tạm hết hàng` : `Thêm ${product.name} vào giỏ`}
          >
            {justAdded ? (
              <span className="added-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <LucideIcon name="check" size={14} /> Đã thêm!
              </span>
            ) : isOutOfStock ? (
              'Hết hàng'
            ) : (
              'Thêm vào giỏ'
            )}
          </button>
          <span className="store-visually-hidden" role="status">{justAdded ? `Đã thêm ${quantity} kg ${product.name} vào giỏ` : ''}</span>
        </div>
        {!isOutOfStock && !isInputValid && <p id={`qty-error-${product.id}`} className="store-quantity-error" role="status">Nhập số kg nguyên từ 1 đến {product.availableKg.toLocaleString('vi-VN')}.</p>}
        {cart.error && <p className="store-quantity-error" role="alert">{cart.error}</p>}

        {/* Multi-supplier compare link */}
        {compareCount && compareCount > 1 ? (
          <Link className="compare-link" to={`/customer/products/${product.id}#suppliers`}>
            So sánh {compareCount} nhà cung cấp tại vùng →
          </Link>
        ) : null}
      </div>
    </article>
  );
}
