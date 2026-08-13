import React, { useEffect, useRef, useState } from 'react';
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CForm,
  CFormCheck,
  CFormInput,
  CFormLabel,
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
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPencil, cilTrash, cilLayers } from '@coreui/icons';
import apiService from 'src/services/apiService';
import AlertModal from 'src/components/AlertModal';
import { parseApiMessage } from 'src/utils/apiMessages';
import AttributeSchemaBuilder, { schemaToFields, fieldsToSchema, validateFields } from './AttributeSchemaBuilder';
import { isSnakeCase } from './attributeSchema';

const selectStyle = { color: '#212631', backgroundColor: '#fff' };
const BOOKING_TYPES = ['none', 'date_range', 'slot', 'quantity'];

// Append a plain object/array to FormData using PHP bracket notation so Laravel
// parses attribute_schema back into a nested array (needed when an icon file
// forces multipart/form-data).
const appendNested = (fd, key, value) => {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => appendNested(fd, `${key}[${i}]`, v));
  } else if (typeof value === 'object') {
    Object.entries(value).forEach(([k, v]) => appendNested(fd, `${key}[${k}]`, v));
  } else if (typeof value === 'boolean') {
    fd.append(key, value ? '1' : '0');
  } else {
    fd.append(key, value);
  }
};

const emptyForm = {
  id: '',
  name: '',
  mr_name: '',
  code: '',
  description: '',
  booking_type: 'none',
  status: true,
  sort_order: '',
};

const ProductCategories = () => {
  const [categories, setCategories] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const [filters, setFilters] = useState({ search: '', booking_type: '', status: '' });
  const activeFilters = useRef({ search: '', booking_type: '', status: '' });
  const [searchTrigger, setSearchTrigger] = useState(0);

  // add / edit modal
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [fields, setFields] = useState([]);
  const [iconFile, setIconFile] = useState(null);

  // allowed-categories modal
  const [allowedModal, setAllowedModal] = useState(false);
  const [siteCategories, setSiteCategories] = useState([]);
  const [selectedSiteCat, setSelectedSiteCat] = useState('');
  const [allowedRows, setAllowedRows] = useState([]); // {product_category_id, name, allowed, max_products, is_required}
  const [allowedLoading, setAllowedLoading] = useState(false);

  const showError = (msg) => setAlert({ type: 'danger', message: msg });
  const showSuccess = (msg) => setAlert({ type: 'success', message: msg });
  const clearAlert = () => setAlert(null);

  useEffect(() => {
    fetchCategories(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTrigger]);

  const fetchCategories = async (page) => {
    setLoading(true);
    const f = activeFilters.current;
    const body = { per_page: 15 };
    if (f.search) body.search = f.search;
    if (f.booking_type) body.booking_type = f.booking_type;
    if (f.status !== '') body.status = Number(f.status);
    try {
      const data = await apiService('POST', `listProductCategories?page=${page}`, body);
      if (!data.success) { showError(parseApiMessage(data.message)); return; }
      setCategories(data.data.data || []);
      setTotalPages(data.data.last_page || 1);
      setTotal(data.data.total || 0);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    activeFilters.current = { ...filters };
    if (currentPage !== 1) setCurrentPage(1);
    else setSearchTrigger((t) => t + 1);
  };

  const handleClear = () => {
    setFilters({ search: '', booking_type: '', status: '' });
    activeFilters.current = { search: '', booking_type: '', status: '' };
    if (currentPage !== 1) setCurrentPage(1);
    else setSearchTrigger((t) => t + 1);
  };

  // ─── Add / Edit ─────────────────────────────────────────────────────────

  const openAdd = () => {
    setIsEdit(false);
    setFormData(emptyForm);
    setFields([]);
    setIconFile(null);
    setShowModal(true);
  };

  const openEdit = async (cat) => {
    setIsEdit(true);
    setIconFile(null);
    setShowModal(true);
    setModalLoading(true);
    try {
      const data = await apiService('POST', 'getProductCategory', { id: cat.id });
      if (!data.success) { showError(parseApiMessage(data.message)); return; }
      const d = data.data;
      setFormData({
        id: d.id,
        name: d.name ?? '',
        mr_name: d.mr_name ?? '',
        code: d.code ?? '',
        description: d.description ?? '',
        booking_type: d.booking_type ?? 'none',
        status: d.status ?? true,
        sort_order: d.sort_order ?? '',
      });
      setFields(schemaToFields(d.attribute_schema));
    } catch (err) {
      showError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleSave = async () => {
    // validation
    const errs = [];
    if (!formData.name.trim() || formData.name.trim().length < 2) errs.push('Name must be at least 2 characters.');
    if (!formData.code.trim()) errs.push('Code is required.');
    else if (!isSnakeCase(formData.code)) errs.push('Code must be snake_case (start with a letter; a-z, 0-9, _).');
    errs.push(...validateFields(fields));
    if (errs.length) { showError(errs.join('\n')); return; }

    const schema = fieldsToSchema(fields);
    setModalLoading(true);
    try {
      const endpoint = isEdit ? 'updateProductCategory' : 'addProductCategory';
      let payload;
      if (iconFile) {
        const fd = new FormData();
        if (isEdit) fd.append('id', formData.id);
        fd.append('name', formData.name);
        if (formData.mr_name) fd.append('mr_name', formData.mr_name);
        fd.append('code', formData.code);
        if (formData.description) fd.append('description', formData.description);
        fd.append('booking_type', formData.booking_type);
        fd.append('status', formData.status ? '1' : '0');
        if (formData.sort_order !== '') fd.append('sort_order', formData.sort_order);
        appendNested(fd, 'attribute_schema', schema);
        fd.append('icon', iconFile);
        payload = fd;
      } else {
        payload = {
          ...(isEdit && { id: formData.id }),
          name: formData.name,
          ...(formData.mr_name && { mr_name: formData.mr_name }),
          code: formData.code,
          ...(formData.description && { description: formData.description }),
          booking_type: formData.booking_type,
          status: formData.status,
          ...(formData.sort_order !== '' && { sort_order: Number(formData.sort_order) }),
          attribute_schema: schema,
        };
      }
      const data = await apiService('POST', endpoint, payload);
      if (!data.success) { showError(parseApiMessage(data.message)); return; }
      showSuccess(data.message);
      setShowModal(false);
      fetchCategories(currentPage);
    } catch (err) {
      showError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product category? (Refused if it has children.)')) return;
    try {
      const data = await apiService('POST', 'deleteProductCategory', { id });
      if (!data.success) { showError(parseApiMessage(data.message)); return; }
      showSuccess(data.message);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      showError(err.message);
    }
  };

  // ─── Allowed categories mapping ───────────────────────────────────────────

  const openAllowed = async () => {
    setAllowedModal(true);
    setSelectedSiteCat('');
    setAllowedRows([]);
    // load site categories once — flatten parents + their sub-categories, since
    // a product mapping may target either level.
    if (siteCategories.length === 0) {
      try {
        const data = await apiService('POST', 'listcategories', { apitype: 'list' });
        if (data.success) {
          const list = Array.isArray(data.data) ? data.data : (data.data.data || []);
          const flat = [];
          list.forEach((c) => {
            flat.push({ id: c.id, name: c.name });
            (c.subCategories || []).forEach((sc) => flat.push({ id: sc.id, name: `${c.name} › ${sc.name}` }));
          });
          setSiteCategories(flat);
        }
      } catch (err) {
        showError(err.message);
      }
    }
  };

  // When a site category is picked, build the row set from every product
  // category and pre-fill each one's current pivot (if it already maps here).
  const loadAllowedFor = async (siteCatId) => {
    if (!siteCatId) { setAllowedRows([]); return; }
    setAllowedLoading(true);
    try {
      const listRes = await apiService('POST', 'listProductCategories', { per_page: 30 });
      const prodCats = listRes.success ? (listRes.data.data || []) : [];
      // fetch each product category's site_categories pivots in parallel
      const details = await Promise.all(
        prodCats.map((pc) => apiService('POST', 'getProductCategory', { id: pc.id }).catch(() => null)),
      );
      const rows = prodCats.map((pc, i) => {
        const d = details[i]?.success ? details[i].data : null;
        const pivotHost = d?.site_categories?.find((sc) => String(sc.id) === String(siteCatId));
        return {
          product_category_id: pc.id,
          name: pc.name,
          allowed: !!pivotHost,
          is_required: pivotHost ? !!pivotHost.pivot?.is_required : false,
          max_products: pivotHost?.pivot?.max_products ?? '',
        };
      });
      setAllowedRows(rows);
    } catch (err) {
      showError(err.message);
    } finally {
      setAllowedLoading(false);
    }
  };

  const saveAllowed = async () => {
    if (!selectedSiteCat) { showError('Select a site category first.'); return; }
    const allowed = allowedRows
      .filter((r) => r.allowed)
      .map((r) => ({
        product_category_id: r.product_category_id,
        is_required: r.is_required,
        ...(r.max_products !== '' && { max_products: Number(r.max_products) }),
      }));
    setAllowedLoading(true);
    try {
      const data = await apiService('POST', 'setAllowedProductCategories', {
        category_id: Number(selectedSiteCat),
        allowed, // replaces the whole set; [] revokes everything
      });
      if (!data.success) { showError(parseApiMessage(data.message)); return; }
      showSuccess(data.message);
      setAllowedModal(false);
    } catch (err) {
      showError(err.message);
    } finally {
      setAllowedLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-3">
          <CCardBody>
            <CForm className="row g-3 align-items-end" onSubmit={(e) => { e.preventDefault(); applyFilters(); }}>
              <CCol md={3}>
                <CFormLabel className="mb-1">Search</CFormLabel>
                <CFormInput placeholder="Category name..." value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} />
              </CCol>
              <CCol md={2}>
                <CFormLabel className="mb-1">Booking type</CFormLabel>
                <CFormSelect value={filters.booking_type} onChange={(e) => setFilters((p) => ({ ...p, booking_type: e.target.value }))} style={selectStyle}>
                  <option value="" style={selectStyle}>All</option>
                  {BOOKING_TYPES.map((t) => <option key={t} value={t} style={selectStyle}>{t}</option>)}
                </CFormSelect>
              </CCol>
              <CCol md={2}>
                <CFormLabel className="mb-1">Status</CFormLabel>
                <CFormSelect value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))} style={selectStyle}>
                  <option value="" style={selectStyle}>All</option>
                  <option value="1" style={selectStyle}>Active</option>
                  <option value="0" style={selectStyle}>Inactive</option>
                </CFormSelect>
              </CCol>
              <CCol md="auto">
                <CButton color="primary" type="submit">Filter</CButton>
              </CCol>
              <CCol md="auto">
                <CButton color="secondary" variant="outline" onClick={handleClear}>Clear</CButton>
              </CCol>
              <CCol className="ms-auto d-flex gap-2" md="auto">
                <CButton color="info" variant="outline" onClick={openAllowed}>
                  <CIcon icon={cilLayers} className="me-1" />Site → Product Mapping
                </CButton>
                <CButton color="success" onClick={openAdd}>+ Add Category</CButton>
              </CCol>
            </CForm>
          </CCardBody>
        </CCard>

        {loading ? (
          <div className="text-center py-5"><CSpinner color="primary" /></div>
        ) : categories.length === 0 ? (
          <CCard><CCardBody className="text-center text-body-secondary py-5">No product categories found.</CCardBody></CCard>
        ) : (
          categories.map((c) => (
            <CCard key={c.id} className="mb-3">
              <CCardBody>
                <CRow className="align-items-center g-3">
                  <CCol xs={12} md={8}>
                    <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                      <strong style={{ fontSize: 15 }}>{c.name}</strong>
                      {c.mr_name && <span className="text-body-secondary" style={{ fontSize: 13 }}>({c.mr_name})</span>}
                      <CBadge color={c.status ? 'success' : 'secondary'} shape="rounded-pill">{c.status ? 'Active' : 'Inactive'}</CBadge>
                      <CBadge color="dark" shape="rounded-pill" style={{ fontFamily: 'monospace' }}>{c.code}</CBadge>
                      {c.booking_type && <CBadge color="info" shape="rounded-pill">{c.booking_type}</CBadge>}
                    </div>
                    <div className="d-flex flex-wrap gap-3" style={{ fontSize: 12, color: 'var(--cui-secondary-color)' }}>
                      <span>{c.attribute_schema ? Object.keys(c.attribute_schema).length : 0} attributes</span>
                      <span>{c.allowed_categories_count ?? 0} site categories may list this</span>
                      {c.parent?.name && <span>Parent: {c.parent.name}</span>}
                    </div>
                  </CCol>
                  <CCol xs={12} md={4} className="d-flex justify-content-end gap-2">
                    <CButton color="warning" size="sm" onClick={() => openEdit(c)}><CIcon icon={cilPencil} className="me-1" />Edit</CButton>
                    <CButton color="danger" size="sm" onClick={() => handleDelete(c.id)}><CIcon icon={cilTrash} className="me-1" />Delete</CButton>
                  </CCol>
                </CRow>
              </CCardBody>
            </CCard>
          ))
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

      {/* Add / Edit modal */}
      <CModal visible={showModal} onClose={() => setShowModal(false)} size="lg" scrollable>
        <CModalHeader><CModalTitle>{isEdit ? 'Edit' : 'Add'} Product Category</CModalTitle></CModalHeader>
        <CModalBody>
          {modalLoading ? (
            <div className="text-center py-4"><CSpinner color="primary" /></div>
          ) : (
            <CForm>
              <CRow className="g-3">
                <CCol md={6}>
                  <CFormLabel>Name <span className="text-danger">*</span></CFormLabel>
                  <CFormInput value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Alphonso Mango" />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Marathi Name</CFormLabel>
                  <CFormInput value={formData.mr_name} onChange={(e) => setFormData((p) => ({ ...p, mr_name: e.target.value }))} placeholder="हापूस आंबा" />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Code <span className="text-danger">*</span></CFormLabel>
                  <CFormInput value={formData.code} onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))} placeholder="alphonso_mango" />
                  <div style={{ fontSize: 11, color: 'var(--cui-secondary-color)', marginTop: 3 }}>snake_case, unique</div>
                </CCol>
                <CCol md={3}>
                  <CFormLabel>Booking type</CFormLabel>
                  <CFormSelect value={formData.booking_type} onChange={(e) => setFormData((p) => ({ ...p, booking_type: e.target.value }))} style={selectStyle}>
                    {BOOKING_TYPES.map((t) => <option key={t} value={t} style={selectStyle}>{t}</option>)}
                  </CFormSelect>
                </CCol>
                <CCol md={3}>
                  <CFormLabel>Sort order</CFormLabel>
                  <CFormInput type="number" min="0" value={formData.sort_order} onChange={(e) => setFormData((p) => ({ ...p, sort_order: e.target.value }))} />
                </CCol>
                <CCol md={12}>
                  <CFormLabel>Description</CFormLabel>
                  <CFormTextarea rows={2} value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} />
                </CCol>
                <CCol md={8}>
                  <CFormLabel>Icon</CFormLabel>
                  <CFormInput type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => setIconFile(e.target.files[0] || null)} />
                </CCol>
                <CCol md={4} className="d-flex align-items-end">
                  <CFormCheck label="Active" checked={!!formData.status} onChange={(e) => setFormData((p) => ({ ...p, status: e.target.checked }))} />
                </CCol>

                <CCol md={12}>
                  <hr />
                  <CFormLabel className="mb-1"><strong>Attribute Schema</strong></CFormLabel>
                  <div style={{ fontSize: 12, color: 'var(--cui-secondary-color)', marginBottom: 8 }}>
                    Drives the vendor Add-Product form in the app. Keys must be snake_case; pricing/availability keys are reserved.
                  </div>
                  <AttributeSchemaBuilder fields={fields} setFields={setFields} />
                </CCol>
              </CRow>
            </CForm>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowModal(false)}>Cancel</CButton>
          <CButton color="primary" onClick={handleSave} disabled={modalLoading}>
            {modalLoading ? <CSpinner size="sm" /> : (isEdit ? 'Save Changes' : 'Create Category')}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Allowed categories mapping modal */}
      <CModal visible={allowedModal} onClose={() => setAllowedModal(false)} size="lg" scrollable>
        <CModalHeader><CModalTitle>Site → Product Category Mapping</CModalTitle></CModalHeader>
        <CModalBody>
          <div style={{ fontSize: 13, color: 'var(--cui-secondary-color)', marginBottom: 10 }}>
            Defines which product categories a <strong>site</strong> category may list. Saving replaces the entire set for that site category.
          </div>
          <CFormLabel>Site Category</CFormLabel>
          <CFormSelect
            value={selectedSiteCat}
            onChange={(e) => { setSelectedSiteCat(e.target.value); loadAllowedFor(e.target.value); }}
            style={selectStyle}
          >
            <option value="" style={selectStyle}>Select site category...</option>
            {siteCategories.map((sc) => <option key={sc.id} value={sc.id} style={selectStyle}>{sc.name}</option>)}
          </CFormSelect>

          {allowedLoading ? (
            <div className="text-center py-4"><CSpinner color="primary" /></div>
          ) : selectedSiteCat && (
            <div className="mt-3">
              {allowedRows.length === 0 ? (
                <div className="text-body-secondary" style={{ fontSize: 13 }}>No product categories exist yet.</div>
              ) : allowedRows.map((r, idx) => (
                <div key={r.product_category_id} className="border rounded p-2 mb-2">
                  <CRow className="g-2 align-items-center">
                    <CCol md={5}>
                      <CFormCheck
                        label={r.name}
                        checked={r.allowed}
                        onChange={(e) => setAllowedRows((prev) => prev.map((x, i) => i === idx ? { ...x, allowed: e.target.checked } : x))}
                      />
                    </CCol>
                    <CCol md={4}>
                      <CFormInput
                        size="sm"
                        type="number"
                        min="1"
                        placeholder="Max products (blank = unlimited)"
                        value={r.max_products}
                        disabled={!r.allowed}
                        onChange={(e) => setAllowedRows((prev) => prev.map((x, i) => i === idx ? { ...x, max_products: e.target.value } : x))}
                      />
                    </CCol>
                    <CCol md={3}>
                      <CFormCheck
                        label="Required"
                        checked={r.is_required}
                        disabled={!r.allowed}
                        onChange={(e) => setAllowedRows((prev) => prev.map((x, i) => i === idx ? { ...x, is_required: e.target.checked } : x))}
                      />
                    </CCol>
                  </CRow>
                </div>
              ))}
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setAllowedModal(false)}>Cancel</CButton>
          <CButton color="primary" onClick={saveAllowed} disabled={allowedLoading || !selectedSiteCat}>
            {allowedLoading ? <CSpinner size="sm" /> : 'Save Mapping'}
          </CButton>
        </CModalFooter>
      </CModal>

      <AlertModal alert={alert} onClose={clearAlert} />
    </CRow>
  );
};

export default ProductCategories;
