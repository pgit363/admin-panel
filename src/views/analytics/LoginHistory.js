import React, { useEffect, useRef, useState } from 'react';
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CPagination,
  CPaginationItem,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react';
import apiService from 'src/services/apiService';
import AlertModal from 'src/components/AlertModal';
import { parseApiMessage } from 'src/utils/apiMessages';

const platformColor = (p) => {
  if (p === 'mobile') return 'success';
  if (p === 'web') return 'info';
  if (p === 'admin') return 'secondary';
  return 'light';
};

const eventColor = (e) => {
  if (e === 'login') return 'primary';
  if (e === 'logout') return 'secondary';
  if (e === 'register') return 'success';
  return 'light';
};

const LoginHistory = () => {
  const [logs, setLogs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [searchTrigger, setSearchTrigger] = useState(0);

  const [filters, setFilters] = useState({
    user_id: '',
    platform: '',
    date_from: '',
    date_to: '',
  });
  const activeFilters = useRef({ ...filters });

  useEffect(() => {
    fetchLogs(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTrigger]);

  const fetchLogs = async (page) => {
    setLoading(true);
    try {
      const f = activeFilters.current;
      const body = { per_page: 30 };
      if (f.user_id) body.user_id = Number(f.user_id);
      if (f.platform) body.platform = f.platform;
      if (f.date_from) body.date_from = f.date_from;
      if (f.date_to) body.date_to = f.date_to;

      const data = await apiService('POST', `analytics/loginHistory?page=${page}`, body);
      if (!data.success) { setAlert({ type: 'warning', message: parseApiMessage(data.message) || 'Failed to load login history' }); return; }
      const inner = data.data?.data ?? data.data ?? [];
      setLogs(Array.isArray(inner) ? inner : []);
      setTotalPages(data.data?.last_page || 1);
      setTotal(data.data?.total || 0);
    } catch (err) {
      setAlert({ type: 'danger', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    activeFilters.current = { ...filters };
    if (currentPage === 1) setSearchTrigger((t) => t + 1);
    else setCurrentPage(1);
  };

  const clearFilters = () => {
    const empty = { user_id: '', platform: '', date_from: '', date_to: '' };
    setFilters(empty);
    activeFilters.current = empty;
    if (currentPage === 1) setSearchTrigger((t) => t + 1);
    else setCurrentPage(1);
  };

  const set = (key) => (e) => setFilters((p) => ({ ...p, [key]: e.target.value }));

  const formatDate = (s) => {
    if (!s) return '—';
    return new Date(s).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
  };

  return (
    <>
      {alert && <AlertModal type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      <CCard className="mb-4">
        <CCardHeader><strong>Login History</strong></CCardHeader>
        <CCardBody>
          <CRow className="g-2 align-items-end">
            <CCol xs={12} sm={6} md={3}>
              <CFormLabel className="small">User ID</CFormLabel>
              <CFormInput type="number" placeholder="12" value={filters.user_id} onChange={set('user_id')} />
            </CCol>
            <CCol xs={12} sm={6} md={2}>
              <CFormLabel className="small">Platform</CFormLabel>
              <CFormSelect value={filters.platform} onChange={set('platform')}>
                <option value="">All</option>
                <option value="mobile">mobile</option>
                <option value="web">web</option>
                <option value="admin">admin</option>
              </CFormSelect>
            </CCol>
            <CCol xs={12} sm={6} md={2}>
              <CFormLabel className="small">Date From</CFormLabel>
              <CFormInput type="date" value={filters.date_from} onChange={set('date_from')} />
            </CCol>
            <CCol xs={12} sm={6} md={2}>
              <CFormLabel className="small">Date To</CFormLabel>
              <CFormInput type="date" value={filters.date_to} onChange={set('date_to')} />
            </CCol>
            <CCol xs={12} className="d-flex gap-2">
              <CButton color="primary" onClick={applyFilters} disabled={loading}>
                {loading ? <CSpinner size="sm" /> : 'Search'}
              </CButton>
              <CButton color="secondary" variant="outline" onClick={clearFilters} disabled={loading}>
                Clear
              </CButton>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      <CCard>
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <span>Results <span className="text-body-secondary small">({total.toLocaleString()} total)</span></span>
          {loading && <CSpinner size="sm" />}
        </CCardHeader>
        <CCardBody className="p-0">
          <CTable hover responsive className="mb-0">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Time</CTableHeaderCell>
                <CTableHeaderCell>User</CTableHeaderCell>
                <CTableHeaderCell>Event</CTableHeaderCell>
                <CTableHeaderCell>Platform</CTableHeaderCell>
                <CTableHeaderCell>App Version</CTableHeaderCell>
                <CTableHeaderCell>IP Address</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {logs.length === 0 && !loading ? (
                <CTableRow>
                  <CTableDataCell colSpan={6} className="text-center text-body-secondary py-4">No records found</CTableDataCell>
                </CTableRow>
              ) : (
                logs.map((log) => (
                  <CTableRow key={log.id}>
                    <CTableDataCell className="small text-nowrap">{formatDate(log.created_at)}</CTableDataCell>
                    <CTableDataCell className="small">
                      {log.user ? (
                        <>
                          <div>{log.user.name}</div>
                          <div className="text-body-secondary">{log.user.mobile}</div>
                        </>
                      ) : (
                        <span className="text-body-secondary">—</span>
                      )}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={eventColor(log.event_type)}>{log.event_type}</CBadge>
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={platformColor(log.platform)}>{log.platform || '?'}</CBadge>
                    </CTableDataCell>
                    <CTableDataCell className="small text-body-secondary">{log.app_version || '—'}</CTableDataCell>
                    <CTableDataCell className="small text-body-secondary">{log.ip_address || '—'}</CTableDataCell>
                  </CTableRow>
                ))
              )}
            </CTableBody>
          </CTable>
        </CCardBody>
      </CCard>

      {totalPages > 1 && (
        <CPagination className="mt-3 justify-content-center" aria-label="Page navigation">
          <CPaginationItem disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>«</CPaginationItem>
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
            const pg = currentPage <= 5 ? i + 1 : currentPage - 4 + i;
            if (pg > totalPages) return null;
            return (
              <CPaginationItem key={pg} active={pg === currentPage} onClick={() => setCurrentPage(pg)}>{pg}</CPaginationItem>
            );
          })}
          <CPaginationItem disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>»</CPaginationItem>
        </CPagination>
      )}
    </>
  );
};

export default LoginHistory;
