import { formatCurrency } from '../utils/dataProcessor';

const SummaryCards = ({ metrics }) => {
  return (
    <div className="overview-summary">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        
        <div className="metric-item overview-kpi-tile" style={{ boxShadow: 'inset 0 -2px 0 var(--primary)' }}>
          <span className="metric-label">Bookings</span>
          <span className="metric-value">{metrics.totalBookings}</span>
          <span className="metric-sub">Total volume</span>
        </div>
        
        <div className="metric-item overview-kpi-tile" style={{ boxShadow: 'inset 0 -2px 0 var(--emerald)' }}>
          <span className="metric-label">Unique Users</span>
          <span className="metric-value">{metrics.uniqueUsers}</span>
          <span className="metric-sub">Customer reach</span>
        </div>

        <div className="metric-item overview-kpi-tile" style={{ boxShadow: 'inset 0 -2px 0 var(--primary-light)' }}>
          <span className="metric-label">Converted Amount</span>
          <span className="metric-value" style={{ color: 'var(--primary-light)' }}>
            {formatCurrency(metrics.totalConverted)}
          </span>
          <span className="metric-sub">Total loan book</span>
        </div>

        <div className="metric-item overview-kpi-tile" style={{ boxShadow: 'inset 0 -2px 0 var(--amber)' }}>
          <span className="metric-label">Total Revenue</span>
          <span className="metric-value" style={{ color: 'var(--emerald)' }}>
            {formatCurrency(metrics.totalRevenue)}
          </span>
          <span className="metric-sub">
            Interest {formatCurrency(metrics.totalInterest)} + Fees {formatCurrency(metrics.totalProcessingFee)}
          </span>
        </div>

      </div>
    </div>
  );
};

export default SummaryCards;
