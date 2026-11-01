import React, { useState } from 'react';
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react';
import apiService from 'src/services/apiService';
import AlertModal from 'src/components/AlertModal';
import { parseApiMessage } from 'src/utils/apiMessages';

/**
 * AI Trip Planner — quota and credits.
 *
 * Answers: a real user ran out and emailed me.
 *
 * Search is exact, not partial, and that is not an oversight: name, email and
 * mobile are encrypted at rest and reachable only through an HMAC blind index.
 * A LIKE over ciphertext would match nothing while looking like a search that
 * worked, so half an email is refused rather than silently answered "no one".
 */

/** The ledger's own vocabulary, in words. */
const SOURCE_LABELS = {
  'grant:signup': 'Free plans on signing up',
  'grant:referral': 'Referral reward',
};

const describeSource = (source) => {
  if (SOURCE_LABELS[source]) return SOURCE_LABELS[source];
  if (source?.startsWith('grant:admin:')) return `Granted by an admin — ${source.slice(12)}`;
  if (source?.startsWith('spend:trip:')) return `Spent on trip #${source.slice(11)}`;
  if (source?.startsWith('refund:trip:')) return `Returned — trip #${source.slice(12)} failed`;
  return source;
};

const AiCredits = () => {
  const [term, setTerm] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [granting, setGranting] = useState(false);
  const [grant, setGrant] = useState({ credits: 3, reason: '' });
  const [alert, setAlert] = useState(null);

  const lookup = async (body) => {
    setLoading(true);
    try {
      const res = await apiService('POST', 'ai/userCredits', body);
      if (!res.success) {
        setAlert({ type: 'danger', message: parseApiMessage(res.message) });
        setData(null);
        return;
      }
      setData(res.data);
    } catch (err) {
      setAlert({ type: 'danger', message: err.message });
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const search = (e) => {
    e.preventDefault();
    const value = term.trim();
    if (!value) return;
    // A bare number is an id; anything else is an identity to match exactly.
    lookup(/^\d+$/.test(value) ? { user_id: Number(value) } : { search: value });
  };

  const give = async (e) => {
    e.preventDefault();
    if (!data?.user?.id || !grant.reason.trim()) return;

    setGranting(true);
    try {
      const res = await apiService('POST', 'ai/grantCredits', {
        user_id: data.user.id,
        credits: Number(grant.credits),
        reason: grant.reason.trim(),
      });
      if (!res.success) {
        setAlert({ type: 'danger', message: parseApiMessage(res.message) });
        return;
      }
      setAlert({
        type: 'success',
        message: `${grant.credits} plan(s) added. Balance is now ${res.data.balance}.`,
      });
      setGrant({ credits: 3, reason: '' });
      lookup({ user_id: data.user.id });
    } catch (err) {
      setAlert({ type: 'danger', message: err.message });
    } finally {
      setGranting(false);
    }
  };

  return (
    <>
      <AlertModal alert={alert} onClose={() => setAlert(null)} />

      <CCard className="mb-4">
        <CCardHeader>
          Trip credits
          <div className="text-body-secondary small fw-normal">
            Find an account by its id, or by the exact email, mobile or name on it
          </div>
        </CCardHeader>
        <CCardBody>
          <CForm onSubmit={search}>
            <CRow className="g-2">
              <CCol md={9}>
                <CFormInput
                  placeholder="someone@example.com, 9876543210, or a user id"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                />
              </CCol>
              <CCol md={3}>
                <CButton type="submit" color="primary" className="w-100" disabled={loading}>
                  {loading ? <CSpinner size="sm" /> : 'Find'}
                </CButton>
              </CCol>
            </CRow>
          </CForm>
          <div className="text-body-secondary small mt-2">
            Email, mobile and name are encrypted, so they have to match in full. Part of an address
            will find nothing.
          </div>
        </CCardBody>
      </CCard>

      {data ? (
        <>
          <CRow>
            <CCol lg={7}>
              <CCard className="mb-4">
                <CCardBody>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <div className="fs-5 fw-semibold">{data.user.name || '—'}</div>
                      <div className="text-body-secondary small">
                        #{data.user.id} · {data.user.email || 'no email'} ·{' '}
                        {data.user.mobile || 'no mobile'}
                      </div>
                      <div className="mt-2">
                        {data.user.verified ? (
                          <CBadge color="success">Email verified</CBadge>
                        ) : (
                          <CBadge color="warning">Not verified — cannot generate</CBadge>
                        )}
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="text-body-secondary small text-uppercase fw-semibold">
                        Plans left
                      </div>
                      <div className="fs-2 fw-semibold">{data.balance}</div>
                      <div className="text-body-secondary small">
                        {data.generations} generated so far
                      </div>
                    </div>
                  </div>
                </CCardBody>
              </CCard>
            </CCol>

            <CCol lg={5}>
              <CCard className="mb-4">
                <CCardHeader>Give more plans</CCardHeader>
                <CCardBody>
                  <CForm onSubmit={give}>
                    <CRow className="g-2 align-items-end">
                      <CCol xs={4}>
                        <CFormInput
                          type="number"
                          min={1}
                          max={100}
                          label="How many"
                          value={grant.credits}
                          onChange={(e) => setGrant({ ...grant, credits: e.target.value })}
                        />
                      </CCol>
                      <CCol xs={8}>
                        <CFormInput
                          label="Why"
                          placeholder="support ticket 412"
                          maxLength={60}
                          value={grant.reason}
                          onChange={(e) => setGrant({ ...grant, reason: e.target.value })}
                        />
                      </CCol>
                    </CRow>
                    <CButton
                      type="submit"
                      color="primary"
                      className="mt-3 w-100"
                      disabled={granting || !grant.reason.trim()}
                    >
                      {granting ? <CSpinner size="sm" /> : 'Add to this account'}
                    </CButton>
                  </CForm>
                  <div className="text-body-secondary small mt-2">
                    The reason is written into the ledger beside the amount, so a goodwill grant is
                    as auditable as a signup one.
                  </div>
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>

          <CCard className="mb-4">
            <CCardHeader>
              Ledger
              <div className="text-body-secondary small fw-normal">
                Every row that has ever moved this balance, newest first
              </div>
            </CCardHeader>
            <CCardBody className="p-0">
              {data.ledger.length === 0 ? (
                <div className="p-4 text-body-secondary">
                  Nothing yet — this account has not been granted its free plans.
                </div>
              ) : (
                <CTable hover responsive align="middle" className="mb-0">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>When</CTableHeaderCell>
                      <CTableHeaderCell>What happened</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Change</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {data.ledger.map((row) => (
                      <CTableRow key={row.id}>
                        <CTableDataCell className="small">
                          {new Date(row.created_at).toLocaleString()}
                        </CTableDataCell>
                        <CTableDataCell>
                          {describeSource(row.source)}
                          <div className="text-body-secondary small">
                            <code>{row.source}</code>
                          </div>
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          <span
                            className={`fw-semibold ${row.amount > 0 ? 'text-success' : 'text-body'}`}
                          >
                            {row.amount > 0 ? `+${row.amount}` : row.amount}
                          </span>
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              )}
            </CCardBody>
          </CCard>
        </>
      ) : null}
    </>
  );
};

export default AiCredits;
