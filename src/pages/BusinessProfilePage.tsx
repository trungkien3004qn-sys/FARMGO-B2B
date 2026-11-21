import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/demoService';
import { getStoredUser, clearStoredAuth } from '../services/apiClient';
import type { BusinessProfile } from '../types';
import { useDemoData } from '../components/shared/useDemoData';
import { ErrorMessage } from '../components/shared/Feedback';

export function BusinessProfilePage() {
  const navigate = useNavigate();
  const [storedUser] = useState(getStoredUser);
  const state = useDemoData(async () => ({
    session: await api.getDemoSession(),
    profiles: await api.getBusinessProfiles(),
  }));

  const [form, setForm] = useState<BusinessProfile>();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  const id = state.data?.session.role === 'SUPPLIER'
    ? state.data.session.activeSupplierId
    : state.data?.session.activeCustomerId;

  const current = state.data?.profiles.find(p => p.id === id);

  useEffect(() => {
    if (!state.data) return;
    if (current) {
      setForm(current);
    } else if (storedUser) {
      setForm({
        id: storedUser.id,
        businessName: storedUser.companyName || storedUser.name,
        taxCode: '',
        contactName: storedUser.name,
        address: storedUser.address || '',
        phone: storedUser.phone || '',
        role: storedUser.role === 'SUPPLIER' ? 'SUPPLIER' : 'CUSTOMER',
        status: 'DRAFT',
        legacy: false,
      });
    }
  }, [current, storedUser, state.data]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setSuccess('');
    setSaveError('');
    try {
      await api.saveBusinessProfile({
        id: form.id,
        changes: {
          businessName: form.businessName,
          taxCode: form.taxCode,
          contactName: form.contactName,
          address: form.address,
        },
      });
      setSuccess('Đã lưu thông tin hồ sơ doanh nghiệp thành công!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Không lưu được hồ sơ. Hãy thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    clearStoredAuth();
    try {
      await api.setDemoSession({ role: 'CUSTOMER', activeSupplierId: undefined, activeCustomerId: undefined });
    } catch {
      // ignore
    }
    navigate('/login', { replace: true });
  };

  const statusLabels = { DRAFT: 'Chưa gửi duyệt', PENDING: 'Đang chờ duyệt', APPROVED: 'Đã xác thực & Đang hoạt động', REJECTED: 'Cần bổ sung hồ sơ' };
  return <section className="business-profile-page">
    <div className="page-heading"><div><h1>Hồ sơ doanh nghiệp</h1><p>Quản lý thông tin pháp lý, địa chỉ và thông tin liên hệ.</p></div><button type="button" className="btn-secondary" onClick={()=>void handleLogout()}>Đăng xuất</button></div>
    {state.error && <ErrorMessage message={state.error}/>}
    {saveError && <ErrorMessage message={saveError}/>}
    {success && <p className="fg-feedback" role="status">{success}</p>}
    {form ? <section className="card"><div className="page-heading"><div><h2>{form.businessName}</h2><p>{form.role==='SUPPLIER'?'Nhà vườn / Hợp tác xã':'Khách hàng doanh nghiệp F&B'}</p></div><span className="business-profile-status">{statusLabels[form.status]}</span></div>
      <form onSubmit={handleSave} className="business-profile-form">
        <p className="unified-required-note">Các trường có dấu * là bắt buộc.</p>
        <div className="form-grid">
          <label htmlFor="business-name">Tên doanh nghiệp *<input id="business-name" autoComplete="organization" required value={form.businessName} onChange={e=>setForm({...form,businessName:e.target.value})}/></label>
          <label htmlFor="business-tax">Mã số thuế *<input id="business-tax" required value={form.taxCode} onChange={e=>setForm({...form,taxCode:e.target.value})}/></label>
          <label htmlFor="business-contact">Người đại diện liên hệ *<input id="business-contact" autoComplete="name" required value={form.contactName||''} onChange={e=>setForm({...form,contactName:e.target.value})}/></label>
          <label htmlFor="business-phone">Số điện thoại tài khoản<input id="business-phone" type="tel" autoComplete="tel" readOnly value={form.phone||''}/></label>
        </div>
        <label className="business-address" htmlFor="business-address">Địa chỉ trụ sở / vườn canh tác *<input id="business-address" autoComplete="street-address" required value={form.address||''} onChange={e=>setForm({...form,address:e.target.value})}/></label>
        <div className="action-row"><button className="btn-secondary" type="button" onClick={()=>navigate('/login')}>Đổi tài khoản / phân hệ</button><button className="btn-primary" type="submit" disabled={saving}>{saving?'Đang lưu…':'Lưu thông tin hồ sơ'}</button></div>
      </form>
    </section> : !state.error && <p role="status">Đang tải hồ sơ doanh nghiệp…</p>}
  </section>;
}
