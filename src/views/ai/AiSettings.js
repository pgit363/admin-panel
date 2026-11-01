import React, { useCallback, useEffect, useState } from 'react';
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CRow,
  CSpinner,
} from '@coreui/react';
import PropTypes from 'prop-types';
import apiService from 'src/services/apiService';
import AlertModal from 'src/components/AlertModal';
import { parseApiMessage } from 'src/utils/apiMessages';

/**
 * AI Trip Planner — settings.
 *
 * Answers: tighten something right now, without a deploy.
 *
 * This screen earns its place because the backend runs Octane. Every change
 * that would otherwise be a code change means a pull, a restart and a wait —
 * and during an abuse spike you want a form submission, not a release.
 *
 * Each key is saved on its own, because each has its own bounds on the server
 * and a rejected value should not discard the others.
 */

/** The groups an operator actually thinks in, rather than alphabetical order. */
const GROUPS = [
  {
    title: 'The model',
    hint: 'Switching the driver to "fake" stops all spending immediately and keeps the feature working with a stub.',
    keys: ['ai_driver', 'ai_model', 'ai_timeout', 'usd_inr'],
  },
  {
    title: 'Cost control',
    hint: 'The ceiling is the circuit breaker. Past it, new questions are declined and cached plans keep being served.',
    keys: ['daily_spend_ceiling', 'cache_enabled', 'cache_ttl_hours', 'candidate_limit'],
  },
  {
    title: 'What a traveller gets free',
    hint: 'Changing the signup grant affects accounts that have not claimed theirs yet; it does not take credits back.',
    keys: ['free_plans_on_signup', 'free_plans_referral', 'rate_limit_per_hour', 'rate_limit_per_day'],
  },
  {
    title: 'Shape of a trip',
    hint: 'The app reads these from the server, so a change reaches phones on their next visit to the plan form — no release needed.',
    keys: [
      'max_days',
      'max_towns',
      'default_radius_km',
      'min_cart_places',
      'min_stops_per_day',
      'max_stops_per_day',
      'interest_parent_codes',
    ],
  },
];

const Row = ({ row, onSave, saving }) => {
  const [value, setValue] = useState(row.value ?? '');
  const dirty = String(value) !== String(row.value ?? '');

  // The server is the source of truth; a successful save or a reload replaces
  // whatever was typed here.
  useEffect(() => setValue(row.value ?? ''), [row.value]);

  return (
    <CRow className="align-items-center py-3 border-bottom g-2">
      <CCol md={4}>
        <code className="fw-semibold">{row.key}</code>
        <div className="text-body-secondary small">{row.description || '—'}</div>
      </CCol>
      <CCol md={5}>
        <CFormInput
          size="sm"
          value={value}
          disabled={!row.editable}
          onChange={(e) => setValue(e.target.value)}
        />
      </CCol>
      <CCol md={3} className="text-md-end">
        {row.editable ? (
          <CButton
            size="sm"
            color="primary"
            variant={dirty ? undefined : 'outline'}
            disabled={!dirty || saving}
            onClick={() => onSave(row.key, value)}
          >
            {saving ? <CSpinner size="sm" /> : 'Save'}
          </CButton>
        ) : (
          <CBadge color="secondary">read only</CBadge>
        )}
      </CCol>
    </CRow>
  );
};

Row.propTypes = {
  row: PropTypes.shape({
    key: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    description: PropTypes.string,
    editable: PropTypes.bool,
  }).isRequired,
  onSave: PropTypes.func.isRequired,
  saving: PropTypes.bool,
};

const AiSettings = () => {
  const [rows, setRows] = useState([]);
  const [spend, setSpend] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState(null);
  const [alert, setAlert] = useState(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService('POST', 'ai/config');
      if (!res.success) {
        setAlert({ type: 'danger', message: parseApiMessage(res.message) });
        return;
      }
      setRows(res.data.config || []);
      setSpend(res.data.spend || null);
    } catch (err) {
      setAlert({ type: 'danger', message: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const save = async (key, value) => {
    setSavingKey(key);
    try {
      const res = await apiService('POST', 'ai/updateConfig', { key, value });
      if (!res.success) {
        setAlert({ type: 'danger', message: parseApiMessage(res.message) });
        return;
      }
      setAlert({ type: 'success', message: `${key} is now ${res.data.value}. It is live already.` });
      setRows((prev) => prev.map((r) => (r.key === key ? { ...r, value: res.data.value } : r)));
    } catch (err) {
      setAlert({ type: 'danger', message: err.message });
    } finally {
      setSavingKey(null);
    }
  };

  const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
  const grouped = new Set(GROUPS.flatMap((g) => g.keys));
  const ungrouped = rows.filter((r) => !grouped.has(r.key));

  return (
    <>
      <AlertModal alert={alert} onClose={() => setAlert(null)} />

      <div className="mb-3">
        <h4 className="mb-0">AI settings</h4>
        <div className="text-body-secondary small">
          Saved values take effect on the next request. No deploy, no restart.
        </div>
      </div>

      {spend && !spend.can_spend ? (
        <CAlert color="warning">
          Today&apos;s spend has reached the ceiling (₹{Number(spend.today).toFixed(2)} of ₹
          {Number(spend.ceiling).toFixed(2)}). New questions are being declined; cached plans are
          still served. Raise <code>daily_spend_ceiling</code> below to resume.
        </CAlert>
      ) : null}

      {loading ? (
        <div className="text-center py-5">
          <CSpinner color="primary" />
        </div>
      ) : (
        <>
          {GROUPS.map((group) => (
            <CCard className="mb-4" key={group.title}>
              <CCardHeader>
                {group.title}
                <div className="text-body-secondary small fw-normal">{group.hint}</div>
              </CCardHeader>
              <CCardBody className="pt-0">
                {group.keys
                  .filter((k) => byKey[k])
                  .map((k) => (
                    <Row
                      key={k}
                      row={byKey[k]}
                      saving={savingKey === k}
                      onSave={save}
                    />
                  ))}
              </CCardBody>
            </CCard>
          ))}

          {ungrouped.length > 0 ? (
            <CCard className="mb-4">
              <CCardHeader>
                Other
                <div className="text-body-secondary small fw-normal">
                  Rows this screen has no rule for. Changing one safely needs bounds, and guessing
                  them here is how a model id becomes unusable — so they are shown, not edited.
                </div>
              </CCardHeader>
              <CCardBody className="pt-0">
                {ungrouped.map((r) => (
                  <Row key={r.key} row={r} saving={false} onSave={save} />
                ))}
              </CCardBody>
            </CCard>
          ) : null}
        </>
      )}
    </>
  );
};

export default AiSettings;
