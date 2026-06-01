import React, { useEffect, useRef, useState } from 'react';
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormSwitch,
  CImage,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CPagination,
  CPaginationItem,
  CRow,
  CSpinner,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilBan, cilCalendar, cilCheck, cilClock, cilImage, cilLayers, cilPencil, cilTrash } from '@coreui/icons';
import apiService from 'src/services/apiService';
import { awsUrl } from 'src/services/endpoints';
import AlertModal from 'src/components/AlertModal';
import { parseApiMessage } from 'src/utils/apiMessages';

const BANNERABLE_TYPES = ['Site', 'City', 'Place'];

const selectStyle = { color: '#212631', backgroundColor: '#fff' };

const emptyForm = {
  id: '',
  name: '',
  image: null,
  start_date: '',
  duration: '',
  level: '',
  image_orientation: '',
  bannerable_type: '',
  bannerable_id: '',
  banner_package_id: '',
  banner_placement_id: '',
  redirect_url: '',
  status: 1,
  meta_data: '',
};

const Banners = () => {
  const [banners, setBanners] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [currentImageUrl, setCurrentImageUrl] = useState('');
  const [alert, setAlert] = useState(null);

  const [filters, setFilters] = useState({ search: '', status: '', level: '', is_active: '', banner_package_id: '', banner_placement_id: '' });
  const activeFilters = useRef({ search: '', status: '', level: '', is_active: '', banner_package_id: '', banner_placement_id: '' });
  const [searchTrigger, setSearchTrigger] = useState(0);

  const [durations, setDurations] = useState([]);
  const [levels, setLevels] = useState([]);
  const [orientations, setOrientations] = useState([]);
  const [packageFormDD, setPackageFormDD] = useState([]);

  useEffect(() => {
    fetchBanners(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTrigger]);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [daysRes, levelsRes, orientRes, pkgRes] = await Promise.all([
          apiService('POST', 'bannerDaysDD', {}),
          apiService('POST', 'bannerLevelsDD', {}),
          apiService('POST', 'bannerImageOrientationDD', {}),
          apiService('POST', 'bannerFormDD', {}),
        ]);
        if (daysRes.success) setDurations(daysRes.data || []);
        if (levelsRes.success) setLevels(levelsRes.data || []);
        if (orientRes.success) setOrientations(orientRes.data || []);
        if (pkgRes.success) setPackageFormDD(pkgRes.data || []);
      } catch (_) {}
    };
    fetchDropdowns();
  }, []);

  const showError = (msg) => setAlert({ type: 'danger', message: msg });
  const showSuccess = (msg) => setAlert({ type: 'success', message: msg });
  const clearAlert = () => setAlert(null);

  const handleSearch = () => {
    activeFilters.current = { ...filters };
    if (currentPage !== 1) setCurrentPage(1);
    else setSearchTrigger((t) => t + 1);
  };

  const handleClear = () => {
    const empty = { search: '', status: '', level: '', is_active: '', banner_package_id: '', banner_placement_id: '' };
    setFilters(empty);
    activeFilters.current = empty;
    setSearchTrigger((t) => t + 1);
  };

  // ─── List ─────────────────────────────────────────────────────────────────────

  const fetchBanners = async (page) => {
    setLoading(true);
    const body = {};
    const f = activeFilters.current;
    if (f.search) body.search = f.search;
    if (f.status !== '') body.status = Number(f.status);
    if (f.is_active !== '') body.is_active = Number(f.is_active);
    if (f.level) body.level = f.level;
    if (f.banner_package_id) body.banner_package_id = f.banner_package_id;
    if (f.banner_placement_id) body.banner_placement_id = f.banner_placement_id;
    try {
      const data = await apiService('POST', `listBanners?page=${page}`, body);
      if (!data.success) { showError(parseApiMessage(data.message) || 'Failed to load banners'); return; }
      setBanners(data.data.data || []);
      setTotalPages(data.data.last_page || 1);
      setTotal(data.data.total || 0);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Modals ───────────────────────────────────────────────────────────────────

  const openAddModal = () => {
    setFormData(emptyForm);
    setCurrentImageUrl('');
    setShowAddModal(true);
  };

  const mapBannerToForm = (b) => ({
    id: b.id,
    name: b.name ?? '',
    image: null,
    start_date: b.start_date ? b.start_date.replace('T', ' ').slice(0, 19) : '',
    duration: String(b.duration ?? ''),
    level: b.level ?? '',
    image_orientation: b.image_orientation ?? '',
    bannerable_type: b.bannerable_type
      ? b.bannerable_type.charAt(0).toUpperCase() + b.bannerable_type.slice(1)
      : '',
    bannerable_id: b.bannerable_id ?? '',
    banner_package_id: b.package?.id ?? b.banner_package_id ?? '',
    banner_placement_id: b.placement?.id ?? b.banner_placement_id ?? '',
    redirect_url: b.redirect_url ?? '',
    status: b.status ?? 1,
    meta_data: b.meta_data ? JSON.stringify(b.meta_data) : '',
  });

  const openEditModal = async (banner) => {
    setShowEditModal(true);
    setCurrentImageUrl(awsUrl(banner.image));
    setFormData(mapBannerToForm(banner));
    setModalLoading(true);
    try {
      const data = await apiService('POST', 'getBanner', { id: banner.id });
      if (!data.success) { showError(parseApiMessage(data.message) || 'Failed to load banner'); return; }
      setFormData(mapBannerToForm(data.data));
      if (data.data.image) setCurrentImageUrl(awsUrl(data.data.image));
    } catch (err) {
      showError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // ─── CRUD ─────────────────────────────────────────────────────────────────────

  const normalizeDate = (val) => {
    if (!val) return '';
    const s = val.replace('T', ' ');
    return s.length === 16 ? s + ':00' : s;
  };

  const handleAddBanner = async () => {
    const fd = new FormData();
    if (formData.name) fd.append('name', formData.name);
    if (formData.image) fd.append('image', formData.image);
    if (formData.start_date) fd.append('start_date', normalizeDate(formData.start_date));
    if (formData.duration) fd.append('duration', formData.duration);
    if (formData.level) fd.append('level', formData.level);
    if (formData.image_orientation) fd.append('image_orientation', formData.image_orientation);
    if (formData.bannerable_type) fd.append('bannerable_type', formData.bannerable_type);
    if (formData.bannerable_id) fd.append('bannerable_id', formData.bannerable_id);
    if (formData.banner_package_id) fd.append('banner_package_id', formData.banner_package_id);
    if (formData.banner_placement_id) fd.append('banner_placement_id', formData.banner_placement_id);
    if (formData.redirect_url) fd.append('redirect_url', formData.redirect_url);
    fd.append('status', formData.status ? '1' : '0');
    if (formData.meta_data) fd.append('meta_data', formData.meta_data);

    setModalLoading(true);
    try {
      const data = await apiService('POST', 'addBanner', fd);
      if (!data.success) { showError(parseApiMessage(data.message)); return; }
      setShowAddModal(false);
      showSuccess(data.message);
      fetchBanners(currentPage);
    } catch (err) {
      showError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleUpdateBanner = async () => {
    const fd = new FormData();
    fd.append('id', formData.id);
    fd.append('name', formData.name);
    fd.append('start_date', normalizeDate(formData.start_date));
    fd.append('duration', formData.duration);
    fd.append('level', formData.level);
    fd.append('image_orientation', formData.image_orientation);
    fd.append('bannerable_type', formData.bannerable_type);
    fd.append('bannerable_id', formData.bannerable_id);
    fd.append('banner_package_id', formData.banner_package_id);
    fd.append('banner_placement_id', formData.banner_placement_id);
    fd.append('redirect_url', formData.redirect_url);
    fd.append('status', formData.status ? '1' : '0');
    fd.append('meta_data', formData.meta_data);
    if (formData.image) fd.append('image', formData.image);

    setModalLoading(true);
    try {
      const data = await apiService('POST', 'updateBanner', fd);
      if (!data.success) { showError(parseApiMessage(data.message)); return; }
      setShowEditModal(false);
      showSuccess(data.message);
      fetchBanners(currentPage);
    } catch (err) {
      showError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteBanner = async (id) => {
    if (!window.confirm('Delete this banner? The image will also be removed from S3.')) return;
    try {
      const data = await apiService('POST', 'deleteBanner', { id });
      if (!data.success) { showError(parseApiMessage(data.message)); return; }
      setBanners((prev) => prev.filter((b) => b.id !== id));
      showSuccess(data.message);
    } catch (err) {
      showError(err.message);
    }
  };

  const handleChangeStatus = async (banner_id, status) => {
    if (!window.confirm(`${status.charAt(0).toUpperCase() + status.slice(1)} this banner?`)) return;
    try {
      const data = await apiService('POST', 'changeBannerStatus', { banner_id, status });
      if (!data.success) { showError(parseApiMessage(data.message)); return; }
      showSuccess(data.message);
      setBanners((prev) => prev.map((b) => b.id === banner_id ? { ...b, status } : b));
    } catch (err) {
      showError(err.message);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFormData((prev) => ({ ...prev, image: file }));
    setCurrentImageUrl(URL.createObjectURL(file));
  };

  const orientationHeight = (o) => o === 'potrait' ? 300 : 180;

  // ─── Add Form ─────────────────────────────────────────────────────────────────

  const addForm = (
    <CForm>
      <CRow className="g-3">
        <CCol md={6}>
          <CFormLabel>Name <span className="text-danger">*</span></CFormLabel>
          <CFormInput name="name" value={formData.name} onChange={handleInputChange} placeholder="Unique banner name" />
        </CCol>
        <CCol md={6}>
          <CFormLabel>Package</CFormLabel>
          <CFormSelect
            name="banner_package_id"
            value={formData.banner_package_id}
            onChange={(e) => setFormData((p) => ({ ...p, banner_package_id: e.target.value, banner_placement_id: '' }))}
            style={selectStyle}
          >
            <option value="" style={selectStyle}>Select package...</option>
            {packageFormDD.map((pkg) => (
              <option key={pkg.id} value={pkg.id} style={selectStyle}>{pkg.name} — ₹{pkg.price}</option>
            ))}
          </CFormSelect>
        </CCol>
        <CCol md={6}>
          <CFormLabel>Placement</CFormLabel>
          {(() => {
            const pkg = packageFormDD.find((p) => String(p.id) === String(formData.banner_package_id));
            const placements = pkg?.allowed_placements || [];
            const selected = placements.find((pl) => String(pl.id) === String(formData.banner_placement_id));
            return (
              <>
                <CFormSelect
                  name="banner_placement_id"
                  value={formData.banner_placement_id}
                  onChange={handleInputChange}
                  disabled={!formData.banner_package_id}
                  style={selectStyle}
                >
                  <option value="" style={selectStyle}>Select placement...</option>
                  {placements.map((pl) => (
                    <option key={pl.id} value={pl.id} style={selectStyle}>{pl.code} ({pl.width}×{pl.height})</option>
                  ))}
                </CFormSelect>
                {selected && (
                  <div style={{ fontSize: 11, color: 'var(--cui-secondary-color)', marginTop: 3 }}>
                    Recommended: {selected.width}×{selected.height}px — {selected.screen}
                  </div>
                )}
              </>
            );
          })()}
        </CCol>
        <CCol md={6}>
          <CFormLabel>Bannerable Type <span className="text-danger">*</span></CFormLabel>
          <CFormSelect name="bannerable_type" value={formData.bannerable_type} onChange={handleInputChange} style={selectStyle}>
            <option value="" style={selectStyle}>Select type...</option>
            {BANNERABLE_TYPES.map((t) => <option key={t} value={t} style={selectStyle}>{t}</option>)}
          </CFormSelect>
        </CCol>
        <CCol md={6}>
          <CFormLabel>Bannerable ID <span className="text-danger">*</span></CFormLabel>
          <CFormInput type="number" name="bannerable_id" value={formData.bannerable_id} onChange={handleInputChange} placeholder="ID of linked entity" />
        </CCol>
        <CCol md={12}>
          <CFormLabel>Redirect URL</CFormLabel>
          <CFormInput type="url" name="redirect_url" value={formData.redirect_url} onChange={handleInputChange} placeholder="https://tourkokan.com/..." />
        </CCol>
        <CCol md={6}>
          <CFormLabel>Start Date <span className="text-danger">*</span></CFormLabel>
          <CFormInput
            type="datetime-local"
            name="start_date"
            value={formData.start_date?.replace(' ', 'T').slice(0, 16) || ''}
            onChange={(e) => setFormData((p) => ({ ...p, start_date: e.target.value.replace('T', ' ') + ':00' }))}
          />
        </CCol>
        <CCol md={4}>
          <CFormLabel>Duration <span className="text-danger">*</span></CFormLabel>
          <CFormSelect name="duration" value={formData.duration} onChange={handleInputChange} style={selectStyle}>
            <option value="" style={selectStyle}>Select days...</option>
            {durations.map((d) => <option key={d.code} value={d.code} style={selectStyle}>{d.name}</option>)}
          </CFormSelect>
        </CCol>
        <CCol md={4}>
          <CFormLabel>Level <span className="text-danger">*</span></CFormLabel>
          <CFormSelect name="level" value={formData.level} onChange={handleInputChange} style={selectStyle}>
            <option value="" style={selectStyle}>Select level...</option>
            {levels.map((l) => <option key={l.code} value={l.code} style={selectStyle}>{l.name}</option>)}
          </CFormSelect>
        </CCol>
        <CCol md={4}>
          <CFormLabel>Orientation <span className="text-danger">*</span></CFormLabel>
          <CFormSelect name="image_orientation" value={formData.image_orientation} onChange={handleInputChange} style={selectStyle}>
            <option value="" style={selectStyle}>Select...</option>
            {orientations.map((o) => <option key={o.code} value={o.code} style={selectStyle}>{o.name}</option>)}
          </CFormSelect>
        </CCol>
        <CCol md={12}>
          <CFormLabel>Image <span className="text-danger">*</span></CFormLabel>
          <CFormInput type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleFileChange} />
          {currentImageUrl && (
            <CImage src={currentImageUrl} alt="preview" style={{ marginTop: 8, maxHeight: 100, maxWidth: 220, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--cui-border-color)' }} />
          )}
          <div style={{ fontSize: 11, color: 'var(--cui-secondary-color)', marginTop: 4 }}>Accepted: jpeg, jpg, png, webp</div>
        </CCol>
        <CCol md={6}>
          <CFormLabel>Status</CFormLabel>
          <div className="mt-1">
            <CFormSwitch
              id="add-banner-status"
              label={formData.status ? 'Active' : 'Inactive'}
              checked={!!formData.status}
              onChange={(e) => setFormData((p) => ({ ...p, status: e.target.checked ? 1 : 0 }))}
            />
          </div>
        </CCol>
        <CCol md={12}>
          <CFormLabel>Meta Data <span className="text-body-secondary" style={{ fontSize: 12 }}>(JSON, optional)</span></CFormLabel>
          <CFormInput name="meta_data" value={formData.meta_data} onChange={handleInputChange} placeholder='{"url": "https://example.com"}' />
        </CCol>
      </CRow>
    </CForm>
  );

  // ─── Edit Form ────────────────────────────────────────────────────────────────

  const editForm = (
    <CForm>
      <CRow className="g-3">
        <CCol md={6}>
          <CFormLabel>Name</CFormLabel>
          <CFormInput name="name" value={formData.name} onChange={handleInputChange} placeholder="Banner name" />
        </CCol>
        <CCol md={6}>
          <CFormLabel>Start Date</CFormLabel>
          <CFormInput
            type="datetime-local"
            name="start_date"
            value={formData.start_date?.replace(' ', 'T').slice(0, 16) || ''}
            onChange={(e) => setFormData((p) => ({ ...p, start_date: e.target.value.replace('T', ' ') + ':00' }))}
          />
        </CCol>
        <CCol md={6}>
          <CFormLabel>Package</CFormLabel>
          <CFormSelect
            name="banner_package_id"
            value={formData.banner_package_id}
            onChange={(e) => setFormData((p) => ({ ...p, banner_package_id: e.target.value, banner_placement_id: '' }))}
            style={selectStyle}
          >
            <option value="" style={selectStyle}>Select package...</option>
            {packageFormDD.map((pkg) => (
              <option key={pkg.id} value={pkg.id} style={selectStyle}>{pkg.name} — ₹{pkg.price}</option>
            ))}
          </CFormSelect>
        </CCol>
        <CCol md={6}>
          <CFormLabel>Placement</CFormLabel>
          {(() => {
            const pkg = packageFormDD.find((p) => String(p.id) === String(formData.banner_package_id));
            const placements = pkg?.allowed_placements || [];
            const selected = placements.find((pl) => String(pl.id) === String(formData.banner_placement_id));
            return (
              <>
                <CFormSelect
                  name="banner_placement_id"
                  value={formData.banner_placement_id}
                  onChange={handleInputChange}
                  disabled={!formData.banner_package_id}
                  style={selectStyle}
                >
                  <option value="" style={selectStyle}>Select placement...</option>
                  {placements.map((pl) => (
                    <option key={pl.id} value={pl.id} style={selectStyle}>{pl.code} ({pl.width}×{pl.height})</option>
                  ))}
                </CFormSelect>
                {selected && (
                  <div style={{ fontSize: 11, color: 'var(--cui-secondary-color)', marginTop: 3 }}>
                    Recommended: {selected.width}×{selected.height}px — {selected.screen}
                  </div>
                )}
              </>
            );
          })()}
        </CCol>
        <CCol md={6}>
          <CFormLabel>Bannerable Type</CFormLabel>
          <CFormSelect name="bannerable_type" value={formData.bannerable_type} onChange={handleInputChange} style={selectStyle}>
            <option value="" style={selectStyle}>Select type...</option>
            {BANNERABLE_TYPES.map((t) => <option key={t} value={t} style={selectStyle}>{t}</option>)}
          </CFormSelect>
        </CCol>
        <CCol md={6}>
          <CFormLabel>Bannerable ID</CFormLabel>
          <CFormInput type="number" name="bannerable_id" value={formData.bannerable_id} onChange={handleInputChange} placeholder="ID of linked entity" />
        </CCol>
        <CCol md={4}>
          <CFormLabel>Duration</CFormLabel>
          <CFormSelect name="duration" value={formData.duration} onChange={handleInputChange} style={selectStyle}>
            <option value="" style={selectStyle}>Select days...</option>
            {durations.map((d) => <option key={d.code} value={d.code} style={selectStyle}>{d.name}</option>)}
          </CFormSelect>
        </CCol>
        <CCol md={4}>
          <CFormLabel>Level</CFormLabel>
          <CFormSelect name="level" value={formData.level} onChange={handleInputChange} style={selectStyle}>
            <option value="" style={selectStyle}>Select level...</option>
            {levels.map((l) => <option key={l.code} value={l.code} style={selectStyle}>{l.name}</option>)}
          </CFormSelect>
        </CCol>
        <CCol md={4}>
          <CFormLabel>Orientation</CFormLabel>
          <CFormSelect name="image_orientation" value={formData.image_orientation} onChange={handleInputChange} style={selectStyle}>
            <option value="" style={selectStyle}>Select...</option>
            {orientations.map((o) => <option key={o.code} value={o.code} style={selectStyle}>{o.name}</option>)}
          </CFormSelect>
        </CCol>
        <CCol md={12}>
          <CFormLabel>
            Image
            <span className="text-body-secondary ms-1" style={{ fontSize: 12 }}>
              (leave empty to keep current — uploading replaces and deletes the old S3 file)
            </span>
          </CFormLabel>
          <CFormInput type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleFileChange} />
          {currentImageUrl && (
            <CImage src={currentImageUrl} alt="preview" style={{ marginTop: 8, maxHeight: 100, maxWidth: 220, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--cui-border-color)' }} />
          )}
        </CCol>
        <CCol md={6}>
          <CFormLabel>Status</CFormLabel>
          <div className="mt-1">
            <CFormSwitch
              id="edit-banner-status"
              label={formData.status ? 'Active' : 'Inactive'}
              checked={!!formData.status}
              onChange={(e) => setFormData((p) => ({ ...p, status: e.target.checked ? 1 : 0 }))}
            />
          </div>
        </CCol>
        <CCol md={12}>
          <CFormLabel>Redirect URL</CFormLabel>
          <CFormInput type="url" name="redirect_url" value={formData.redirect_url} onChange={handleInputChange} placeholder="https://tourkokan.com/..." />
        </CCol>
        <CCol md={12}>
          <CFormLabel>Meta Data <span className="text-body-secondary" style={{ fontSize: 12 }}>(JSON, optional)</span></CFormLabel>
          <CFormInput name="meta_data" value={formData.meta_data} onChange={handleInputChange} placeholder='{"url": "https://example.com"}' />
        </CCol>
      </CRow>
    </CForm>
  );

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <CRow>
      <CCol xs={12}>
        {/* Toolbar */}
        <CCard className="mb-3">
          <CCardBody>
            <CForm className="row g-3 align-items-end" onSubmit={(e) => { e.preventDefault(); handleSearch(); }}>
              <CCol md={3}>
                <CFormLabel className="mb-1">Search</CFormLabel>
                <CFormInput
                  placeholder="Banner name..."
                  value={filters.search}
                  onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                />
              </CCol>
              <CCol md={2}>
                <CFormLabel className="mb-1">Level</CFormLabel>
                <CFormSelect value={filters.level} onChange={(e) => setFilters((p) => ({ ...p, level: e.target.value }))} style={selectStyle}>
                  <option value="" style={selectStyle}>All</option>
                  {levels.map((l) => <option key={l.code} value={l.code} style={selectStyle}>{l.name}</option>)}
                </CFormSelect>
              </CCol>
              <CCol md={2}>
                <CFormLabel className="mb-1">Package</CFormLabel>
                <CFormSelect value={filters.banner_package_id} onChange={(e) => setFilters((p) => ({ ...p, banner_package_id: e.target.value, banner_placement_id: '' }))} style={selectStyle}>
                  <option value="" style={selectStyle}>All</option>
                  {packageFormDD.map((pkg) => <option key={pkg.id} value={pkg.id} style={selectStyle}>{pkg.name}</option>)}
                </CFormSelect>
              </CCol>
              <CCol md={2}>
                <CFormLabel className="mb-1">Placement</CFormLabel>
                <CFormSelect value={filters.banner_placement_id} onChange={(e) => setFilters((p) => ({ ...p, banner_placement_id: e.target.value }))} style={selectStyle}>
                  <option value="" style={selectStyle}>All</option>
                  {(filters.banner_package_id
                    ? (packageFormDD.find((p) => String(p.id) === String(filters.banner_package_id))?.allowed_placements || [])
                    : packageFormDD.flatMap((p) => p.allowed_placements || []).filter((v, i, a) => a.findIndex((x) => x.id === v.id) === i)
                  ).map((pl) => <option key={pl.id} value={pl.id} style={selectStyle}>{pl.code}</option>)}
                </CFormSelect>
              </CCol>
              <CCol md={2}>
                <CFormLabel className="mb-1">Status</CFormLabel>
                <CFormSelect value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))} style={selectStyle}>
                  <option value="" style={selectStyle}>All</option>
                  <option value="1" style={selectStyle}>Active</option>
                  <option value="0" style={selectStyle}>Inactive</option>
                </CFormSelect>
              </CCol>
              <CCol md="auto">
                <CButton color="primary" type="submit">Filter</CButton>
              </CCol>
              <CCol md="auto">
                <CButton color="secondary" variant="outline" onClick={handleClear}>Clear</CButton>
              </CCol>
              <CCol className="ms-auto" md="auto">
                {total > 0 && <span className="text-body-secondary me-3" style={{ fontSize: 13 }}>{total} banners</span>}
              </CCol>
              <CCol md="auto">
                <CButton color="success" onClick={openAddModal}>+ Add Banner</CButton>
              </CCol>
            </CForm>
          </CCardBody>
        </CCard>

        {/* Banner Grid */}
        {loading ? (
          <div className="text-center py-5"><CSpinner color="primary" /></div>
        ) : banners.length === 0 ? (
          <CCard><CCardBody className="text-center text-body-secondary py-5">No banners found.</CCardBody></CCard>
        ) : (
          <CRow className="g-3">
            {banners.map((banner) => {
              const imgH = orientationHeight(banner.image_orientation);
              const isPortrait = banner.image_orientation === 'potrait';
              return (
                <CCol key={banner.id} xs={12} sm={6} md={isPortrait ? 3 : 6} xl={isPortrait ? 2 : 4}>
                  <CCard className="h-100" style={{ overflow: 'hidden' }}>
                    {/* Image */}
                    <div style={{ position: 'relative', height: imgH, backgroundColor: 'var(--cui-secondary-bg)', overflow: 'hidden' }}>
                      {banner.image ? (
                        <CImage
                          src={awsUrl(banner.image)}
                          alt={banner.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          <CIcon icon={cilImage} style={{ fontSize: 40, color: 'var(--cui-secondary-color)' }} />
                          <span style={{ fontSize: 12, color: 'var(--cui-secondary-color)' }}>No Image</span>
                        </div>
                      )}
                      <div style={{ position: 'absolute', top: 8, right: 8 }}>
                        <CBadge color={banner.is_active ? 'success' : 'secondary'} shape="rounded-pill">
                          {banner.is_active ? 'Active' : 'Inactive'}
                        </CBadge>
                      </div>
                      {banner.level && (
                        <div style={{ position: 'absolute', top: 8, left: 8 }}>
                          <CBadge color="info" shape="rounded-pill">
                            <CIcon icon={cilLayers} size="sm" className="me-1" />{banner.level}
                          </CBadge>
                        </div>
                      )}
                      {banner.image_orientation && (
                        <div style={{ position: 'absolute', bottom: 8, left: 8 }}>
                          <CBadge color="dark" shape="rounded-pill" style={{ fontSize: 10, opacity: 0.85 }}>{banner.image_orientation}</CBadge>
                        </div>
                      )}
                    </div>

                    {/* Info + Actions */}
                    <CCardBody className="p-3">
                      <strong style={{ fontSize: 14, display: 'block' }}>{banner.name}</strong>

                      {/* Package + Placement */}
                      <div className="d-flex flex-wrap gap-1 my-1">
                        {banner.package?.name && (
                          <CBadge color="primary" shape="rounded-pill" style={{ fontSize: 11 }}>{banner.package.name}</CBadge>
                        )}
                        {banner.placement?.code && (
                          <CBadge color="info" shape="rounded-pill" style={{ fontSize: 11 }}>{banner.placement.description || banner.placement.code}</CBadge>
                        )}
                        {banner.bannerable_type && (
                          <CBadge color="secondary" shape="rounded-pill" style={{ fontSize: 11 }}>
                            {banner.bannerable_type} #{banner.bannerable_id}
                          </CBadge>
                        )}
                      </div>

                      {/* Dates + duration */}
                      <div className="d-flex flex-wrap gap-2 my-1" style={{ fontSize: 12, color: 'var(--cui-secondary-color)' }}>
                        {banner.start_date && (
                          <span><CIcon icon={cilCalendar} size="sm" className="me-1" />{banner.start_date.slice(0, 10)}</span>
                        )}
                        {banner.end_date && (
                          <span>→ {banner.end_date.slice(0, 10)}</span>
                        )}
                        {banner.duration != null && (
                          <span>{banner.duration} day{banner.duration > 1 ? 's' : ''}</span>
                        )}
                      </div>

                      {/* Impressions + Clicks */}
                      {(banner.impressions != null || banner.clicks != null) && (
                        <div className="d-flex gap-3 mb-1" style={{ fontSize: 12, color: 'var(--cui-secondary-color)' }}>
                          {banner.impressions != null && <span>👁 {banner.impressions.toLocaleString()}</span>}
                          {banner.clicks != null && <span>🖱 {banner.clicks.toLocaleString()}</span>}
                        </div>
                      )}

                      {/* Approve / Reject / Expire */}
                      <div className="d-flex flex-wrap gap-1 mb-2">
                        <CButton color="success" size="sm" variant="outline" onClick={() => handleChangeStatus(banner.id, 'approved')}>
                          <CIcon icon={cilCheck} size="sm" className="me-1" />Approve
                        </CButton>
                        <CButton color="danger" size="sm" variant="outline" onClick={() => handleChangeStatus(banner.id, 'rejected')}>
                          <CIcon icon={cilBan} size="sm" className="me-1" />Reject
                        </CButton>
                        <CButton color="secondary" size="sm" variant="outline" onClick={() => handleChangeStatus(banner.id, 'expired')}>
                          <CIcon icon={cilClock} size="sm" className="me-1" />Expire
                        </CButton>
                      </div>

                      <div className="d-flex gap-2 mt-auto pt-1">
                        <CButton color="warning" size="sm" className="flex-fill" onClick={() => openEditModal(banner)}>
                          <CIcon icon={cilPencil} className="me-1" />Edit
                        </CButton>
                        <CButton color="danger" size="sm" className="flex-fill" onClick={() => handleDeleteBanner(banner.id)}>
                          <CIcon icon={cilTrash} className="me-1" />Delete
                        </CButton>
                      </div>
                    </CCardBody>
                  </CCard>
                </CCol>
              );
            })}
          </CRow>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <CPagination className="mt-3">
            <CPaginationItem disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>Previous</CPaginationItem>
            {Array.from({ length: totalPages }, (_, i) => (
              <CPaginationItem key={i} active={i + 1 === currentPage} onClick={() => setCurrentPage(i + 1)}>{i + 1}</CPaginationItem>
            ))}
            <CPaginationItem disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>Next</CPaginationItem>
          </CPagination>
        )}
      </CCol>

      {/* ── Add Modal ── */}
      <CModal visible={showAddModal} onClose={() => setShowAddModal(false)} size="lg" scrollable>
        <CModalHeader><CModalTitle>Add Banner</CModalTitle></CModalHeader>
        <CModalBody>{addForm}</CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowAddModal(false)}>Cancel</CButton>
          <CButton color="primary" onClick={handleAddBanner} disabled={modalLoading}>
            {modalLoading ? <CSpinner size="sm" /> : 'Add Banner'}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* ── Edit Modal ── */}
      <CModal visible={showEditModal} onClose={() => setShowEditModal(false)} size="lg" scrollable>
        <CModalHeader><CModalTitle>Edit Banner{formData.name ? ` — ${formData.name}` : ''}</CModalTitle></CModalHeader>
        <CModalBody>
          {modalLoading ? <div className="text-center py-4"><CSpinner color="primary" /></div> : editForm}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowEditModal(false)}>Cancel</CButton>
          <CButton color="primary" onClick={handleUpdateBanner} disabled={modalLoading}>
            {modalLoading ? <CSpinner size="sm" /> : 'Save Changes'}
          </CButton>
        </CModalFooter>
      </CModal>

      <AlertModal alert={alert} onClose={clearAlert} />
    </CRow>
  );
};

export default Banners;
