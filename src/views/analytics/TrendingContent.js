import React, { useEffect, useState } from 'react';
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
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

const TrendingContent = () => {
  const [sites, setSites] = useState([]);
  const [events, setEvents] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const body = { limit: 20 };
    if (dateFrom) body.date_from = dateFrom;
    if (dateTo) body.date_to = dateTo;
    try {
      const [sitesRes, eventsRes, routesRes] = await Promise.all([
        apiService('POST', 'analytics/topSites', body),
        apiService('POST', 'analytics/topEvents', body),
        apiService('POST', 'analytics/topRoutes', body),
      ]);
      if (sitesRes.success) setSites(sitesRes.data || []);
      else setAlert({ type: 'warning', message: parseApiMessage(sitesRes.message) || 'Failed to load top sites' });
      if (eventsRes.success) setEvents(eventsRes.data || []);
      if (routesRes.success) setRoutes(routesRes.data || []);
    } catch (err) {
      setAlert({ type: 'danger', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const EntityTable = ({ title, data, columns }) => (
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <strong>{title}</strong>
        {loading && <CSpinner size="sm" />}
      </CCardHeader>
      <CCardBody>
        <CTable hover responsive>
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell>#</CTableHeaderCell>
              {columns.map((c) => (
                <CTableHeaderCell key={c.key} className={c.align === 'end' ? 'text-end' : ''}>{c.label}</CTableHeaderCell>
              ))}
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {data.length === 0 && !loading ? (
              <CTableRow>
                <CTableDataCell colSpan={columns.length + 1} className="text-center text-body-secondary">No data</CTableDataCell>
              </CTableRow>
            ) : (
              data.map((row, i) => (
                <CTableRow key={i}>
                  <CTableDataCell className="text-body-secondary small">{i + 1}</CTableDataCell>
                  {columns.map((c) => (
                    <CTableDataCell key={c.key} className={c.align === 'end' ? 'text-end' : ''}>
                      {c.render ? c.render(row) : row[c.key] ?? '—'}
                    </CTableDataCell>
                  ))}
                </CTableRow>
              ))
            )}
          </CTableBody>
        </CTable>
      </CCardBody>
    </CCard>
  );

  return (
    <>
      {alert && (
        <AlertModal type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
      )}

      <CCard className="mb-4">
        <CCardHeader><strong>Trending Content</strong></CCardHeader>
        <CCardBody>
          <CRow className="g-3 align-items-end">
            <CCol xs={12} sm={4} md={3}>
              <CFormLabel className="small">Date From</CFormLabel>
              <CFormInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </CCol>
            <CCol xs={12} sm={4} md={3}>
              <CFormLabel className="small">Date To</CFormLabel>
              <CFormInput type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </CCol>
            <CCol xs="auto">
              <CButton color="primary" onClick={fetchAll} disabled={loading}>
                {loading ? <CSpinner size="sm" /> : 'Apply'}
              </CButton>
            </CCol>
            {(dateFrom || dateTo) && (
              <CCol xs="auto">
                <CButton color="secondary" variant="outline" onClick={() => { setDateFrom(''); setDateTo(''); }} disabled={loading}>
                  Clear
                </CButton>
              </CCol>
            )}
          </CRow>
        </CCardBody>
      </CCard>

      <CRow>
        <CCol xs={12} xl={6}>
          <EntityTable
            title="Top Sites"
            data={sites}
            columns={[
              { key: 'entity_name', label: 'Site' },
              { key: 'view_count', label: 'Views', align: 'end', render: (r) => r.view_count?.toLocaleString() },
              { key: 'unique_users', label: 'Unique Users', align: 'end', render: (r) => r.unique_users?.toLocaleString() },
            ]}
          />
        </CCol>
        <CCol xs={12} xl={6}>
          <EntityTable
            title="Top Events"
            data={events}
            columns={[
              { key: 'entity_name', label: 'Event' },
              { key: 'view_count', label: 'Views', align: 'end', render: (r) => r.view_count?.toLocaleString() },
              { key: 'unique_users', label: 'Unique Users', align: 'end', render: (r) => r.unique_users?.toLocaleString() },
            ]}
          />
        </CCol>
      </CRow>

      <EntityTable
        title="Top Routes Searched"
        data={routes}
        columns={[
          { key: 'source_id', label: 'Source ID' },
          { key: 'destination_id', label: 'Destination ID' },
          { key: 'search_count', label: 'Searches', align: 'end', render: (r) => r.search_count?.toLocaleString() },
          { key: 'unique_users', label: 'Unique Users', align: 'end', render: (r) => r.unique_users?.toLocaleString() },
        ]}
      />
    </>
  );
};

export default TrendingContent;
