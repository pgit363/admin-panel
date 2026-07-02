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
  CFormSwitch,
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
import { cilPencil, cilTrash, cilTag } from '@coreui/icons';
import Select from 'react-select';
import apiService from 'src/services/apiService';
import AlertModal from 'src/components/AlertModal';
import { parseApiMessage } from 'src/utils/apiMessages';
import selectStyle from './reactSelectStyles';

const emptyForm = {
  id: '',
  name: '',
  price: '',
  duration_days: '',
  allowed_placements: [],
  is_active: true,
};

const BannerPackages = () => {
  const [packages, setPackages] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [alert, setAlert] = useState(null);

  // Placements for multi-select — loaded once
  const [placementOptions, setPlacementOptions] = useState([]);
  const placementsLoaded = useRef(false);

  useEffect(() => {
    fetchPackages(currentPage);
    loadPlacements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const showError = (msg) => setAlert({ type: 'danger', message: msg });
  const showSuccess = (msg) => setAlert({ type: 'success', message: msg });
  const clearAlert = () => setAlert(null);

  const fetchPackages = async (page) => {
    setLoading(true);
    try {
      const data = await apiService('POST', `listBannerPackages?page=${page}`, {});
      if (!data.success) { showError(parseApiMessage(data.message)); return; }
      // API returns plain array or paginated object
      const list = Array.isArray(data.data) ? data.data : (data.data.data || []);
      setPackages(list);
      setTotalPages(data.data.last_page || 1);
      setTotal(Array.isArray(data.data) ? data.data.length : (data.data.total || 0));
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPlacements = async () => {
    if (placementsLoaded.current) return;
    try {
      const data = await apiService('POST', 'listBannerPlacements', {});
      if (data.success) {
        const all = Array.isArray(data.data) ? data.data : (data.data.data || []);
        const active = all.filter((p) => p.is_active);
        setPlacementOptions(active.map((p) => ({ value: p.code, label: `${p.code}${p.screen ? ` (${p.screen})` : ''}` })));
        placementsLoaded.current = true;
      }
    } catch (err) {
      showError(`Failed to load placements: ${err.message}`);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setFormData(emptyForm);
    setShowAddModal(true);
  };

  const openEditModal = async (pkg) => {
    setShowEditModal(true);
    setModalLoading(true);
    try {
      const data = await apiService('POST', 'getBannerPackage', { id: pkg.id });
      if (!data.success) { showError(parseApiMessage(data.message)); return; }
      const d = data.data;
      setFormData({
        id: d.id,
        name: d.name ?? '',
        price: d.price ?? '',
        duration_days: d.duration_days ?? '',
        allowed_placements: Array.isArray(d.allowed_placements) ? d.allowed_placements : [],
        is_active: d.is_active ?? true,
      });
    } catch (err) {
      showError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const buildPayload = () => ({
    ...(formData.id && { id: formData.id }),
    name: formData.name,
    price: parseFloat(formData.price),
    duration_days: parseInt(formData.duration_days),
    allowed_placements: formData.allowed_placements,
    is_active: formData.is_active,
  });

  const validateForm = () => {
    const errors = [];
    if (!formData.name.trim()) errors.push('Package name is required.');
    if (formData.price === '' || Number(formData.price) < 0) errors.push('Price must be 0 or more.');
    if (!formData.duration_days || Number(formData.duration_days) < 1) errors.push('Duration must be at least 1 day.');
    if (!formData.allowed_placements.length) errors.push('Select at least one placement.');
    return errors;
  };

  const handleAdd = async () => {
    const errors = validateForm();
    if (errors.length) { showError(errors.join('\n')); return; }
    setModalLoading(true);
    try {
      const data = await apiService('POST', 'addBannerPackage', buildPayload());
      if (!data.success) { showError(parseApiMessage(data.message)); return; }
      setShowAddModal(false);
      showSuccess(data.message);
      fetchPackages(currentPage);
    } catch (err) {
      showError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleUpdate = async () => {
    const errors = validateForm();
    if (errors.length) { showError(errors.join('\n')); return; }
    setModalLoading(true);
    try {
      const data = await apiService('POST', 'updateBannerPackage', buildPayload());
      if (!data.success) { showError(parseApiMessage(data.message)); return; }
      setShowEditModal(false);
      showSuccess(data.message);
      fetchPackages(currentPage);
    } catch (err) {
      showError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this package?')) return;
    try {
      const data = await apiService('POST', 'deleteBannerPackage', { id });
      if (!data.success) { showError(parseApiMessage(data.message)); return; }
      showSuccess(data.message);
      setPackages((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      showError(err.message);
    }
  };

  // Selected options for react-select (must be option objects)
  const selectedPlacements = placementOptions.filter((o) =>
    formData.allowed_placements.includes(o.value)
  );

  const packageForm = (
    <CForm>
      <CRow className="g-3">
        <CCol md={12}>
          <CFormLabel>Package Name <span className="text-danger">*</span></CFormLabel>
          <CFormInput name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g. Gold Package" />
        </CCol>
        <CCol md={6}>
          <CFormLabel>Price (₹) <span className="text-danger">*</span></CFormLabel>
          <CFormInput type="number" name="price" value={formData.price} onChange={handleInputChange} placeholder="0.00" min="0" step="0.01" />
        </CCol>
        <CCol md={6}>
          <CFormLabel>Duration (days) <span className="text-danger">*</span></CFormLabel>
          <CFormInput type="number" name="duration_days" value={formData.duration_days} onChange={handleInputChange} placeholder="e.g. 30" min="1" />
        </CCol>
        <CCol md={12}>
          <CFormLabel>Allowed Placements <span className="text-danger">*</span></CFormLabel>
          <Select
            isMulti
            options={placementOptions}
            value={selectedPlacements}
            onChange={(selected) =>
              setFormData((p) => ({ ...p, allowed_placements: selected ? selected.map((s) => s.value) : [] }))
            }
            styles={selectStyle}
            placeholder="Select placements..."
            menuPortalTarget={document.body}
            menuPosition="fixed"
          />
          <div style={{ fontSize: 11, color: 'var(--cui-secondary-color)', marginTop: 3 }}>
            Only active placements shown
          </div>
        </CCol>
        <CCol md={12}>
          <CFormSwitch
            id="package-active"
            label="Is Active"
            checked={!!formData.is_active}
            onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
          />
        </CCol>
      </CRow>
    </CForm>
  );

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-3">
          <CCardBody className="d-flex justify-content-between align-items-center">
            <div>
              <strong>Banner Packages</strong>
              {total > 0 && <span className="ms-2 text-body-secondary" style={{ fontSize: 13 }}>{total} total</span>}
            </div>
            <CButton color="success" onClick={openAddModal}>+ Add Package</CButton>
          </CCardBody>
        </CCard>

        {loading ? (
          <div className="text-center py-5"><CSpinner color="primary" /></div>
        ) : packages.length === 0 ? (
          <CCard><CCardBody className="text-center text-body-secondary py-5">No packages found.</CCardBody></CCard>
        ) : (
          packages.map((pkg) => (
            <CCard key={pkg.id} className="mb-3">
              <CCardBody>
                <CRow className="align-items-center g-3">
                  <CCol xs={12} md={8}>
                    <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                      <strong style={{ fontSize: 15 }}>{pkg.name}</strong>
                      <CBadge color={pkg.is_active ? 'success' : 'secondary'} shape="rounded-pill">
                        {pkg.is_active ? 'Active' : 'Inactive'}
                      </CBadge>
                    </div>
                    <div className="d-flex flex-wrap gap-3 mb-2" style={{ fontSize: 13 }}>
                      <span style={{ fontWeight: 700, color: 'var(--cui-primary)' }}>₹{pkg.price}</span>
                      <span className="text-body-secondary">{pkg.duration_days} days</span>
                    </div>
                    {Array.isArray(pkg.allowed_placements) && pkg.allowed_placements.length > 0 && (
                      <div className="d-flex flex-wrap gap-1">
                        {pkg.allowed_placements.map((code) => (
                          <CBadge key={code} color="primary" shape="rounded-pill" style={{ fontFamily: 'monospace', fontWeight: 400 }}>
                            <CIcon icon={cilTag} size="sm" className="me-1" />{code}
                          </CBadge>
                        ))}
                      </div>
                    )}
                  </CCol>
                  <CCol xs={12} md={4} className="d-flex justify-content-end gap-2">
                    <CButton color="warning" size="sm" onClick={() => openEditModal(pkg)}>
                      <CIcon icon={cilPencil} className="me-1" />Edit
                    </CButton>
                    <CButton color="danger" size="sm" onClick={() => handleDelete(pkg.id)}>
                      <CIcon icon={cilTrash} className="me-1" />Delete
                    </CButton>
                  </CCol>
                </CRow>
              </CCardBody>
            </CCard>
          ))
        )}

        {totalPages > 1 && (
          <CPagination className="mt-2">
            <CPaginationItem disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>Previous</CPaginationItem>
            {Array.from({ length: totalPages }, (_, i) => (
              <CPaginationItem key={i} active={i + 1 === currentPage} onClick={() => setCurrentPage(i + 1)}>{i + 1}</CPaginationItem>
            ))}
            <CPaginationItem disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>Next</CPaginationItem>
          </CPagination>
        )}
      </CCol>

      <CModal visible={showAddModal} onClose={() => setShowAddModal(false)} size="lg" scrollable>
        <CModalHeader onClose={() => setShowAddModal(false)}><CModalTitle>Add Package</CModalTitle></CModalHeader>
        <CModalBody>{packageForm}</CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowAddModal(false)}>Cancel</CButton>
          <CButton color="primary" onClick={handleAdd} disabled={modalLoading}>
            {modalLoading ? <CSpinner size="sm" /> : 'Add Package'}
          </CButton>
        </CModalFooter>
      </CModal>

      <CModal visible={showEditModal} onClose={() => setShowEditModal(false)} size="lg" scrollable>
        <CModalHeader onClose={() => setShowEditModal(false)}>
          <CModalTitle>Edit — {formData.name}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {modalLoading ? <div className="text-center py-4"><CSpinner color="primary" /></div> : packageForm}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowEditModal(false)}>Cancel</CButton>
          <CButton color="primary" onClick={handleUpdate} disabled={modalLoading}>
            {modalLoading ? <CSpinner size="sm" /> : 'Save Changes'}
          </CButton>
        </CModalFooter>
      </CModal>
      <AlertModal alert={alert} onClose={clearAlert} />

    </CRow>
  );
};

export default BannerPackages;
