import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CBadge,
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CProgress,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react';
import { CChartBar, CChartLine } from '@coreui/react-chartjs';
import { getStyle } from '@coreui/utils';
import PropTypes from 'prop-types';
import apiService from 'src/services/apiService';
import AlertModal from 'src/components/AlertModal';
import { parseApiMessage } from 'src/utils/apiMessages';

/**
 * AI Trip Planner — overview.
 *
 * Answers two questions: is this healthy, and what is it costing me? The daily
 * cost line against its ceiling is the one that matters most — it catches an
 * abuse loop or a retry bug in hours rather than at the month's invoice.
 */

// Read from the CSS vars so light and dark stay in step, as the dashboard does.
const themeColor = (name, fallback) => getStyle(`--cui-${name}`) || fallback;

const RANGES = [7, 30, 90];

const rupees = (n) => `₹${Number(n || 0).toFixed(2)}`;

/** Reasons a generation can fail, in words an admin can act on. */
const FAILURE_LABELS = {
  spend_ceiling: 'Daily spend ceiling reached',
  generation_failed: 'Model returned an unusable plan',
  model_error: 'Model call itself failed',
  not_enough_places: 'Too few places for the trip length',
  cart_too_small: 'Cart below the minimum',
  insufficient_credits: 'Traveller out of free plans',
  town_not_found: 'Base town not found',
};

const Tile = ({ label, value, hint, color }) => (
  <CCard className="mb-3 h-100">
    <CCardBody>
      <div className="text-body-secondary small text-uppercase fw-semibold mb-1">{label}</div>
      <div className={`fs-3 fw-semibold ${color ? `text-${color}` : ''}`}>{value}</div>
      {hint ? <div className="text-body-secondary small mt-1">{hint}</div> : null}
    </CCardBody>
  </CCard>
);

Tile.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  hint: PropTypes.string,
  color: PropTypes.string,
};

const AiOverview = () => {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const fetchOverview = useCallback(async (window) => {
    setLoading(true);
    try {
      const res = await apiService('POST', 'ai/overview', { days: window });
      if (!res.success) {
        setAlert({ type: 'danger', message: parseApiMessage(res.message) });
        return;
      }
      setData(res.data);
    } catch (err) {
      setAlert({ type: 'danger', message: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview(days);
  }, [days, fetchOverview]);

  const colors = useMemo(
    () => ({
      cost: themeColor('primary', '#5856d6'),
      cached: themeColor('success', '#1b9e3e'),
      ceiling: themeColor('danger', '#e55353'),
      grid: themeColor('border-color', 'rgba(0,0,0,.08)'),
      ink: themeColor('body-color', '#212529'),
    }),
    [],
  );

  const labels = (data?.daily || []).map((d) => d.day.slice(5));

  /**
   * Cost and the ceiling share one axis because they share one unit. Two
   * y-scales on one chart is the single most misleading thing a dashboard can
   * do, so generations get their own chart below rather than a second axis.
   */
  const costChart = {
    labels,
    datasets: [
      {
        label: 'Spent (₹)',
        data: (data?.daily || []).map((d) => d.cost_inr),
        borderColor: colors.cost,
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 8,
        tension: 0.3,
      },
      {
        label: 'Daily ceiling',
        data: labels.map(() => data?.spend?.ceiling ?? 0),
        borderColor: colors.ceiling,
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 0,
        pointHoverRadius: 0,
      },
    ],
  };

  const volumeChart = {
    labels,
    datasets: [
      {
        label: 'Generated',
        data: (data?.daily || []).map((d) => Math.max(0, d.generations - d.cached)),
        backgroundColor: colors.cost,
        // A 2px gap between stacked segments, so the boundary is read as a
        // boundary rather than as a colour change.
        borderColor: themeColor('body-bg', '#fff'),
        borderWidth: { top: 2, right: 0, bottom: 0, left: 0 },
        borderRadius: 4,
      },
      {
        label: 'Served from cache',
        data: (data?.daily || []).map((d) => d.cached),
        backgroundColor: colors.cached,
        borderRadius: 4,
      },
    ],
  };

  const axes = {
    x: { grid: { display: false }, ticks: { color: colors.ink, maxRotation: 0, autoSkipPadding: 12 } },
    y: { beginAtZero: true, grid: { color: colors.grid }, ticks: { color: colors.ink } },
  };

  const spend = data?.spend;
  const outcomes = data?.outcomes;
  const quality = data?.quality;
  const cache = data?.cache;

  return (
    <>
      <AlertModal alert={alert} onClose={() => setAlert(null)} />

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">AI Trip Planner</h4>
          <div className="text-body-secondary small">
            Spend, demand and quality over the last {data?.window_days ?? days} days
          </div>
        </div>
        <CButtonGroup size="sm">
          {RANGES.map((r) => (
            <CButton
              key={r}
              color="primary"
              variant={days === r ? undefined : 'outline'}
              onClick={() => setDays(r)}
            >
              {r}D
            </CButton>
          ))}
        </CButtonGroup>
      </div>

      {loading && !data ? (
        <div className="text-center py-5">
          <CSpinner color="primary" />
        </div>
      ) : (
        <>
          {/* Today's spend against the ceiling — the number that can run away. */}
          <CCard className="mb-4">
            <CCardBody>
              <CRow className="align-items-center">
                <CCol md={7}>
                  <div className="text-body-secondary small text-uppercase fw-semibold mb-1">
                    Spent today
                  </div>
                  <div className="d-flex align-items-baseline gap-2 mb-2">
                    <span className="fs-2 fw-semibold">{rupees(spend?.today)}</span>
                    <span className="text-body-secondary">
                      of {rupees(spend?.ceiling)} ceiling
                    </span>
                    {spend && !spend.can_spend ? (
                      <CBadge color="danger">Serving cache only</CBadge>
                    ) : null}
                  </div>
                  <CProgress
                    thin
                    color={spend?.percent >= 100 ? 'danger' : spend?.percent >= 75 ? 'warning' : 'success'}
                    value={Math.min(100, spend?.percent ?? 0)}
                  />
                  <div className="text-body-secondary small mt-2">
                    {spend?.can_spend
                      ? `${rupees(spend?.remaining)} left today. New questions are being answered.`
                      : 'New questions are declined until midnight; cached plans still work.'}
                  </div>
                </CCol>
                <CCol md={5} className="mt-3 mt-md-0 text-md-end">
                  <div className="text-body-secondary small text-uppercase fw-semibold mb-1">
                    This month
                  </div>
                  <div className="fs-4 fw-semibold">{rupees(spend?.month)}</div>
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>

          <CRow>
            <CCol sm={6} lg={3}>
              <Tile
                label="Plans asked for"
                value={outcomes?.total ?? 0}
                hint={`${outcomes?.success ?? 0} generated · ${outcomes?.cached ?? 0} cached`}
              />
            </CCol>
            <CCol sm={6} lg={3}>
              <Tile
                label="Cache hit rate"
                value={`${outcomes?.cache_hit_rate ?? 0}%`}
                hint={
                  cache?.enabled
                    ? `${cache?.entries ?? 0} answers kept · ${rupees(cache?.saved_inr)} saved`
                    : 'Caching is switched off'
                }
                color={cache?.enabled ? 'success' : 'secondary'}
              />
            </CCol>
            <CCol sm={6} lg={3}>
              <Tile
                label="Failure rate"
                value={`${outcomes?.failure_rate ?? 0}%`}
                hint="Every failure returns the traveller's credit"
                color={(outcomes?.failure_rate ?? 0) > 10 ? 'warning' : undefined}
              />
            </CCol>
            <CCol sm={6} lg={3}>
              <Tile
                label="Invented places per plan"
                value={quality?.dropped_per_run ?? 0}
                hint="Ids the model named that we never offered. Dropped before anyone saw them."
              />
            </CCol>
          </CRow>

          <CRow>
            <CCol lg={7}>
              <CCard className="mb-4">
                <CCardHeader>What it is costing</CCardHeader>
                <CCardBody>
                  <CChartLine
                    style={{ height: '280px' }}
                    data={costChart}
                    options={{
                      maintainAspectRatio: false,
                      interaction: { mode: 'index', intersect: false },
                      plugins: { legend: { labels: { color: colors.ink } } },
                      scales: axes,
                    }}
                  />
                </CCardBody>
              </CCard>
            </CCol>
            <CCol lg={5}>
              <CCard className="mb-4">
                <CCardHeader>How many, and how many were free</CCardHeader>
                <CCardBody>
                  <CChartBar
                    style={{ height: '280px' }}
                    data={volumeChart}
                    options={{
                      maintainAspectRatio: false,
                      plugins: { legend: { labels: { color: colors.ink } } },
                      scales: {
                        x: { ...axes.x, stacked: true },
                        y: { ...axes.y, stacked: true },
                      },
                    }}
                  />
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>

          <CRow>
            <CCol lg={6}>
              <CCard className="mb-4">
                <CCardHeader>Why plans failed</CCardHeader>
                <CCardBody className="p-0">
                  {(data?.failures || []).length === 0 ? (
                    <div className="p-4 text-body-secondary">
                      Nothing failed in this window.
                    </div>
                  ) : (
                    <CTable hover responsive className="mb-0">
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>Reason</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Times</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {data.failures.map((f) => (
                          <CTableRow key={f.reason}>
                            <CTableDataCell>
                              {FAILURE_LABELS[f.reason] || f.reason}
                              <div className="text-body-secondary small">
                                <code>{f.reason}</code>
                              </div>
                            </CTableDataCell>
                            <CTableDataCell className="text-end fw-semibold">
                              {f.count}
                            </CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>
                  )}
                </CCardBody>
              </CCard>
            </CCol>

            <CCol lg={6}>
              <CCard className="mb-4">
                <CCardHeader>
                  Where travellers want to go
                  <div className="text-body-secondary small fw-normal">
                    Which taluka to sign vendors in next
                  </div>
                </CCardHeader>
                <CCardBody className="p-0">
                  {(data?.areas || []).length === 0 ? (
                    <div className="p-4 text-body-secondary">No trips in this window.</div>
                  ) : (
                    <CTable hover responsive className="mb-0">
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>Town</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Trips</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {data.areas.map((a) => (
                          <CTableRow key={a.site_id}>
                            <CTableDataCell>{a.name}</CTableDataCell>
                            <CTableDataCell className="text-end fw-semibold">
                              {a.trips}
                            </CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>
                  )}
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>

          <CCard className="mb-4">
            <CCardHeader>Quality and shape of the output</CCardHeader>
            <CCardBody>
              <CRow className="text-center">
                <CCol sm={4} lg={2}>
                  <div className="fs-5 fw-semibold">{quality?.avg_stops ?? 0}</div>
                  <div className="text-body-secondary small">Stops per plan</div>
                </CCol>
                <CCol sm={4} lg={2}>
                  <div className="fs-5 fw-semibold">{quality?.avg_days ?? 0}</div>
                  <div className="text-body-secondary small">Days delivered</div>
                </CCol>
                <CCol sm={4} lg={2}>
                  <div className="fs-5 fw-semibold">{quality?.avg_latency_ms ?? 0} ms</div>
                  <div className="text-body-secondary small">Average wait</div>
                </CCol>
                <CCol sm={4} lg={2}>
                  <div className="fs-5 fw-semibold">{quality?.avg_tokens_in ?? 0}</div>
                  <div className="text-body-secondary small">Input tokens</div>
                </CCol>
                <CCol sm={4} lg={2}>
                  <div className="fs-5 fw-semibold">{quality?.dropped_ids ?? 0}</div>
                  <div className="text-body-secondary small">Invented ids dropped</div>
                </CCol>
                <CCol sm={4} lg={2}>
                  <div className="fs-5 fw-semibold">{quality?.prompt_cache_reads ?? 0}</div>
                  <div className="text-body-secondary small">
                    Prompt-cache reads
                    <div className="small">
                      Zero while the fixed prompt is shorter than the model will cache
                    </div>
                  </div>
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </>
      )}
    </>
  );
};

export default AiOverview;
