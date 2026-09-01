import { useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { formatCurrency } from '../utils/dataProcessor';
import MatrixFilter from './MatrixFilter';
import ResponsiveMatrix from './ResponsiveMatrix';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const BANDS = [
  { label: '00-03', start: 0, end: 3 },
  { label: '03-06', start: 3, end: 6 },
  { label: '06-09', start: 6, end: 9 },
  { label: '09-12', start: 9, end: 12 },
  { label: '12-15', start: 12, end: 15 },
  { label: '15-18', start: 15, end: 18 },
  { label: '18-21', start: 18, end: 21 },
  { label: '21-24', start: 21, end: 24 }
];

const getCellClass = (value, maxValue) => {
  if (!value || !maxValue) return 'matrix-cell intensity-0';
  const ratio = value / maxValue;
  if (ratio > 0.8) return 'matrix-cell intensity-5';
  if (ratio > 0.55) return 'matrix-cell intensity-4';
  if (ratio > 0.3) return 'matrix-cell intensity-3';
  if (ratio > 0.12) return 'matrix-cell intensity-2';
  return 'matrix-cell intensity-1';
};

const formatMetric = (value, metricKey) => {
  if (metricKey === 'count') return `${value || 0}`;
  return formatCurrency(value || 0);
};

const formatTimeBand = (band) => band.label;

const MarketingHeatmap = ({ data }) => {
  const [metric, setMetric] = useState('count');

  const matrix = useMemo(() => {
    const byKey = new Map((data || []).map(item => [`${item.dayIndex}-${item.hour}`, item]));

    return DAYS.map((day, dayIndex) => ({
      day,
      bands: BANDS.map(band => {
        const cells = [];
        for (let hour = band.start; hour < band.end; hour++) {
          cells.push(byKey.get(`${dayIndex}-${hour}`) || { count: 0, amount: 0, income: 0, rows: [] });
        }

        const count = cells.reduce((sum, cell) => sum + (cell.count || 0), 0);
        const amount = cells.reduce((sum, cell) => sum + (cell.amount || 0), 0);
        const income = cells.reduce((sum, cell) => sum + (cell.income || 0), 0);

        return {
          day,
          band,
          label: formatTimeBand(band),
          count,
          amount,
          income,
          avgTicket: count ? amount / count : 0,
        };
      })
    }));
  }, [data]);

  const flatCells = matrix.flatMap(row => row.bands);
  const maxValue = Math.max(...flatCells.map(cell => cell[metric] || 0), 0);
  const bestCell = flatCells.reduce((best, cell) => ((cell[metric] || 0) > (best?.[metric] || 0) ? cell : best), null);
  
  const getDynamicInsight = () => {
    if (!bestCell || !bestCell.count) return 'No campaign timing clusters available for the current filter.';
    
    const valFormatted = metric === 'count' ? `${bestCell[metric]} bookings` : formatCurrency(bestCell[metric]);
    const metricName = {
      count: 'volume',
      amount: 'total value',
      avgTicket: 'average ticket size',
      income: 'interest/fee income'
    }[metric];
    
    return `<strong>${bestCell.day} ${bestCell.label}</strong> is the strongest campaign window generating the highest ${metricName} (${valFormatted}).`;
  };

  const insight = getDynamicInsight();

  if (!data || data.length === 0) return null;

  return (
    <div>
      <div className="matrix-card-toolbar">
        <div className="matrix-card-heading">
          <h2 className="card-title">Booking Activity Heatmap</h2>
          <p className="card-subtitle">Conversion volume by day of week and time of day — spot peak hours and quiet zones.</p>
        </div>
        <MatrixFilter metric={metric} setMetric={setMetric} />
      </div>

      <ResponsiveMatrix
        xLabel="Time of Day ➔"
        yLabel="Day of Week ➔"
        columns={BANDS}
        rows={matrix}
        renderColumnHeader={band => band.label}
        renderRowHeader={row => row.day}
        renderCell={(row, band) => {
          const cell = row.bands.find(item => item.label === band.label);
          const value = cell?.[metric] || 0;

          return (
            <div
              className={getCellClass(value, maxValue)}
              title={`${cell.day} ${cell.label}: ${cell.count} bookings, ${formatCurrency(cell.amount)}`}
            >
              {value > 0 ? (
                <>
                  <span className="cell-count">{formatMetric(value, metric)}</span>
                  {metric !== 'count' && cell.count > 0 ? (
                    <span className="cell-amount">{cell.count} bookings</span>
                  ) : null}
                </>
              ) : null}
            </div>
          );
        }}
      />

      <div className="insight-callout insight-callout--spaced">
        <span className="insight-callout-icon">✨</span>
        <span className="insight-callout-text" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(insight) }}></span>
      </div>
    </div>
  );
};

export default MarketingHeatmap;
