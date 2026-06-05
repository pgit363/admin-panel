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

const EVENT_TYPES = [
  'login', 'logout', 'register', 'otp_send', 'otp_verify',
  'site_view', 'site_list', 'site_submit', 'site_update',
  'favourite_toggle', 'comment_add', 'rating_add',
  'event_view', 'event_list', 'event_create', 'event_update', 'event_cancel', 'event_interaction',
  'route_search', 'route_list', 'route_stops_view',
  'category_view', 'category_list', 'landing_page',
  'profile_update', 'role_request', 'gallery_upload',
  'banner_fetch', 'contact_query', 'message_view', 'api_call',
];

const platformColor = (p) => {
  if (p === 'mobile') return 'success';
  if (p === 'web') return 'info';
  if (p === 'admin') return 'secondary';
  return 'light';
};

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [searchTrigger, setSearchTrigger] = useState(0);

  const [filters, setFilters] = useState({
    search: '',
    user_id: '',
    event_type: '',
    entity_type: '',
    platform: '',
    success: '',
    date_from: '',
    date_to: '',
    ip_address: '',
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
      const body = { per_page: 50 };
      if (f.search) body.search = f.search;
      if (f.user_id) body.user_id = Number(f.user_id);
      if (f.event_type) body.event_type = f.event_type;
      if (f.entity_type) body.entity_type = f.entity_type;
      if (f.platform) body.platform = f.platform;
      if (f.success !== '') body.success = f.success === 'true';
      if (f.date_from) body.date_from = f.date_from;
      if (f.date_to) body.date_to = f.date_to;
      if (f.ip_address) body.ip_address = f.ip_address;

      const data = await apiService('POST', `analytics/activityLogs?page=${page}`, body);
      if (!data.success) { setAlert({ type: 'warning', message: parseApiMessage(data.message) || 'Failed to load logs' }); return; }
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
    const empty = { search: '', user_id: '', event_type: '', entity_type: '', platform: '', success: '', date_from: '', date_to: '', ip_address: '' };
    setFilters(empty);
    activeFilters.current = empty;
    if (currentPage === 1) setSearchTrigger((t) => t + 1);
    else setCurrentPage(1);
  };

  const set = (key) => (e) => setFilters((p) => ({ ...p, [key]: e.target.value }));

  const formatDate = (s) => {
    if (!s) return '—';
    const d = new Date(s);
    return d.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
  };

  return (
    <>
      {alert && <AlertModal type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {/* Filters */}
      <CCard className="mb-4">
        <CCardHeader><strong>Activity Logs</strong></CCardHeader>
        <CCardBody>
          <CRow className="g-2">
            <CCol xs={12} sm={6} md={4} lg={3}>
              <CFormLabel className="small">Search (route / entity)</CFormLabel>
              <CFormInput placeholder="e.g. getSite" value={filters.search} onChange={set('search')} onKeyDown={(e) => e.key === 'Enter' && applyFilters()} />
            </CCol>
            <CCol xs={12} sm={6} md={4} lg={2}>
              <CFormLabel className="small">User ID</CFormLabel>
              <CFormInput type="number" placeholder="12" value={filters.user_id} onChange={set('user_id')} />
            </CCol>
            <CCol xs={12} sm={6} md={4} lg={2}>
              <CFormLabel className="small">Event Type</CFormLabel>
              <CFormSelect value={filters.event_type} onChange={set('event_type')}>
                <option value="">All</option>
                {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </CFormSelect>
            </CCol>
            <CCol xs={12} sm={6} md={4} lg={2}>
              <CFormLabel className="small">Entity Type</CFormLabel>
              <CFormSelect value={filters.entity_type} onChange={set('entity_type')}>
                <option value="">All</option>
                <option value="site">site</option>
                <option value="event">event</option>
                <option value="route">route</option>
                <option value="category">category</option>
                <option value="user">user</option>
              </CFormSelect>
            </CCol>
            <CCol xs={12} sm={6} md={4} lg={2}>
              <CFormLabel className="small">Platform</CFormLabel>
              <CFormSelect value={filters.platform} onChange={set('platform')}>
                <option value="">All</option>
                <option value="mobile">mobile</option>
                <option value="web">web</option>
                <option value="admin">admin</option>
              </CFormSelect>
            </CCol>
            <CCol xs={12} sm={6} md={4} lg={1}>
              <CFormLabel className="small">Success</CFormLabel>
              <CFormSelect value={filters.success} onChange={set('success')}>
                <option value="">All</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </CFormSelect>
            </CCol>
            <CCol xs={12} sm={6} md={3}>
              <CFormLabel className="small">Date From</CFormLabel>
              <CFormInput type="date" value={filters.date_from} onChange={set('date_from')} />
            </CCol>
            <CCol xs={12} sm={6} md={3}>
              <CFormLabel className="small">Date To</CFormLabel>
              <CFormInput type="date" value={filters.date_to} onChange={set('date_to')} />
            </CCol>
            <CCol xs={12} sm={6} md={3}>
              <CFormLabel className="small">IP Address</CFormLabel>
              <CFormInput placeholder="103.21.0.1" value={filters.ip_address} onChange={set('ip_address')} />
            </CCol>
            <CCol xs={12} className="d-flex gap-2 mt-1">
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

      {/* Table */}
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
                <CTableHeaderCell>Entity</CTableHeaderCell>
                <CTableHeaderCell>Route</CTableHeaderCell>
                <CTableHeaderCell>Platform</CTableHeaderCell>
                <CTableHeaderCell>IP</CTableHeaderCell>
                <CTableHeaderCell className="text-end">ms</CTableHeaderCell>
                <CTableHeaderCell className="text-center">OK</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {logs.length === 0 && !loading ? (
                <CTableRow>
                  <CTableDataCell colSpan={9} className="text-center text-body-secondary py-4">No logs found</CTableDataCell>
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
                        <span className="text-body-secondary">guest</span>
                      )}
                    </CTableDataCell>
                    <CTableDataCell>
                      <code className="small">{log.event_type}</code>
                    </CTableDataCell>
                    <CTableDataCell className="small">
                      {log.entity_name ? (
                        <>
                          <div>{log.entity_name}</div>
                          <div className="text-body-secondary">{log.entity_type} #{log.entity_id}</div>
                        </>
                      ) : (
                        <span className="text-body-secondary">—</span>
                      )}
                    </CTableDataCell>
                    <CTableDataCell className="small text-body-secondary">{log.route}</CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={platformColor(log.platform)}>{log.platform || '?'}</CBadge>
                    </CTableDataCell>
                    <CTableDataCell className="small text-body-secondary">{log.ip_address}</CTableDataCell>
                    <CTableDataCell className="text-end small">{log.response_time_ms ?? '—'}</CTableDataCell>
                    <CTableDataCell className="text-center">
                      <CBadge color={log.success ? 'success' : 'danger'}>{log.success ? '✓' : '✗'}</CBadge>
                    </CTableDataCell>
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

export default ActivityLogs;
