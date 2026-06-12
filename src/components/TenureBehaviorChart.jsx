import React from 'react';
import { formatCurrency } from '../utils/dataProcessor';

const TENURE_COLORS = {
  '6M': '#3b82f6',
  '12M': '#10b981',
  '24M': '#f97316',
  '36M': '#8b5cf6',
  '48M': '#94a3b8',
};

const TenureBehaviorChart = ({ data, tenureByTicket, insight }) => {
  return (
    <div style={{ width: '100%' }}>
      <h2 className="card-title">Tenure Behavior</h2>
      <p className="card-subtitle">6M and 12M dominate count; longer tenures carry larger tickets.</p>

      {/* Stacked Horizontal Bars by Ticket Size */}
      {tenureByTicket && tenureByTicket.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          {tenureByTicket.map((row) => (
            <div className="tenure-stacked-row" key={row.name}>
              <span className="tenure-label">{row.name}</span>
              <div className="tenure-bar-container">
                {['6M', '12M', '24M', '36M', '48M'].map((tenure) => {
                  const count = row[tenure] || 0;
                  if (count === 0) return null;
                  const widthPct = (count / Math.max(...tenureByTicket.map(r => r.total), 1)) * 100;
                  return (
                    <div
                      key={tenure}
                      className="tenure-bar-segment"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: TENURE_COLORS[tenure],
                      }}
                      title={`${tenure}: ${count} users`}
                    >
                      {count > 0 ? count : ''}
                    </div>
                  );
                })}
              </div>
              <span className="tenure-total">{row.total}</span>
            </div>
          ))}

          {/* Legend */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            {Object.entries(TENURE_COLORS).map(([label, color]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: color }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fallback summary list */}
      {(!tenureByTicket || tenureByTicket.length === 0) && data && (
        <div style={{ marginTop: '1rem' }}>
          {data.map((item) => (
            <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontWeight: 600 }}>{item.name}</span>
              <span style={{ color: 'var(--text-tertiary)' }}>{item.users} users · {formatCurrency(item.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {insight && (
        <div className="insight-box">
          <span className="insight-icon">✨</span>
          <span className="insight-text" dangerouslySetInnerHTML={{ __html: insight }}></span>
        </div>
      )}
    </div>
  );
};

export default TenureBehaviorChart;
