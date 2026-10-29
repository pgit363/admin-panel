import React, { useEffect, useState } from 'react';
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CForm,
  CFormInput,
  CFormSelect,
  CImage,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CPagination,
  CPaginationItem,
  CRow,
  CSpinner,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilUser, cilBuilding, cilBasket, cilChartLine } from '@coreui/icons';
import apiService from 'src/services/apiService';
import { awsUrl } from 'src/services/endpoints';
import AlertModal from 'src/components/AlertModal';
import { parseApiMessage } from 'src/utils/apiMessages';

const selectStyle = { color: '#212631', backgroundColor: '#fff' };

const STATUS_COLORS = {
  draft: 'secondary',
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  paused: 'dark',
};

const SUBMISSION_COLORS = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

const date = (value) => (value ? String(value).slice(0, 10) : '—');

// A quota row from the usage summary: max_images_per_product carries only a limit,
// so anything without `used` is informational rather than a consumable quota.
const isQuota = (row) => row && row.used !== undefined;

const VendorDirectory = () => {
  const [vendors, setVendors] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const [plans, setPlans] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    plan_code: '',
    has_pending_products: false,
    has_no_sites: false,
  });
  // Applied filters drive the request; the form above only edits the draft, so typing
  // in the search box doesn't fire a request per keystroke.
  const [applied, setApplied] = useState({});

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const showError = (msg) => setAlert({ type: 'danger', message: msg });
  const clearAlert = () => setAlert(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    fetchVendors(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, applied]);

  const fetchPlans = async () => {
    try {
      const data = await apiService('POST', 'listPlans', {});
      if (data.success) setPlans(data.data?.data || data.data || []);
    } catch {
      // The plan filter is a convenience — the directory still works without it.
    }
  };

  const fetchVendors = async (page) => {
    setLoading(true);
    try {
      const payload = { per_page: 15 };
      if (applied.search) payload.search = applied.search;
      if (applied.plan_code) payload.plan_code = applied.plan_code;
      if (applied.has_pending_products) payload.has_pending_products = true;
      if (applied.has_no_sites) payload.has_no_sites = true;

      const data = await apiService('POST', `listVendors?page=${page}`, payload);
      if (!data.success) {
        showError(parseApiMessage(data.message));
        return;
      }
      setVendors(data.data.data || []);
      setTotalPages(data.data.last_page || 1);
      setTotal(data.data.total || 0);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (e) => {
    e?.preventDefault();
    setCurrentPage(1);
    setApplied({ ...filters });
  };

  const resetFilters = () => {
    const blank = { search: '', plan_code: '', has_pending_products: false, has_no_sites: false };
    setFilters(blank);
    setCurrentPage(1);
    setApplied({});
  };

  const openVendor = async (id) => {
    setDetailLoading(true);
    setDetail({ loading: true });
    try {
      const data = await apiService('POST', 'getVendor', { id });
      if (!data.success) {
        setDetail(null);
        showError(parseApiMessage(data.message));
        return;
      }
      setDetail(data.data);
    } catch (err) {
      setDetail(null);
      showError(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-3">
          <CCardBody>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h5 className="mb-1">Vendor Directory</h5>
                <span className="text-body-secondary" style={{ fontSize: 13 }}>
                  Every user holding the vendor role, with their businesses, catalog and plan.
                  Open one to see its sites, products, quota usage and engagement.
                </span>
              </div>
              {total > 0 && <CBadge color="primary" shape="rounded-pill">{total} vendors</CBadge>}
            </div>

            <CForm onSubmit={applyFilters}>
              <CRow className="g-2 align-items-center">
                <CCol xs={12} md={4}>
                  <CFormInput
                    placeholder="Search name, email or mobile…"
                    value={filters.search}
                    maxLength={100}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  />
                </CCol>
                <CCol xs={12} md={3}>
                  <CFormSelect
                    style={selectStyle}
                    value={filters.plan_code}
                    onChange={(e) => setFilters({ ...filters, plan_code: e.target.value })}
                  >
                    <option value="">All plans</option>
                    {plans.map((p) => (
                      <option key={p.id || p.code} value={p.code}>{p.name}</option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol xs={12} md={5} className="d-flex flex-wrap align-items-center gap-3">
                  <label className="d-flex align-items-center gap-1 mb-0" style={{ fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={filters.has_pending_products}
                      onChange={(e) => setFilters({ ...filters, has_pending_products: e.target.checked })}
                    />
                    Has pending products
                  </label>
                  <label className="d-flex align-items-center gap-1 mb-0" style={{ fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={filters.has_no_sites}
                      onChange={(e) => setFilters({ ...filters, has_no_sites: e.target.checked })}
                    />
                    No sites yet
                  </label>
                  <CButton type="submit" color="primary" size="sm">Apply</CButton>
                  <CButton type="button" color="secondary" variant="outline" size="sm" onClick={resetFilters}>
                    Reset
                  </CButton>
                </CCol>
              </CRow>
            </CForm>
          </CCardBody>
        </CCard>

        {loading ? (
          <div className="text-center py-5"><CSpinner color="primary" /></div>
        ) : vendors.length === 0 ? (
          <CCard>
            <CCardBody className="text-center text-body-secondary py-5">
              No vendors match these filters.
            </CCardBody>
          </CCard>
        ) : (
          vendors.map((v) => (
            <CCard key={v.id} className="mb-3">
              <CCardBody>
                <CRow className="align-items-center g-3">
                  <CCol xs="auto">
                    {v.logo ? (
                      <CImage
                        src={awsUrl(v.logo)}
                        alt={v.business_name || v.name}
                        style={{ width: 54, height: 54, objectFit: 'cover', borderRadius: 8 }}
                      />
                    ) : (
                      <div
                        className="d-flex align-items-center justify-content-center"
                        style={{ width: 54, height: 54, borderRadius: 8, background: 'var(--cui-tertiary-bg)' }}
                      >
                        <CIcon icon={cilUser} />
                      </div>
                    )}
                  </CCol>

                  <CCol xs={12} md={5}>
                    <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                      <strong style={{ fontSize: 15 }}>{v.business_name || v.name}</strong>
                      {v.plan?.name && (
                        <CBadge color="info" shape="rounded-pill">{v.plan.name}</CBadge>
                      )}
                    </div>
                    <div
                      className="d-flex flex-wrap gap-3"
                      style={{ fontSize: 12, color: 'var(--cui-secondary-color)' }}
                    >
                      <span><CIcon icon={cilUser} size="sm" className="me-1" />{v.name}</span>
                      {v.email && <span>{v.email}</span>}
                      {v.mobile && <span>{v.mobile}</span>}
                      <span>Joined {date(v.joined_at)}</span>
                    </div>
                  </CCol>

                  <CCol xs={12} md={4} className="d-flex flex-wrap gap-2">
                    <CBadge color="secondary" shape="rounded-pill">
                      <CIcon icon={cilBuilding} size="sm" className="me-1" />
                      {v.sites?.approved ?? 0}/{v.sites?.total ?? 0} sites
                    </CBadge>
                    <CBadge color="secondary" shape="rounded-pill">
                      <CIcon icon={cilBasket} size="sm" className="me-1" />
                      {v.products?.approved ?? 0}/{v.products?.total ?? 0} products
                    </CBadge>
                    {v.sites?.pending > 0 && (
                      <CBadge color="warning" shape="rounded-pill">{v.sites.pending} site pending</CBadge>
                    )}
                    {v.products?.pending > 0 && (
                      <CBadge color="warning" shape="rounded-pill">{v.products.pending} product pending</CBadge>
                    )}
                  </CCol>

                  <CCol xs={12} md="auto" className="ms-auto">
                    <CButton color="primary" variant="outline" size="sm" onClick={() => openVendor(v.id)}>
                      View
                    </CButton>
                  </CCol>
                </CRow>
              </CCardBody>
            </CCard>
          ))
        )}

        {totalPages > 1 && (
          <CPagination className="mt-2">
            <CPaginationItem disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
              Previous
            </CPaginationItem>
            {Array.from({ length: totalPages }, (_, i) => (
              <CPaginationItem key={i} active={i + 1 === currentPage} onClick={() => setCurrentPage(i + 1)}>
                {i + 1}
              </CPaginationItem>
            ))}
            <CPaginationItem disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
              Next
            </CPaginationItem>
          </CPagination>
        )}
      </CCol>

      {/* Vendor detail */}
      <CModal visible={!!detail} onClose={() => setDetail(null)} size="xl" scrollable>
        <CModalHeader>
          <CModalTitle>{detail?.vendor?.name || 'Vendor'}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {detailLoading || detail?.loading ? (
            <div className="text-center py-5"><CSpinner color="primary" /></div>
          ) : detail ? (
            <>
              <CRow className="g-3 mb-3">
                <CCol xs={12} md={6}>
                  <div style={{ fontSize: 13 }}>
                    <div><strong>Email:</strong> {detail.vendor.email || '—'}</div>
                    <div><strong>Mobile:</strong> {detail.vendor.mobile || '—'}</div>
                    <div><strong>Joined:</strong> {date(detail.vendor.joined_at)}</div>
                    <div className="d-flex align-items-center gap-1 mt-1">
                      <strong>Roles:</strong>
                      {(detail.vendor.roles || []).map((r) => (
                        <CBadge key={r} color="secondary" shape="rounded-pill">{r}</CBadge>
                      ))}
                    </div>
                  </div>
                </CCol>
                <CCol xs={12} md={6}>
                  <div style={{ fontSize: 13 }}>
                    <div>
                      <strong>Plan:</strong> {detail.plan?.name || '—'}
                      {detail.plan?.price != null && ` (₹${detail.plan.price})`}
                    </div>
                    <div>
                      <strong>Subscription:</strong>{' '}
                      {detail.subscription ? (
                        <>
                          <CBadge color={detail.subscription.status === 'active' ? 'success' : 'secondary'} shape="rounded-pill">
                            {detail.subscription.status}
                          </CBadge>{' '}
                          {date(detail.subscription.starts_at)} →{' '}
                          {detail.subscription.ends_at ? date(detail.subscription.ends_at) : 'never expires'}
                        </>
                      ) : '—'}
                    </div>
                    <div className="mt-1">
                      <CIcon icon={cilChartLine} size="sm" className="me-1" />
                      <strong>{detail.engagement?.views ?? 0}</strong> views ·{' '}
                      <strong>{detail.engagement?.leads ?? 0}</strong> leads
                    </div>
                  </div>
                </CCol>
              </CRow>

              {/* Quota usage */}
              {detail.usage && (
                <>
                  <h6 className="mb-2">Quota usage</h6>
                  <CRow className="g-2 mb-3">
                    {Object.entries(detail.usage).filter(([, row]) => isQuota(row)).map(([key, row]) => (
                      <CCol xs={6} md={3} key={key}>
                        <CCard>
                          <CCardBody className="py-2">
                            <div style={{ fontSize: 11, color: 'var(--cui-secondary-color)' }}>
                              {key.replace(/_/g, ' ')}
                            </div>
                            <div>
                              <strong style={{ fontSize: 16 }}>{row.used}</strong>
                              <span style={{ fontSize: 12 }}> / {row.limit}</span>
                              {row.exceeded && <CBadge color="danger" className="ms-2">full</CBadge>}
                            </div>
                          </CCardBody>
                        </CCard>
                      </CCol>
                    ))}
                  </CRow>
                </>
              )}

              {/* Sites */}
              <h6 className="mb-2">Businesses ({detail.sites?.length || 0})</h6>
              {(detail.sites || []).length === 0 ? (
                <p className="text-body-secondary" style={{ fontSize: 13 }}>No sites yet.</p>
              ) : (
                detail.sites.map((s) => (
                  <CCard key={s.id} className="mb-2">
                    <CCardBody className="py-2">
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <strong>{s.name}</strong>
                        {s.is_primary && <CBadge color="primary" shape="rounded-pill">primary</CBadge>}
                        <CBadge color={SUBMISSION_COLORS[s.submission_status] || 'secondary'} shape="rounded-pill">
                          {s.submission_status}
                        </CBadge>
                        {s.verification_status === 'verified' && (
                          <CBadge color="success" shape="rounded-pill">verified</CBadge>
                        )}
                        {(s.categories || []).map((c) => (
                          <CBadge key={c.id} color="secondary" shape="rounded-pill">{c.name}</CBadge>
                        ))}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--cui-secondary-color)' }}>
                        {s.approved_products_count ?? 0}/{s.products_count ?? 0} products approved
                        {s.pin_code ? ` · ${s.pin_code}` : ''}
                        {s.rejection_reason ? ` · rejected: ${s.rejection_reason}` : ''}
                      </div>
                    </CCardBody>
                  </CCard>
                ))
              )}

              {/* Catalog */}
              <h6 className="mb-2 mt-3">Catalog</h6>
              <div className="d-flex flex-wrap gap-2 mb-2">
                {Object.entries(detail.products?.by_status || {}).map(([status, count]) => (
                  <CBadge key={status} color={STATUS_COLORS[status] || 'secondary'} shape="rounded-pill">
                    {count} {status}
                  </CBadge>
                ))}
                {Object.keys(detail.products?.by_status || {}).length === 0 && (
                  <span className="text-body-secondary" style={{ fontSize: 13 }}>No products yet.</span>
                )}
              </div>
              {(detail.products?.recent || []).map((p) => (
                <div
                  key={p.id}
                  className="d-flex align-items-center gap-2 py-1"
                  style={{ fontSize: 13, borderBottom: '1px solid var(--cui-border-color)' }}
                >
                  <CBadge color={STATUS_COLORS[p.status] || 'secondary'} shape="rounded-pill">{p.status}</CBadge>
                  <span>{p.name}</span>
                  <span style={{ color: 'var(--cui-secondary-color)' }}>{p.site?.name}</span>
                  <span className="ms-auto" style={{ color: 'var(--cui-secondary-color)' }}>
                    {p.views_count ?? 0} views · {p.leads_count ?? 0} leads
                  </span>
                </div>
              ))}

              {/* Recent leads */}
              {(detail.engagement?.recent_leads || []).length > 0 && (
                <>
                  <h6 className="mb-2 mt-3">Recent leads</h6>
                  {detail.engagement.recent_leads.map((l) => (
                    <div key={l.id} style={{ fontSize: 13 }}>
                      {l.product?.name || 'Product'} — {date(l.created_at)}
                    </div>
                  ))}
                </>
              )}
            </>
          ) : null}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setDetail(null)}>Close</CButton>
        </CModalFooter>
      </CModal>

      <AlertModal alert={alert} onClose={clearAlert} />
    </CRow>
  );
};

export default VendorDirectory;
