import { useRef, useState, useMemo } from 'react';
import { Scatter } from 'react-chartjs-2';
import { Chart as ChartJS, LinearScale, PointElement, Tooltip, Legend } from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import annotationPlugin from 'chartjs-plugin-annotation';
import { formatCurrency } from '../utils/dataProcessor';
import { TENURE_CONFIG, getChartJsTooltipOptions, getTenureCategory, getTenureColor, useChartTheme, withAlpha } from '../utils/uiTheme';

ChartJS.register(LinearScale, PointElement, Tooltip, Legend, zoomPlugin, annotationPlugin);

const formatAxisTick = (value) => {
  const absVal = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (absVal >= 100000) return `${sign}₹${(absVal / 100000).toFixed(1)}L`;
  if (absVal >= 1000)   return `${sign}₹${(absVal / 1000).toFixed(0)}K`;
  return `${sign}₹${Math.round(absVal)}`;
};

const ProfitabilityQuadrant = ({ data }) => {
  const chartRef = useRef(null);
  const [selectedTenures, setSelectedTenures] = useState([6, 12, 24, 36, 48]);
  const [hoveredTenure, setHoveredTenure] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const chartTheme = useChartTheme();
  const safeData = useMemo(() => data || [], [data]);

  // Filter by selected tenures
  const filteredData = useMemo(
    () => safeData.filter(d => selectedTenures.includes(getTenureCategory(d.tenure))),
    [safeData, selectedTenures]
  );

  // Medians for quadrant lines
  const sortedTickets = [...filteredData].sort((a, b) => a.ticketSize - b.ticketSize);
  const sortedProfits = [...filteredData].sort((a, b) => a.interestIncome - b.interestIncome);
  const medianTicket = sortedTickets[Math.floor(sortedTickets.length / 2)]?.ticketSize || 0;
  const medianProfit = sortedProfits[Math.floor(sortedProfits.length / 2)]?.interestIncome || 0;

  const chartData = {
    datasets: [{
      label: 'Bookings',
      data: filteredData.map(d => ({ x: d.ticketSize, y: d.interestIncome, raw: d })),
      backgroundColor: filteredData.map(d => withAlpha(getTenureColor(d.tenure), 'cc')),
      borderColor: filteredData.map(d => getTenureColor(d.tenure)),
      borderWidth: 1,
      pointRadius: 4,
      hoverRadius: 6,
    }]
  };

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    layout: { padding: 10 },
    onHover: (event, elements) => {
      event.native.target.style.cursor = elements.length ? 'pointer' : 'default';
    },
    scales: {
      x: {
        type: 'linear',
        position: 'bottom',
        title: {
          display: true,
          text: 'Ticket Size (₹)',
          color: chartTheme.axisLabel,
          font: { size: 12, weight: '500' }
        },
        grid: { color: chartTheme.grid, drawBorder: false },
        border: { color: chartTheme.axisLine },
        ticks: { color: chartTheme.axisTick, callback: formatAxisTick }
      },
      y: {
        type: 'linear',
        title: {
          display: true,
          text: 'Interest Income (₹)',
          color: chartTheme.axisLabel,
          font: { size: 12, weight: '500' }
        },
        grid: { color: chartTheme.grid, drawBorder: false },
        border: { color: chartTheme.axisLine },
        ticks: { color: chartTheme.axisTick, callback: formatAxisTick }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: getChartJsTooltipOptions(chartTheme, {
        mode: 'nearest',
        intersect: true,
        callbacks: {
          title: (items) => {
            const raw = items[0]?.raw?.raw;
            if (!raw) return '';
            const cat = getTenureCategory(raw.tenure);
            const cfg = TENURE_CONFIG.find(c => c.value === cat);
            return cfg ? cfg.label : `${raw.tenure}M tenure`;
          },
          label: (context) => {
            const raw = context.raw.raw;
            return [
              `Ticket:   ${formatCurrency(raw.ticketSize).replace('Rs. ', '₹')}`,
              `Interest: ${formatCurrency(raw.interestIncome).replace('Rs. ', '₹')}`,
              `ROI:      ${raw.roi}%`,
            ];
          }
        }
      }),
      zoom: {
        pan: { enabled: true, mode: 'xy', onPan: () => setIsZoomed(true) },
        zoom: {
          wheel: { enabled: true, modifierKey: 'ctrl' },
          pinch: { enabled: true },
          mode: 'xy',
          onZoom: () => setIsZoomed(true)
        }
      },
      annotation: {
        annotations: {
          vLine: {
            type: 'line',
            xMin: medianTicket,
            xMax: medianTicket,
            borderColor: chartTheme.annotationLine,
            borderWidth: 1.5,
            borderDash: [5, 5],
          },
          hLine: {
            type: 'line',
            yMin: medianProfit,
            yMax: medianProfit,
            borderColor: chartTheme.annotationLine,
            borderWidth: 1.5,
            borderDash: [5, 5],
          }
        }
      }
    }
  }), [chartTheme, medianTicket, medianProfit]);

  if (safeData.length === 0) return null;

  const resetZoom = () => {
    if (chartRef.current) { chartRef.current.resetZoom(); setIsZoomed(false); }
  };

  // Quadrant insight
  const totalVolume = filteredData.length;
  const totalIncome = filteredData.reduce((s, d) => s + d.interestIncome, 0);
  let cashCowVol = 0, cashCowInc = 0, longTailVol = 0, longTailInc = 0;
  filteredData.forEach(d => {
    if (d.ticketSize >= medianTicket && d.interestIncome >= medianProfit) { cashCowVol++; cashCowInc += d.interestIncome; }
    if (d.ticketSize <  medianTicket && d.interestIncome <  medianProfit) { longTailVol++; longTailInc += d.interestIncome; }
  });
  const cowVolPct  = totalVolume ? Math.round((cashCowVol / totalVolume) * 100) : 0;
  const cowIncPct  = totalIncome ? Math.round((cashCowInc / totalIncome) * 100) : 0;
  const tailVolPct = totalVolume ? Math.round((longTailVol / totalVolume) * 100) : 0;
  const tailIncPct = totalIncome ? Math.round((longTailInc / totalIncome) * 100) : 0;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="card-title">Interest Income Quadrants</h2>
          <p className="card-subtitle">
            <strong>Pinch</strong> or <strong>Ctrl + scroll</strong> to zoom · Click and drag to pan · Click a tenure to filter
          </p>
        </div>
        {isZoomed && (
          <button
            onClick={resetZoom}
            style={{
              padding: '6px 14px',
              backgroundColor: 'var(--primary)',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.825rem',
              fontWeight: 600,
            }}
          >
            Reset Zoom
          </button>
        )}
      </div>

      {/* Chart */}
      <div style={{ width: '100%', height: 430, marginTop: '12px' }}>
        <Scatter ref={chartRef} data={chartData} options={options} />
      </div>

      {/* Legend - same style as BookingMapChart */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center', marginTop: '1.5rem', alignItems: 'center' }}>
        {TENURE_CONFIG.map((item) => {
          const isSelected = selectedTenures.includes(item.value);
          const isHovered  = hoveredTenure === item.value;
          return (
            <div
              key={item.value}
              style={{ position: 'relative' }}
              onMouseEnter={() => setHoveredTenure(item.value)}
              onMouseLeave={() => setHoveredTenure(null)}
            >
              <div
                onClick={() => setSelectedTenures(prev =>
                  prev.includes(item.value)
                    ? prev.filter(t => t !== item.value)
                    : [...prev, item.value]
                )}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  opacity: isSelected ? 1 : 0.4,
                  transition: 'all 0.2s ease',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: isSelected ? `1px solid ${item.hex}` : '1px solid var(--border-subtle)',
                  backgroundColor: isSelected ? `${item.hex}18` : 'transparent',
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: item.hex }} />
                <span style={{ fontSize: '0.825rem', fontWeight: isSelected ? 600 : 400, color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {item.label}
                </span>
              </div>

              {/* Hover nudge */}
              {isHovered && (
                <div style={{
                  position: 'absolute',
                  bottom: '110%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: chartTheme.tooltipBg,
                  border: `1px solid ${chartTheme.tooltipBorder}`,
                  padding: '5px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  color: chartTheme.tooltipTitle,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  zIndex: 50,
                  boxShadow: 'var(--shadow-md)',
                }}>
                  {isSelected ? `Click to hide ${item.label}` : `Click to show ${item.label}`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Insight */}
      <div className="insight-callout">
        <span className="insight-callout-icon">🎯</span>
        <span className="insight-callout-text">
          <strong>"Cash Cows" (Top-Right)</strong> make up <strong>{cowVolPct}%</strong> of volume but generate <strong>{cowIncPct}%</strong> of total interest income. The <strong>"Long Tail" (Bottom-Left)</strong> accounts for <strong>{tailVolPct}%</strong> of volume but only contributes <strong>{tailIncPct}%</strong> of income.
        </span>
      </div>
    </div>
  );
};

export default ProfitabilityQuadrant;
