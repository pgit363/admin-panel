import React, { useEffect, useState } from 'react';
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
  CRow,
  CSpinner,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPencil, cilPlus } from '@coreui/icons';
import apiService from 'src/services/apiService';
import AlertModal from 'src/components/AlertModal';
import { parseApiMessage } from 'src/utils/apiMessages';
import { isSnakeCase } from '../products/attributeSchema';

const selectStyle = { color: '#212631', backgroundColor: '#fff' };
const BILLING_PERIODS = ['free', 'monthly', 'quarterly', 'yearly'];

// The only limit keys the backend accepts — a typo would silently stop being enforced.
const LIMIT_KEYS = [
  { key: 'max_sites', label: 'Max sites' },
  { key: 'max_products', label: 'Max products' },
  { key: 'featured_slots', label: 'Featured slots' },
  { key: 'max_images_per_product', label: 'Images per product' },
];

const emptyForm = {
  id: '',
  code: '',
  name: '',
  mr_name: '',
  description: '',
  price: '',
  currency: 'INR',
  billing_period: 'monthly',
  is_active: false,
  sort_order: '',
  limits: { max_sites: '', max_products: '', featured_slots: '', max_images_per_product: '' },
};

const showLimit = (v) => (v == null ? 'Unlimited' : v);

const Plans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  const showError = (msg) => setAlert({ type: 'danger', message: msg });
  const showSuccess = (msg) => setAlert({ type: 'success', message: msg });
  const clearAlert = () => setAlert(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const data = await apiService('POST', 'listPlans', {});
      if (!data.success) { showError(parseApiMessage(data.message)); return; }
      // listPlans returns a plain array
      setPlans(Array.isArray(data.data) ? data.data : (data.data.data || []));
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setIsEdit(false);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEdit = (plan) => {
    setIsEdit(true);
    setFormData({
      id: plan.id,
      code: plan.code ?? '',
      name: plan.name ?? '',
      mr_name: plan.mr_name ?? '',
      description: plan.description ?? '',
      price: plan.price ?? '',
      currency: plan.currency ?? 'INR',
      billing_period: plan.billing_period ?? 'monthly',
      is_active: !!plan.is_active,
      sort_order: plan.sort_order ?? '',
      limits: {
        max_sites: plan.limits?.max_sites ?? '',
        max_products: plan.limits?.max_products ?? '',
        featured_slots: plan.limits?.featured_slots ?? '',
        max_images_per_product: plan.limits?.max_images_per_product ?? '',
      },
    });
    setShowModal(true);
  };

  // Blank limit => null (unlimited); a value => number.
  const buildLimits = () => {
    const out = {};
    LIMIT_KEYS.forEach(({ key }) => {
      const v = formData.limits[key];
      out[key] = v === '' || v == null ? null : Number(v);
    });
    return out;
  };

  const handleSave = async () => {
    const errs = [];
    if (!formData.name.trim()) errs.push('Name is required.');
    if (!isEdit) {
      if (!formData.code.trim()) errs.push('Code is required.');
      else if (!isSnakeCase(formData.code)) errs.push('Code must be snake_case (start with a letter; a-z, 0-9, _).');
    }
    if (formData.price !== '' && Number(formData.price) < 0) errs.push('Price cannot be negative.');
    if (errs.length) { showError(errs.join('\n')); return; }

    const payload = {
      name: formData.name,
      ...(formData.mr_name && { mr_name: formData.mr_name }),
      ...(formData.description && { description: formData.description }),
      ...(formData.price !== '' && { price: Number(formData.price) }),
      ...(formData.currency && { currency: formData.currency }),
      billing_period: formData.billing_period,
      is_active: formData.is_active,
      ...(formData.sort_order !== '' && { sort_order: Number(formData.sort_order) }),
      limits: buildLimits(),
    };
    if (isEdit) payload.id = formData.id;
    else payload.code = formData.code; // code is set on create only

    setModalLoading(true);
    try {
      const data = await apiService('POST', isEdit ? 'updatePlan' : 'addPlan', payload);
      if (!data.success) { showError(parseApiMessage(data.message)); return; }
      showSuccess(data.message);
      setShowModal(false);
      fetchPlans();
    } catch (err) {
      showError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const setLimit = (key, value) =>
    setFormData((p) => ({ ...p, limits: { ...p.limits, [key]: value } }));

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-3">
          <CCardBody className="d-flex justify-content-between align-items-center">
            <div>
              <strong>Plans</strong>
              {plans.length > 0 && <span className="ms-2 text-body-secondary" style={{ fontSize: 13 }}>{plans.length} total</span>}
            </div>
            <CButton color="success" onClick={openAdd}><CIcon icon={cilPlus} className="me-1" />Add Plan</CButton>
          </CCardBody>
        </CCard>

        {loading ? (
          <div className="text-center py-5"><CSpinner color="primary" /></div>
        ) : plans.length === 0 ? (
          <CCard><CCardBody className="text-center text-body-secondary py-5">No plans found.</CCardBody></CCard>
        ) : (
          <CRow className="g-3">
            {plans.map((plan) => (
              <CCol key={plan.id} xs={12} md={6} xl={4}>
                <CCard className="h-100">
                  <CCardBody>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <strong style={{ fontSize: 16 }}>{plan.name}</strong>
                          <CBadge color={plan.is_active ? 'success' : 'secondary'} shape="rounded-pill">
                            {plan.is_active ? 'Live' : 'Inactive'}
                          </CBadge>
                        </div>
                        <CBadge color="dark" shape="rounded-pill" style={{ fontFamily: 'monospace', fontWeight: 400 }}>{plan.code}</CBadge>
                      </div>
                      <CButton color="warning" size="sm" variant="outline" onClick={() => openEdit(plan)}>
                        <CIcon icon={cilPencil} />
                      </CButton>
                    </div>

                    <div className="mb-2">
                      <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--cui-primary)' }}>
                        {plan.currency === 'INR' ? '₹' : `${plan.currency || ''} `}{plan.price}
                      </span>
                      <span className="text-body-secondary" style={{ fontSize: 13 }}> / {plan.billing_period}</span>
                    </div>

                    {plan.description && (
                      <p className="text-body-secondary" style={{ fontSize: 13 }}>{plan.description}</p>
                    )}

                    <div className="border-top pt-2" style={{ fontSize: 13 }}>
                      {LIMIT_KEYS.map(({ key, label }) => (
                        <div key={key} className="d-flex justify-content-between py-1">
                          <span className="text-body-secondary">{label}</span>
                          <span>{showLimit(plan.limits?.[key])}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-2 text-body-secondary" style={{ fontSize: 12 }}>
                      {plan.subscriptions_count ?? 0} active subscription{plan.subscriptions_count === 1 ? '' : 's'}
                    </div>
                  </CCardBody>
                </CCard>
              </CCol>
            ))}
          </CRow>
        )}
      </CCol>

      {/* Add / Edit modal */}
      <CModal visible={showModal} onClose={() => setShowModal(false)} size="lg" scrollable>
        <CModalHeader><CModalTitle>{isEdit ? 'Edit' : 'Add'} Plan</CModalTitle></CModalHeader>
        <CModalBody>
          <CForm>
            <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel>Name <span className="text-danger">*</span></CFormLabel>
                <CFormInput value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Pro" />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Code <span className="text-danger">*</span></CFormLabel>
                <CFormInput
                  value={formData.code}
                  onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))}
                  placeholder="pro"
                  disabled={isEdit}
                />
                <div style={{ fontSize: 11, color: 'var(--cui-secondary-color)', marginTop: 3 }}>
                  {isEdit ? 'Code cannot be changed after creation' : 'snake_case, unique'}
                </div>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Marathi Name</CFormLabel>
                <CFormInput value={formData.mr_name} onChange={(e) => setFormData((p) => ({ ...p, mr_name: e.target.value }))} />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Price</CFormLabel>
                <CFormInput type="number" min="0" step="0.01" value={formData.price} onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))} placeholder="0.00" />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Currency</CFormLabel>
                <CFormInput maxLength={3} value={formData.currency} onChange={(e) => setFormData((p) => ({ ...p, currency: e.target.value.toUpperCase() }))} placeholder="INR" />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Billing period</CFormLabel>
                <CFormSelect value={formData.billing_period} onChange={(e) => setFormData((p) => ({ ...p, billing_period: e.target.value }))} style={selectStyle}>
                  {BILLING_PERIODS.map((b) => <option key={b} value={b} style={selectStyle}>{b}</option>)}
                </CFormSelect>
              </CCol>
              <CCol md={4}>
                <CFormLabel>Sort order</CFormLabel>
                <CFormInput type="number" min="0" value={formData.sort_order} onChange={(e) => setFormData((p) => ({ ...p, sort_order: e.target.value }))} />
              </CCol>
              <CCol md={4} className="d-flex align-items-end">
                <CFormCheck label="Active (live)" checked={formData.is_active} onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))} />
              </CCol>
              <CCol md={12}>
                <CFormLabel>Description</CFormLabel>
                <CFormTextarea rows={2} maxLength={500} value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} />
              </CCol>

              <CCol md={12}>
                <hr />
                <CFormLabel className="mb-1"><strong>Limits</strong></CFormLabel>
                <div style={{ fontSize: 12, color: 'var(--cui-secondary-color)', marginBottom: 8 }}>
                  Leave blank for <strong>unlimited</strong>. Only these four keys are accepted.
                </div>
                <CRow className="g-3">
                  {LIMIT_KEYS.map(({ key, label }) => (
                    <CCol md={3} key={key}>
                      <CFormLabel style={{ fontSize: 12 }}>{label}</CFormLabel>
                      <CFormInput type="number" min="0" placeholder="Unlimited" value={formData.limits[key]} onChange={(e) => setLimit(key, e.target.value)} />
                    </CCol>
                  ))}
                </CRow>
              </CCol>
            </CRow>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowModal(false)}>Cancel</CButton>
          <CButton color="primary" onClick={handleSave} disabled={modalLoading}>
            {modalLoading ? <CSpinner size="sm" /> : (isEdit ? 'Save Changes' : 'Create Plan')}
          </CButton>
        </CModalFooter>
      </CModal>

      <AlertModal alert={alert} onClose={clearAlert} />
    </CRow>
  );
};

export default Plans;
