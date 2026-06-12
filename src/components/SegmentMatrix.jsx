import React from 'react';
import { formatCurrency } from '../utils/dataProcessor';

const TICKET_BUCKETS = ['<7.5K', '7.5K-10K', '10K-25K', '25K-50K', '50K-1L', '1L+'];
const EMI_BUCKETS = ['<1K', '1K-2.5K', '2.5K-5K', '5K-7K', '7K-10K', '10K+'];

const SegmentMatrix = ({ matrix }) => {
  // Find max value to color scale
  let maxCount = 0;
  Object.values(matrix).forEach(row => {
    Object.values(row).forEach(cell => {
      if (cell.count > maxCount) maxCount = cell.count;
    });
  });

  const getCellClass = (count) => {
    if (!count) return 'matrix-cell intensity-0';
    if (count === maxCount) return 'matrix-cell intensity-5';
    
    // Scale count from 1 to 4 based on maxCount
    const ratio = count / maxCount;
    if (ratio > 0.8) return 'matrix-cell intensity-4';
    if (ratio > 0.5) return 'matrix-cell intensity-3';
    if (ratio > 0.2) return 'matrix-cell intensity-2';
    return 'matrix-cell intensity-1';
  };

  return (
    <div>
      <h2 className="card-title">Ticket x EMI Segment Matrix</h2>
      <p className="card-subtitle">Darker cells indicate higher user concentration. Best segment: 25K-1L, under 7K EMI.</p>
      
      <div className="matrix-container" style={{ marginTop: '1.5rem', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--text-tertiary)', fontSize: '0.9rem', fontWeight: 600 }}>
          Ticket Size ➔
        </div>
        <div style={{ display: 'flex' }}>
          <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', textAlign: 'center', marginRight: '1rem', color: 'var(--text-tertiary)', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            EMI Amount ➔
          </div>
          <div style={{ flex: 1 }}>
            {/* Header Row */}
            <div className="matrix-row">
              <div className="matrix-header"></div>
              {TICKET_BUCKETS.map(ticket => (
                <div key={`header-${ticket}`} className="matrix-header-col">{ticket}</div>
              ))}
            </div>
        
        {/* Matrix Rows */}
        {EMI_BUCKETS.map(emi => (
          <div key={`row-${emi}`} className="matrix-row">
            <div className="matrix-header">{emi}</div>
            
            {TICKET_BUCKETS.map(ticket => {
              const cellData = matrix[emi]?.[ticket] || { count: 0, amount: 0 };
              
              return (
                <div 
                  key={`cell-${emi}-${ticket}`} 
                  className={getCellClass(cellData.count)}
                  title={`${cellData.count} Users, ${formatCurrency(cellData.amount)}`}
                >
                  {cellData.count > 0 ? (
                    <>
                      <span className="cell-count">{cellData.count}</span>
                      <span className="cell-amount">{formatCurrency(cellData.amount)}</span>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SegmentMatrix;
