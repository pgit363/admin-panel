import React, { useCallback, useEffect, useState } from 'react';
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
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
import CIcon from '@coreui/icons-react';
import { cilFlagAlt, cilCheckCircle } from '@coreui/icons';
import PropTypes from 'prop-types';
import apiService from 'src/services/apiService';
import AlertModal from 'src/components/AlertModal';
import { parseApiMessage } from 'src/utils/apiMessages';

/**
 * AI Trip Planner — generations.
 *
 * Answers: a traveller says their trip was wrong, what actually happened?
 *
 * The list is only a way into the drawer. The drawer is the debugging surface,
 * and it carries the five things that make a complaint answerable in a minute:
 * the filters sent, the places involved, the raw response before validation,
 * which ids were dropped, and the plan as the traveller saw it.
 */

const STATUS_COLORS = { success: 'success', cached: 'info', failed: 'danger' };

const Section = ({ title, hint, children }) => (
  <div className="mb-4">
    <div className="fw-semibold mb-1">{title}</div>
    {hint ? <div className="text-body-secondary small mb-2">{hint}</div> : null}
    {children}
  </div>
);

Section.propTypes = {
  title: PropTypes.string.isRequired,
  hint: PropTypes.string,
  children: PropTypes.node,
};

const Json = ({ value }) => (
  <pre
    className="bg-body-tertiary border rounded p-3 mb-0 small"
    style={{ maxHeight: '320px', overflow: 'auto' }}
  >
    {value === null || value === undefined ? '—' : JSON.stringify(value, null, 2)}
  </pre>
);

Json.propTypes = {
  // Anything the API hands back, shown as it arrived.
  value: PropTypes.any,
};

const AiGenerations = () => {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const [filters, setFilters] = useState({ status: '', type: '', user_id: '', from: '', to: '' });

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [flagReason, setFlagReason] = useState('');

  const fetchLogs = useCallback(async (which, applied) => {
    setLoading(true);
    try {
      // Empty strings would become `?status=` and fail validation, so only
      // filters the admin actually set are sent.
      const body = Object.fromEntries(
        Object.entries(applied).filter(([, v]) => v !== '' && v !== null),
      );
      const res = await apiService('POST', `ai/logs?page=${which}`, { ...body, per_page: 20 });
      if (!res.success) {
        setAlert({ type: 'danger', message: parseApiMessage(res.message) });
        return;
      }
      setRows(res.data.data || []);
      setTotalPages(res.data.last_page || 1);
      setTotal(res.data.total || 0);
    } catch (err) {
      setAlert({ type: 'danger', message: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(page, filters);
    // Filters are applied on submit, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const applyFilters = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs(1, filters);
  };

  const openDetail = async (id) => {
    setDetailLoading(true);
    setDetail({ id });
    try {
      const res = await apiService('POST', 'ai/getLog', { id });
      if (!res.success) {
        setAlert({ type: 'danger', message: parseApiMessage(res.message) });
        setDetail(null);
        return;
      }
      setDetail(res.data);
      setFlagReason(res.data.moderation?.flag_reason || '');
    } catch (err) {
      setAlert({ type: 'danger', message: err.message });
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const review = async (body) => {
    try {
      const res = await apiService('POST', 'ai/reviewLog', { id: detail.id, ...body });
      if (!res.success) {
        setAlert({ type: 'danger', message: parseApiMessage(res.message) });
        return;
      }
      setAlert({ type: 'success', message: 'Saved.' });
      // Reflect it in the row behind the drawer without a refetch.
      setRows((prev) =>
        prev.map((r) =>
          r.id === detail.id
            ? { ...r, flagged: body.flagged ?? r.flagged, reviewed: body.reviewed ?? r.reviewed }
            : r,
        ),
      );
      setDetail((d) => ({ ...d, moderation: { ...d.moderation, ...body, flag_reason: flagReason } }));
    } catch (err) {
      setAlert({ type: 'danger', message: err.message });
    }
  };

  return (
    <>
      <AlertModal alert={alert} onClose={() => setAlert(null)} />

      <CCard className="mb-4">
        <CCardHeader>
          Generations
          <div className="text-body-secondary small fw-normal">
            {total} recorded. Open a row to see what the model was given and what it returned.
          </div>
        </CCardHeader>
        <CCardBody>
          <CForm onSubmit={applyFilters}>
            <CRow className="g-2 align-items-end mb-3">
              <CCol md={2}>
                <CFormSelect
                  label="Outcome"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  options={[
                    { label: 'Any', value: '' },
                    { label: 'Generated', value: 'success' },
                    { label: 'From cache', value: 'cached' },
                    { label: 'Failed', value: 'failed' },
                  ]}
                />
              </CCol>
              <CCol md={2}>
                <CFormSelect
                  label="Source"
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  options={[
                    { label: 'Any', value: '' },
                    { label: 'Plan form', value: 'plan' },
                    { label: 'Cart', value: 'cart' },
                  ]}
                />
              </CCol>
              <CCol md={2}>
                <CFormInput
                  type="number"
                  label="User id"
                  value={filters.user_id}
                  onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
                />
              </CCol>
              <CCol md={2}>
                <CFormInput
                  type="date"
                  label="From"
                  value={filters.from}
                  onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                />
              </CCol>
              <CCol md={2}>
                <CFormInput
                  type="date"
                  label="To"
                  value={filters.to}
                  onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                />
              </CCol>
              <CCol md={2} className="d-flex gap-2">
                <CButton type="submit" color="primary" className="w-100">
                  Apply
                </CButton>
                <CButton
                  color="secondary"
                  variant="outline"
                  onClick={() => {
                    const cleared = { status: '', type: '', user_id: '', from: '', to: '' };
                    setFilters(cleared);
                    setPage(1);
                    fetchLogs(1, cleared);
                  }}
                >
                  Clear
                </CButton>
              </CCol>
            </CRow>
          </CForm>

          {loading ? (
            <div className="text-center py-5">
              <CSpinner color="primary" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-body-secondary py-4">Nothing matches those filters.</div>
          ) : (
            <CTable hover responsive align="middle">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>When</CTableHeaderCell>
                  <CTableHeaderCell>Outcome</CTableHeaderCell>
                  <CTableHeaderCell>User</CTableHeaderCell>
                  <CTableHeaderCell>Model</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Tokens</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Cost</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Wait</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Plan</CTableHeaderCell>
                  <CTableHeaderCell />
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {rows.map((r) => (
                  <CTableRow key={r.id}>
                    <CTableDataCell>
                      <div>{new Date(r.created_at).toLocaleString()}</div>
                      <div className="text-body-secondary small">
                        #{r.id} · {r.type === 'cart' ? 'cart' : 'form'}
                      </div>
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={STATUS_COLORS[r.status] || 'secondary'}>{r.status}</CBadge>
                      {r.failure_reason ? (
                        <div className="text-body-secondary small mt-1">
                          <code>{r.failure_reason}</code>
                        </div>
                      ) : null}
                      {r.flagged ? (
                        <CBadge color="warning" className="ms-1">
                          flagged
                        </CBadge>
                      ) : null}
                    </CTableDataCell>
                    <CTableDataCell>{r.user_id ?? '—'}</CTableDataCell>
                    <CTableDataCell>
                      <div className="small">{r.model || r.driver || '—'}</div>
                    </CTableDataCell>
                    <CTableDataCell className="text-end small">
                      {r.tokens.in}/{r.tokens.out}
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      {r.cost_inr > 0 ? `₹${r.cost_inr.toFixed(4)}` : '—'}
                    </CTableDataCell>
                    <CTableDataCell className="text-end small">{r.latency_ms} ms</CTableDataCell>
                    <CTableDataCell className="text-end small">
                      {r.days ? `${r.days}d · ${r.stops} stops` : '—'}
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      <CButton
                        size="sm"
                        color="primary"
                        variant="outline"
                        onClick={() => openDetail(r.id)}
                      >
                        Inspect
                      </CButton>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          )}

          {totalPages > 1 ? (
            <CPagination align="center" className="mt-3">
              <CPaginationItem disabled={page === 1} onClick={() => setPage(page - 1)}>
                Previous
              </CPaginationItem>
              <CPaginationItem active>
                {page} / {totalPages}
              </CPaginationItem>
              <CPaginationItem disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                Next
              </CPaginationItem>
            </CPagination>
          ) : null}
        </CCardBody>
      </CCard>

      <CModal size="xl" visible={!!detail} onClose={() => setDetail(null)} scrollable>
        <CModalHeader>
          <CModalTitle>Generation #{detail?.id}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {detailLoading || !detail?.call ? (
            <div className="text-center py-5">
              <CSpinner color="primary" />
            </div>
          ) : (
            <>
              <CRow className="mb-4">
                <CCol md={6}>
                  <div className="text-body-secondary small">Outcome</div>
                  <CBadge color={STATUS_COLORS[detail.status] || 'secondary'}>
                    {detail.status}
                  </CBadge>
                  {detail.result?.failure_reason ? (
                    <span className="ms-2">
                      <code>{detail.result.failure_reason}</code>
                    </span>
                  ) : null}
                  <div className="mt-2 small">
                    {new Date(detail.created_at).toLocaleString()} ·{' '}
                    {detail.user?.name || `user ${detail.user?.id ?? '—'}`}
                  </div>
                </CCol>
                <CCol md={6} className="small">
                  <div>
                    <span className="text-body-secondary">Model </span>
                    {detail.call.model || detail.call.driver || '—'}
                  </div>
                  <div>
                    <span className="text-body-secondary">Tokens </span>
                    {detail.call.tokens_in} in / {detail.call.tokens_out} out
                    {detail.call.cache_read_tokens > 0
                      ? ` · ${detail.call.cache_read_tokens} from prompt cache`
                      : ''}
                  </div>
                  <div>
                    <span className="text-body-secondary">Cost </span>
                    {detail.call.cost_inr > 0 ? `₹${detail.call.cost_inr.toFixed(4)}` : 'nothing'}
                    <span className="text-body-secondary"> · wait </span>
                    {detail.call.latency_ms} ms
                  </div>
                </CCol>
              </CRow>

              <Section title="1. What the traveller asked for">
                <Json value={detail.filters} />
              </Section>

              <Section
                title={`2. Places involved (${detail.candidates?.count ?? 0} offered)`}
                hint="Whether the place they wanted was even on the list is usually the first question."
              >
                {(detail.candidates?.sites || []).length === 0 ? (
                  <div className="text-body-secondary small">
                    No places recorded for this attempt.
                  </div>
                ) : (
                  <CTable small responsive className="mb-0">
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>Place</CTableHeaderCell>
                        <CTableHeaderCell>State</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {detail.candidates.sites.map((s) => (
                        <CTableRow key={s.id}>
                          <CTableDataCell>
                            {s.name} <span className="text-body-secondary">#{s.id}</span>
                          </CTableDataCell>
                          <CTableDataCell>
                            {s.dropped ? <CBadge color="danger">dropped</CBadge> : null}{' '}
                            {!s.approved ? <CBadge color="warning">not approved</CBadge> : null}{' '}
                            {s.verified ? <CBadge color="info">verified</CBadge> : null}
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                )}
              </Section>

              <Section
                title="3. What the model returned, before validation"
                hint="Ordering and prose only — the model is never given a phone number or a bus time."
              >
                <Json value={detail.raw_response} />
              </Section>

              <Section
                title={`4. Dropped (${detail.dropped?.count ?? 0})`}
                hint="Ids the model named that were not in the set it was offered. These never reach a traveller."
              >
                <Json value={detail.dropped?.site_ids} />
              </Section>

              <Section title="5. The plan as the traveller saw it">
                <Json value={detail.itinerary} />
              </Section>

              {detail.result?.error_message ? (
                <Section title="Error">
                  <Json value={detail.result.error_message} />
                </Section>
              ) : null}

              <Section title="Review" hint="Flag anything a traveller was right to complain about.">
                <CFormTextarea
                  rows={2}
                  placeholder="What was wrong with this plan?"
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                />
              </Section>
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="warning"
            variant="outline"
            disabled={!detail?.call}
            onClick={() => review({ flagged: true, flag_reason: flagReason })}
          >
            <CIcon icon={cilFlagAlt} className="me-1" />
            Flag
          </CButton>
          <CButton
            color="success"
            variant="outline"
            disabled={!detail?.call}
            onClick={() => review({ reviewed: true })}
          >
            <CIcon icon={cilCheckCircle} className="me-1" />
            Mark handled
          </CButton>
          <CButton color="secondary" onClick={() => setDetail(null)}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  );
};

export default AiGenerations;
