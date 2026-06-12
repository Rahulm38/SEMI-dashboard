import React from 'react';
import { formatCurrency } from '../utils/dataProcessor';

const SummaryCards = ({ metrics }) => {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 className="card-title" style={{ marginBottom: '0.2rem' }}>Overview</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>Date Range: {metrics.dateRange}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <span className="user-badge">
            📊 {metrics.totalBookings} bookings
          </span>
          <span className="user-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.4)', color: 'var(--secondary)' }}>
            👤 {metrics.uniqueUsers} unique users
          </span>
          {metrics.repeatConverters > 0 && (
            <span className="user-badge" style={{ background: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.4)', color: 'var(--accent-purple)' }}>
              🔄 {metrics.repeatConverters} repeat converters
            </span>
          )}
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
        
        {/* Section 1: Core Conversion Value */}
        <div style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            Conversion Value
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            {metrics.conversionInsight}
          </p>
          <div className="metric-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="metric-item">
              <span className="metric-label">Converted Amount</span>
              <span className="metric-value" style={{ color: 'var(--primary-light)' }}>
                {formatCurrency(metrics.totalConverted)}
              </span>
            </div>
            
            <div className="metric-item">
              <span className="metric-label">Total Payable</span>
              <span className="metric-value">
                {formatCurrency(metrics.totalPayable)}
              </span>
            </div>
            
            <div className="metric-item">
              <span className="metric-label">Total Interest</span>
              <span className="metric-value" style={{ color: 'var(--accent-orange)' }}>
                {formatCurrency(metrics.totalInterest)}
              </span>
            </div>
            
            <div className="metric-item">
              <span className="metric-label">Processing Fee</span>
              <span className="metric-value" style={{ color: 'var(--accent-purple)' }}>
                {formatCurrency(metrics.totalProcessingFee)}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: User Averages */}
        <div style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            User Averages & Medians
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            {metrics.averagesInsight}
          </p>
          <div className="metric-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="metric-item">
              <span className="metric-label">Avg Ticket</span>
              <span className="metric-value">
                {formatCurrency(metrics.avgTicket)}
              </span>
            </div>

            <div className="metric-item">
              <span className="metric-label">Median Ticket</span>
              <span className="metric-value" style={{ color: 'var(--text-tertiary)' }}>
                {formatCurrency(metrics.medianTicket)}
              </span>
            </div>
            
            <div className="metric-item">
              <span className="metric-label">Avg EMI</span>
              <span className="metric-value" style={{ color: 'var(--secondary)' }}>
                {formatCurrency(metrics.avgEmi)}/mo
              </span>
            </div>

            <div className="metric-item">
              <span className="metric-label">Median EMI</span>
              <span className="metric-value" style={{ color: 'var(--text-tertiary)' }}>
                {formatCurrency(metrics.medianEmi)}/mo
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Unit Economics (NEW) */}
        <div style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            Unit Economics
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Revenue earned per booking from interest + fees.
          </p>
          <div className="metric-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="metric-item">
              <span className="metric-label">Gross Revenue</span>
              <span className="metric-value" style={{ color: 'var(--secondary)' }}>
                {formatCurrency(metrics.grossRevenue)}
              </span>
            </div>
            
            <div className="metric-item">
              <span className="metric-label">Revenue / Booking</span>
              <span className="metric-value">
                {formatCurrency(metrics.revenuePerUser)}
              </span>
            </div>

            <div className="metric-item">
              <span className="metric-label">Effective Cost %</span>
              <span className="metric-value" style={{ color: 'var(--accent-orange)' }}>
                {metrics.effectiveCostPct.toFixed(1)}%
              </span>
            </div>

            <div className="metric-item">
              <span className="metric-label">Referral Users</span>
              <span className="metric-value" style={{ color: 'var(--text-tertiary)' }}>
                {metrics.referralCount}/{metrics.totalBookings}
              </span>
            </div>
          </div>
        </div>

      </div>
    </>
  );
};

export default SummaryCards;
