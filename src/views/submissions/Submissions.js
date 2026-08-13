import React, { useEffect, useRef, useState } from 'react';
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CFormInput,
  CFormLabel,
  CPagination,
  CPaginationItem,
  CRow,
  CSpinner,
  CForm,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCheckCircle, cilLocationPin, cilUser, cilXCircle } from '@coreui/icons';
import apiService from 'src/services/apiService';
import AlertModal from 'src/components/AlertModal';
import { parseApiMessage } from 'src/utils/apiMessages';

const selectStyle = { color: '#212631', backgroundColor: '#fff' };

const STATUS_COLORS = { pending: 'warning', approved: 'success', rejected: 'danger' };

const Submissions = () => {
  const [submissions, setSubmissions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [searchTrigger, setSearchTrigger] = useState(0);
  const activeStatus = useRef('');
  const activeSearch = useRef('');

  const [rejectModal, setRejectModal] = useState({ visible: false, id: null });
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const showError = (msg) => setAlert({ type: 'danger', message: msg });
  const showSuccess = (msg) => setAlert({ type: 'success', message: msg });
  const clearAlert = () => setAlert(null);

  useEffect(() => {
    fetchSubmissions(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTrigger]);

  const fetchSubmissions = async (page) => {
    setLoading(true);
    try {
      const endpoint = activeStatus.current === 'pending' ? 'pendingSites' : 'allSubmissions';
      const payload = { per_page: 15 };
      if (activeStatus.current && activeStatus.current !== 'pending') payload.submission_status = activeStatus.current;
      if (activeSearch.current) payload.search = activeSearch.current;
      const data = await apiService('POST', `${endpoint}?page=${page}`, payload);
      if (!data.success) { showError(parseApiMessage(data.message)); return; }
      const list = Array.isArray(data.data) ? data.data : (data.data.data || []);
      setSubmissions(list);
      setLinks(Array.isArray(data.data) ? [] : (data.data.links || []));
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    activeStatus.current = statusFilter;
    activeSearch.current = searchText;
    if (currentPage === 1) setSearchTrigger((t) => t + 1);
    else setCurrentPage(1);
  };

  const handleClear = () => {
    setStatusFilter('');
    setSearchText('');
    activeStatus.current = '';
    activeSearch.current = '';
    if (currentPage === 1) setSearchTrigger((t) => t + 1);
    else setCurrentPage(1);
  };

  const handleApprove = async (id) => {
    setActionLoading(true);
    try {
      const data = await apiService('POST', 'approveSite', { id });
      if (!data.success) { showError(parseApiMessage(data.message)); return; }
      showSuccess(data.message || 'Site approved.');
      // approveSite auto-marks a vendor's first approved site as primary
      setSubmissions((prev) => prev.map((s) => s.id === id ? { ...s, submission_status: 'approved', is_primary: data.data?.is_primary ?? s.is_primary } : s));
    } catch (err) {
      showError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (id) => {
    setRejectReason('');
    setRejectModal({ visible: true, id });
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      const data = await apiService('POST', 'rejectSite', { id: rejectModal.id, rejection_reason: rejectReason });
      if (!data.success) { showError(parseApiMessage(data.message)); return; }
      showSuccess(data.message || 'Site rejected.');
      setSubmissions((prev) => prev.map((s) => s.id === rejectModal.id ? { ...s, submission_status: 'rejected' } : s));
      setRejectModal({ visible: false, id: null });
    } catch (err) {
      showError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePaginationClick = (label) => {
    const clean = label.replace('&laquo;', '').replace('&raquo;', '').trim();
    if (clean === 'Previous') setCurrentPage((p) => Math.max(p - 1, 1));
    else if (clean === 'Next') setCurrentPage((p) => p + 1);
    else setCurrentPage(parseInt(clean));
  };

  return (
    <CRow>
      <CCol xs={12}>
        {/* Filters */}
        <CCard className="mb-3">
          <CCardBody>
            <CForm className="row g-3 align-items-end" onSubmit={(e) => { e.preventDefault(); handleSearch(); }}>
              <CCol md={4}>
                <CFormLabel>Search</CFormLabel>
                <CFormInput placeholder="Search by name..." value={searchText} onChange={(e) => setSearchText(e.target.value)} />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Status</CFormLabel>
                <CFormSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
                  <option value="" style={selectStyle}>All Submissions</option>
                  <option value="pending" style={selectStyle}>Pending</option>
                  <option value="approved" style={selectStyle}>Approved</option>
                  <option value="rejected" style={selectStyle}>Rejected</option>
                </CFormSelect>
              </CCol>
              <CCol md="auto">
                <CButton color="primary" type="submit">Search</CButton>
              </CCol>
              <CCol md="auto">
                <CButton color="secondary" onClick={handleClear}>Clear</CButton>
              </CCol>
            </CForm>
          </CCardBody>
        </CCard>

        {loading ? (
          <div className="text-center py-5"><CSpinner color="primary" /></div>
        ) : submissions.length === 0 ? (
          <CCard><CCardBody className="text-center text-body-secondary py-5">No submissions found.</CCardBody></CCard>
        ) : (
          submissions.map((s) => (
            <CCard key={s.id} className="mb-3">
              <CCardBody>
                <CRow className="g-3 align-items-center">
                  <CCol xs={12} md={7}>
                    <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                      <strong style={{ fontSize: 16 }}>{s.name}</strong>
                      <CBadge color={STATUS_COLORS[s.submission_status] || 'secondary'} shape="rounded-pill">
                        {s.submission_status || 'unknown'}
                      </CBadge>
                      {s.is_primary && (
                        <CBadge color="primary" shape="rounded-pill">Primary</CBadge>
                      )}
                      {s.meta_data?.resubmission && (
                        <CBadge color="warning" shape="rounded-pill">Resubmitted</CBadge>
                      )}
                      {s.categories?.map((c) => (
                        <CBadge key={c.id} color="info" shape="rounded-pill">{c.name}</CBadge>
                      ))}
                    </div>
                    {s.description && (
                      <p className="mb-1 text-body-secondary" style={{ fontSize: 13 }}>{s.description}</p>
                    )}
                    <div className="d-flex flex-wrap gap-3" style={{ fontSize: 12, color: 'var(--cui-secondary-color)' }}>
                      {s.user && (
                        <span><CIcon icon={cilUser} size="sm" className="me-1" />{s.user.name} ({s.user.email})</span>
                      )}
                      {(s.latitude || s.longitude) && (
                        <span><CIcon icon={cilLocationPin} size="sm" className="me-1" />{s.latitude}, {s.longitude}</span>
                      )}
                      {s.created_at && (
                        <span>Submitted: {s.created_at?.slice(0, 10)}</span>
                      )}
                    </div>
                    {s.rejection_reason && (
                      <p className="mb-0 mt-1" style={{ fontSize: 12, color: 'var(--cui-danger)' }}>
                        Reason: {s.rejection_reason}
                      </p>
                    )}
                  </CCol>
                  <CCol xs={12} md={5} className="d-flex justify-content-end gap-2 flex-wrap">
                    {s.submission_status !== 'approved' && (
                      <CButton color="success" size="sm" onClick={() => handleApprove(s.id)} disabled={actionLoading}>
                        <CIcon icon={cilCheckCircle} className="me-1" />Approve
                      </CButton>
                    )}
                    {s.submission_status !== 'rejected' && (
                      <CButton color="danger" size="sm" onClick={() => openRejectModal(s.id)} disabled={actionLoading}>
                        <CIcon icon={cilXCircle} className="me-1" />Reject
                      </CButton>
                    )}
                  </CCol>
                </CRow>
              </CCardBody>
            </CCard>
          ))
        )}

        {links.length > 0 && (
          <CPagination className="mt-2">
            {links.map((link, i) => (
              <CPaginationItem key={i} active={link.active} disabled={!link.url}
                onClick={() => link.url && handlePaginationClick(link.label)}>
                {link.label.replace('&laquo;', '').replace('&raquo;', '').trim()}
              </CPaginationItem>
            ))}
          </CPagination>
        )}
      </CCol>

      {/* Reject Modal */}
      <CModal visible={rejectModal.visible} onClose={() => setRejectModal({ visible: false, id: null })}>
        <CModalHeader><CModalTitle>Reject Submission</CModalTitle></CModalHeader>
        <CModalBody>
          <CFormLabel>Rejection Reason</CFormLabel>
          <CFormInput
            placeholder="Explain why this submission is being rejected..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setRejectModal({ visible: false, id: null })}>Cancel</CButton>
          <CButton color="danger" onClick={handleReject} disabled={actionLoading || !rejectReason.trim()}>
            {actionLoading ? <CSpinner size="sm" /> : 'Reject'}
          </CButton>
        </CModalFooter>
      </CModal>

      <AlertModal alert={alert} onClose={clearAlert} />
    </CRow>
  );
};

export default Submissions;
