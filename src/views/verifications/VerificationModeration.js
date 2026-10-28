import React, { useEffect, useState } from 'react';
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CFormLabel,
  CFormTextarea,
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
import { cilCheckCircle, cilXCircle, cilUser, cilCloudDownload } from '@coreui/icons';
import apiService from 'src/services/apiService';
import { awsUrl } from 'src/services/endpoints';
import AlertModal from 'src/components/AlertModal';
import { parseApiMessage } from 'src/utils/apiMessages';

// Mirrors the reg_type enum the mobile Verify step submits (udyam|gstin|shop_act).
const REG_TYPE_LABELS = {
  udyam: 'Udyam',
  gstin: 'GSTIN',
  shop_act: 'Shop Act',
};

const isPdf = (path) => typeof path === 'string' && path.toLowerCase().endsWith('.pdf');

const VerificationModeration = () => {
  const [sites, setSites] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // certificate preview modal
  const [preview, setPreview] = useState(null); // { url, pdf }

  // reject modal
  const [rejectModal, setRejectModal] = useState({ visible: false, id: null });
  const [rejectNote, setRejectNote] = useState('');

  const showError = (msg) => setAlert({ type: 'danger', message: msg });
  const showSuccess = (msg) => setAlert({ type: 'success', message: msg });
  const clearAlert = () => setAlert(null);

  useEffect(() => {
    fetchPending(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const fetchPending = async (page) => {
    setLoading(true);
    try {
      const data = await apiService('POST', `pendingVerifications?page=${page}`, { per_page: 15 });
      if (!data.success) {
        showError(parseApiMessage(data.message));
        return;
      }
      setSites(data.data.data || []);
      setTotalPages(data.data.last_page || 1);
      setTotal(data.data.total || 0);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const dropSite = (id) => setSites((prev) => prev.filter((s) => s.id !== id));

  const handleVerify = async (id) => {
    setActionLoading(true);
    try {
      const data = await apiService('POST', 'verifySiteRegistration', { id, decision: 'verified' });
      if (!data.success) {
        showError(parseApiMessage(data.message));
        return;
      }
      showSuccess(data.message || 'Business verified. The badge is now live.');
      dropSite(id); // leaves the pending queue
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      showError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (id) => {
    setRejectNote('');
    setRejectModal({ visible: true, id });
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      const data = await apiService('POST', 'verifySiteRegistration', {
        id: rejectModal.id,
        decision: 'rejected',
        note: rejectNote,
      });
      if (!data.success) {
        showError(parseApiMessage(data.message));
        return;
      }
      showSuccess(data.message || 'Verification rejected. The vendor has been notified.');
      dropSite(rejectModal.id);
      setTotal((t) => Math.max(0, t - 1));
      setRejectModal({ visible: false, id: null });
    } catch (err) {
      showError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openCertificate = (regDoc) => {
    if (!regDoc) return;
    setPreview({ url: awsUrl(regDoc), pdf: isPdf(regDoc) });
  };

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-3">
          <CCardBody className="d-flex align-items-center justify-content-between">
            <div>
              <h5 className="mb-1">Business Verifications</h5>
              <span className="text-body-secondary" style={{ fontSize: 13 }}>
                Review the registration a vendor submitted (Udyam / GSTIN / Shop Act) and award the
                Verified badge, or reject with a reason. The listing stays live either way.
              </span>
            </div>
            {total > 0 && (
              <CBadge color="warning" shape="rounded-pill">{total} pending</CBadge>
            )}
          </CCardBody>
        </CCard>

        {loading ? (
          <div className="text-center py-5"><CSpinner color="primary" /></div>
        ) : sites.length === 0 ? (
          <CCard>
            <CCardBody className="text-center text-body-secondary py-5">
              No pending verifications. 🎉
            </CCardBody>
          </CCard>
        ) : (
          sites.map((s) => {
            const regType = REG_TYPE_LABELS[s.reg_type] || s.reg_type || '—';
            return (
              <CCard key={s.id} className="mb-3">
                <CCardBody>
                  <CRow className="align-items-center g-3">
                    <CCol xs={12} md={7}>
                      <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                        <strong style={{ fontSize: 15 }}>{s.name}</strong>
                        <CBadge color="info" shape="rounded-pill">{regType}</CBadge>
                        {Array.isArray(s.categories) &&
                          s.categories.map((c) => (
                            <CBadge key={c.id} color="secondary" shape="rounded-pill">{c.name}</CBadge>
                          ))}
                      </div>
                      <div className="d-flex flex-wrap gap-3" style={{ fontSize: 12, color: 'var(--cui-secondary-color)' }}>
                        {s.user?.name && <span><CIcon icon={cilUser} size="sm" className="me-1" />{s.user.name}</span>}
                        {s.user?.email && <span>{s.user.email}</span>}
                        <span><strong>Reg #:</strong> {s.reg_number || '—'}</span>
                        {s.updated_at && <span>Submitted: {s.updated_at.slice(0, 10)}</span>}
                      </div>
                    </CCol>

                    <CCol xs={12} md={5} className="d-flex justify-content-end gap-2 flex-wrap">
                      <CButton
                        color="secondary"
                        variant="outline"
                        size="sm"
                        disabled={!s.reg_doc}
                        onClick={() => openCertificate(s.reg_doc)}
                      >
                        <CIcon icon={cilCloudDownload} className="me-1" />
                        {s.reg_doc ? 'View certificate' : 'No certificate'}
                      </CButton>
                      <CButton color="success" size="sm" onClick={() => handleVerify(s.id)} disabled={actionLoading}>
                        <CIcon icon={cilCheckCircle} className="me-1" />Verify
                      </CButton>
                      <CButton color="danger" size="sm" onClick={() => openRejectModal(s.id)} disabled={actionLoading}>
                        <CIcon icon={cilXCircle} className="me-1" />Reject
                      </CButton>
                    </CCol>
                  </CRow>
                </CCardBody>
              </CCard>
            );
          })
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

      {/* Certificate preview */}
      <CModal visible={!!preview} onClose={() => setPreview(null)} size="lg" scrollable>
        <CModalHeader><CModalTitle>Registration certificate</CModalTitle></CModalHeader>
        <CModalBody className="text-center">
          {preview && preview.pdf ? (
            <object data={preview.url} type="application/pdf" width="100%" style={{ height: '70vh' }}>
              <p>
                Can’t preview the PDF here.{' '}
                <a href={preview.url} target="_blank" rel="noopener noreferrer">Open in a new tab</a>.
              </p>
            </object>
          ) : preview ? (
            <CImage src={preview.url} alt="certificate" style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
          ) : null}
        </CModalBody>
        <CModalFooter>
          {preview && (
            <a className="btn btn-primary" href={preview.url} target="_blank" rel="noopener noreferrer">Open in new tab</a>
          )}
          <CButton color="secondary" onClick={() => setPreview(null)}>Close</CButton>
        </CModalFooter>
      </CModal>

      {/* Reject modal */}
      <CModal visible={rejectModal.visible} onClose={() => setRejectModal({ visible: false, id: null })}>
        <CModalHeader><CModalTitle>Reject Verification</CModalTitle></CModalHeader>
        <CModalBody>
          <CFormLabel>Reason <span className="text-danger">*</span></CFormLabel>
          <CFormTextarea
            rows={3}
            maxLength={1000}
            placeholder="Why is the registration being rejected? e.g. certificate unreadable, number doesn’t match…"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
          />
          <div style={{ fontSize: 11, color: 'var(--cui-secondary-color)', marginTop: 4 }}>
            Shown to the vendor in the app — write it as user-facing copy. {rejectNote.length}/1000
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setRejectModal({ visible: false, id: null })}>Cancel</CButton>
          <CButton color="danger" onClick={handleReject} disabled={actionLoading || !rejectNote.trim()}>
            {actionLoading ? <CSpinner size="sm" /> : 'Reject'}
          </CButton>
        </CModalFooter>
      </CModal>

      <AlertModal alert={alert} onClose={clearAlert} />
    </CRow>
  );
};

export default VerificationModeration;
