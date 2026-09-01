import { formatCurrency } from '../utils/dataProcessor';

const UserAveragesCard = ({ metrics }) => {
  return (
    <div className="user-averages-strip">
      {[
        { label: 'Avg Ticket', value: formatCurrency(metrics.avgTicket) },
        { label: 'Median Ticket', value: formatCurrency(metrics.medianTicket) },
        { label: 'Avg EMI', value: `${formatCurrency(metrics.avgEmi)}/mo`, accent: true },
        { label: 'Median EMI', value: `${formatCurrency(metrics.medianEmi)}/mo`, accent: true },
      ].map(({ label, value, accent }) => (
        <div key={label} className="user-avg-item">
          <span className="metric-label">{label}</span>
          <span className="metric-value user-avg-value" style={accent ? { color: 'var(--primary-light)' } : {}}>
            {value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default UserAveragesCard;
