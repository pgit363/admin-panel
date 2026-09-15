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
  CImage,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CPagination,
  CPaginationItem,
  CProgress,
  CRow,
  CSpinner,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilBadge, cilChartPie, cilEnvelopeClosed, cilPhone, cilUser } from '@coreui/icons';
import apiService from 'src/services/apiService';
import { awsUrl } from 'src/services/endpoints';
import AlertModal from 'src/components/AlertModal';
import { parseApiMessage } from 'src/utils/apiMessages';
import AssignPlanModal from '../plans/AssignPlanModal';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const [searchName, setSearchName] = useState('');
  const [searchTrigger, setSearchTrigger] = useState(0);
  const activeSearch = useRef('');

  const [usageModal, setUsageModal] = useState(false);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usage, setUsage] = useState(null);
  const [usageUserId, setUsageUserId] = useState(null);

  const [plans, setPlans] = useState([]);
  const [assign, setAssign] = useState({ visible: false, user: null });

  useEffect(() => {
    fetchUsers(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTrigger]);

  const showError = (msg) => setAlert({ type: 'danger', message: msg });
  const clearAlert = () => setAlert(null);

  const fetchUsers = async (page) => {
    setLoading(true);
    try {
      const body = { apitype: 'list' };
      if (activeSearch.current) body.search = activeSearch.current;
      const data = await apiService('POST', `listUsers?page=${page}`, body);
      if (!data.success) { showError(parseApiMessage(data.message)); return; }
      const list = Array.isArray(data.data) ? data.data : (data.data.data || []);
      setUsers(list);
      setTotalPages(Array.isArray(data.data) ? 1 : (data.data.last_page || 1));
      setTotal(Array.isArray(data.data) ? list.length : (data.data.total || list.length));
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    activeSearch.current = searchName;
    if (currentPage === 1) setSearchTrigger((t) => t + 1);
    else setCurrentPage(1);
  };

  const handleClear = () => {
    setSearchName('');
    activeSearch.current = '';
    if (currentPage === 1) setSearchTrigger((t) => t + 1);
    else setCurrentPage(1);
  };

  const genderColor = (g) => {
    if (!g) return 'secondary';
    if (g.toLowerCase() === 'male') return 'info';
    if (g.toLowerCase() === 'female') return 'danger';
    return 'secondary';
  };

  // Show the full timestamp (date + time), not just the date.
  const fmtDateTime = (val) => {
    if (!val) return '—';
    const d = new Date(val.replace(' ', 'T'));
    if (isNaN(d.getTime())) return val;
    return d.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
    });
  };

  const sourceColor = (s) => {
    if (s === 'web') return 'info';
    if (s === 'android') return 'success';
    if (s === 'ios') return 'primary';
    return 'secondary';
  };

  const showSuccess = (msg) => setAlert({ type: 'success', message: msg });

  const openUsage = async (userId) => {
    setUsageModal(true);
    setUsage(null);
    setUsageUserId(userId);
    setUsageLoading(true);
    if (plans.length === 0) {
      apiService('POST', 'listPlans', {})
        .then((r) => { if (r.success) setPlans(Array.isArray(r.data) ? r.data : (r.data.data || [])); })
        .catch(() => {});
    }
    try {
      const data = await apiService('POST', 'vendorUsageReport', { user_id: userId });
      if (!data.success) { showError(parseApiMessage(data.message)); setUsageModal(false); return; }
      setUsage(data.data);
    } catch (err) {
      showError(err.message);
      setUsageModal(false);
    } finally {
      setUsageLoading(false);
    }
  };

  // limit: null means unlimited — render "Unlimited", never 0.
  const renderUsageMeter = (label, m) => {
    if (!m) return null;
    const unlimited = m.limit == null;
    const hasUsage = m.used != null;
    const pct = unlimited || !m.limit ? 0 : Math.min(100, Math.round((m.used / m.limit) * 100));
    return (
      <div key={label} className="mb-3">
        <div className="d-flex justify-content-between" style={{ fontSize: 13 }}>
          <span>{label}</span>
          <span className={m.exceeded ? 'text-danger fw-bold' : ''}>
            {hasUsage ? `${m.used} / ` : ''}{unlimited ? 'Unlimited' : m.limit}
            {m.exceeded ? ' — exceeded' : ''}
          </span>
        </div>
        {hasUsage && !unlimited && (
          <CProgress className="mt-1" height={6} value={pct} color={m.exceeded ? 'danger' : 'success'} />
        )}
      </div>
    );
  };

  return (
    <CRow>
      <CCol xs={12}>
        {/* Search Bar */}
        <CCard className="mb-3">
          <CCardBody>
            <CForm className="row g-3 align-items-end" onSubmit={(e) => { e.preventDefault(); handleSearch(); }}>
              <CCol md={5}>
                <CFormLabel>Search</CFormLabel>
                <CFormInput
                  placeholder="Name, email or phone..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                />
              </CCol>
              <CCol md="auto">
                <CButton color="primary" type="submit">Search</CButton>
              </CCol>
              {activeSearch.current && (
                <CCol md="auto">
                  <CButton color="secondary" variant="outline" onClick={handleClear}>Clear</CButton>
                </CCol>
              )}
              {total > 0 && !loading && (
                <CCol md="auto" className="ms-auto">
                  <span className="text-body-secondary" style={{ fontSize: 13 }}>{total} user{total !== 1 ? 's' : ''}</span>
                </CCol>
              )}
            </CForm>
          </CCardBody>
        </CCard>

        {/* Cards */}
        {loading ? (
          <div className="text-center py-5"><CSpinner color="primary" /></div>
        ) : users.length === 0 ? (
          <CCard><CCardBody className="text-center text-body-secondary py-5">No users found.</CCardBody></CCard>
        ) : (
          users.map((user) => (
            <CCard key={user.id} className="mb-3">
              <CCardBody>
                <CRow className="align-items-center g-3">
                  {/* Avatar */}
                  <CCol xs={12} md={1} className="text-center">
                    {user.profile_picture ? (
                      <CImage
                        src={awsUrl(user.profile_picture)}
                        alt={user.name}
                        style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: 60, height: 60, borderRadius: '50%',
                        backgroundColor: 'var(--cui-secondary-bg)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <CIcon icon={cilUser} size="xl" style={{ color: 'var(--cui-secondary-color)' }} />
                      </div>
                    )}
                  </CCol>

                  {/* Main Info */}
                  <CCol xs={12} md={5}>
                    <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                      <strong style={{ fontSize: 15 }}>{user.name}</strong>
                      <span className="text-body-secondary" style={{ fontSize: 12 }}>#{user.id}</span>
                      {Array.isArray(user.roles)
                        ? user.roles.map((r) => (
                            <CBadge key={r.id} color="primary" shape="rounded-pill">{r.name}</CBadge>
                          ))
                        : user.roles?.name && (
                            <CBadge color="primary" shape="rounded-pill">{user.roles.name}</CBadge>
                          )
                      }
                      {user.gender && (
                        <CBadge color={genderColor(user.gender)} shape="rounded-pill">{user.gender}</CBadge>
                      )}
                      <CBadge color={user.isVerified == 1 ? 'success' : 'secondary'} shape="rounded-pill">
                        <CIcon icon={cilBadge} className="me-1" size="sm" />{user.isVerified == 1 ? 'Verified' : 'Unverified'}
                      </CBadge>
                    </div>
                    <div className="d-flex flex-wrap gap-3" style={{ fontSize: 13, color: 'var(--cui-secondary-color)' }}>
                      <span>
                        <CIcon icon={cilEnvelopeClosed} size="sm" className="me-1" />{user.email || '—'}
                      </span>
                      <span>
                        <CIcon icon={cilPhone} size="sm" className="me-1" />{user.mobile || '—'}
                      </span>
                    </div>
                  </CCol>

                  {/* Secondary Info — every remaining API field */}
                  <CCol xs={12} md={4}>
                    <div className="d-flex flex-wrap gap-3 mb-1" style={{ fontSize: 13, color: 'var(--cui-secondary-color)' }}>
                      <span>Gender: {user.gender || '—'}</span>
                      <span>DOB: {user.dob || '—'}</span>
                      <span>
                        Source:{' '}
                        {user.registered_from
                          ? <CBadge color={sourceColor(user.registered_from)} shape="rounded-pill">{user.registered_from}</CBadge>
                          : '—'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--cui-secondary-color)' }}>
                      Registered: {fmtDateTime(user.created_at)}
                    </div>
                  </CCol>

                  {/* Actions */}
                  <CCol xs={12} md={2} className="text-end">
                    <CButton color="info" variant="outline" size="sm" onClick={() => openUsage(user.id)}>
                      <CIcon icon={cilChartPie} size="sm" className="me-1" />Usage
                    </CButton>
                  </CCol>
                </CRow>
              </CCardBody>
            </CCard>
          ))
        )}

        {/* Pagination */}
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

      {/* Vendor usage modal */}
      <CModal visible={usageModal} onClose={() => setUsageModal(false)} scrollable>
        <CModalHeader><CModalTitle>Vendor Usage</CModalTitle></CModalHeader>
        <CModalBody>
          {usageLoading || !usage ? (
            <div className="text-center py-4"><CSpinner color="primary" /></div>
          ) : (
            <>
              <div className="mb-3">
                <strong>{usage.user?.name}</strong>
                <div className="text-body-secondary" style={{ fontSize: 13 }}>{usage.user?.email}</div>
              </div>

              <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                <CBadge color="primary" shape="rounded-pill">{usage.plan?.name || 'No plan'}</CBadge>
                {usage.subscription?.status && (
                  <CBadge color={usage.subscription.status === 'active' ? 'success' : 'secondary'} shape="rounded-pill">
                    {usage.subscription.status}
                  </CBadge>
                )}
              </div>
              {usage.subscription && (
                <div className="text-body-secondary mb-3" style={{ fontSize: 12 }}>
                  {fmtDateTime(usage.subscription.starts_at)} → {usage.subscription.ends_at ? fmtDateTime(usage.subscription.ends_at) : 'never expires'}
                </div>
              )}

              <hr />
              {usage.usage ? (
                <>
                  {renderUsageMeter('Sites', usage.usage.max_sites)}
                  {renderUsageMeter('Products', usage.usage.max_products)}
                  {renderUsageMeter('Featured slots', usage.usage.featured_slots)}
                  {renderUsageMeter('Images per product', usage.usage.max_images_per_product)}
                </>
              ) : (
                <div className="text-body-secondary" style={{ fontSize: 13 }}>No usage data — user may not be a vendor.</div>
              )}
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="primary"
            variant="outline"
            onClick={() => setAssign({ visible: true, user: { id: usageUserId, name: usage?.user?.name, email: usage?.user?.email } })}
          >
            Assign / Change Plan
          </CButton>
          <CButton color="secondary" onClick={() => setUsageModal(false)}>Close</CButton>
        </CModalFooter>
      </CModal>

      <AssignPlanModal
        visible={assign.visible}
        user={assign.user}
        plans={plans}
        onClose={() => setAssign({ visible: false, user: null })}
        onDone={() => { if (usageUserId) openUsage(usageUserId); }}
        onError={showError}
        onSuccess={showSuccess}
      />

      <AlertModal alert={alert} onClose={clearAlert} />
    </CRow>
  );
};

export default Users;
