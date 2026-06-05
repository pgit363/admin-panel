import React, { useEffect, useState } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CSpinner,
} from '@coreui/react';
import apiService from 'src/services/apiService';
import AlertModal from 'src/components/AlertModal';
import { parseApiMessage } from 'src/utils/apiMessages';

const StatCard = ({ title, value, color = 'primary', sub }) => (
  <CCard className="mb-4">
    <CCardBody>
      <div className={`border-start border-start-4 border-start-${color} py-1 px-3`}>
        <div className="text-body-secondary text-truncate small">{title}</div>
        <div className="fs-4 fw-semibold">{value ?? '—'}</div>
        {sub && <div className="text-body-secondary small">{sub}</div>}
      </div>
    </CCardBody>
  </CCard>
);

const AnalyticsDashboard = () => {
  const [stats, setStats] = useState(null);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, activeRes] = await Promise.all([
        apiService('POST', 'analytics/dashboardStats', {}),
        apiService('POST', 'analytics/activeUsers', {}),
      ]);
      if (statsRes.success) setStats(statsRes.data);
      else setAlert({ type: 'warning', message: parseApiMessage(statsRes.message) || 'Failed to load dashboard stats' });
      if (activeRes.success) setActive(activeRes.data);
    } catch (err) {
      setAlert({ type: 'danger', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {alert && (
        <AlertModal type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
      )}
      <CCard className="mb-4">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>Analytics Dashboard</strong>
          {loading && <CSpinner size="sm" />}
        </CCardHeader>
      </CCard>

      {/* Today's activity */}
      <h6 className="text-body-secondary mb-3">Today</h6>
      <CRow>
        <CCol xs={12} sm={6} xl={3}>
          <StatCard title="Logins Today" value={stats?.total_logins_today} color="success" />
        </CCol>
        <CCol xs={12} sm={6} xl={3}>
          <StatCard title="API Calls Today" value={stats?.total_api_calls_today} color="info" />
        </CCol>
        <CCol xs={12} sm={6} xl={3}>
          <StatCard title="Site Views Today" value={stats?.total_site_views_today} color="warning" />
        </CCol>
        <CCol xs={12} sm={6} xl={3}>
          <StatCard title="Event Views Today" value={stats?.total_event_views_today} color="danger" />
        </CCol>
      </CRow>

      <CRow>
        <CCol xs={12} sm={6} xl={3}>
          <StatCard
            title="Avg Response Time"
            value={stats?.avg_response_time_ms != null ? `${stats.avg_response_time_ms} ms` : null}
            color="primary"
          />
        </CCol>
        <CCol xs={12} sm={6} xl={3}>
          <StatCard title="Top Event Type" value={stats?.top_event_type_today} color="info" />
        </CCol>
        {stats?.most_active_user_today && (
          <CCol xs={12} sm={6} xl={3}>
            <StatCard
              title="Most Active User"
              value={stats.most_active_user_today.name}
              color="success"
              sub={`${stats.most_active_user_today.count} actions`}
            />
          </CCol>
        )}
      </CRow>

      {/* Active users */}
      <h6 className="text-body-secondary mb-3 mt-2">Active Users</h6>
      <CRow>
        <CCol xs={12} sm={6} xl={3}>
          <StatCard title="DAU (Today)" value={active?.dau} color="success" />
        </CCol>
        <CCol xs={12} sm={6} xl={3}>
          <StatCard title="WAU (This Week)" value={active?.wau} color="info" />
        </CCol>
        <CCol xs={12} sm={6} xl={3}>
          <StatCard title="MAU (This Month)" value={active?.mau} color="warning" />
        </CCol>
        <CCol xs={12} sm={6} xl={3}>
          <StatCard
            title="New Users Today"
            value={active?.new_users_today}
            color="primary"
            sub={active?.avg_events_per_user_today != null ? `Avg ${active.avg_events_per_user_today} events/user` : null}
          />
        </CCol>
      </CRow>
    </>
  );
};

export default AnalyticsDashboard;
