import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { ProductListing, QualityReview } from '../../types';
import {
  getDemoSession,
  getSupplierListings,
  getSuppliers,
  subscribeDemoData,
  getQualityReviews,
  getCustomerCatalog,
  updateProduct,
  deleteProduct,
} from '../../services/demoService';
import { LoadingSpinner, ErrorMessage } from '../../components/shared/Feedback';
import { money } from '../../components/shared/useCatalog';
import { LucideIcon } from '../../components/shared/LucideIcon';

export function ListingsPage() {
  const [params] = useSearchParams();
  const [filter, setFilter] = useState('all');
  const query = (params.get('q') || '').toLocaleLowerCase('vi');
  const [quality, setQuality] = useState<QualityReview[]>([]);
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const [listings, setListings] = useState<ProductListing[]>([]);
  const [supplierName, setSupplierName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let disposed = false;
    let request = 0;
    const load = async () => {
      const current = ++request;
      try {
        const session = await getDemoSession();
        const [products, suppliers, reviews, catalog] = await Promise.all([
          getSupplierListings(session.activeSupplierId!),
          getSuppliers(),
          getQualityReviews(),
          getCustomerCatalog(),
        ]);
        if (!disposed && current === request) {
          setListings(products);
          setQuality(reviews);
          setVisibleIds(catalog.map(p => p.id));
          setSupplierName(suppliers.find(item => item.id === session.activeSupplierId)?.name || '');
          setError(undefined);
        }
      } catch (err) {
        if (!disposed && current === request) {
          setError(err instanceof Error ? err.message : 'Không tải được sản phẩm.');
        }
      } finally {
        if (!disposed && current === request) setLoading(false);
      }
    };

    const unsubscribe = subscribeDemoData(event => {
      if (event.type === 'SESSION_CHANGED' || event.type === 'RESET') {
        setListings([]);
        setLoading(true);
      }
      void load();
    });
    void load();
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [revision]);

  const toggle = async (product: ProductListing) => {
    setBusy(product.id);
    try {
      const session = await getDemoSession();
      await updateProduct({
        supplierId: session.activeSupplierId!,
        productId: product.id,
        changes: { active: !product.active },
      });
      setRevision(v => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không cập nhật được sản phẩm.');
    } finally {
      setBusy('');
    }
  };

  const handleDelete = async (product: ProductListing) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa nông sản "${product.name}" khỏi sàn? Thao tác này sẽ gỡ sản phẩm khỏi danh mục chào bán.`)) {
      return;
    }
    setBusy(product.id);
    try {
      await deleteProduct(product.id);
      setRevision(v => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xóa được sản phẩm.');
    } finally {
      setBusy('');
    }
  };

  const filteredListings = listings.filter(item => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'dalat' ? item.originLabel === 'Lâm Đồng' : item.originLabel !== 'Lâm Đồng');
    const matchesQuery = `${item.name} ${item.id} ${item.originLabel || ''}`
      .toLocaleLowerCase('vi')
      .includes(query);
    return matchesFilter && matchesQuery;
  });

  return (
    <>
      <div className="page-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
            Quản lý nông sản &amp; Báo giá B2B
          </h1>
          <p style={{ color: '#64748b', margin: 0 }}>
            {supplierName} · Quản lý nguồn cung, chỉnh sửa giá bán buôn và cập nhật trạng thái mở bán tức thì.
          </p>
        </div>
        <Link
          to="/supplier/new"
          className="btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#16a34a',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
          }}
        >
          <LucideIcon name="plus" size={16} /> Thêm nông sản mới
        </Link>
      </div>

      {error && <ErrorMessage message={error} onRetry={() => setRevision(value => value + 1)} />}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <section className="seller-panel seller-product-table" style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
            <div className="seller-tabs" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <label style={{ fontWeight: 600, color: '#475569' }}>Lọc danh mục:</label>
              {[
                ['all', `Tất cả (${listings.length})`],
                ['mekong', 'Trái cây miền Tây'],
                ['dalat', 'Nông sản Đà Lạt'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  className={filter === key ? 'active' : ''}
                  onClick={() => setFilter(key)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: filter === key ? '2px solid #16a34a' : '1px solid #cbd5e1',
                    background: filter === key ? '#f0fdf4' : '#fff',
                    color: filter === key ? '#15803d' : '#475569',
                    fontWeight: filter === key ? 700 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: '0.9rem', color: '#16a34a', fontWeight: 600, background: '#dcfce7', padding: '4px 10px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '0.65rem' }}>●</span> {visibleIds.filter(id => listings.some(p => p.id === id)).length} / {listings.length} đang mở bán trên sàn
              </span>
            </div>

            <div className="table-responsive" style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 10px' }}>Ảnh &amp; Tên Nông Sản</th>
                    <th style={{ padding: '12px 10px' }}>Xuất xứ &amp; Đóng gói</th>
                    <th style={{ padding: '12px 10px' }}>Giá chào sỉ</th>
                    <th style={{ padding: '12px 10px' }}>Tồn kho</th>
                    <th style={{ padding: '12px 10px' }}>Trạng thái sàn</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredListings.map(item => {
                    const qc = quality.find(q => q.productId === item.id);
                    const isLive = visibleIds.includes(item.id) && item.active !== false;

                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' }}>
                        <td style={{ padding: '14px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <img
                              src={item.imageUrl || '/product-photos/avocado-034.webp'}
                              alt={item.name}
                              style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                              onError={e => {
                                (e.currentTarget as HTMLImageElement).src = '/product-photos/avocado-034.webp';
                              }}
                            />
                            <div>
                              <strong style={{ fontSize: '1rem', color: '#0f172a', display: 'block' }}>{item.name}</strong>
                              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Mã: {item.id}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 10px', color: '#475569', fontSize: '0.9rem' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <LucideIcon name="mapPin" size={13} /> {item.originLabel || 'Việt Nam'}
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <LucideIcon name="package" size={13} /> {item.packagingLabel || 'Theo kg'}
                          </div>
                        </td>
                        <td style={{ padding: '14px 10px' }}>
                          <strong style={{ color: '#16a34a', fontSize: '1.05rem' }}>{money(item.publicPricePerKg)}</strong>
                          <span style={{ fontSize: '0.85rem', color: '#64748b' }}> /kg</span>
                        </td>
                        <td style={{ padding: '14px 10px' }}>
                          <strong style={{ color: item.availableKg > 0 ? '#1e293b' : '#ef4444' }}>
                            {item.availableKg.toLocaleString('vi-VN')} kg
                          </strong>
                        </td>
                        <td style={{ padding: '14px 10px' }}>
                          {isLive ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, background: '#dcfce7', color: '#15803d' }}>
                              ● Đang mở bán
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, background: '#f1f5f9', color: '#64748b' }}>
                              ○ Tạm ẩn
                            </span>
                          )}
                          {qc?.yieldPercent && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                              Đạt chuẩn: {qc.yieldPercent}%
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            {/* Xem trên sàn */}
                            <Link
                              to={`/customer/products/${item.id}`}
                              target="_blank"
                              title="Xem trang sản phẩm phía người mua"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                textDecoration: 'none',
                                background: '#eff6ff',
                                color: '#2563eb',
                                border: '1px solid #bfdbfe',
                              }}
                            >
                              <LucideIcon name="eye" size={14} /> Xem
                            </Link>

                            {/* Chỉnh sửa */}
                            <Link
                              to={`/supplier/products/${item.id}/edit`}
                              title="Chỉnh sửa giá, tồn kho, tên sản phẩm"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                textDecoration: 'none',
                                background: '#f8fafc',
                                color: '#334155',
                                border: '1px solid #cbd5e1',
                              }}
                            >
                              <LucideIcon name="pencil" size={14} /> Sửa
                            </Link>

                            {/* Tạm ẩn / Mở bán */}
                            <button
                              type="button"
                              disabled={!!busy}
                              onClick={() => void toggle(item)}
                              title={item.active ? 'Tạm dừng hiển thị trên chợ sỉ' : 'Mở bán lại cho khách F&B'}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                background: item.active ? '#fff7ed' : '#f0fdf4',
                                color: item.active ? '#c2410c' : '#15803d',
                                border: `1px solid ${item.active ? '#fed7aa' : '#bbf7d0'}`,
                              }}
                            >
                              {busy === item.id ? '...' : item.active ? 'Ẩn' : 'Bán'}
                            </button>

                            {/* Xóa sản phẩm */}
                            <button
                              type="button"
                              disabled={!!busy}
                              onClick={() => void handleDelete(item)}
                              title="Xóa hẳn sản phẩm khỏi danh mục"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                background: '#fef2f2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                              }}
                            >
                              {busy === item.id ? '...' : <><LucideIcon name="trash" size={14} /> Xóa</>}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredListings.length === 0 && (
              <p style={{ textAlign: 'center', padding: '32px 0', color: '#64748b' }}>
                Không có nông sản nào phù hợp với bộ lọc hiện tại.
              </p>
            )}
          </section>

          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <LucideIcon name="lightbulb" size={14} /> Mẹo: Khi nhà vườn bấm <strong>"Thêm nông sản mới"</strong>, sản phẩm sẽ được tự động đồng bộ vào hệ thống dữ liệu và hiển thị ngay trên Chợ Sỉ cho khách hàng F&B đặt mua.
          </p>
        </>
      )}
    </>
  );
}
