import { formatCurrency } from '../utils/dataProcessor';
import ResponsiveMatrix from './ResponsiveMatrix';

const DrillDownModal = ({ drillDownData, onClose, metric = 'count' }) => {
  if (!drillDownData) return null;

  let mMax = 0;
  Object.values(drillDownData.microMatrix).forEach(r => Object.values(r).forEach(c => { 
    let v = c[metric] || 0;
    if (metric === 'avgTicket') v = c.count ? c.amount / c.count : 0;
    if(v > mMax) mMax = v; 
  }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--matrix glass-card animate-fade-in flex-col" onClick={e => e.stopPropagation()}>
        <div className="modal-header modal-header--full">
          <h3 className="modal-title">
            Granular View: {drillDownData.parentTicket} Ticket & {drillDownData.parentEmi} {drillDownData.isRoi ? 'ROI' : 'EMI'}
          </h3>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        <p className="card-subtitle modal-subtitle">Displaying {drillDownData.count} users in micro-segments.</p>
        
        <ResponsiveMatrix
          xLabel="Ticket Size ➔"
          yLabel={drillDownData.isRoi ? 'ROI / Interest Rate ➔' : 'EMI Amount ➔'}
          columns={drillDownData.microTicketKeys}
          rows={drillDownData.microEmiKeys}
          renderCell={(emi, ticket) => {
            const cellData = drillDownData.microMatrix[emi]?.[ticket] || { count: 0, amount: 0, income: 0 };

            let cellValue = cellData[metric] || 0;
            if (metric === 'avgTicket') cellValue = cellData.count ? cellData.amount / cellData.count : 0;

            let cellClass = 'matrix-cell intensity-0';
            if (cellValue > 0) {
              if (cellValue === mMax) cellClass = 'matrix-cell intensity-5';
              else {
                const ratio = cellValue / mMax;
                if (ratio > 0.8) cellClass = 'matrix-cell intensity-4';
                else if (ratio > 0.5) cellClass = 'matrix-cell intensity-3';
                else if (ratio > 0.2) cellClass = 'matrix-cell intensity-2';
                else cellClass = 'matrix-cell intensity-1';
              }
            }

            return (
              <div
                className={cellClass}
                title={`${cellData.count} Users, ${formatCurrency(cellData.amount)}`}
              >
                {cellValue > 0 ? (
                  <>
                    <span className="cell-count">{metric === 'count' ? cellValue : formatCurrency(cellValue)}</span>
                    {metric !== 'count' && cellData.count > 0 ? (
                      <span className="cell-amount">{cellData.count} bookings</span>
                    ) : null}
                  </>
                ) : null}
              </div>
            );
          }}
        />
      </div>
    </div>
  );
};

export default DrillDownModal;
