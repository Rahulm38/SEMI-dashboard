const METRICS = [
  { key: 'count', label: 'Bookings' },
  { key: 'amount', label: 'Value' },
  { key: 'avgTicket', label: 'Avg ticket' },
  { key: 'income', label: 'Income' }
];

const MatrixFilter = ({ metric, setMetric }) => {
  return (
    <div 
      className="heatmap-toggle" 
      aria-label="Heatmap metric" 
      style={{ 
        display: 'flex', 
        background: 'var(--bg-surface-alt)', 
        borderRadius: '8px', 
        overflow: 'hidden', 
        border: '1px solid var(--border-subtle)',
        flexWrap: 'wrap' // Ensures buttons don't overflow on extremely small screens
      }}
    >
      {METRICS.map(item => (
        <button
          key={item.key}
          type="button"
          className={`heatmap-toggle-btn ${metric === item.key ? 'active' : ''}`}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '12px',
            fontWeight: metric === item.key ? 600 : 500,
            background: metric === item.key ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
            color: metric === item.key ? 'var(--primary)' : 'var(--text-secondary)',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            flex: '1 1 auto', // Make buttons responsive and fill space if wrapping
            minWidth: '80px',
          }}
          onClick={() => setMetric(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};

export default MatrixFilter;
