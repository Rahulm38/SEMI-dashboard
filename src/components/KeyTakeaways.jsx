import { formatCurrency } from '../utils/dataProcessor';

const KeyTakeaways = ({ takeaways }) => {
  if (!takeaways) return null;

  const { valueConcentration, affordability, roiTolerance, bestSegment } = takeaways;

  return (
    <div className="pdf-page-section">
      <div className="dashboard-grid">
        <div className="col-span-12 glass-card animate-fade-in delay-3 flex-col" style={{ padding: '2rem' }}>
          
          <div className="card-header">
            <h2 className="card-title" style={{ fontSize: '1.25rem' }}>What this means</h2>
            <p className="card-subtitle">Strategic takeaways from the entire portfolio</p>
          </div>

          <div className="takeaway-grid">
            
            {/* Value Concentration */}
            <div className="takeaway-card" style={{ 
              backgroundColor: 'var(--emerald-bg)', 
              borderLeft: '3px solid var(--emerald)'
            }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Value concentration</h4>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--emerald)', fontFamily: 'var(--font-heading)', marginBottom: '0.5rem' }}>
                {valueConcentration.users} users = {valueConcentration.percentage}%
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                {valueConcentration.text}
              </p>
            </div>

            {/* Affordability is the hook */}
            <div className="takeaway-card" style={{ 
              backgroundColor: 'var(--primary-glow)', 
              borderLeft: '3px solid var(--primary)'
            }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Affordability is the hook</h4>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)', fontFamily: 'var(--font-heading)', marginBottom: '0.5rem' }}>
                {affordability.usersUnderThreshold}/{affordability.totalUsers} under {affordability.thresholdFormatted} EMI
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                {affordability.text}
              </p>
            </div>

            {/* ROI tolerance is real */}
            <div className="takeaway-card" style={{ 
              backgroundColor: 'var(--rose-bg)', 
              borderLeft: '3px solid var(--rose)'
            }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>ROI tolerance is real</h4>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--rose)', fontFamily: 'var(--font-heading)', marginBottom: '0.5rem' }}>
                {roiTolerance.usersAt18}/{roiTolerance.totalUsers} at ROI 18%+
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                {roiTolerance.text}
              </p>
            </div>

            {bestSegment && (
              <div className="takeaway-card" style={{ 
                backgroundColor: 'var(--amber-bg)', 
                borderLeft: '3px solid var(--amber)'
              }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Current best operating segment</h4>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--amber)', fontFamily: 'var(--font-heading)', marginBottom: '0.5rem' }}>
                  {bestSegment.bookings} bookings = {formatCurrency(bestSegment.amount)}
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  Ticket <strong style={{ color: 'var(--text-primary)' }}>₹25K–₹1L</strong> · EMI under <strong style={{ color: 'var(--text-primary)' }}>₹7K/month</strong> · tenure up to <strong style={{ color: 'var(--text-primary)' }}>24M</strong>. This is where conversion, ticket size and affordability line up best. That segment is <strong style={{ color: 'var(--text-primary)' }}>{bestSegment.percentage}%</strong> of converted value.
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyTakeaways;
