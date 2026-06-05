import React, { useEffect, useState } from 'react';
import {
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
  CButton,
} from '@coreui/react';
import apiService from 'src/services/apiService';
import AlertModal from 'src/components/AlertModal';
import { parseApiMessage } from 'src/utils/apiMessages';

const AnalyticsOverview = () => {
  const [eventSummary, setEventSummary] = useState([]);
  const [platforms, setPlatforms] = useState([]);
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
    const body = {};
    if (dateFrom) body.date_from = dateFrom;
    if (dateTo) body.date_to = dateTo;
    try {
      const [evtRes, platRes] = await Promise.all([
        apiService('POST', 'analytics/eventTypeSummary', body),
        apiService('POST', 'analytics/platformBreakdown', body),
      ]);
      if (evtRes.success) setEventSummary(evtRes.data || []);
      else setAlert({ type: 'warning', message: parseApiMessage(evtRes.message) || 'Failed to load event summary' });
      if (platRes.success) setPlatforms(platRes.data || []);
    } catch (err) {
      setAlert({ type: 'danger', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const totalEvents = eventSummary.reduce((s, r) => s + (r.count || 0), 0);
  const totalPlatform = platforms.reduce((s, r) => s + (r.count || 0), 0);

  return (
    <>
      {alert && (
        <AlertModal type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
      )}

      {/* Date filter */}
      <CCard className="mb-4">
        <CCardHeader><strong>Analytics Overview</strong></CCardHeader>
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
        {/* Event Type Summary */}
        <CCol xs={12} lg={7}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>Events by Type</strong>
              {loading && <CSpinner size="sm" />}
            </CCardHeader>
            <CCardBody>
              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Event Type</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Count</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Share</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {eventSummary.length === 0 && !loading ? (
                    <CTableRow>
                      <CTableDataCell colSpan={3} className="text-center text-body-secondary">No data</CTableDataCell>
                    </CTableRow>
                  ) : (
                    eventSummary.map((row) => (
                      <CTableRow key={row.event_type}>
                        <CTableDataCell>
                          <code>{row.event_type}</code>
                        </CTableDataCell>
                        <CTableDataCell className="text-end fw-semibold">{row.count?.toLocaleString()}</CTableDataCell>
                        <CTableDataCell className="text-end text-body-secondary small">
                          {totalEvents > 0 ? `${((row.count / totalEvents) * 100).toFixed(1)}%` : '—'}
                        </CTableDataCell>
                      </CTableRow>
                    ))
                  )}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>

        {/* Platform Breakdown */}
        <CCol xs={12} lg={5}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>Platform Breakdown</strong>
              {loading && <CSpinner size="sm" />}
            </CCardHeader>
            <CCardBody>
              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Platform</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Calls</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Users</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Share</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {platforms.length === 0 && !loading ? (
                    <CTableRow>
                      <CTableDataCell colSpan={4} className="text-center text-body-secondary">No data</CTableDataCell>
                    </CTableRow>
                  ) : (
                    platforms.map((row) => (
                      <CTableRow key={row.platform}>
                        <CTableDataCell>
                          <span className={`badge bg-${row.platform === 'mobile' ? 'success' : row.platform === 'web' ? 'info' : 'secondary'}`}>
                            {row.platform || 'unknown'}
                          </span>
                        </CTableDataCell>
                        <CTableDataCell className="text-end fw-semibold">{row.count?.toLocaleString()}</CTableDataCell>
                        <CTableDataCell className="text-end">{row.unique_users?.toLocaleString()}</CTableDataCell>
                        <CTableDataCell className="text-end text-body-secondary small">
                          {totalPlatform > 0 ? `${((row.count / totalPlatform) * 100).toFixed(1)}%` : '—'}
                        </CTableDataCell>
                      </CTableRow>
                    ))
                  )}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  );
};

export default AnalyticsOverview;
