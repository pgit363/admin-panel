import React from 'react';
import PropTypes from 'prop-types';
import {
  CButton,
  CCol,
  CFormCheck,
  CFormInput,
  CFormSelect,
  CRow,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPlus, cilTrash } from '@coreui/icons';
import { ATTR_TYPES, RESERVED_KEYS, isSnakeCase } from './attributeSchema';

const selectStyle = { color: '#212631', backgroundColor: '#fff' };
const needsOptions = (t) => t === 'enum' || t === 'multi';
const needsBounds = (t) => ['int', 'decimal', 'string', 'text'].includes(t);

// A field-builder that edits an array of field rows and mirrors them to the
// parent as the attribute_schema object. The app renders its whole Add-Product
// form from this schema (doc §5.1), so the builder is the important widget here.

// Convert the schema object <-> the internal array form used by the UI.
export const schemaToFields = (schema) => {
  if (!schema || typeof schema !== 'object') return [];
  return Object.entries(schema).map(([key, def]) => ({
    key,
    type: def.type || 'string',
    label: def.label || '',
    mr_label: def.mr_label || '',
    required: !!def.required,
    min: def.min ?? '',
    max: def.max ?? '',
    options: Array.isArray(def.options) ? def.options.join(', ') : '',
  }));
};

export const fieldsToSchema = (fields) => {
  const schema = {};
  fields.forEach((f) => {
    if (!f.key) return;
    const def = { type: f.type, label: f.label };
    if (f.mr_label) def.mr_label = f.mr_label;
    if (f.required) def.required = true;
    if (needsBounds(f.type)) {
      if (f.min !== '' && f.min != null) def.min = Number(f.min);
      if (f.max !== '' && f.max != null) def.max = Number(f.max);
    }
    if (needsOptions(f.type)) {
      def.options = String(f.options).split(',').map((o) => o.trim()).filter(Boolean);
    }
    schema[f.key] = def;
  });
  return schema;
};

// Returns an array of validation error strings for the given field rows.
export const validateFields = (fields) => {
  const errors = [];
  const seen = new Set();
  fields.forEach((f, i) => {
    const n = `Field ${i + 1}`;
    if (!f.key) { errors.push(`${n}: key is required.`); return; }
    if (!isSnakeCase(f.key)) errors.push(`${n}: key "${f.key}" must be snake_case (a-z, 0-9, _).`);
    if (RESERVED_KEYS.includes(f.key)) errors.push(`${n}: "${f.key}" is a reserved key and will be refused.`);
    if (seen.has(f.key)) errors.push(`${n}: duplicate key "${f.key}".`);
    seen.add(f.key);
    if (!f.label) errors.push(`${n}: label is required.`);
    if (needsOptions(f.type) && !String(f.options).trim()) errors.push(`${n}: "${f.type}" needs at least one option.`);
  });
  return errors;
};

const AttributeSchemaBuilder = ({ fields, setFields }) => {
  const update = (idx, patch) => setFields(fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  const remove = (idx) => setFields(fields.filter((_, i) => i !== idx));
  const add = () => setFields([...fields, { key: '', type: 'string', label: '', mr_label: '', required: false, min: '', max: '', options: '' }]);

  return (
    <div>
      {fields.length === 0 && (
        <div className="text-body-secondary mb-2" style={{ fontSize: 13 }}>
          No attributes yet. Add fields to build the vendor Add-Product form.
        </div>
      )}
      {fields.map((f, idx) => {
        const reserved = f.key && RESERVED_KEYS.includes(f.key);
        const badKey = f.key && !isSnakeCase(f.key);
        return (
          <div key={idx} className="border rounded p-2 mb-2">
            <CRow className="g-2 align-items-end">
              <CCol md={3}>
                <label style={{ fontSize: 11 }}>Key (snake_case)</label>
                <CFormInput
                  size="sm"
                  value={f.key}
                  invalid={!!(reserved || badKey)}
                  onChange={(e) => update(idx, { key: e.target.value })}
                  placeholder="e.g. occupancy"
                />
              </CCol>
              <CCol md={2}>
                <label style={{ fontSize: 11 }}>Type</label>
                <CFormSelect size="sm" value={f.type} onChange={(e) => update(idx, { type: e.target.value })} style={selectStyle}>
                  {ATTR_TYPES.map((t) => <option key={t} value={t} style={selectStyle}>{t}</option>)}
                </CFormSelect>
              </CCol>
              <CCol md={3}>
                <label style={{ fontSize: 11 }}>Label</label>
                <CFormInput size="sm" value={f.label} onChange={(e) => update(idx, { label: e.target.value })} placeholder="Max guests" />
              </CCol>
              <CCol md={2}>
                <label style={{ fontSize: 11 }}>Marathi label</label>
                <CFormInput size="sm" value={f.mr_label} onChange={(e) => update(idx, { mr_label: e.target.value })} placeholder="पाहुणे" />
              </CCol>
              <CCol md={2} className="d-flex align-items-center justify-content-between">
                <CFormCheck label="Required" checked={f.required} onChange={(e) => update(idx, { required: e.target.checked })} />
                <CButton color="danger" variant="ghost" size="sm" onClick={() => remove(idx)}><CIcon icon={cilTrash} /></CButton>
              </CCol>

              {needsBounds(f.type) && (
                <>
                  <CCol md={3}>
                    <label style={{ fontSize: 11 }}>Min {f.type === 'string' || f.type === 'text' ? '(length)' : ''}</label>
                    <CFormInput size="sm" type="number" value={f.min} onChange={(e) => update(idx, { min: e.target.value })} />
                  </CCol>
                  <CCol md={3}>
                    <label style={{ fontSize: 11 }}>Max {f.type === 'string' || f.type === 'text' ? '(length)' : ''}</label>
                    <CFormInput size="sm" type="number" value={f.max} onChange={(e) => update(idx, { max: e.target.value })} />
                  </CCol>
                </>
              )}
              {needsOptions(f.type) && (
                <CCol md={12}>
                  <label style={{ fontSize: 11 }}>Options (comma-separated)</label>
                  <CFormInput size="sm" value={f.options} onChange={(e) => update(idx, { options: e.target.value })} placeholder="EP, CP, MAP, AP" />
                </CCol>
              )}

              {reserved && <CCol md={12}><span style={{ fontSize: 11, color: 'var(--cui-danger)' }}>Reserved key — belongs in pricing/availability, not attributes.</span></CCol>}
              {badKey && !reserved && <CCol md={12}><span style={{ fontSize: 11, color: 'var(--cui-danger)' }}>Key must be snake_case.</span></CCol>}
            </CRow>
          </div>
        );
      })}
      <CButton color="primary" variant="outline" size="sm" onClick={add}>
        <CIcon icon={cilPlus} className="me-1" />Add Field
      </CButton>
    </div>
  );
};

AttributeSchemaBuilder.propTypes = {
  fields: PropTypes.array.isRequired,
  setFields: PropTypes.func.isRequired,
};

export default AttributeSchemaBuilder;
