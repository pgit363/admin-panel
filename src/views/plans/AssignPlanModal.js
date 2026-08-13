import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  CButton,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CSpinner,
} from '@coreui/react';
import apiService from 'src/services/apiService';
import { parseApiMessage } from 'src/utils/apiMessages';

const selectStyle = { color: '#212631', backgroundColor: '#fff' };

// Assign / change a vendor's plan. assignPlan closes any existing active
// subscription server-side, so this is always a "move onto plan X" action.
const AssignPlanModal = ({ visible, user, plans, onClose, onDone, onError, onSuccess }) => {
  const [planId, setPlanId] = useState('');
  const [months, setMonths] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) { setPlanId(''); setMonths(''); }
  }, [visible]);

  const submit = async () => {
    if (!planId) { onError('Select a plan.'); return; }
    setSaving(true);
    try {
      const payload = { user_id: user.id, plan_id: Number(planId) };
      if (months !== '') payload.months = Number(months); // omit for never-expires
      const data = await apiService('POST', 'assignPlan', payload);
      if (!data.success) { onError(parseApiMessage(data.message)); return; }
      onSuccess(data.message || 'Plan assigned.');
      onClose();
      if (onDone) onDone(data.data);
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <CModal visible={visible} onClose={onClose}>
      <CModalHeader><CModalTitle>Assign Plan</CModalTitle></CModalHeader>
      <CModalBody>
        {user && (
          <div className="mb-3">
            <strong>{user.name}</strong>
            {user.email && <div className="text-body-secondary" style={{ fontSize: 13 }}>{user.email}</div>}
          </div>
        )}
        <CForm>
          <CRow className="g-3">
            <CCol md={7}>
              <CFormLabel>Plan <span className="text-danger">*</span></CFormLabel>
              <CFormSelect value={planId} onChange={(e) => setPlanId(e.target.value)} style={selectStyle}>
                <option value="" style={selectStyle}>Select plan...</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id} style={selectStyle}>
                    {p.name} — {p.currency === 'INR' ? '₹' : `${p.currency || ''} `}{p.price}/{p.billing_period}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol md={5}>
              <CFormLabel>Months</CFormLabel>
              <CFormInput type="number" min="1" max="120" value={months} onChange={(e) => setMonths(e.target.value)} placeholder="Blank = never expires" />
            </CCol>
          </CRow>
        </CForm>
        <div style={{ fontSize: 11, color: 'var(--cui-secondary-color)', marginTop: 8 }}>
          Any existing active subscription for this vendor is closed automatically.
        </div>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose}>Cancel</CButton>
        <CButton color="primary" onClick={submit} disabled={saving}>
          {saving ? <CSpinner size="sm" /> : 'Assign'}
        </CButton>
      </CModalFooter>
    </CModal>
  );
};

AssignPlanModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  user: PropTypes.object,
  plans: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  onDone: PropTypes.func,
  onError: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
};

export default AssignPlanModal;
