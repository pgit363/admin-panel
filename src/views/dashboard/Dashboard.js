import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCardFooter,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CProgress,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CWidgetStatsA,
  CWidgetStatsF,
} from '@coreui/react';
import { CChartBar, CChartDoughnut, CChartLine } from '@coreui/react-chartjs';
import { getStyle } from '@coreui/utils';
import CIcon from '@coreui/icons-react';
import {
  cilArrowBottom,
  cilArrowTop,
  cilBrowser,
  cilCalendar,
  cilCart,
  cilChartLine,
  cilClock,
  cilCreditCard,
  cilCursor,
  cilImage,
  cilLocationPin,
  cilNewspaper,
  cilPeople,
  cilReload,
  cilSpeedometer,
  cilStar,
  cilTags,
  cilUser,
  cilUserFollow,
} from '@coreui/icons';
import apiService from 'src/services/apiService';
import AlertModal from 'src/components/AlertModal';
import { parseApiMessage } from 'src/utils/apiMessages';

const num = (v) => (v == null ? '—' : Number(v).toLocaleString());

const PLATFORM_COLORS = { mobile: 'success', web: 'info', android: 'success', ios: 'primary' };

// CoreUI theme colours, read from the CSS vars so light/dark stay in sync.
const themeColor = (name, fallback) => getStyle(`--cui-${name}`) || fallback;

const RANGE_PRESETS = [
  { label: '7D', value: 7 },
  { label: '30D', value: 30 },
  { label: '90D', value: 90 },
  { label: '1Y', value: 365 },
];

const GRANULARITIES = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
];

// Local (not UTC) YYYY-MM-DD — toISOString() would shift the day for IST users.
const toIsoDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const bucketLabel = (value) => {
  const parts = String(value || '').split('-');
  if (parts.length !== 3) return String(value ?? '');
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// Charts map over these payloads directly — an unexpected object/null would take the
// whole dashboard down, so anything that isn't an array becomes an empty one.
const toArray = (v) => (Array.isArray(v) ? v : []);

const sum = (rows, key) => rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);

// Second half of the window vs the first half — a like-for-like trend inside the
// range the user picked, without a second round-trip for the previous period.
const halfOverHalf = (rows, key) => {
  if (rows.length < 4) return null;
  const mid = Math.floor(rows.length / 2);
  const first = sum(rows.slice(0, mid), key);
  const second = sum(rows.slice(mid), key);
  if (first === 0) return null;
  return ((second - first) / first) * 100;
};

const Delta = ({ value }) => {
  if (value == null) return null;
  const up = value >= 0;
  return (
    <span className="fs-6 fw-normal" title="Second half of the selected range vs the first half">
      ({up ? '+' : ''}
      {value.toFixed(1)}% <CIcon icon={up ? cilArrowTop : cilArrowBottom} />)
    </span>
  );
};

Delta.propTypes = { value: PropTypes.number };

const Kpi = ({ icon, title, value, color, footer }) => (
  <CCol xs={12} sm={6} xl={3}>
    <CWidgetStatsF
      className="mb-4"
      color={color}
      icon={<CIcon icon={icon} height={24} />}
      title={title}
      value={value}
      footer={footer}
    />
  </CCol>
);

Kpi.propTypes = {
  icon: PropTypes.any.isRequired,
  title: PropTypes.string.isRequired,
  value: PropTypes.node,
  color: PropTypes.string,
  footer: PropTypes.node,
};

// Sparkline used inside the CWidgetStatsA tiles — same styling as the CoreUI template.
const sparkOptions = {
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
  maintainAspectRatio: false,
  scales: {
    x: { border: { display: false }, grid: { display: false, drawBorder: false }, ticks: { display: false } },
    y: { display: false, grid: { display: false }, ticks: { display: false } },
  },
  elements: {
    line: { borderWidth: 1, tension: 0.4 },
    point: { radius: 0, hitRadius: 10, hoverRadius: 4 },
  },
};

const Spark = ({ labels, data, pointColor }) => (
  <CChartLine
    className="mt-3 mx-3"
    style={{ height: '70px' }}
    data={{
      labels,
      datasets: [
        {
          label: 'Value',
          backgroundColor: 'transparent',
          borderColor: 'rgba(255,255,255,.55)',
          pointBackgroundColor: pointColor,
          data,
        },
      ],
    }}
    options={sparkOptions}
  />
);

Spark.propTypes = {
  labels: PropTypes.array.isRequired,
  data: PropTypes.array.isRequired,
  pointColor: PropTypes.string,
};

const ChartCard = ({ title, subtitle, loading, empty, footer, children }) => (
  <CCard className="mb-4">
    <CCardHeader className="d-flex justify-content-between align-items-center">
      <div>
        <strong>{title}</strong>
        {subtitle && <div className="text-body-secondary small">{subtitle}</div>}
      </div>
      {loading && <CSpinner size="sm" />}
    </CCardHeader>
    <CCardBody>
      {empty && !loading ? (
        <div className="text-center text-body-secondary py-5">No data for the selected range</div>
      ) : (
        children
      )}
    </CCardBody>
    {footer && <CCardFooter>{footer}</CCardFooter>}
  </CCard>
);

ChartCard.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.node,
  loading: PropTypes.bool,
  empty: PropTypes.bool,
  footer: PropTypes.node,
  children: PropTypes.node,
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [active, setActive] = useState(null);
  const [totals, setTotals] = useState(null);
  const [series, setSeries] = useState([]);
  const [growth, setGrowth] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [topSites, setTopSites] = useState([]);
  const [topEvents, setTopEvents] = useState([]);
  const [topRoutes, setTopRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  // Range controls — `days` preset unless an explicit from/to pair is entered.
  const [days, setDays] = useState(30);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [granularity, setGranularity] = useState('day');

  // Chart text/grid colours come from CSS vars, so re-render on theme switch.
  const [, setThemeTick] = useState(0);
  useEffect(() => {
    const onScheme = () => setThemeTick((t) => t + 1);
    document.documentElement.addEventListener('ColorSchemeChange', onScheme);
    return () => document.documentElement.removeEventListener('ColorSchemeChange', onScheme);
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resolve the controls to a concrete date window. Sending explicit dates to every
  // endpoint avoids relying on `days` support in the older (non-timeseries) ones.
  const resolveRange = (d = days, from = dateFrom, to = dateTo) => {
    if (from && to) return { date_from: from, date_to: to };
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (Number(d) - 1));
    return { date_from: toIsoDate(start), date_to: toIsoDate(end) };
  };

  // Takes explicit overrides so the preset/granularity buttons can fetch immediately
  // instead of waiting a render for the corresponding state to settle.
  const load = async (opts = {}) => {
    const d = opts.days ?? days;
    const from = opts.dateFrom ?? dateFrom;
    const to = opts.dateTo ?? dateTo;
    const g = opts.granularity ?? granularity;

    setLoading(true);
    const range = resolveRange(d, from, to);
    const scoped = { ...range, granularity: g };

    // allSettled, not all: a single failing endpoint should cost its own card,
    // not every other widget on the page.
    const requests = {
      stats: ['analytics/dashboardStats', {}],
      active: ['analytics/activeUsers', {}],
      totals: ['analytics/globalTotals', {}],
      series: ['analytics/activityTimeseries', scoped],
      growth: ['analytics/userGrowthTimeseries', scoped],
      platforms: ['analytics/platformBreakdown', range],
      eventTypes: ['analytics/eventTypeSummary', range],
      topSites: ['analytics/topSites', { limit: 5, ...range }],
      topEvents: ['analytics/topEvents', { limit: 5, ...range }],
      topRoutes: ['analytics/topRoutes', { limit: 5, ...range }],
    };
    const keys = Object.keys(requests);

    try {
      const settled = await Promise.allSettled(
        keys.map((k) => apiService('POST', requests[k][0], requests[k][1])),
      );

      const data = {};
      const failed = [];
      const reasons = [];

      settled.forEach((res, i) => {
        const key = keys[i];
        const name = requests[key][0].replace('analytics/', '');
        if (res.status === 'fulfilled' && res.value?.success) {
          data[key] = res.value.data;
          return;
        }
        failed.push(name);
        if (res.status === 'fulfilled') {
          const msg = parseApiMessage(res.value?.message);
          if (msg) reasons.push(`${name}: ${msg}`);
        }
      });

      setStats(data.stats ?? null);
      setActive(data.active ?? null);
      setTotals(data.totals ?? null);
      setSeries(toArray(data.series));
      setGrowth(toArray(data.growth));
      setPlatforms(toArray(data.platforms));
      setEventTypes(toArray(data.eventTypes));
      setTopSites(toArray(data.topSites));
      setTopEvents(toArray(data.topEvents));
      setTopRoutes(toArray(data.topRoutes));

      if (failed.length === keys.length) {
        // Everything failed — almost always auth or the backend being down, so
        // surface the underlying error rather than a list of ten endpoint names.
        const rejected = settled.find((r) => r.status === 'rejected');
        setAlert({
          type: 'danger',
          message: rejected?.reason?.message || reasons[0] || 'Failed to load dashboard data',
        });
      } else if (failed.length) {
        setAlert({
          type: 'warning',
          message: reasons.length ? reasons.join('\n') : `Could not load: ${failed.join(', ')}`,
        });
      }
    } catch (err) {
      setAlert({ type: 'danger', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (d) => {
    setDays(d);
    setDateFrom('');
    setDateTo('');
    load({ days: d, dateFrom: '', dateTo: '' });
  };

  const applyGranularity = (g) => {
    setGranularity(g);
    load({ granularity: g });
  };

  const clearRange = () => {
    setDateFrom('');
    setDateTo('');
    load({ dateFrom: '', dateTo: '' });
  };

  const isCustom = Boolean(dateFrom && dateTo);
  const range = resolveRange();
  const rangeLabel = `${range.date_from} → ${range.date_to}`;

  const bodyColor = themeColor('body-color', '#4f5d73');
  const gridColor = themeColor('border-color-translucent', 'rgba(0,0,0,.1)');
  const C = {
    primary: themeColor('primary', '#321fdb'),
    info: themeColor('info', '#3399ff'),
    success: themeColor('success', '#2eb85c'),
    warning: themeColor('warning', '#f9b115'),
    danger: themeColor('danger', '#e55353'),
    secondary: themeColor('secondary', '#9da5b1'),
  };

  const axisScales = useMemo(
    () => ({
      x: {
        grid: { color: gridColor, drawOnChartArea: false },
        ticks: { color: bodyColor, maxRotation: 0, autoSkipPadding: 12 },
      },
      y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: bodyColor, precision: 0 } },
    }),
    [bodyColor, gridColor],
  );

  const legend = useMemo(
    () => ({ display: true, labels: { color: bodyColor, usePointStyle: true, boxWidth: 8 } }),
    [bodyColor],
  );

  const seriesLabels = series.map((r) => bucketLabel(r.date));

  // Headline tiles across the top — value is the range total, sparkline is the shape.
  const widgets = [
    { key: 'logins', title: 'Logins', color: 'primary', cssVar: '--cui-primary' },
    { key: 'site_views', title: 'Site Views', color: 'info', cssVar: '--cui-info' },
    { key: 'event_views', title: 'Event Views', color: 'warning', cssVar: '--cui-warning' },
    { key: 'active_users', title: 'Active Users', color: 'danger', cssVar: '--cui-danger' },
  ];

  const activityData = {
    labels: seriesLabels,
    datasets: [
      {
        label: 'Logins',
        data: series.map((r) => r.logins ?? 0),
        borderColor: C.success,
        backgroundColor: 'transparent',
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
        tension: 0.3,
      },
      {
        label: 'Site Views',
        data: series.map((r) => r.site_views ?? 0),
        borderColor: C.warning,
        backgroundColor: 'transparent',
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
        tension: 0.3,
      },
      {
        label: 'Event Views',
        data: series.map((r) => r.event_views ?? 0),
        borderColor: C.danger,
        backgroundColor: 'transparent',
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
        tension: 0.3,
      },
      {
        label: 'Active Users',
        data: series.map((r) => r.active_users ?? 0),
        borderColor: C.primary,
        backgroundColor: 'transparent',
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
        tension: 0.3,
      },
      {
        label: 'API Calls (right axis)',
        data: series.map((r) => r.api_calls ?? 0),
        borderColor: C.info,
        backgroundColor: 'transparent',
        borderDash: [4, 4],
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
        tension: 0.3,
        yAxisID: 'y1',
      },
    ],
  };

  // API calls run orders of magnitude above the other metrics — own axis, or it flattens them.
  const activityOptions = {
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend },
    scales: {
      ...axisScales,
      y1: {
        position: 'right',
        beginAtZero: true,
        grid: { drawOnChartArea: false },
        ticks: { color: bodyColor, precision: 0 },
      },
    },
  };

  const footerMetrics = [
    { key: 'logins', label: 'Logins', color: 'success' },
    { key: 'api_calls', label: 'API Calls', color: 'info' },
    { key: 'site_views', label: 'Site Views', color: 'warning' },
    { key: 'event_views', label: 'Event Views', color: 'danger' },
    { key: 'active_users', label: 'Active Users', color: 'primary' },
  ].map((m) => ({ ...m, total: sum(series, m.key) }));
  const footerMax = Math.max(...footerMetrics.map((m) => m.total), 1);

  const growthData = {
    labels: growth.map((r) => bucketLabel(r.date)),
    datasets: [
      {
        label: 'New Users',
        data: growth.map((r) => r.new_users ?? 0),
        borderColor: C.success,
        backgroundColor: 'rgba(46, 184, 92, 0.18)',
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
        tension: 0.3,
      },
      {
        label: 'Cumulative Users (right axis)',
        data: growth.map((r) => r.cumulative_users ?? 0),
        borderColor: C.primary,
        backgroundColor: 'transparent',
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
        tension: 0.3,
        yAxisID: 'y1',
      },
    ],
  };

  const growthOptions = {
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend },
    scales: {
      ...axisScales,
      y1: {
        position: 'right',
        beginAtZero: true,
        grid: { drawOnChartArea: false },
        ticks: { color: bodyColor, precision: 0 },
      },
    },
  };

  const totalPlatform = sum(platforms, 'count');
  const platformData = {
    labels: platforms.map((r) => r.platform || 'unknown'),
    datasets: [
      {
        data: platforms.map((r) => r.count ?? 0),
        backgroundColor: [C.success, C.info, C.primary, C.warning, C.danger, C.secondary],
        borderWidth: 0,
      },
    ],
  };

  const platformOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: bodyColor, usePointStyle: true, boxWidth: 8 } },
    },
  };

  const totalEvents = sum(eventTypes, 'count');
  const topEventTypes = eventTypes.slice(0, 8);
  const eventTypeData = {
    labels: topEventTypes.map((r) => r.event_type),
    datasets: [
      {
        label: 'Events',
        data: topEventTypes.map((r) => r.count ?? 0),
        backgroundColor: C.info,
        borderRadius: 4,
      },
    ],
  };

  const eventTypeOptions = {
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: bodyColor, precision: 0 } },
      y: { grid: { display: false }, ticks: { color: bodyColor } },
    },
  };

  // `analytics/vendorFunnel` is not deployed; the doc marks it redundant when
  // globalTotals already carries these counters, so derive the pipeline here.
  const funnelRows = [
    { label: 'Pending Sites', value: totals?.pending_sites, color: C.warning },
    { label: 'Approved Sites', value: totals?.approved_sites, color: C.success },
    { label: 'Pending Products', value: totals?.pending_products, color: C.danger },
    { label: 'Approved Products', value: totals?.approved_products, color: C.info },
    { label: 'Active Subscriptions', value: totals?.active_subscriptions, color: C.primary },
  ];

  const funnelData = {
    labels: funnelRows.map((r) => r.label),
    datasets: [
      {
        label: 'Count',
        data: funnelRows.map((r) => r.value ?? 0),
        backgroundColor: funnelRows.map((r) => r.color),
        borderRadius: 4,
      },
    ],
  };

  const funnelOptions = {
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: bodyColor } },
      y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: bodyColor, precision: 0 } },
    },
  };

  return (
    <>
      {alert && <AlertModal type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {/* Headline tiles — range totals with sparklines */}
      <CRow className="mb-4" xs={{ gutter: 4 }}>
        {widgets.map((w) => (
          <CCol sm={6} xl={3} key={w.key}>
            <CWidgetStatsA
              color={w.color}
              value={
                <>
                  {num(sum(series, w.key))} <Delta value={halfOverHalf(series, w.key)} />
                </>
              }
              title={w.title}
              chart={
                <Spark
                  labels={seriesLabels}
                  data={series.map((r) => r[w.key] ?? 0)}
                  pointColor={getStyle(w.cssVar)}
                />
              }
            />
          </CCol>
        ))}
      </CRow>

      {/* Main chart — range + granularity filters live in this card's header */}
      <CCard className="mb-4">
        <CCardBody>
          <CRow className="align-items-start">
            <CCol sm={5}>
              <h4 className="card-title mb-0">Activity Trend</h4>
              <div className="small text-body-secondary">
                {rangeLabel}
                {isCustom ? ' · custom range' : ''}
              </div>
            </CCol>
            <CCol sm={7} className="d-none d-md-block">
              <CButton
                color="primary"
                className="float-end"
                onClick={() => load()}
                disabled={loading}
                title="Refresh"
              >
                {loading ? <CSpinner size="sm" /> : <CIcon icon={cilReload} />}
              </CButton>
              <CButtonGroup className="float-end me-3">
                {GRANULARITIES.map((g) => (
                  <CButton
                    color="outline-secondary"
                    key={g.value}
                    className="mx-0"
                    active={granularity === g.value}
                    onClick={() => applyGranularity(g.value)}
                    disabled={loading}
                  >
                    {g.label}
                  </CButton>
                ))}
              </CButtonGroup>
              <CButtonGroup className="float-end me-3">
                {RANGE_PRESETS.map((p) => (
                  <CButton
                    color="outline-secondary"
                    key={p.value}
                    className="mx-0"
                    active={!isCustom && days === p.value}
                    onClick={() => applyPreset(p.value)}
                    disabled={loading}
                  >
                    {p.label}
                  </CButton>
                ))}
              </CButtonGroup>
            </CCol>
          </CRow>

          {/* Custom window — overrides the preset once both dates are set */}
          <CRow className="g-2 align-items-end mt-1">
            <CCol xs={6} sm={4} md={3} lg={2}>
              <CFormLabel className="small text-body-secondary mb-1">From</CFormLabel>
              <CFormInput
                size="sm"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </CCol>
            <CCol xs={6} sm={4} md={3} lg={2}>
              <CFormLabel className="small text-body-secondary mb-1">To</CFormLabel>
              <CFormInput
                size="sm"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </CCol>
            <CCol xs="auto">
              <CButton size="sm" color="primary" onClick={() => load()} disabled={loading || !isCustom}>
                Apply
              </CButton>
            </CCol>
            {(dateFrom || dateTo) && (
              <CCol xs="auto">
                <CButton size="sm" color="secondary" variant="outline" onClick={clearRange} disabled={loading}>
                  Clear
                </CButton>
              </CCol>
            )}
            <CCol xs={12} className="d-md-none mt-2">
              <CButtonGroup size="sm">
                {RANGE_PRESETS.map((p) => (
                  <CButton
                    color="outline-secondary"
                    key={p.value}
                    className="mx-0"
                    active={!isCustom && days === p.value}
                    onClick={() => applyPreset(p.value)}
                    disabled={loading}
                  >
                    {p.label}
                  </CButton>
                ))}
              </CButtonGroup>
            </CCol>
          </CRow>

          {series.length === 0 && !loading ? (
            <div className="text-center text-body-secondary py-5">No activity for the selected range</div>
          ) : (
            <CChartLine
              style={{ height: '320px', marginTop: '24px' }}
              data={activityData}
              options={activityOptions}
            />
          )}
        </CCardBody>
        <CCardFooter>
          <CRow xs={{ cols: 1 }} md={{ cols: 5 }} className="text-center">
            {footerMetrics.map((m) => (
              <CCol className="mb-sm-2 mb-0" key={m.key}>
                <div className="text-body-secondary">{m.label}</div>
                <div className="fw-semibold text-truncate">{num(m.total)}</div>
                <CProgress thin className="mt-2" color={m.color} value={(m.total / footerMax) * 100} />
              </CCol>
            ))}
          </CRow>
        </CCardFooter>
      </CCard>

      {/* Growth + event mix */}
      <CRow>
        <CCol xs={12} xl={7}>
          <ChartCard title="User Growth" subtitle={rangeLabel} loading={loading} empty={growth.length === 0}>
            <CChartLine style={{ height: '300px' }} data={growthData} options={growthOptions} />
          </ChartCard>
        </CCol>
        <CCol xs={12} xl={5}>
          <ChartCard
            title="Events by Type"
            subtitle={`${rangeLabel} · ${num(totalEvents)} events`}
            loading={loading}
            empty={eventTypes.length === 0}
          >
            <CChartBar style={{ height: '300px' }} data={eventTypeData} options={eventTypeOptions} />
          </ChartCard>
        </CCol>
      </CRow>

      {/* Platform mix + vendor pipeline */}
      <CRow>
        <CCol xs={12} xl={5}>
          <ChartCard
            title="Platform Breakdown"
            subtitle={rangeLabel}
            loading={loading}
            empty={platforms.length === 0}
            footer={
              <>
                {platforms.map((row) => {
                  const pct = totalPlatform > 0 ? (row.count / totalPlatform) * 100 : 0;
                  return (
                    <div className="progress-group mb-3" key={row.platform || 'unknown'}>
                      <div className="progress-group-header">
                        <span className="text-capitalize">{row.platform || 'unknown'}</span>
                        <span className="ms-auto fw-semibold">
                          {num(row.count)}{' '}
                          <span className="text-body-secondary small">({pct.toFixed(1)}%)</span>
                        </span>
                      </div>
                      <div className="progress-group-bars">
                        <CProgress thin color={PLATFORM_COLORS[row.platform] || 'secondary'} value={pct} />
                      </div>
                      {row.unique_users != null && (
                        <div className="text-body-secondary small mt-1">
                          {num(row.unique_users)} unique users
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            }
          >
            <CChartDoughnut style={{ height: '280px' }} data={platformData} options={platformOptions} />
          </ChartCard>
        </CCol>
        <CCol xs={12} xl={7}>
          <ChartCard
            title="Vendor Pipeline"
            subtitle="All-time submission and approval counts"
            loading={loading}
            empty={!totals}
          >
            <CChartBar style={{ height: '300px' }} data={funnelData} options={funnelOptions} />
          </ChartCard>
        </CCol>
      </CRow>

      {/* Platform totals — all-time, independent of the range filter */}
      <CCard className="mb-4">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <div>
            <strong>Platform Totals</strong>
            <div className="text-body-secondary small">All-time — not affected by the range filter</div>
          </div>
          {loading && <CSpinner size="sm" />}
        </CCardHeader>
        <CCardBody className="pb-0">
          <CRow>
            <Kpi
              icon={cilPeople}
              title="Total Users"
              value={num(totals?.total_users)}
              color="primary"
              footer={
                totals ? `${num(totals.total_vendors)} vendors · ${num(totals.total_tourists)} tourists` : undefined
              }
            />
            <Kpi
              icon={cilLocationPin}
              title="Total Sites"
              value={num(totals?.total_sites)}
              color="info"
              footer={totals ? `${num(totals.approved_sites)} approved · ${num(totals.pending_sites)} pending` : undefined}
            />
            <Kpi
              icon={cilCart}
              title="Total Products"
              value={num(totals?.total_products)}
              color="success"
              footer={
                totals
                  ? `${num(totals.approved_products)} approved · ${num(totals.pending_products)} pending`
                  : undefined
              }
            />
            <Kpi
              icon={cilTags}
              title="Total Events"
              value={num(totals?.total_events)}
              color="warning"
              footer={totals?.total_banners != null ? `${num(totals.total_banners)} banners` : undefined}
            />
          </CRow>
          <div className="text-body-secondary small mb-3">Pending work</div>
          <CRow>
            <Kpi icon={cilClock} title="Pending Sites" value={num(totals?.pending_sites)} color="warning" />
            <Kpi icon={cilClock} title="Pending Products" value={num(totals?.pending_products)} color="danger" />
            <Kpi
              icon={cilCreditCard}
              title="Active Subscriptions"
              value={num(totals?.active_subscriptions)}
              color="success"
            />
            <Kpi
              icon={cilImage}
              title="Active Banners"
              value={num(totals?.active_banners)}
              color="info"
              footer={totals?.total_banners != null ? `of ${num(totals.total_banners)} total` : undefined}
            />
          </CRow>
        </CCardBody>
      </CCard>

      {/* Live counters — always today / rolling windows, never the range filter */}
      <CCard className="mb-4">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <div>
            <strong>Today &amp; Active Users</strong>
            <div className="text-body-secondary small">Live counters — not affected by the range filter</div>
          </div>
          {loading && <CSpinner size="sm" />}
        </CCardHeader>
        <CCardBody className="pb-0">
          <CRow>
            <Kpi icon={cilPeople} title="Daily Active (DAU)" value={num(active?.dau)} color="success" />
            <Kpi icon={cilPeople} title="Weekly Active (WAU)" value={num(active?.wau)} color="info" />
            <Kpi icon={cilPeople} title="Monthly Active (MAU)" value={num(active?.mau)} color="warning" />
            <Kpi
              icon={cilUserFollow}
              title="New Users Today"
              value={num(active?.new_users_today)}
              color="primary"
              footer={
                active?.avg_events_per_user_today != null
                  ? `Avg ${active.avg_events_per_user_today} events / user`
                  : undefined
              }
            />
          </CRow>
          <CRow>
            <Kpi icon={cilUser} title="Logins Today" value={num(stats?.total_logins_today)} color="success" />
            <Kpi icon={cilCursor} title="API Calls Today" value={num(stats?.total_api_calls_today)} color="info" />
            <Kpi icon={cilBrowser} title="Site Views Today" value={num(stats?.total_site_views_today)} color="warning" />
            <Kpi icon={cilStar} title="Event Views Today" value={num(stats?.total_event_views_today)} color="danger" />
          </CRow>
          <CRow>
            <Kpi
              icon={cilSpeedometer}
              title="Avg Response Time"
              value={stats?.avg_response_time_ms != null ? `${stats.avg_response_time_ms} ms` : '—'}
              color="primary"
            />
            <Kpi
              icon={cilChartLine}
              title="Top Event Type Today"
              value={stats?.top_event_type_today || '—'}
              color="info"
            />
            <Kpi
              icon={cilUser}
              title="Most Active User Today"
              value={stats?.most_active_user_today?.name || '—'}
              color="success"
              footer={stats?.most_active_user_today ? `${num(stats.most_active_user_today.count)} actions` : undefined}
            />
            <Kpi
              icon={cilCalendar}
              title="Avg Events / User Today"
              value={active?.avg_events_per_user_today != null ? String(active.avg_events_per_user_today) : '—'}
              color="warning"
            />
          </CRow>
        </CCardBody>
      </CCard>

      {/* Top sites + top events */}
      <CRow>
        <CCol xs={12} xl={6}>
          <CCard className="mb-4">
            <CCardHeader><strong>Top Sites</strong></CCardHeader>
            <CCardBody>
              <CTable align="middle" className="mb-0" hover responsive>
                <CTableHead className="text-nowrap">
                  <CTableRow>
                    <CTableHeaderCell className="bg-body-tertiary">#</CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary">Site</CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary text-end">Views</CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary text-end">Unique</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {topSites.length === 0 && !loading ? (
                    <CTableRow><CTableDataCell colSpan={4} className="text-center text-body-secondary">No data</CTableDataCell></CTableRow>
                  ) : (
                    topSites.map((r, i) => (
                      <CTableRow key={i}>
                        <CTableDataCell className="text-body-secondary">{i + 1}</CTableDataCell>
                        <CTableDataCell>{r.entity_name ?? '—'}</CTableDataCell>
                        <CTableDataCell className="text-end fw-semibold">{num(r.view_count)}</CTableDataCell>
                        <CTableDataCell className="text-end">{num(r.unique_users)}</CTableDataCell>
                      </CTableRow>
                    ))
                  )}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12} xl={6}>
          <CCard className="mb-4">
            <CCardHeader><strong>Top Events</strong></CCardHeader>
            <CCardBody>
              <CTable align="middle" className="mb-0" hover responsive>
                <CTableHead className="text-nowrap">
                  <CTableRow>
                    <CTableHeaderCell className="bg-body-tertiary">#</CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary">Event</CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary text-end">Views</CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary text-end">Unique</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {topEvents.length === 0 && !loading ? (
                    <CTableRow><CTableDataCell colSpan={4} className="text-center text-body-secondary">No data</CTableDataCell></CTableRow>
                  ) : (
                    topEvents.map((r, i) => (
                      <CTableRow key={i}>
                        <CTableDataCell className="text-body-secondary">{i + 1}</CTableDataCell>
                        <CTableDataCell>{r.entity_name ?? '—'}</CTableDataCell>
                        <CTableDataCell className="text-end fw-semibold">{num(r.view_count)}</CTableDataCell>
                        <CTableDataCell className="text-end">{num(r.unique_users)}</CTableDataCell>
                      </CTableRow>
                    ))
                  )}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Top routes */}
      <CCard className="mb-4">
        <CCardHeader><strong>Top Routes Searched</strong></CCardHeader>
        <CCardBody>
          <CTable align="middle" className="mb-0" hover responsive>
            <CTableHead className="text-nowrap">
              <CTableRow>
                <CTableHeaderCell className="bg-body-tertiary">#</CTableHeaderCell>
                <CTableHeaderCell className="bg-body-tertiary">Source</CTableHeaderCell>
                <CTableHeaderCell className="bg-body-tertiary">Destination</CTableHeaderCell>
                <CTableHeaderCell className="bg-body-tertiary text-end">Searches</CTableHeaderCell>
                <CTableHeaderCell className="bg-body-tertiary text-end">Unique</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {topRoutes.length === 0 && !loading ? (
                <CTableRow><CTableDataCell colSpan={5} className="text-center text-body-secondary">No data</CTableDataCell></CTableRow>
              ) : (
                topRoutes.map((r, i) => (
                  <CTableRow key={i}>
                    <CTableDataCell className="text-body-secondary">{i + 1}</CTableDataCell>
                    <CTableDataCell>
                      <CIcon icon={cilNewspaper} className="me-1 text-body-secondary" size="sm" />
                      {r.source_name ?? r.source_id ?? '—'}
                      {r.source_name && r.source_id != null && (
                        <span className="text-body-secondary small ms-1">#{r.source_id}</span>
                      )}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CIcon icon={cilLocationPin} className="me-1 text-body-secondary" size="sm" />
                      {r.destination_name ?? r.destination_id ?? '—'}
                      {r.destination_name && r.destination_id != null && (
                        <span className="text-body-secondary small ms-1">#{r.destination_id}</span>
                      )}
                    </CTableDataCell>
                    <CTableDataCell className="text-end fw-semibold">{num(r.search_count)}</CTableDataCell>
                    <CTableDataCell className="text-end">{num(r.unique_users)}</CTableDataCell>
                  </CTableRow>
                ))
              )}
            </CTableBody>
          </CTable>
        </CCardBody>
      </CCard>
    </>
  );
};

export default Dashboard;
