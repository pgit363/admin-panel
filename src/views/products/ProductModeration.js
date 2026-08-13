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
  CFormSelect,
  CFormTextarea,
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
import { cilCheckCircle, cilStar, cilUser, cilXCircle } from '@coreui/icons';
import apiService from 'src/services/apiService';
import { awsUrl } from 'src/services/endpoints';
import AlertModal from 'src/components/AlertModal';
import { parseApiMessage } from 'src/utils/apiMessages';
import { attributeRows } from './attributeSchema';

const selectStyle = { color: '#212631', backgroundColor: '#fff' };

const STATUS_COLORS = {
  draft: 'secondary',
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  paused: 'dark',
};

const money = (amount, currency) => {
  if (amount == null) return null;
  const sym = currency === 'INR' ? '₹' : `${currency || ''} `;
  return `${sym}${amount}`;
};

const ProductModeration = () => {
  const [products, setProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // filters
  const [queue, setQueue] = useState('pending'); // 'pending' = review queue, '' = all products
  const [filters, setFilters] = useState({ status: '', search: '', product_category_id: '' });
  const activeState = useRef({ queue: 'pending', status: '', search: '', product_category_id: '' });
  const [searchTrigger, setSearchTrigger] = useState(0);

  const [categories, setCategories] = useState([]);

  // detail modal
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  // reject modal
  const [rejectModal, setRejectModal] = useState({ visible: false, id: null });
  const [rejectReason, setRejectReason] = useState('');

  const showError = (msg) => setAlert({ type: 'danger', message: msg });
  const showSuccess = (msg) => setAlert({ type: 'success', message: msg });
  const clearAlert = () => setAlert(null);

  useEffect(() => {
    fetchProducts(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTrigger]);

  useEffect(() => {
    apiService('POST', 'listProductCategories', { per_page: 30 })
      .then((r) => {
        if (r.success) {
          const list = Array.isArray(r.data) ? r.data : (r.data.data || []);
          setCategories(list);
        }
      })
      .catch(() => {});
  }, []);

  const fetchProducts = async (page) => {
    setLoading(true);
    const s = activeState.current;
    try {
      let data;
      if (s.queue === 'pending') {
        data = await apiService('POST', `pendingProducts?page=${page}`, { per_page: 15 });
      } else {
        const body = { per_page: 15 };
        if (s.status) body.status = s.status;
        if (s.search) body.search = s.search;
        if (s.product_category_id) body.product_category_id = s.product_category_id;
        data = await apiService('POST', `listAllProducts?page=${page}`, body);
      }
      if (!data.success) { showError(parseApiMessage(data.message)); return; }
      setProducts(data.data.data || []);
      setTotalPages(data.data.last_page || 1);
      setTotal(data.data.total || 0);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    activeState.current = { queue, ...filters };
    if (currentPage !== 1) setCurrentPage(1);
    else setSearchTrigger((t) => t + 1);
  };

  const handleClear = () => {
    setQueue('pending');
    setFilters({ status: '', search: '', product_category_id: '' });
    activeState.current = { queue: 'pending', status: '', search: '', product_category_id: '' };
    if (currentPage !== 1) setCurrentPage(1);
    else setSearchTrigger((t) => t + 1);
  };

  // ─── Detail ─────────────────────────────────────────────────────────────

  const openDetail = async (id) => {
    setShowDetail(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      const data = await apiService('POST', 'getProductAdmin', { id });
      if (!data.success) { showError(parseApiMessage(data.message)); return; }
      setDetail(data.data);
    } catch (err) {
      showError(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  // ─── Actions ────────────────────────────────────────────────────────────

  const patchProduct = (id, changes) =>
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...changes } : p)));

  const handleApprove = async (id) => {
    setActionLoading(true);
    try {
      const data = await apiService('POST', 'approveProduct', { id });
      if (!data.success) {
        // Common case: the product's site is not approved and live.
        showError(parseApiMessage(data.message));
        return;
      }
      showSuccess(data.message || 'Product approved.');
      patchProduct(id, { status: 'approved' });
      if (detail?.id === id) setDetail((d) => ({ ...d, status: 'approved' }));
    } catch (err) {
      showError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (id) => {
    setRejectReason('');
    setRejectModal({ visible: true, id });
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      const data = await apiService('POST', 'rejectProduct', {
        id: rejectModal.id,
        rejection_reason: rejectReason,
      });
      if (!data.success) { showError(parseApiMessage(data.message)); return; }
      showSuccess(data.message || 'Product rejected.');
      patchProduct(rejectModal.id, { status: 'rejected', rejection_reason: rejectReason });
      if (detail?.id === rejectModal.id) setDetail((d) => ({ ...d, status: 'rejected', rejection_reason: rejectReason }));
      setRejectModal({ visible: false, id: null });
    } catch (err) {
      showError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFeature = async (id, isFeatured) => {
    setActionLoading(true);
    try {
      const data = await apiService('POST', 'featureProduct', { id, is_featured: isFeatured });
      if (!data.success) { showError(parseApiMessage(data.message)); return; }
      showSuccess(data.message);
      patchProduct(id, { is_featured: isFeatured });
      if (detail?.id === id) setDetail((d) => ({ ...d, is_featured: isFeatured }));
    } catch (err) {
      showError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  const rows = detail ? attributeRows(detail.attributes, detail.product_category?.attribute_schema) : [];

  return (
    <CRow>
      <CCol xs={12}>
        {/* Filters */}
        <CCard className="mb-3">
          <CCardBody>
            <CForm className="row g-3 align-items-end" onSubmit={(e) => { e.preventDefault(); applyFilters(); }}>
              <CCol md={3}>
                <CFormLabel className="mb-1">View</CFormLabel>
                <CFormSelect value={queue} onChange={(e) => setQueue(e.target.value)} style={selectStyle}>
                  <option value="pending" style={selectStyle}>Review Queue (oldest first)</option>
                  <option value="" style={selectStyle}>All Products</option>
                </CFormSelect>
              </CCol>
              <CCol md={3}>
                <CFormLabel className="mb-1">Search</CFormLabel>
                <CFormInput
                  placeholder="Product name..."
                  value={filters.search}
                  onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                  disabled={queue === 'pending'}
                />
              </CCol>
              <CCol md={2}>
                <CFormLabel className="mb-1">Status</CFormLabel>
                <CFormSelect
                  value={filters.status}
                  onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
                  style={selectStyle}
                  disabled={queue === 'pending'}
                >
                  <option value="" style={selectStyle}>All</option>
                  <option value="draft" style={selectStyle}>Draft</option>
                  <option value="pending" style={selectStyle}>Pending</option>
                  <option value="approved" style={selectStyle}>Approved</option>
                  <option value="rejected" style={selectStyle}>Rejected</option>
                  <option value="paused" style={selectStyle}>Paused</option>
                </CFormSelect>
              </CCol>
              <CCol md={2}>
                <CFormLabel className="mb-1">Category</CFormLabel>
                <CFormSelect
                  value={filters.product_category_id}
                  onChange={(e) => setFilters((p) => ({ ...p, product_category_id: e.target.value }))}
                  style={selectStyle}
                  disabled={queue === 'pending'}
                >
                  <option value="" style={selectStyle}>All</option>
                  {categories.map((c) => <option key={c.id} value={c.id} style={selectStyle}>{c.name}</option>)}
                </CFormSelect>
              </CCol>
              <CCol md="auto">
                <CButton color="primary" type="submit">Apply</CButton>
              </CCol>
              <CCol md="auto">
                <CButton color="secondary" variant="outline" onClick={handleClear}>Clear</CButton>
              </CCol>
              {total > 0 && (
                <CCol className="ms-auto" md="auto">
                  <span className="text-body-secondary" style={{ fontSize: 13 }}>{total} product{total !== 1 ? 's' : ''}</span>
                </CCol>
              )}
            </CForm>
          </CCardBody>
        </CCard>

        {/* List */}
        {loading ? (
          <div className="text-center py-5"><CSpinner color="primary" /></div>
        ) : products.length === 0 ? (
          <CCard><CCardBody className="text-center text-body-secondary py-5">No products found.</CCardBody></CCard>
        ) : (
          products.map((p) => {
            const cover = p.cover?.image || p.cover?.url || p.gallery?.[0]?.image;
            return (
              <CCard key={p.id} className="mb-3">
                <CCardBody>
                  <CRow className="align-items-center g-3">
                    {/* cover */}
                    <CCol xs={12} md={1} className="text-center">
                      {cover ? (
                        <CImage src={awsUrl(cover)} alt={p.name} style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 64, height: 64, borderRadius: 8, backgroundColor: 'var(--cui-secondary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: 11, color: 'var(--cui-secondary-color)' }}>
                          No img
                        </div>
                      )}
                    </CCol>

                    {/* main */}
                    <CCol xs={12} md={7}>
                      <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                        <strong style={{ fontSize: 15 }}>{p.name}</strong>
                        <CBadge color={STATUS_COLORS[p.status] || 'secondary'} shape="rounded-pill">{p.status}</CBadge>
                        {p.is_featured && (
                          <CBadge color="warning" shape="rounded-pill"><CIcon icon={cilStar} size="sm" className="me-1" />Featured</CBadge>
                        )}
                        {p.product_category?.name && (
                          <CBadge color="info" shape="rounded-pill">{p.product_category.name}</CBadge>
                        )}
                      </div>
                      <div className="d-flex flex-wrap gap-3" style={{ fontSize: 12, color: 'var(--cui-secondary-color)' }}>
                        {p.site?.name && <span>{p.site.name}</span>}
                        {p.site?.user?.name && <span><CIcon icon={cilUser} size="sm" className="me-1" />{p.site.user.name}</span>}
                        {p.base_price != null && (
                          <span>
                            {money(p.sale_price ?? p.base_price, p.currency)}
                            {p.sale_price != null && <span style={{ textDecoration: 'line-through', marginLeft: 4, opacity: 0.6 }}>{money(p.base_price, p.currency)}</span>}
                            {p.unit ? ` / ${p.unit}` : ''}
                          </span>
                        )}
                        {p.created_at && <span>Submitted: {p.created_at.slice(0, 10)}</span>}
                      </div>
                      {p.rejection_reason && (
                        <p className="mb-0 mt-1" style={{ fontSize: 12, color: 'var(--cui-danger)' }}>Reason: {p.rejection_reason}</p>
                      )}
                    </CCol>

                    {/* actions */}
                    <CCol xs={12} md={4} className="d-flex justify-content-end gap-2 flex-wrap">
                      <CButton color="secondary" variant="outline" size="sm" onClick={() => openDetail(p.id)}>Review</CButton>
                      {p.status !== 'approved' && (
                        <CButton color="success" size="sm" onClick={() => handleApprove(p.id)} disabled={actionLoading}>
                          <CIcon icon={cilCheckCircle} className="me-1" />Approve
                        </CButton>
                      )}
                      {p.status !== 'rejected' && (
                        <CButton color="danger" size="sm" onClick={() => openRejectModal(p.id)} disabled={actionLoading}>
                          <CIcon icon={cilXCircle} className="me-1" />Reject
                        </CButton>
                      )}
                      {p.status === 'approved' && (
                        <CButton color="warning" variant={p.is_featured ? undefined : 'outline'} size="sm" onClick={() => handleFeature(p.id, !p.is_featured)} disabled={actionLoading}>
                          <CIcon icon={cilStar} className="me-1" />{p.is_featured ? 'Unfeature' : 'Feature'}
                        </CButton>
                      )}
                    </CCol>
                  </CRow>
                </CCardBody>
              </CCard>
            );
          })
        )}

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

      {/* Detail modal */}
      <CModal visible={showDetail} onClose={() => setShowDetail(false)} size="lg" scrollable>
        <CModalHeader><CModalTitle>{detail?.name || 'Product Review'}</CModalTitle></CModalHeader>
        <CModalBody>
          {detailLoading || !detail ? (
            <div className="text-center py-4"><CSpinner color="primary" /></div>
          ) : (
            <>
              <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
                <CBadge color={STATUS_COLORS[detail.status] || 'secondary'} shape="rounded-pill">{detail.status}</CBadge>
                {detail.is_featured && <CBadge color="warning" shape="rounded-pill">Featured</CBadge>}
                {detail.product_category?.name && <CBadge color="info" shape="rounded-pill">{detail.product_category.name}</CBadge>}
                {detail.fulfilment_type && <CBadge color="dark" shape="rounded-pill">{detail.fulfilment_type}</CBadge>}
              </div>

              {detail.description && <p style={{ fontSize: 14 }}>{detail.description}</p>}

              <CRow className="g-2 mb-3" style={{ fontSize: 13 }}>
                <CCol md={6}><strong>Site:</strong> {detail.site?.name} {detail.site?.user?.name ? `(${detail.site.user.name})` : ''}</CCol>
                <CCol md={3}><strong>Base price:</strong> {money(detail.base_price, detail.currency) || '—'}</CCol>
                <CCol md={3}><strong>Sale price:</strong> {money(detail.sale_price, detail.currency) || '—'}</CCol>
                <CCol md={3}><strong>Unit:</strong> {detail.unit || '—'}</CCol>
                <CCol md={3}><strong>Tax rate:</strong> {detail.tax_rate != null ? `${detail.tax_rate}%` : '—'}</CCol>
                <CCol md={3}><strong>HSN:</strong> {detail.hsn_code || '—'}</CCol>
                <CCol md={3}><strong>Bookable:</strong> {detail.is_bookable ? 'Yes' : 'No'}</CCol>
              </CRow>

              {/* Attributes vs schema */}
              {rows.length > 0 && (
                <>
                  <h6>Attributes</h6>
                  <div className="mb-3">
                    {rows.map((r) => (
                      <div key={r.key} className="d-flex justify-content-between border-bottom py-1" style={{ fontSize: 13 }}>
                        <span className="text-body-secondary">{r.label}</span>
                        <span>{r.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Variants */}
              {Array.isArray(detail.variants) && detail.variants.length > 0 && (
                <>
                  <h6>Variants</h6>
                  <div className="mb-3">
                    {detail.variants.map((v) => (
                      <div key={v.id} className="d-flex justify-content-between border-bottom py-1" style={{ fontSize: 13 }}>
                        <span>{v.name} {v.is_default ? <CBadge color="primary" shape="rounded-pill" style={{ fontSize: 10 }}>default</CBadge> : null} {v.sku ? <span className="text-body-secondary">· {v.sku}</span> : ''}</span>
                        <span>{money(v.sale_price ?? v.price, detail.currency)}{v.stock != null ? ` · stock ${v.stock}` : ''}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Gallery */}
              {Array.isArray(detail.gallery) && detail.gallery.length > 0 && (
                <>
                  <h6>Gallery</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {detail.gallery.map((g, i) => (
                      <CImage key={i} src={awsUrl(g.image || g.url)} alt="" style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 6 }} />
                    ))}
                  </div>
                </>
              )}

              {detail.rejection_reason && (
                <p className="mt-3 mb-0" style={{ color: 'var(--cui-danger)', fontSize: 13 }}>
                  <strong>Rejection reason:</strong> {detail.rejection_reason}
                </p>
              )}
            </>
          )}
        </CModalBody>
        <CModalFooter>
          {detail && detail.status !== 'rejected' && (
            <CButton color="danger" variant="outline" onClick={() => openRejectModal(detail.id)} disabled={actionLoading}>Reject</CButton>
          )}
          {detail && detail.status === 'approved' && (
            <CButton color="warning" variant={detail.is_featured ? undefined : 'outline'} onClick={() => handleFeature(detail.id, !detail.is_featured)} disabled={actionLoading}>
              {detail.is_featured ? 'Unfeature' : 'Feature'}
            </CButton>
          )}
          {detail && detail.status !== 'approved' && (
            <CButton color="success" onClick={() => handleApprove(detail.id)} disabled={actionLoading}>
              {actionLoading ? <CSpinner size="sm" /> : 'Approve'}
            </CButton>
          )}
          <CButton color="secondary" onClick={() => setShowDetail(false)}>Close</CButton>
        </CModalFooter>
      </CModal>

      {/* Reject modal */}
      <CModal visible={rejectModal.visible} onClose={() => setRejectModal({ visible: false, id: null })}>
        <CModalHeader><CModalTitle>Reject Product</CModalTitle></CModalHeader>
        <CModalBody>
          <CFormLabel>Rejection Reason <span className="text-danger">*</span></CFormLabel>
          <CFormTextarea
            rows={3}
            maxLength={1000}
            placeholder="Explain what the vendor must fix..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div style={{ fontSize: 11, color: 'var(--cui-secondary-color)', marginTop: 4 }}>
            Shown to the vendor in the app — write it as user-facing copy. {rejectReason.length}/1000
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setRejectModal({ visible: false, id: null })}>Cancel</CButton>
          <CButton color="danger" onClick={handleReject} disabled={actionLoading || !rejectReason.trim()}>
            {actionLoading ? <CSpinner size="sm" /> : 'Reject'}
          </CButton>
        </CModalFooter>
      </CModal>

      <AlertModal alert={alert} onClose={clearAlert} />
    </CRow>
  );
};

export default ProductModeration;
