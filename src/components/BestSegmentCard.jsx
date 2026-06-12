import React from 'react';

const BestSegmentCard = ({ insight }) => {
  if (!insight) return null;

  // Parse the insight to extract segments
  const segments = [];
  if (insight.ticketRange) segments.push(`Ticket: ${insight.ticketRange}`);
  if (insight.emiRange) segments.push(`EMI: ${insight.emiRange}`);
  if (insight.tenures) segments.push(`Tenure: ${insight.tenures}`);
  if (insight.users) segments.push(`${insight.users} users`);
  if (insight.amountShare) segments.push(`${insight.amountShare}% of total value`);

  return (
    <div className="best-segment-card">
      <h3>🎯 Best Operating Segment</h3>
      <div className="segment-tags">
        {segments.map((seg, i) => (
          <span className="segment-tag" key={i}>{seg}</span>
        ))}
      </div>
      {insight.description && (
        <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
          {insight.description}
        </p>
      )}
    </div>
  );
};

export default BestSegmentCard;
