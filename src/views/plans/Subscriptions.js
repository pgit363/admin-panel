import React, { useEffect, useRef, useState } from 'react';
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CForm,
  CFormCheck,
  CFormLabel,
  CFormSelect,
  CPagination,
  CPaginationItem,
  CRow,
  CSpinner,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilLoop, cilUser } from '@coreui/icons';
import apiService from 'src/services/apiService';
import AlertModal from 'src/components/AlertModal';
import { parseApiMessage } from 'src/utils/apiMessages';
import AssignPlanModal from './AssignPlanModal';

const selectStyle = { color: '#212631', backgroundColor: '#fff' };
const STATUS_COLORS = { active: 'success', cancelled: 'secondary', expired: 'dark' };

const Subscriptions = () => {
  const [subs, setSubs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const [plans, setPlans] = useState([]);
  const [filters, setFilters] = useState({ plan_id: '', status: '', expiring_soon: false });
  const activeFilters = useRef({ plan_id: '', status: '', expiring_soon: false });
  const [searchTrigger, setSearchTrigger] = useState(0);

  const [assign, setAssign] = useState({ visible: false, user: null });

  const showError = (msg) => setAlert({ type: 'danger', message: msg });
  const showSuccess = (msg) => setAlert({ type: 'success', message: msg });
  const clearAlert = () => setAlert(null);

  useEffect(() => {
    fetchSubs(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTrigger]);

  useEffect(() => {
    apiService('POST', 'listPlans', {})
      .then((r) => { if (r.success) setPlans(Array.isArray(r.data) ? r.data : (r.data.data || [])); })
      .catch(() => {});
  }, []);

  const fetchSubs = async (page) => {
    setLoading(true);
    const f = activeFilters.current;
    const body = { per_page: 15 };
    if (f.plan_id) body.plan_id = f.plan_id;
    if (f.status) body.status = f.status;
    if (f.expiring_soon) body.expiring_soon = true;
    try {
      const data = await apiService('POST', `listSubscriptions?page=${page}`, body);
      if (!data.success) { showError(parseApiMessage(data.message)); return; }
      setSubs(data.data.data || []);
      setTotalPages(data.data.last_page || 1);
      setTotal(data.data.total || 0);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    activeFilters.current = { ...filters };
    if (currentPage !== 1) setCurrentPage(1);
    else setSearchTrigger((t) => t + 1);
  };

  const handleClear = () => {
    setFilters({ plan_id: '', status: '', expiring_soon: false });
    activeFilters.current = { plan_id: '', status: '', expiring_soon: false };
    if (currentPage !== 1) setCurrentPage(1);
    else setSearchTrigger((t) => t + 1);
  };

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-3">
          <CCardBody>
            <CForm className="row g-3 align-items-end" onSubmit={(e) => { e.preventDefault(); applyFilters(); }}>
              <CCol md={3}>
                <CFormLabel className="mb-1">Plan</CFormLabel>
                <CFormSelect value={filters.plan_id} onChange={(e) => setFilters((p) => ({ ...p, plan_id: e.target.value }))} style={selectStyle}>
                  <option value="" style={selectStyle}>All</option>
                  {plans.map((p) => <option key={p.id} value={p.id} style={selectStyle}>{p.name}</option>)}
                </CFormSelect>
              </CCol>
              <CCol md={3}>
                <CFormLabel className="mb-1">Status</CFormLabel>
                <CFormSelect value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))} style={selectStyle}>
                  <option value="" style={selectStyle}>All</option>
                  <option value="active" style={selectStyle}>Active</option>
                  <option value="cancelled" style={selectStyle}>Cancelled</option>
                  <option value="expired" style={selectStyle}>Expired</option>
                </CFormSelect>
              </CCol>
              <CCol md="auto" className="d-flex align-items-center" style={{ paddingTop: 24 }}>
                <CFormCheck
                  label="Expiring within 30 days"
                  checked={filters.expiring_soon}
                  onChange={(e) => setFilters((p) => ({ ...p, expiring_soon: e.target.checked }))}
                />
              </CCol>
              <CCol md="auto">
                <CButton color="primary" type="submit">Filter</CButton>
              </CCol>
              <CCol md="auto">
                <CButton color="secondary" variant="outline" onClick={handleClear}>Clear</CButton>
              </CCol>
              {total > 0 && (
                <CCol className="ms-auto" md="auto">
                  <span className="text-body-secondary" style={{ fontSize: 13 }}>{total} subscription{total !== 1 ? 's' : ''}</span>
                </CCol>
              )}
            </CForm>
          </CCardBody>
        </CCard>

        {loading ? (
          <div className="text-center py-5"><CSpinner color="primary" /></div>
        ) : subs.length === 0 ? (
          <CCard><CCardBody className="text-center text-body-secondary py-5">No subscriptions found.</CCardBody></CCard>
        ) : (
          subs.map((s) => (
            <CCard key={s.id} className="mb-3">
              <CCardBody>
                <CRow className="align-items-center g-3">
                  <CCol xs={12} md={5}>
                    <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                      <strong style={{ fontSize: 15 }}>{s.user?.name || `User #${s.user_id}`}</strong>
                      <CBadge color={STATUS_COLORS[s.status] || 'secondary'} shape="rounded-pill">{s.status}</CBadge>
                      {s.auto_renew && <CBadge color="info" shape="rounded-pill">auto-renew</CBadge>}
                    </div>
                    {s.user?.email && (
                      <div className="text-body-secondary" style={{ fontSize: 12 }}>
                        <CIcon icon={cilUser} size="sm" className="me-1" />{s.user.email}
                      </div>
                    )}
                  </CCol>
                  <CCol xs={12} md={4}>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <CBadge color="primary" shape="rounded-pill">{s.plan?.name || `Plan #${s.plan_id}`}</CBadge>
                      {s.price_paid != null && <span style={{ fontSize: 13 }}>₹{s.price_paid}</span>}
                    </div>
                    <div className="text-body-secondary" style={{ fontSize: 12, marginTop: 2 }}>
                      {s.starts_at?.slice(0, 10)} → {s.ends_at ? s.ends_at.slice(0, 10) : 'never expires'}
                    </div>
                  </CCol>
                  <CCol xs={12} md={3} className="d-flex justify-content-end">
                    <CButton
                      color="warning"
                      size="sm"
                      variant="outline"
                      onClick={() => setAssign({ visible: true, user: { id: s.user_id, name: s.user?.name, email: s.user?.email } })}
                    >
                      <CIcon icon={cilLoop} className="me-1" />Change Plan
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

      <AssignPlanModal
        visible={assign.visible}
        user={assign.user}
        plans={plans}
        onClose={() => setAssign({ visible: false, user: null })}
        onDone={() => fetchSubs(currentPage)}
        onError={showError}
        onSuccess={showSuccess}
      />

      <AlertModal alert={alert} onClose={clearAlert} />
    </CRow>
  );
};

export default Subscriptions;
