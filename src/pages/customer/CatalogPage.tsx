import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, type Variants } from 'motion/react';
import { useCatalog, categoryLabels } from '../../components/shared/useCatalog';
import { useBuyerCart } from '../../components/shared/useBuyerCart';
import { LoadingSpinner, ErrorMessage } from '../../components/shared/Feedback';
import { productRatings } from '../../mocks/productRatings';
import { productConditions } from '../../mocks/customerMerchandising';
import { StoreProductCard } from './StoreProductCard';
import { LucideIcon } from '../../components/shared/LucideIcon';

const catalogContainerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.03,
    },
  },
};

const catalogItemVariants: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      damping: 24,
      stiffness: 300,
    },
  },
};

export function CatalogPage() {
  const { products, loading, error, retry } = useCatalog();
  const cart = useBuyerCart();
  const [params, setParams] = useSearchParams();
  const [sort, setSort] = useState('name');
  const [showFilters, setShowFilters] = useState(false);

  const supplier = params.get('supplier') || '';
  const setSupplier = (value: string) => setFilter('supplier', value);
  const [distance, setDistance] = useState('');
  const [rating, setRating] = useState('');
  const [ripeness, setRipeness] = useState('');
  const [priceBand, setPriceBand] = useState('');
  const [area, setArea] = useState('');
  const category = params.get('category') || '';
  const query = params.get('q') || '';
  const use = params.get('use') || '';
  const cert = params.get('cert') || '';

  const setFilters = (values: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(values).forEach(([key,value]) => { if (value) next.set(key,value); else next.delete(key); });
    setParams(next);
  };
  const setFilter = (key: string, value: string) => setFilters({[key]:value});

  const suppliers = useMemo(
    () => [...new Map(products.map(product => [product.supplier.id, product.supplier])).values()],
    [products]
  );
  const areas = useMemo(
    () => [...new Set(products.map(product => product.supplier.regionLabel).filter((v): v is string => Boolean(v)))],
    [products]
  );

  const hasActiveFilters = Boolean(
    category || supplier || rating || ripeness || priceBand || area || distance || use || cert || query
  );

  const handleResetFilters = () => {
    setParams({});
    setDistance('');
    setRating('');
    setRipeness('');
    setPriceBand('');
    setArea('');
  };

  const visible = useMemo(() => {
    return products
      .filter(product => {
        if (category && product.category !== category) return false;
        if (supplier && product.supplierId !== supplier) return false;
        if (rating) {
          const score = (productRatings[product.id] ?? productRatings[product.commodityId])?.score ?? 0;
          if (score < Number(rating)) return false;
        }
        if (ripeness) {
          const cond = (productConditions[product.id] || '').toLocaleLowerCase('vi');
          if (!cond.includes(ripeness.toLocaleLowerCase('vi'))) return false;
        }
        if (priceBand) {
          if (priceBand === 'low' && product.publicPricePerKg >= 30000) return false;
          if (priceBand === 'mid' && (product.publicPricePerKg < 30000 || product.publicPricePerKg >= 60000)) return false;
          if (priceBand === 'high' && product.publicPricePerKg < 60000) return false;
        }
        if (area && product.supplier.regionLabel !== area) return false;
        if (distance) {
          const region = product.supplier.regionLabel || '';
          if (distance === 'near' && !['Q1', 'Q3'].includes(region)) return false;
          if (distance === 'middle' && !['Tiền Giang', 'Lâm Đồng'].includes(region)) return false;
          if (distance === 'far' && ['Q1', 'Q3', 'Tiền Giang', 'Lâm Đồng'].includes(region)) return false;
        }
        if (use) {
          if (use === 'DRINKS' && !product.uses.some(v => ['JUICE', 'SMOOTHIE'].includes(v))) return false;
          if (use !== 'DRINKS' && !product.uses.includes(use as 'JUICE')) return false;
        }
        if (cert) {
          const fullText = `${product.name} ${product.originLabel || ''} ${product.packagingLabel || ''} ${product.supplier.name}`.toLowerCase();
          if (cert === 'vietgap' && !fullText.includes('vietgap') && !fullText.includes('gap')) return false;
          if (cert === 'ocop' && !fullText.includes('ocop')) return false;
        }
        if (query) {
          const qText = `${product.name} ${product.supplier.name} ${product.originLabel || ''} ${product.packagingLabel || ''}`.toLocaleLowerCase('vi');
          if (!qText.includes(query.toLocaleLowerCase('vi'))) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sort === 'price-up') return a.publicPricePerKg - b.publicPricePerKg;
        if (sort === 'price-down') return b.publicPricePerKg - a.publicPricePerKg;
        if (sort === 'rating') {
          const scoreA = (productRatings[a.id] ?? productRatings[a.commodityId])?.score ?? 0;
          const scoreB = (productRatings[b.id] ?? productRatings[b.commodityId])?.score ?? 0;
          return scoreB - scoreA;
        }
        return a.name.localeCompare(b.name, 'vi');
      });
  }, [products, category, supplier, rating, ripeness, priceBand, area, distance, use, cert, query, sort]);

  return (
    <div className="taste-catalog-container">
      {/* Page Hero Header */}
      <div className="taste-page-heading">
        <div className="heading-content">
          <h1>Danh Mục Nguyên Liệu Nông Sản</h1>
          <p className="heading-sub">
            Khám phá nguồn hàng từ nhà vườn và hợp tác xã. So sánh giá công khai, quy cách và thông tin nguồn cung cho quán F&B.
          </p>
        </div>
        <div className="heading-actions">
          <Link className="taste-cart-cta-btn" to="/customer/checkout">
            <span className="cart-cta-icon" aria-hidden="true">
              <LucideIcon name="shoppingCart" size={18} />
            </span>
            <span className="cart-cta-text">Giỏ hàng F&B</span>
            {cart.items.length > 0 && <span className="cart-cta-badge">{cart.items.length}</span>}
          </Link>
        </div>
      </div>

      {/* Pill Filter Tabs (taste-skill navigation pills) */}
      <nav className="taste-pill-tabs-bar" aria-label="Lọc theo nhóm sản phẩm">
        <div className="taste-pill-tabs-scroll">
          <button 
            type="button" 
            className={`pill-tab-btn ${!category && !use && !cert ? 'is-active' : ''}`}
            onClick={() => { setFilters({category:'',use:'',cert:''}); }}
          >
            <span className="pill-tab-icon"><LucideIcon name="sprout" size={15} /></span> Tất cả mặt hàng ({products.length})
          </button>
          
          <button 
            type="button" 
            className={`pill-tab-btn ${category === 'FRESH_FRUIT' ? 'is-active' : ''}`}
            onClick={() => { setFilters({category:'FRESH_FRUIT',use:'',cert:''}); }}
          >
            <span className="pill-tab-icon"><LucideIcon name="apple" size={15} /></span> Trái cây tươi
          </button>

          <button 
            type="button" 
            className={`pill-tab-btn ${category === 'VEGETABLES' ? 'is-active' : ''}`}
            onClick={() => { setFilters({category:'VEGETABLES',use:'',cert:''}); }}
          >
            <span className="pill-tab-icon"><LucideIcon name="leaf" size={15} /></span> Rau củ quả
          </button>


          <button 
            type="button" 
            className={`pill-tab-btn ${cert === 'vietgap' ? 'is-active' : ''}`}
            onClick={() => { setFilter('cert', cert === 'vietgap' ? '' : 'vietgap'); }}
          >
            <span className="pill-tab-icon"><LucideIcon name="checkCircle" size={15} /></span> Chuẩn VietGAP
          </button>

          <button 
            type="button" 
            className={`pill-tab-btn ${cert === 'ocop' ? 'is-active' : ''}`}
            onClick={() => { setFilter('cert', cert === 'ocop' ? '' : 'ocop'); }}
          >
            <span className="pill-tab-icon"><LucideIcon name="star" size={15} /></span> Nông sản OCOP
          </button>
        </div>
      </nav>

      {/* Main Filter & Search Toolbar */}
      <div className="taste-filter-toolbar">
        <div className="search-pill-wrapper">
          <span className="search-icon" aria-hidden="true">
            <LucideIcon name="search" size={16} />
          </span>
          <input 
            type="search" 
            className="search-pill-input"
            placeholder="Tìm theo tên trái cây, rau củ, HTX cung cấp, vùng trồng..." 
            value={query} 
            onChange={event => setFilter('q', event.target.value)} 
            aria-label="Tìm kiếm sản phẩm sỉ"
          />
          {query && (
            <button 
              type="button" 
              className="search-clear-btn" 
              onClick={() => setFilter('q', '')}
              aria-label="Xóa từ khóa tìm kiếm"
            >
              <LucideIcon name="x" size={14} />
            </button>
          )}
        </div>

        <div className="toolbar-controls-row">
          <div className="select-pill-group">
            <label htmlFor="supplier-select" className="sr-only">Nhà cung cấp</label>
            <select 
              id="supplier-select"
              className="taste-select-pill"
              value={supplier} 
              onChange={event => setSupplier(event.target.value)}
            >
              <option value="">Tất cả HTX ({suppliers.length})</option>
              {suppliers.map(entry => (
                <option key={entry.id} value={entry.id}>{entry.name}</option>
              ))}
            </select>
          </div>

          <div className="select-pill-group">
            <label htmlFor="sort-select" className="sr-only">Sắp xếp</label>
            <select 
              id="sort-select"
              className="taste-select-pill"
              value={sort} 
              onChange={event => setSort(event.target.value)}
            >
              <option value="name">Tên nông sản (A - Z)</option>
              <option value="price-up">Giá sỉ: Thấp đến Cao</option>
              <option value="price-down">Giá sỉ: Cao đến Thấp</option>
              <option value="rating">Đánh giá cao nhất</option>
            </select>
          </div>

          <button 
            type="button" 
            className={`taste-filter-toggle-btn ${showFilters ? 'is-active' : ''}`}
            onClick={() => setShowFilters(prev => !prev)}
            aria-expanded={showFilters}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <LucideIcon name="sliders" size={14} /> Bộ lọc nâng cao
            </span>
            <span className="toggle-indicator">{showFilters ? '▲' : '▼'}</span>
          </button>
        </div>
      </div>

      {/* Collapsible Advanced Filters Row */}
      {showFilters && (
        <div className="taste-advanced-filters-panel" role="region" aria-label="Bộ lọc nâng cao">
          <div className="advanced-filter-item">
            <span className="filter-label">Khu vực / Tỉnh</span>
            <select 
              aria-label="Khu vực nguồn hàng" value={area} 
              onChange={event => setArea(event.target.value)}
              className="filter-input-select"
            >
              <option value="">Tất cả địa bàn</option>
              {areas.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div className="advanced-filter-item">
            <span className="filter-label">Mức giá sỉ</span>
            <select 
              aria-label="Mức giá sỉ" value={priceBand} 
              onChange={event => setPriceBand(event.target.value)}
              className="filter-input-select"
            >
              <option value="">Tất cả mức giá</option>
              <option value="low">Dưới 30.000đ/kg (Tiết kiệm)</option>
              <option value="mid">30.000 – 59.999đ/kg (Phổ thông)</option>
              <option value="high">Từ 60.000đ/kg (Cao cấp)</option>
            </select>
          </div>

          <div className="advanced-filter-item">
            <span className="filter-label">Chất lượng đánh giá</span>
            <select 
              aria-label="Đánh giá" value={rating} 
              onChange={event => setRating(event.target.value)}
              className="filter-input-select"
            >
              <option value="">Tất cả đánh giá</option>
              <option value="4">Từ 4.0 sao trở lên</option>
              <option value="4.5">Từ 4.5 sao trở lên</option>
              <option value="4.8">Từ 4.8 sao (Xuất sắc)</option>
            </select>
          </div>

          <div className="advanced-filter-item">
            <span className="filter-label">Độ chín / Quy cách</span>
            <select 
              aria-label="Độ chín và quy cách" value={ripeness} 
              onChange={event => setRipeness(event.target.value)}
              className="filter-input-select"
            >
              <option value="">Tất cả quy cách</option>
              {[...new Set(Object.values(productConditions))].map(value => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </div>

          <div className="advanced-filter-item">
            <span className="filter-label">Nhóm khu vực</span>
            <select 
              aria-label="Nhóm khu vực" value={distance} 
              onChange={event => setDistance(event.target.value)}
              className="filter-input-select"
            >
              <option value="">Tất cả khu vực</option>
              <option value="near">Q1 / Q3</option>
              <option value="middle">Tiền Giang / Lâm Đồng</option>
              <option value="far">Vùng trồng xa</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button 
              type="button" 
              className="reset-filters-btn"
              onClick={handleResetFilters}
            >
              ↺ Đặt lại tất cả
            </button>
          )}
        </div>
      )}

      {/* Active Filter Chips indicator */}
      {hasActiveFilters && (
        <div className="taste-active-chips-bar">
          <span className="chips-intro">Đang lọc:</span>
          {category && (
            <span className="filter-chip">
              Nhóm: {categoryLabels[category as keyof typeof categoryLabels] || category}
              <button type="button" onClick={() => setFilter('category', '')}>×</button>
            </span>
          )}
          {cert && (
            <span className="filter-chip">
              Chuẩn: {cert.toUpperCase()}
              <button type="button" onClick={() => setFilter('cert', '')}>×</button>
            </span>
          )}
          {use && (
            <span className="filter-chip">
              Mục đích: Pha chế F&B
              <button type="button" onClick={() => setFilter('use', '')}>×</button>
            </span>
          )}
          {supplier && (
            <span className="filter-chip">
              HTX: {suppliers.find(s => s.id === supplier)?.name || supplier}
              <button type="button" onClick={() => setSupplier('')}>×</button>
            </span>
          )}
          {priceBand && (
            <span className="filter-chip">
              Mức giá: {priceBand === 'low' ? '<30k' : priceBand === 'mid' ? '30k-60k' : '>60k'}
              <button type="button" onClick={() => setPriceBand('')}>×</button>
            </span>
          )}
          {area && (
            <span className="filter-chip">
              Khu vực: {area}
              <button type="button" onClick={() => setArea('')}>×</button>
            </span>
          )}
          {query && (
            <span className="filter-chip">
              Từ khóa: "{query}"
              <button type="button" onClick={() => setFilter('q', '')}>×</button>
            </span>
          )}
          <button type="button" className="clear-all-chip-btn" onClick={handleResetFilters}>
            Xóa hết bộ lọc
          </button>
        </div>
      )}

      {/* Error & Loading Handlers */}
      {(error || cart.error) && <ErrorMessage message={error || cart.error!} onRetry={retry} />}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Result Count and Trust bar */}
          <div className="taste-results-header">
            <span className="results-count-text">
              Tìm thấy <strong>{visible.length}</strong> báo giá nông sản sỉ phù hợp
            </span>
            <span className="results-trust-badge">
              <LucideIcon name="shieldCheck" size={14} /> 100% kiểm định chất lượng trước khi đóng gói
            </span>
          </div>

          {/* Empty State */}
          {visible.length === 0 && (
            <div className="taste-empty-state">
              <div className="empty-icon-wrap" aria-hidden="true">
                <LucideIcon name="sprout" size={44} />
              </div>
              <h3>Không tìm thấy mặt hàng phù hợp</h3>
              <p>Thử điều chỉnh từ khóa tìm kiếm hoặc chọn lại các tiêu chí bộ lọc của bạn.</p>
              <button type="button" className="btn-taste-reset" onClick={handleResetFilters}>
                <LucideIcon name="refreshCw" size={14} /> Xem tất cả nông sản sỉ
              </button>
            </div>
          )}

          {/* Modern Product Grid with Motion Stagger Fade-in */}
          <motion.div
            key={`catalog-grid-${category}-${query}-${supplier}-${sort}-${area}`}
            className="market-grid taste-market-grid"
            variants={catalogContainerVariants}
            initial="hidden"
            animate="show"
          >
            {visible.map((product) => {
              const count = products.filter((item) => item.commodityId === product.commodityId).length;
              return (
                <motion.div
                  key={product.id}
                  variants={catalogItemVariants}
                  className="catalog-stagger-item"
                >
                  <StoreProductCard 
                    product={product} 
                    compareCount={count} 
                  />
                </motion.div>
              );
            })}
          </motion.div>
        </>
      )}
    </div>
  );
}
