import React, { useEffect, useState } from 'react';
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
import { cilPencil, cilTrash, cilScreenDesktop } from '@coreui/icons';
import apiService from 'src/services/apiService';
import AlertModal from 'src/components/AlertModal';
import { parseApiMessage } from 'src/utils/apiMessages';

const emptyForm = {
  id: '',
  code: '',
  description: '',
  screen: '',
  width: '',
  height: '',
  is_active: true,
};

const BannerPlacements = () => {
  const [placements, setPlacements] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    fetchPlacements(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const showError = (msg) => setAlert({ type: 'danger', message: msg });
  const showSuccess = (msg) => setAlert({ type: 'success', message: msg });
  const clearAlert = () => setAlert(null);

  const fetchPlacements = async (page) => {
    setLoading(true);
    try {
      const data = await apiService('POST', `listBannerPlacements?page=${page}`, {});
      if (!data.success) { showError(parseApiMessage(data.message)); return; }
      // API returns plain array or paginated object
      const list = Array.isArray(data.data) ? data.data : (data.data.data || []);
      setPlacements(list);
      setTotalPages(data.data.last_page || 1);
      setTotal(Array.isArray(data.data) ? data.data.length : (data.data.total || 0));
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
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

  const openEditModal = async (p) => {
    setShowEditModal(true);
    setModalLoading(true);
    try {
      const data = await apiService('POST', 'getBannerPlacement', { id: p.id });
      if (!data.success) { showError(parseApiMessage(data.message)); return; }
      const d = data.data;
      setFormData({
        id: d.id,
        code: d.code ?? '',
        description: d.description ?? '',
        screen: d.screen ?? '',
        width: d.width ?? '',
        height: d.height ?? '',
        is_active: d.is_active ?? true,
      });
    } catch (err) {
      showError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.code.trim()) { showError('Code is required.'); return; }
    setModalLoading(true);
    try {
      const data = await apiService('POST', 'addBannerPlacement', {
        code: formData.code,
        ...(formData.description && { description: formData.description }),
        ...(formData.screen && { screen: formData.screen }),
        ...(formData.width && { width: parseInt(formData.width) }),
        ...(formData.height && { height: parseInt(formData.height) }),
        is_active: formData.is_active,
      });
      if (!data.success) { showError(parseApiMessage(data.message)); return; }
      setShowAddModal(false);
      showSuccess(data.message);
      fetchPlacements(currentPage);
    } catch (err) {
      showError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleUpdate = async () => {
    setModalLoading(true);
    try {
      // code is immutable after creation — packages reference placements by code string
      const data = await apiService('POST', 'updateBannerPlacement', {
        id: formData.id,
        ...(formData.description && { description: formData.description }),
        ...(formData.screen && { screen: formData.screen }),
        ...(formData.width && { width: parseInt(formData.width) }),
        ...(formData.height && { height: parseInt(formData.height) }),
        is_active: formData.is_active,
      });
      if (!data.success) { showError(parseApiMessage(data.message)); return; }
      setShowEditModal(false);
      showSuccess(data.message);
      fetchPlacements(currentPage);
    } catch (err) {
      showError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this placement?')) return;
    try {
      const data = await apiService('POST', 'deleteBannerPlacement', { id });
      if (!data.success) { showError(parseApiMessage(data.message)); return; }
      showSuccess(data.message);
      setPlacements((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      showError(err.message);
    }
  };

  const placementForm = (
    <CForm>
      <CRow className="g-3">
        <CCol md={6}>
          <CFormLabel>Code <span className="text-danger">*</span></CFormLabel>
          <CFormInput
            name="code"
            value={formData.code}
            onChange={handleInputChange}
            placeholder="e.g. carousel, footer"
            disabled={showEditModal}
          />
          <div style={{ fontSize: 11, color: 'var(--cui-secondary-color)', marginTop: 3 }}>
            {showEditModal ? 'Code cannot be changed — packages reference it' : 'Lowercase slug, no spaces'}
          </div>
        </CCol>
        <CCol md={6}>
          <CFormLabel>Screen</CFormLabel>
          <CFormInput
            name="screen"
            value={formData.screen}
            onChange={handleInputChange}
            placeholder="e.g. home, explore"
          />
        </CCol>
        <CCol md={12}>
          <CFormLabel>Description</CFormLabel>
          <CFormInput
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Human-readable label for this placement"
          />
        </CCol>
        <CCol md={6}>
          <CFormLabel>Width (px)</CFormLabel>
          <CFormInput type="number" name="width" value={formData.width} onChange={handleInputChange} placeholder="e.g. 1080" />
        </CCol>
        <CCol md={6}>
          <CFormLabel>Height (px)</CFormLabel>
          <CFormInput type="number" name="height" value={formData.height} onChange={handleInputChange} placeholder="e.g. 400" />
        </CCol>
        <CCol md={12}>
          <CFormSwitch
            id="placement-active"
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
              <strong>Banner Placements</strong>
              {total > 0 && <span className="ms-2 text-body-secondary" style={{ fontSize: 13 }}>{total} total</span>}
            </div>
            <CButton color="success" onClick={openAddModal}>+ Add Placement</CButton>
          </CCardBody>
        </CCard>

        {loading ? (
          <div className="text-center py-5"><CSpinner color="primary" /></div>
        ) : placements.length === 0 ? (
          <CCard><CCardBody className="text-center text-body-secondary py-5">No placements found.</CCardBody></CCard>
        ) : (
          placements.map((p) => (
            <CCard key={p.id} className="mb-3">
              <CCardBody>
                <CRow className="align-items-center g-3">
                  <CCol xs={12} md={1} className="text-center">
                    <div style={{
                      width: 48, height: 48, borderRadius: 10, margin: '0 auto',
                      backgroundColor: 'rgba(50,31,219,.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <CIcon icon={cilScreenDesktop} size="lg" style={{ color: 'var(--cui-primary)' }} />
                    </div>
                  </CCol>

                  <CCol xs={12} md={8}>
                    <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                      <strong style={{ fontSize: 15, fontFamily: 'monospace' }}>{p.code}</strong>
                      <CBadge color={p.is_active ? 'success' : 'secondary'} shape="rounded-pill">
                        {p.is_active ? 'Active' : 'Inactive'}
                      </CBadge>
                      {p.screen && (
                        <CBadge color="info" shape="rounded-pill">{p.screen}</CBadge>
                      )}
                    </div>
                    {p.description && (
                      <p className="mb-1 text-body-secondary" style={{ fontSize: 13 }}>{p.description}</p>
                    )}
                    {(p.width || p.height) && (
                      <span style={{ fontSize: 12, color: 'var(--cui-secondary-color)' }}>
                        {p.width} × {p.height} px
                      </span>
                    )}
                  </CCol>

                  <CCol xs={12} md={3} className="d-flex justify-content-end gap-2">
                    <CButton color="warning" size="sm" onClick={() => openEditModal(p)}>
                      <CIcon icon={cilPencil} className="me-1" />Edit
                    </CButton>
                    <CButton color="danger" size="sm" onClick={() => handleDelete(p.id)}>
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
        <CModalHeader onClose={() => setShowAddModal(false)}><CModalTitle>Add Placement</CModalTitle></CModalHeader>
        <CModalBody>{placementForm}</CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowAddModal(false)}>Cancel</CButton>
          <CButton color="primary" onClick={handleAdd} disabled={modalLoading}>
            {modalLoading ? <CSpinner size="sm" /> : 'Add Placement'}
          </CButton>
        </CModalFooter>
      </CModal>

      <CModal visible={showEditModal} onClose={() => setShowEditModal(false)} size="lg" scrollable>
        <CModalHeader onClose={() => setShowEditModal(false)}>
          <CModalTitle>Edit — {formData.code}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {modalLoading ? <div className="text-center py-4"><CSpinner color="primary" /></div> : placementForm}
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

export default BannerPlacements;
