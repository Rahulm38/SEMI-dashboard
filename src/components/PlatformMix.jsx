import { Smartphone } from 'lucide-react';
import { formatCurrency } from '../utils/dataProcessor';

const PLATFORM_COLORS = {
  Android: 'var(--emerald)',
  iOS: 'var(--primary-light)',
  Unknown: 'var(--text-tertiary)'
};

const PlatformMix = ({ data = [], insight }) => {
  const platformData = data.filter(item => item.amount > 0);
  if (!platformData.length) return null;

  const totalAmount = platformData.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
        <Smartphone size={18} color="var(--primary-light)" />
        <h2 className="card-title" style={{ marginBottom: 0 }}>Platform Mix</h2>
      </div>
      <p className="card-subtitle">Android vs iOS contribution to bookings and converted value.</p>

      <div style={{ display: 'flex', overflow: 'hidden', height: '10px', borderRadius: 'var(--radius-full)', background: 'var(--bg-surface-alt)', marginBottom: '1rem' }}>
        {platformData.map(platform => {
          const widthPct = totalAmount > 0 ? (platform.amount / totalAmount) * 100 : 0;
          return (
            <div
              key={platform.name}
              title={`${platform.name}: ${widthPct.toFixed(1)}% value share`}
              style={{ width: `${widthPct}%`, background: PLATFORM_COLORS[platform.name] || PLATFORM_COLORS.Unknown }}
            />
          );
        })}
      </div>

      <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        {platformData.map(platform => (
          <div key={platform.name} className="metric-item">
            <span className="metric-label">{platform.name}</span>
            <span className="metric-value" style={{ color: PLATFORM_COLORS[platform.name] || PLATFORM_COLORS.Unknown }}>
              {platform.bookingShare.toFixed(1)}%
            </span>
            <span className="metric-sub">{platform.bookings} bookings · {platform.users} users</span>
            <span className="metric-sub">Value {formatCurrency(platform.amount)} · Avg {formatCurrency(platform.avgTicket)}</span>
          </div>
        ))}
      </div>

      {insight && (
        <div className="insight-callout">
          <span className="insight-callout-icon">📱</span>
          <span className="insight-callout-text">{insight}</span>
        </div>
      )}
    </div>
  );
};

export default PlatformMix;
