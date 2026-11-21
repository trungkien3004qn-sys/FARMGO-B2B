import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Commodity, ProductUse, Supplier } from '../../types';
import {
  getDemoSession,
  getSuppliers,
  getSupplierListings,
  getCommodities,
  createProduct,
  updateProduct,
  subscribeDemoData,
} from '../../services/demoService';
import { prepareProductPhoto } from '../../components/shared/prepareProductPhoto';
import { ErrorMessage, LoadingSpinner } from '../../components/shared/Feedback';
import { LucideIcon } from '../../components/shared/LucideIcon';

const samplePhotos: { name: string; url: string }[] = [
  { name: 'Bơ sáp 034', url: '/product-photos/avocado-034.webp' },
  { name: 'Xoài Cát Hòa Lộc', url: '/product-photos/mango-cat-hoa-loc.webp' },
  { name: 'Thanh Long', url: '/product-photos/dragon-fruit.webp' },
  { name: 'Cam sành', url: '/product-photos/orange.webp' },
  { name: 'Cà rốt Đà Lạt', url: '/product-photos/carrot.webp' },
  { name: 'Cà chua sạch', url: '/product-photos/tomato.webp' },
];

const blank = {
  name: '',
  category: 'FRESH_FRUIT' as 'FRESH_FRUIT' | 'VEGETABLES' | 'SPICES',
  variety: '',
  commodityId: '',
  availableKg: 200,
  publicPricePerKg: 35000,
  originLabel: 'Lâm Đồng',
  packagingLabel: 'Thùng carton 10 kg',
  imageUrl: '/product-photos/avocado-034.webp',
  uses: ['FRESH', 'JUICE'] as ProductUse[],
  active: true,
};

export function AddProductPage({ onSaved, onCancel }: { onSaved?: () => void; onCancel?: () => void }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const photoId = useId();
  const [form, setForm] = useState({ ...blank });
  const [supplier, setSupplier] = useState<Supplier>();
  const [, setCommodities] = useState<Commodity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string>();
  const [photoError, setPhotoError] = useState<string>();
  const [inputKey, setInputKey] = useState(0);
  const [revision, setRevision] = useState(0);
  const photoRequest = useRef(0);

  useEffect(() => subscribeDemoData(event => {
    if (event.type === 'SESSION_CHANGED' || event.type === 'RESET') setRevision(value => value + 1);
  }), []);

  useEffect(() => {
    let disposed = false;
    const cancelPhoto = () => { photoRequest.current += 1; };
    cancelPhoto();
    setLoading(true);
    setPhotoError(undefined);
    setProcessing(false);

    const load = async () => {
      try {
        const session = await getDemoSession();
        const [suppliers, groups, listings] = await Promise.all([
          getSuppliers(),
          getCommodities(),
          getSupplierListings(session.activeSupplierId!),
        ]);
        const item = id ? listings.find(product => product.id === id) : undefined;
        if (id && !item) throw new Error('Lô hàng không thuộc tài khoản nhà cung cấp đang chọn.');
        if (!disposed) {
          const activeSupplier = suppliers.find(entry => entry.id === session.activeSupplierId);
          setSupplier(activeSupplier);
          setCommodities(groups);
          setForm(item ? {
            name: item.name,
            category: (item as any).category || 'FRESH_FRUIT',
            variety: item.variety || '',
            commodityId: item.commodityId || '',
            availableKg: item.availableKg,
            publicPricePerKg: item.publicPricePerKg,
            originLabel: item.originLabel || activeSupplier?.regionLabel || 'Lâm Đồng',
            packagingLabel: item.packagingLabel || 'Thùng carton 10 kg',
            imageUrl: item.imageUrl || '/product-photos/avocado-034.webp',
            uses: item.uses || ['FRESH', 'JUICE'],
            active: item.active !== false,
          } : {
            ...blank,
            originLabel: activeSupplier?.regionLabel || 'Lâm Đồng',
            uses: ['FRESH', 'JUICE'],
          });
          setError(undefined);
        }
      } catch (err) {
        if (!disposed) {
          setSupplier(undefined);
          setError(err instanceof Error ? err.message : 'Không tải được thông tin nông sản.');
        }
      } finally {
        if (!disposed) setLoading(false);
      }
    };
    void load();
    return () => {
      disposed = true;
      cancelPhoto();
    };
  }, [id, revision]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supplier || saving || processing) return;
    if (!form.name.trim()) {
      setError('Vui lòng nhập tên nông sản / sản phẩm.');
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      const values = { ...form, name: form.name.trim() };
      if (id) {
        const { packagingLabel: _pkg, uses: _uses, ...changes } = values;
        await updateProduct({
          supplierId: supplier.id,
          productId: id,
          changes: {
            ...changes,
            originLabel: values.originLabel,
            packagingLabel: values.packagingLabel,
          },
        });
      } else {
        await createProduct({
          supplierId: supplier.id,
          commodityId: values.commodityId,
          name: values.name,
          category: values.category,
          variety: values.variety,
          availableKg: values.availableKg,
          publicPricePerKg: values.publicPricePerKg,
          imageUrl: values.imageUrl,
          uses: values.uses,
          originLabel: values.originLabel,
          packagingLabel: values.packagingLabel,
        });
      }
      if (onSaved) onSaved();
      else navigate('/supplier/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được lô hàng.');
    } finally {
      setSaving(false);
    }
  };

  const photo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const current = ++photoRequest.current;
    setProcessing(true);
    setPhotoError(undefined);
    try {
      const imageUrl = await prepareProductPhoto(file);
      if (current === photoRequest.current) setForm(value => ({ ...value, imageUrl }));
    } catch (err) {
      if (current === photoRequest.current) setPhotoError(err instanceof Error ? err.message : 'Không đọc được ảnh.');
    } finally {
      if (current === photoRequest.current) {
        setProcessing(false);
        setInputKey(key => key + 1);
      }
    }
  };

  const field = (key: keyof typeof form, value: any) => setForm(current => ({ ...current, [key]: value }));

  if (loading) return <LoadingSpinner />;

  return (
    <div className="product-form-wrap" style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
      {!onCancel && (
        <>
          <Link
            className="back-link"
            to="/supplier/products"
            style={{ display: 'inline-block', marginBottom: '12px', color: '#16a34a', textDecoration: 'none', fontWeight: 600 }}
          >
            ← Quay lại danh sách sản phẩm
          </Link>
          <div className="page-heading" style={{ marginBottom: '20px' }}>
            <div>
              <h1 style={{ fontSize: '1.6rem', color: '#0f172a', margin: '0 0 6px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                {id ? <><LucideIcon name="pencil" size={22} /> Chỉnh sửa thông tin nông sản</> : <><LucideIcon name="plus" size={22} /> Đăng bán lô nông sản mới</>}
              </h1>
              <p style={{ color: '#64748b', margin: 0 }}>
                {supplier?.name} · Sản phẩm sau khi đăng sẽ hiển thị trực tiếp trên Chợ Sỉ cho khách hàng F&amp;B đặt mua.
              </p>
            </div>
          </div>
        </>
      )}

      {error && <ErrorMessage message={error} />}

      {supplier && (
        <form
          className="card product-form"
          onSubmit={submit}
          style={{
            background: '#fff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
          }}
        >
          <fieldset disabled={saving || processing} style={{ border: 'none', padding: 0, margin: 0 }}>
            {/* Tên sản phẩm chính */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '1rem', color: '#1e293b', marginBottom: '8px' }}>
                Tên nông sản / Tên sản phẩm <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                name="productName"
                required aria-label="Tên nông sản"
                value={form.name}
                onChange={e => field('name', e.target.value)}
                placeholder="Ví dụ: Sầu Riêng Ri6 Đắk Lắk, Bơ Sáp 034, Xoài Cát Hòa Lộc..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '1.05rem',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <small style={{ color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                <LucideIcon name="lightbulb" size={14} /> Nhập tên cụ thể của loại quả hoặc nông sản bạn muốn mở bán trực tiếp cho khách mua F&amp;B.
              </small>
            </div>

            {/* Phân loại danh mục */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.95rem', color: '#1e293b', marginBottom: '8px' }}>
                Danh mục ngành hàng:
              </label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {[
                  { key: 'FRESH_FRUIT', label: 'Trái cây tươi', icon: 'apple' as const },
                  { key: 'VEGETABLES', label: 'Rau củ quả sạch', icon: 'salad' as const },
                  { key: 'SPICES', label: 'Gia vị & Nông sản khác', icon: 'leaf' as const },
                ].map(cat => (
                  <label
                    key={cat.key}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      borderRadius: '24px',
                      border: form.category === cat.key ? '2px solid #16a34a' : '1px solid #cbd5e1',
                      background: form.category === cat.key ? '#dcfce7' : '#f8fafc',
                      color: form.category === cat.key ? '#15803d' : '#475569',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="prodCategory"
                      value={cat.key}
                      checked={form.category === cat.key}
                      onChange={() => field('category', cat.key as any)}
                      style={{ width: 18, height: 18, accentColor: 'var(--fg-brand)' }}
                    />
                    <LucideIcon name={cat.icon} size={15} />
                    {cat.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Thông số Giá & Tồn kho */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', color: '#1e293b', marginBottom: '6px' }}>
                  Giá bán sỉ công khai (đ/kg) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  required
                  type="number"
                  min={1000}
                  step={500} aria-label="Giá bán sỉ công khai mỗi kg"
                  value={form.publicPricePerKg}
                  onChange={e => field('publicPricePerKg', e.target.valueAsNumber || 0)}
                  placeholder="Ví dụ: 35000"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', color: '#1e293b', marginBottom: '6px' }}>
                  Sản lượng sẵn có (kg) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  required
                  type="number"
                  min={1}
                  step={1} aria-label="Sản lượng sẵn có theo kg"
                  value={form.availableKg}
                  onChange={e => field('availableKg', e.target.valueAsNumber || 0)}
                  placeholder="Ví dụ: 500"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Vùng trồng & Đóng gói */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', color: '#1e293b', marginBottom: '6px' }}>
                  Vùng trồng / Xuất xứ
                </label>
                <input aria-label="Khu vực xuất xứ"
                  value={form.originLabel}
                  onChange={e => field('originLabel', e.target.value)}
                  placeholder="Ví dụ: Lâm Đồng, Tiền Giang, Đắk Lắk..."
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', color: '#1e293b', marginBottom: '6px' }}>
                  Quy cách đóng gói
                </label>
                <input aria-label="Quy cách đóng gói"
                  value={form.packagingLabel}
                  onChange={e => field('packagingLabel', e.target.value)}
                  placeholder="Ví dụ: Thùng carton 10 kg, Sọt 20 kg..."
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Đặc điểm phẩm chất */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', color: '#1e293b', marginBottom: '6px' }}>
                Đặc điểm / Tình trạng quả
              </label>
              <input aria-label="Giống và đặc điểm nông sản"
                value={form.variety}
                onChange={e => field('variety', e.target.value)}
                placeholder="Ví dụ: Cơm vàng hạt lép, chín bói tự nhiên, không hóa chất"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>

            {/* Ảnh sản phẩm */}
            <div style={{ marginBottom: '24px' }}>
              <label htmlFor={photoId} style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', color: '#1e293b', marginBottom: '6px' }}>
                Ảnh minh họa nông sản
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b', alignSelf: 'center' }}>Chọn ảnh nhanh:</span>
                {samplePhotos.map(sample => (
                  <button
                    key={sample.name}
                    type="button"
                    onClick={() => field('imageUrl', sample.url)}
                    style={{
                      cursor: 'pointer',
                      padding: '4px 10px',
                      borderRadius: '16px',
                      border: form.imageUrl === sample.url ? '2px solid #16a34a' : '1px solid #cbd5e1',
                      background: form.imageUrl === sample.url ? '#dcfce7' : '#fff',
                      fontSize: '0.82rem',
                    }}
                  >
                    {sample.name}
                  </button>
                ))}
              </div>
              <input id={photoId} key={inputKey} type="file" accept="image/jpeg,image/png,image/webp" onChange={photo} />
              {processing && <p style={{ color: '#0284c7', fontSize: '0.85rem' }}>Đang nén và xử lý ảnh...</p>}
              {photoError && <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>{photoError}</p>}
              {form.imageUrl && (
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src={form.imageUrl}
                    alt="Xem trước ảnh"
                    style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <button
                    type="button"
                    onClick={() => field('imageUrl', '')}
                    style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <LucideIcon name="x" size={14} /> Bỏ ảnh
                  </button>
                </div>
              )}
            </div>

            {/* Trạng thái mở bán */}
            <div style={{ marginBottom: '24px', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={e => field('active', e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <div>
                  <strong style={{ color: '#1e293b' }}>Mở bán trực tiếp trên Chợ Sỉ B2B ngay sau khi lưu</strong>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                    Khách hàng F&amp;B có thể xem thông tin, thêm vào giỏ và đặt hàng ngay lập tức.
                  </p>
                </div>
              </label>
            </div>

            {/* Nút hành động */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              {onCancel ? (
                <button type="button" className="btn-secondary" onClick={onCancel} style={{ padding: '10px 20px', borderRadius: '8px' }}>
                  Hủy
                </button>
              ) : (
                <Link
                  className="btn-secondary"
                  to="/supplier/products"
                  style={{ padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                >
                  Hủy
                </Link>
              )}
              <button
                className="btn-primary"
                type="submit"
                disabled={saving || processing}
                style={{
                  padding: '10px 28px',
                  borderRadius: '8px',
                  background: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {saving ? 'Đang lưu vào sàn...' : id ? <><LucideIcon name="save" size={16} /> Lưu thay đổi</> : <><LucideIcon name="rocket" size={16} /> Đăng nông sản lên sàn ngay</>}
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </div>
  );
}
