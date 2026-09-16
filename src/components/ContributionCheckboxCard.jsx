import React from 'react';
import { CheckCircle2, Circle, Info, TrendingUp } from 'lucide-react';
import { formatNaira } from '../utils/formatters';

// ─── "Contribution checklist" card ───────────────────────────────────────────
// A per-user account card where every box is one contribution unit the user
// agreed to pay (one day, week, month... — whatever their accepted plan is).
// A box is ticked once enough of the user's money has been verified to cover
// that unit, so the user can see at a glance where their account stands against
// the amount they committed to.
//
// The maths is deliberately computed from the AMOUNT PAID, not from a count of
// records: an admin can verify a single transfer of ₦2,000 against a ₦500/week
// plan, which must tick four boxes rather than one.
//
// Two shapes of account feed this component:
//   - Thrift members  → contributions per cycle (MemberDashboard)
//   - Loan borrowers  → repayment installments (MyLoans)
// Both are normalised into the same `units` array, so the card looks and
// behaves identically for every kind of user.

/**
 * Builds units from a plain "how much did they pay toward a plan" total.
 * ticked = how many whole units the verified total covers; the leftover is
 * reported as a partial amount instead of being shown as a 5th box, which
 * would wrongly imply the unit was completed.
 *
 * A unit amount can be far smaller than the amount paid (e.g. ₦500/week against
 * a large lump sum), which would otherwise produce thousands of boxes. Only the
 * first MAX_BOXES are materialised; the true counts are still reported so the
 * header stays accurate and the UI says how many boxes are not drawn.
 */
export const MAX_BOXES = 60;

export const buildUnitsFromTotal = ({ totalPaid, perUnitAmount, targetUnits, perUnitLabel }) => {
  const unit = Number(perUnitAmount) || 0;
  const paid = Number(totalPaid) || 0;

  const ticked = unit > 0 ? Math.floor(paid / unit) : 0;
  const remainder = unit > 0 ? paid - (ticked * unit) : 0;
  const total = Math.max(Number(targetUnits) || 0, ticked, 1);

  const rendered = Math.min(total, MAX_BOXES);
  const units = Array.from({ length: rendered }, (_, i) => {
    const n = i + 1;
    return {
      key: n,
      label: `${perUnitLabel} ${n}`,
      amount: unit,
      paid: n <= ticked ? unit : 0,
      ticked: n <= ticked
    };
  });

  return {
    units,
    ticked,
    total,
    remainder,
    unit,
    paid,
    target: unit * total,
    // How many units exist beyond the ones drawn, so the UI can say so.
    hiddenCount: Math.max(0, total - rendered),
    hiddenTicked: Math.max(0, ticked - rendered)
  };
};

/** Builds units from an explicit list (e.g. a loan repayment schedule). */
export const buildUnitsFromList = (rows, { labelPrefix = 'Installment', onAmount, onPaid, onLabel } = {}) => {
  const all = (rows || []).map((row, i) => {
    const amount = Number(onAmount ? onAmount(row) : row.amount) || 0;
    const paid = Number(onPaid ? onPaid(row) : row.paid) || 0;
    const ticked = amount > 0 ? paid >= amount : paid > 0;
    return {
      key: row.id ?? row.key ?? i + 1,
      label: onLabel ? onLabel(row, i) : `${labelPrefix} ${i + 1}`,
      amount,
      paid,
      ticked,
      percent: amount > 0 ? Math.min(100, Math.round((paid / amount) * 100)) : (paid > 0 ? 100 : 0),
      status: row.status
    };
  });

  const units = all.slice(0, MAX_BOXES);
  const ticked = all.filter((u) => u.ticked).length;
  const paid = all.reduce((sum, u) => sum + (u.paid || 0), 0);
  const target = all.reduce((sum, u) => sum + (u.amount || 0), 0);

  return {
    units,
    ticked,
    total: all.length,
    paid,
    target,
    remainder: Math.max(0, target - paid),
    hiddenCount: Math.max(0, all.length - units.length),
    hiddenTicked: Math.max(0, ticked - units.length)
  };
};

export default function ContributionCheckboxCard({
  title = 'My Contribution Checklist',
  subtitle,
  units = [],
  perUnitLabel = 'Unit',
  perUnitAmount = 0,
  ticked = 0,
  total = 0,
  paid = 0,
  target = 0,
  remainder = 0,
  hiddenCount = 0,
  frequencyLabel,
  emptyMessage = 'No contribution plan has been set for your account yet.',
  footnote
}) {
  const hasUnits = units.length > 0;
  const percent = total > 0 ? Math.round((ticked / total) * 100) : 0;
  const goal = target || (perUnitAmount * total);

  return (
    <div className="glass-card checklist-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" /> {title}
          </h3>
          {subtitle && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{subtitle}</p>
          )}
        </div>
        {hasUnits && (
          <span className="badge badge-success">
            {ticked} of {total} {String(perUnitLabel).toLowerCase()}{total === 1 ? '' : 's'} ticked
          </span>
        )}
      </div>

      {!hasUnits ? (
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>{emptyMessage}</p>
      ) : (
        <>
          {/* Summary strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            <div className="checklist-stat">
              <div className="checklist-stat-label">My Plan</div>
              <div className="checklist-stat-value">
                {formatNaira(perUnitAmount)}
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {' '}per {String(perUnitLabel).toLowerCase()}
                </span>
              </div>
              {frequencyLabel && (
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{frequencyLabel}</div>
              )}
            </div>

            <div className="checklist-stat">
              <div className="checklist-stat-label">Verified Paid</div>
              <div className="checklist-stat-value" style={{ color: 'var(--primary-light)' }}>
                {formatNaira(paid)}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {formatNaira(ticked * (Number(perUnitAmount) || 0))} ticked into units
              </div>
            </div>

            <div className="checklist-stat">
              <div className="checklist-stat-label">Commitment {goal > 0 ? '(total)' : ''}</div>
              <div className="checklist-stat-value">
                {goal > 0 ? formatNaira(goal) : `${total} ${String(perUnitLabel).toLowerCase()}s`}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <TrendingUp className="w-3.5 h-3.5" /> {percent}% complete
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="checklist-bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div className="checklist-bar-fill" style={{ width: `${percent}%` }} />
          </div>

          {/* The actual check boxes */}
          <div className="checklist-grid">
            {units.map((u) => (
              <div
                key={u.key}
                className={`checklist-box${u.ticked ? ' checked' : ''}`}
                title={`${u.label} — ${formatNaira(u.amount)}${u.ticked ? ' (paid)' : ''}`}
              >
                <span className="checklist-box-mark" aria-hidden="true">
                  {u.ticked
                    ? <CheckCircle2 className="w-4 h-4" />
                    : <Circle className="w-4 h-4" />}
                </span>
                <span className="checklist-box-text">
                  <span className="checklist-box-label">{u.label}</span>
                  <span className="checklist-box-amount">{formatNaira(u.amount)}</span>
                </span>
              </div>
            ))}
          </div>

          {/* Partial payment + legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.9rem' }}>
            <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap' }}>
              <span className="checklist-legend">
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--primary-light)' }} /> Paid &amp; verified
              </span>
              <span className="checklist-legend">
                <Circle className="w-3.5 h-3.5" style={{ color: 'var(--text-dim)' }} /> Outstanding
              </span>
            </div>
            {remainder > 0 && (
              <span style={{ fontSize: '0.76rem', color: 'var(--accent-gold)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <Info className="w-3.5 h-3.5" />
                {formatNaira(remainder)} received beyond the last ticked {String(perUnitLabel).toLowerCase()}
              </span>
            )}
          </div>

          {/* A very small unit amount against a large total would mean hundreds
              of boxes; say so rather than silently drawing only the first few. */}
          {hiddenCount > 0 && (
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.6rem', display: 'flex', alignItems: 'flex-start', gap: '0.3rem', lineHeight: 1.5 }}>
              <Info className="w-3.5 h-3.5" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
              Showing the first {units.length} of {total} boxes. The totals above cover every{' '}
              {String(perUnitLabel).toLowerCase()}, including the {hiddenCount} not drawn here.
            </p>
          )}

          {footnote && (
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.75rem', lineHeight: 1.5 }}>
              {footnote}
            </p>
          )}
        </>
      )}
    </div>
  );
}
