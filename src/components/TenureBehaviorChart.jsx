import { formatCurrency } from '../utils/dataProcessor';
import DOMPurify from 'dompurify';

const TENURE_COLORS = {
  '6M': 'var(--accent-purple)',
  '12M': 'var(--emerald)',
  '24M': 'var(--accent-orange)',
  '36M': 'var(--accent-teal)',
  '48M': 'var(--primary)',
};

const TenureBehaviorChart = ({ data, tenureByTicket, insight }) => {
  return (
    <div className="w-full h-full flex-col">
      <h2 className="card-title">Tenure Behavior</h2>
      <p className="card-subtitle">6M and 12M dominate count; longer tenures carry larger tickets.</p>

      {/* Stacked Horizontal Bars by Ticket Size */}
      {tenureByTicket && tenureByTicket.length > 0 && (
        <div className="chart-container">
          <div style={{ display: 'flex' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px' }}>
              <div style={{ transform: 'rotate(-90deg)', whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 500 }}>
                Ticket Size (₹)
              </div>
            </div>
            <div style={{ flex: 1 }}>
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
                            opacity: 0.85,
                            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)'
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
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '12px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 500, paddingLeft: '80px' }}>
            Number of Bookings
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '1.25rem', marginTop: '2.5rem', flexWrap: 'wrap' }}>
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
        <div className="insight-callout">
          <span className="insight-callout-icon">✨</span>
          <span className="insight-callout-text" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(insight) }}></span>
        </div>
      )}
    </div>
  );
};

export default TenureBehaviorChart;
