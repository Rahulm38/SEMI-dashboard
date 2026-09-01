import { useState } from 'react';
import DOMPurify from 'dompurify';
import { formatCurrency } from '../utils/dataProcessor';
import DrillDownModal from './DrillDownModal';
import MatrixFilter from './MatrixFilter';
import ResponsiveMatrix from './ResponsiveMatrix';

const RoiMatrix = ({ matrix, ticketKeys = [], roiKeys = [] }) => {
  const [drillDownData, setDrillDownData] = useState(null);
  const [metric, setMetric] = useState('count');

  const handleCellClick = (roi, ticket, count) => {
    if (count === 0) return;
    const cell = matrix[roi]?.[ticket];
    if (cell && cell.drillDown) {
      setDrillDownData({ ...cell.drillDown, parentEmi: roi, parentTicket: ticket, isRoi: true });
    }
  };

  const closeDrillDown = () => setDrillDownData(null);

  // Find max value to color scale
  let maxValue = 0;
  let maxCellInfo = { roi: '', ticket: '', val: 0 };

  Object.keys(matrix || {}).forEach(roi => {
    Object.keys(matrix[roi] || {}).forEach(ticket => {
      let cell = matrix[roi][ticket];
      let val = cell[metric];
      if (metric === 'avgTicket') val = cell.count ? cell.amount / cell.count : 0;
      if (val > maxValue) {
        maxValue = val;
        maxCellInfo = { roi, ticket, val };
      }
    });
  });

  const getDynamicInsight = () => {
    if (!maxValue) return null;
    const valFormatted = metric === 'count' ? `${maxCellInfo.val} bookings` : formatCurrency(maxCellInfo.val);
    const metricName = {
      count: 'volume',
      amount: 'total value',
      avgTicket: 'average ticket size',
      income: 'interest/fee income'
    }[metric];
    
    return `Tickets <strong>${maxCellInfo.ticket}</strong> with ROI <strong>${maxCellInfo.roi}</strong> generated the highest ${metricName} (${valFormatted}).`;
  };

  const getCellClass = (val) => {
    if (!val || !maxValue) return 'matrix-cell intensity-0';
    if (val === maxValue) return 'matrix-cell intensity-5';
    
    const ratio = val / maxValue;
    if (ratio > 0.8) return 'matrix-cell intensity-4';
    if (ratio > 0.5) return 'matrix-cell intensity-3';
    if (ratio > 0.2) return 'matrix-cell intensity-2';
    return 'matrix-cell intensity-1';
  };

  const formatMetric = (value, metricKey) => {
    if (metricKey === 'count') return `${value || 0}`;
    return formatCurrency(value || 0);
  };

  return (
    <div>
      <div className="matrix-card-toolbar">
        <div className="matrix-card-heading">
          <h2 className="card-title">ROI × Ticket Segment Matrix</h2>
          <p className="card-subtitle">
            Distribution of converted users and generated volume across ROI and ticket sizes.
          </p>
        </div>
        <MatrixFilter metric={metric} setMetric={setMetric} />
      </div>

      <ResponsiveMatrix
        xLabel="Ticket Size ➔"
        yLabel="ROI / Interest Rate ➔"
        columns={ticketKeys}
        rows={roiKeys}
        renderCell={(r, t) => {
          const cellData = matrix[r]?.[t] || { count: 0, amount: 0, income: 0 };
          let cellValue = cellData[metric];
          if (metric === 'avgTicket') cellValue = cellData.count ? cellData.amount / cellData.count : 0;

          return (
            <div
              className={`${getCellClass(cellValue)} ${cellData.count > 0 ? 'clickable-cell' : ''}`}
              title={cellData.count > 0 ? `${cellData.count} Users, ${formatCurrency(cellData.amount)} (Click to expand)` : "No activity"}
              onClick={() => cellData.count > 0 && handleCellClick(r, t, cellData.count)}
            >
              {cellValue > 0 ? (
                <>
                  <span className="cell-count">{formatMetric(cellValue, metric)}</span>
                  {metric !== 'count' && cellData.count > 0 ? (
                    <span className="cell-amount">{cellData.count} bookings</span>
                  ) : null}
                </>
              ) : <span className="matrix-empty-dash">—</span>}
            </div>
          );
        }}
      />

      {getDynamicInsight() && (
        <div className="insight-callout insight-callout--spaced">
          <span className="insight-callout-icon">✨</span>
          <span className="insight-callout-text" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(getDynamicInsight()) }}></span>
        </div>
      )}

      {drillDownData && (
        <DrillDownModal 
          drillDownData={drillDownData} 
          onClose={closeDrillDown} 
          metric={metric}
        />
      )}
    </div>
  );
};

export default RoiMatrix;
