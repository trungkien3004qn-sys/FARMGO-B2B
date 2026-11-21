import { ProductRating } from './ProductRating';
import { ProductSuggestion } from './ProductSuggestion';
import { ProductCondition } from './ProductCondition';
import { ProductSellerChat } from './ProductSellerChat';
import { calculateTrueCost } from '../../services/demoService';
import { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useCatalog, money, categoryLabels, useLabels } from '../../components/shared/useCatalog';
import { useBuyerCart } from '../../components/shared/useBuyerCart';
import { FruitPhoto } from '../../components/shared/FruitPhoto';
import { LoadingSpinner, ErrorMessage } from '../../components/shared/Feedback';
import { getStoredReviews, subscribeReviews, type CustomerReview } from '../../mocks/productReviews';
import { LucideIcon } from '../../components/shared/LucideIcon';

export function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, loading, error, retry } = useCatalog();
  const cart = useBuyerCart();
  const [quantity, setQuantity] = useState(25);
  const [message, setMessage] = useState('');
  const [justAdded, setJustAdded] = useState(false);
  const [reviews, setReviews] = useState<CustomerReview[]>(getStoredReviews);

  useEffect(() => {
    const unsub = subscribeReviews(() => {
      setReviews(getStoredReviews());
    });
    return () => unsub();
  }, []);

  const product = useMemo(() => products.find(item => item.id === id), [products, id]);
  const peers = useMemo(
    () => (product ? products.filter(item => item.commodityId === product.commodityId) : []),
    [products, product]
  );
  const productReviews = useMemo(
    () => (product ? reviews.filter(r => r.productId === product.id) : []),
    [reviews, product]
  );

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={retry} />;
  if (!product) {
    return (
      <div className="taste-empty-state">
        <div className="empty-icon-wrap" aria-hidden="true">
          <LucideIcon name="package" size={32} color="#94a3b8" />
        </div>
        <h3>Sản phẩm chưa mở bán hoặc tạm ẩn</h3>
        <p>Báo giá nông sản này có thể đã được cập nhật hoặc chuyển sang phiên mùa vụ mới.</p>
        <Link to="/customer/catalog" className="btn-taste-reset">
          ← Quay lại Chợ nông sản sỉ
        </Link>
      </div>
    );
  }

  const valid =
    Number.isSafeInteger(quantity) &&
    quantity >= 1 &&
    quantity <= product.availableKg &&
    Number.isSafeInteger(quantity * product.publicPricePerKg);
  const trueCost = valid ? calculateTrueCost(product.publicPricePerKg, quantity, product.qc) : null;
  const certification = product.supplier.certifications?.[0];

  const handleStep = (delta: number) => {
    setQuantity(prev => {
      const next = (prev || 0) + delta;
      if (next < 1) return 1;
      if (next > product.availableKg) return product.availableKg;
      return next;
    });
    setMessage('');
  };

  const handlePreset = (kg: number) => {
    const safeKg = Math.min(kg, product.availableKg);
    setQuantity(safeKg);
    setMessage('');
  };

  const addToCart = (buyNow: boolean) => {
    if (!valid || !cart.ready) return;
    if (cart.add(product.id, quantity)) {
      if (buyNow) {
        navigate('/customer/checkout');
      } else {
        setJustAdded(true);
        setMessage(`Đã thêm ${quantity} kg ${product.name} vào giỏ hàng.`);
        setTimeout(() => setJustAdded(false), 2000);
      }
    }
  };

  return (
    <div className="taste-purchase-page">
      {/* Breadcrumb Navigation */}
      <nav className="taste-breadcrumb" aria-label="Đường dẫn trang">
        <Link to="/customer">Trang chủ</Link>
        <span className="sep">/</span>
        <Link to="/customer/catalog">Chợ nông sản sỉ</Link>
        <span className="sep">/</span>
        <span className="current">{product.name}</span>
      </nav>

      {/* Main Product Showcase Card */}
      <article className="taste-purchase-showcase">
        <div className="taste-showcase-grid">
          {/* Visual Column */}
          <div className="taste-visual-col">
            <div className="taste-visual-frame">
              <FruitPhoto id={product.commodityId} name={product.name} imageUrl={product.imageUrl} />
              <>{certification && <div className="card-cert-badge badge-certification"><span className="badge-text">{certification}</span></div>}</>
              {product.availableKg <= 0 ? (
                <div className="card-status-pill pill-out">Tạm hết hàng</div>
              ) : product.availableKg < 100 ? (
                <div className="card-status-pill pill-low">Chỉ còn {product.availableKg} kg</div>
              ) : null}
            </div>

            {/* F&B Preparation & TrueCost Tip Box */}
            <div className="taste-tip-box">
              <div className="tip-box-header">
                <span className="tip-icon" aria-hidden="true"><LucideIcon name="lightbulb" size={16} /></span>
                <strong>Khuyến nghị pha chế &amp; bảo quản</strong>
              </div>
              <p className="tip-box-body">
                {product.qc?.status === 'APPROVED' ? (
                  <>Tỷ lệ phần thịt ăn được/dùng được thực tế đạt <strong>{product.qc.yieldPercent}%</strong> (Chứng nhận QC). </>
                ) : null}
                {product.uses.length ? (
                  <>Phù hợp tốt nhất cho: <strong>{product.uses.map(use => useLabels[use]).join(', ')}</strong>.</>
                ) : (
                  'Thích hợp cho cả chế biến món ăn và pha chế thức uống.'
                )}
              </p>
              <ProductCondition id={product.id} />
              <ProductSuggestion product={product} full />
            </div>
          </div>

          {/* Product Details & Purchase Form Column */}
          <div className="taste-info-col">
            <div className="taste-category-row">
              <span className="product-category-pill">{categoryLabels[product.category]}</span>
              <span className="harvest-origin-pill">
                <LucideIcon name="mapPin" size={14} /> {product.originLabel || product.supplier.regionLabel || 'Chưa cập nhật vùng trồng'}
              </span>
            </div>

            <h1 className="taste-product-h1">{product.name}</h1>

            <div className="taste-rating-meta-row">
              <ProductRating id={product.id} />
              <span className="stock-bullet">•</span>
              <span className="stock-info-text">
                Kho nông sản: <strong>{product.availableKg.toLocaleString('vi-VN')} kg</strong>
              </span>
            </div>

            {/* Fintech Pricing Block */}
            <div className="taste-price-card">
              <div className="price-primary-row">
                <span className="price-tag-b2b">Giá sỉ niêm yết trực tiếp</span>
                <div className="price-number-wrap">
                  <span className="price-huge">{money(product.publicPricePerKg)}</span>
                  <span className="price-unit">/kg</span>
                </div>
              </div>
              {trueCost && (
                <div className="price-truecost-banner">
                  <span className="truecost-icon"><LucideIcon name="sparkles" size={15} /></span>
                  <span>
                    True-Cost: <strong>{money(trueCost.costPerUsableKg)}</strong>/kg dùng được (Sau khi bù hao hụt QC)
                  </span>
                </div>
              )}
            </div>

            {/* Supplier Profile Card */}
            <div className="taste-supplier-card">
              <div className="supplier-avatar-box"><LucideIcon name="building" size={24} /></div>
              <div className="supplier-meta-box">
                <strong className="supplier-name-heading">{product.supplier.name}</strong>
                <span className="supplier-region-sub">
                  {product.supplier.regionLabel || 'Đối tác Hợp tác xã liên kết FARMGO'}
                </span>
              </div>
              <div className="supplier-actions-group">
                {cart.customerId && (
                  <ProductSellerChat
                    key={JSON.stringify([cart.customerId, product.supplierId, product.id])}
                    product={product}
                    customerId={cart.customerId}
                  />
                )}
                <Link 
                  className="supplier-visit-link" 
                  to={`/farm/${encodeURIComponent(product.supplierId)}`}
                  target="_blank"
                  title="Xem hồ sơ số & quét mã QR nhà vườn"
                >
                  <LucideIcon name="qrCode" size={14} /> Hồ sơ QR ↗
                </Link>
                <Link 
                  className="supplier-visit-link" 
                  to={`/customer/stores/${encodeURIComponent(product.supplierId)}`}
                >
                  Gian hàng HTX →
                </Link>
              </div>
            </div>

            {/* B2B Quantity Selector & Presets */}
            <div className="taste-b2b-quantity-box">
              <div className="quantity-header-row">
                <label className="quantity-title-label" htmlFor="detail-qty">
                  Số lượng nhập hàng (kg)
                </label>
                <span className="quantity-subtotal-text">
                  Tạm tính: <strong>{valid ? money(quantity * product.publicPricePerKg) : '—'}</strong>
                </span>
              </div>

              {/* Stepper + Quick Presets */}
              <div className="quantity-stepper-presets-row">
                <div className="qty-stepper-box detail-stepper">
                  <button
                    type="button"
                    className="qty-btn"
                    onClick={() => handleStep(-10)}
                    disabled={product.availableKg === 0 || quantity <= 1}
                    title="Giảm 10 kg"
                  >
                    −
                  </button>
                  <input
                    id="detail-qty"
                    type="number"
                    min={1}
                    max={product.availableKg}
                    step={1}
                    value={quantity}
                    disabled={product.availableKg === 0}
                    aria-invalid={!valid}
                    aria-describedby={!valid ? 'detail-quantity-error' : undefined}
                    onChange={e => {
                      setQuantity(Number(e.target.value));
                      setMessage('');
                    }}
                  />
                  <span className="qty-suffix">kg</span>
                  <button
                    type="button"
                    className="qty-btn"
                    onClick={() => handleStep(10)}
                    disabled={product.availableKg === 0 || quantity >= product.availableKg}
                    title="Tăng 10 kg"
                  >
                    +
                  </button>
                </div>

                <div className="preset-buttons-group">
                  {[10, 25, 50, 100].map(kg => (
                    <button
                      key={kg}
                      type="button"
                      className={`preset-btn ${quantity === kg ? 'is-selected' : ''}`}
                      disabled={product.availableKg < kg}
                      onClick={() => handlePreset(kg)}
                    >
                      {kg} kg
                    </button>
                  ))}
                </div>
              </div>

              {!valid && (
                <p id="detail-quantity-error" className="taste-validation-hint" role="status">
                  {product.availableKg === 0
                    ? 'Sản phẩm tạm thời hết hàng trong kho.'
                    : `Vui lòng nhập số kg hợp lệ từ 1 đến ${product.availableKg}.`}
                </p>
              )}
            </div>

            {/* Action Buttons: Add to Cart & Buy Now */}
            <div className="taste-action-buttons-row">
              <button
                type="button"
                className={`btn-taste-detail-add ${justAdded ? 'is-added' : ''}`}
                disabled={!cart.ready || !valid}
                onClick={() => addToCart(false)}
              >
                {justAdded ? <><LucideIcon name="check" size={16} /> Đã thêm vào giỏ!</> : <><LucideIcon name="shoppingCart" size={16} /> Thêm vào giỏ hàng</>}
              </button>
              <button
                type="button"
                className="btn-taste-detail-buynow"
                disabled={!cart.ready || !valid}
                onClick={() => addToCart(true)}
              >
                <LucideIcon name="zap" size={16} /> Mua ngay
              </button>
            </div>

            {message && (
              <div className="taste-success-toast-inline" role="status">
                <span>{message}</span>
                <Link to="/customer/checkout" className="toast-link">Xem giỏ hàng →</Link>
              </div>
            )}
            {cart.error && <ErrorMessage message={cart.error} />}

            {/* Specifications Collapsible Accordion */}
            <details className="taste-specs-accordion" open>
              <summary><LucideIcon name="clipboardList" size={16} /> Quy cách đóng gói &amp; Chất lượng lô hàng</summary>
              <div className="specs-accordion-content">
                <div className="spec-row">
                  <span className="spec-name">Tiêu chuẩn đóng gói:</span>
                  <span className="spec-val">{product.packagingLabel || 'Chưa cập nhật thông tin đóng gói'}</span>
                </div>
                <div className="spec-row">
                  <span className="spec-name">Đánh giá kiểm định QC:</span>
                  <span className="spec-val">
                    {product.qc?.status === 'APPROVED'
                      ? `Đạt chứng nhận Hạng ${product.qc.grade} · Yield ${product.qc.yieldPercent}%`
                      : 'Chưa có kết quả kiểm định QC'}
                  </span>
                </div>
                {trueCost && (
                  <div className="spec-row">
                    <span className="spec-name">Chi phí thực tế theo kg dùng:</span>
                    <span className="spec-val highlight-val">{money(trueCost.costPerUsableKg)}/kg</span>
                  </div>
                )}
              </div>
            </details>
          </div>
        </div>
      </article>

      {/* --- Đánh giá & phản hồi từ khách hàng B2B --- */}
      <section className="taste-reviews-section">
        <div className="reviews-section-header">
          <div>
            <h2>Đánh Giá &amp; Nhận Xét B2B</h2>
            <p>Ý kiến phản hồi thực tế từ các quán cà phê, nhà hàng và bếp ăn công nghiệp đã mua hàng.</p>
          </div>
          <div className="reviews-overall-rating">
            <ProductRating id={product.id} />
          </div>
        </div>

        {productReviews.length === 0 ? (
          <div className="reviews-empty-state">
            <p>Chưa có đánh giá cho lô hàng này. Khách hàng đã đặt mua có thể để lại phản hồi sau khi nhận hàng.</p>
          </div>
        ) : (
          <div className="reviews-cards-list">
            {productReviews.map(rev => (
              <article key={rev.id} className="taste-review-item">
                <div className="review-item-top">
                  <div className="reviewer-info-wrap">
                    <div className="reviewer-avatar">
                      {rev.customerName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="reviewer-name-row">
                        <strong>{rev.customerName}</strong>
                        <span className="verified-buyer-pill"><LucideIcon name="check" size={12} /> Đã mua hàng B2B</span>
                      </div>
                      <span className="reviewer-business">{rev.customerBusiness}</span>
                    </div>
                  </div>
                  <div className="review-score-date">
                    <span className="star-rating">{'★'.repeat(rev.rating)}</span>
                    <span className="review-date">
                      {new Date(rev.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </div>

                <p className="review-comment-text">{rev.comment}</p>

                {rev.tags && rev.tags.length > 0 && (
                  <div className="review-tags-row">
                    {rev.tags.map(t => (
                      <span key={t} className="review-tag">#{t}</span>
                    ))}
                  </div>
                )}

                {rev.sellerResponse && (
                  <div className="seller-reply-card">
                    <div className="seller-reply-header">
                      <span className="reply-icon"><LucideIcon name="messageCircle" size={15} /></span>
                      <strong>Phản hồi từ {rev.sellerResponse.responderName}:</strong>
                      <small>{new Date(rev.sellerResponse.respondedAt).toLocaleDateString('vi-VN')}</small>
                    </div>
                    <p className="seller-reply-message">{rev.sellerResponse.message}</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* --- So sánh nhà cung cấp cùng loại mặt hàng --- */}
      {peers.length > 1 && (
        <section id="suppliers" className="taste-comparison-section">
          <div className="comparison-header">
            <h2>So Sánh Báo Giá Từ Các Nhà Cung Cấp Khác</h2>
            <p>Cùng mặt hàng {product.name}, mỗi Hợp tác xã có năng lực tồn kho và vùng trồng đặc trưng.</p>
          </div>
          <div className="table-responsive taste-table-wrap">
            <table className="taste-comparison-table">
              <thead>
                <tr>
                  <th>Nhà cung cấp / HTX</th>
                  <th>Vùng trồng</th>
                  <th>Giá sỉ niêm yết</th>
                  <th>True-Cost /kg dùng được</th>
                  <th>Sẵn kho</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {peers.map(peer => {
                  const peerTrueCost = calculateTrueCost(peer.publicPricePerKg, 1, peer.qc);
                  const isCurrent = peer.id === id;
                  return (
                    <tr key={peer.id} className={isCurrent ? 'row-current' : ''}>
                      <td>
                        <strong>{peer.supplier.name}</strong>
                      </td>
                      <td>{peer.originLabel || 'Chưa cập nhật'}</td>
                      <td>
                        <strong className="table-price">{money(peer.publicPricePerKg)}</strong>/kg
                      </td>
                      <td>
                        {peerTrueCost ? (
                          <span className="table-truecost">{money(peerTrueCost.costPerUsableKg)}</span>
                        ) : (
                          'Chưa có Yield QC'
                        )}
                      </td>
                      <td>
                        <strong>{peer.availableKg.toLocaleString('vi-VN')}</strong> kg
                      </td>
                      <td>
                        {isCurrent ? (
                          <span className="current-viewing-badge">● Đang xem</span>
                        ) : (
                          <Link className="switch-quote-link" to={`/customer/products/${peer.id}`}>
                            Xem báo giá này →
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
