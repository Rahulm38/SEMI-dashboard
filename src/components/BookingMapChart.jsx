import Hammer from 'hammerjs';
if (typeof window !== 'undefined') {
  window.Hammer = Hammer;
}
import { useRef, useState, useMemo } from 'react';
import { Scatter } from 'react-chartjs-2';
import { Chart as ChartJS, LinearScale, PointElement, Tooltip, Legend } from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import { formatCurrency } from '../utils/dataProcessor';
import { TENURE_CONFIG, getChartJsTooltipOptions, getTenureCategory, getTenureColor, useChartTheme } from '../utils/uiTheme';

ChartJS.register(LinearScale, PointElement, Tooltip, Legend, zoomPlugin);

const BookingMapChart = ({ scatterData }) => {
  const chartRef = useRef(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedTenures, setSelectedTenures] = useState([6, 12, 24, 36, 48]);
  const [hoveredTenure, setHoveredTenure] = useState(null);
  const chartTheme = useChartTheme();

  const safeScatterData = useMemo(() => scatterData || [], [scatterData]);

  const filteredData = useMemo(() => {
    return safeScatterData.filter(d => selectedTenures.includes(getTenureCategory(d.tenure)));
  }, [safeScatterData, selectedTenures]);

  const data = useMemo(() => ({
    datasets: [{
      label: 'Bookings',
      data: filteredData.map(d => ({ x: d.ticket, y: d.emi, raw: d })),
      backgroundColor: filteredData.map(d => getTenureColor(d.tenure)),
      borderColor: filteredData.map(d => d.roiHigh ? chartTheme.roiOutline : getTenureColor(d.tenure)),
      borderWidth: filteredData.map(d => d.roiHigh ? 1 : 0),
      pointRadius: filteredData.map(d => d.roiHigh ? 3.5 : 2.5),
      hoverRadius: filteredData.map(d => d.roiHigh ? 5 : 4),
    }]
  }), [filteredData, chartTheme.roiOutline]);

  const formatAxisTick = (value) => {
    const absVal = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (absVal >= 100000) return `${sign}₹${(absVal/100000).toFixed(1)}L`;
    if (absVal >= 1000) return `${sign}₹${(absVal/1000).toFixed(0)}K`;
    if (absVal < 10 && absVal !== Math.floor(absVal)) return `${sign}₹${absVal.toFixed(1)}`;
    return `${sign}₹${Math.round(absVal)}`;
  };

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    onHover: (event, chartElement) => {
      event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
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
        grid: { display: false },
        border: { color: chartTheme.axisLine },
        ticks: {
          callback: formatAxisTick,
          color: chartTheme.axisTick,
          font: { size: 12, weight: '500' }
        }
      },
      y: {
        type: 'linear',
        title: {
          display: true,
          text: 'EMI per Month (₹)',
          color: chartTheme.axisLabel,
          font: { size: 12, weight: '500' }
        },
        grid: { drawOnChartArea: false, color: chartTheme.axisLine },
        border: { color: chartTheme.axisLine },
        ticks: {
          callback: formatAxisTick,
          color: chartTheme.axisTick,
          font: { size: 12, weight: '500' }
        }
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
            return `Tenure: ${raw.tenure}M`;
          },
          label: (context) => {
            const raw = context.raw.raw;
            const lines = [
              `Ticket:   ${formatCurrency(raw.ticket).replace('Rs. ', '₹')}`,
              `EMI/mo:   ${formatCurrency(raw.emi).replace('Rs. ', '₹')}`,
            ];
            if (raw.roiHigh) lines.push('ROI: ≥ 18%');
            return lines;
          }
        }
      }),
      zoom: {
        pan: {
          enabled: true,
          mode: 'xy',
          onPan: () => setIsZoomed(true)
        },
        zoom: {
          wheel: { enabled: true, modifierKey: 'ctrl' },
          pinch: { enabled: true },
          mode: 'xy',
          onZoom: () => setIsZoomed(true)
        }
      }
    }
  }), [chartTheme]);

  if (!scatterData || scatterData.length === 0) return null;

  const resetZoom = () => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
      setIsZoomed(false);
    }
  };

  const handleDoubleClick = () => {
    if (chartRef.current) {
      chartRef.current.zoom(1.5);
      setIsZoomed(true);
    }
  };

  // Dynamic business insight calculations based on filteredData
  const activeCount = filteredData.length;
  const insightContent = activeCount > 0 ? (() => {
    const sortedByTicket = [...filteredData].sort((a, b) => a.ticket - b.ticket);
    const p80Index = Math.floor(activeCount * 0.8);
    const p80Ticket = sortedByTicket[p80Index]?.ticket || 0;
    
    const bottom80Data = sortedByTicket.slice(0, p80Index);
    const p80Emi = bottom80Data.length > 0 ? Math.max(...bottom80Data.map(d => d.emi)) : 0;
    
    const totalPortfolioValue = filteredData.reduce((sum, d) => sum + d.ticket, 0);
    const top20Data = sortedByTicket.slice(p80Index);
    const top20Value = top20Data.reduce((sum, d) => sum + d.ticket, 0);
    const top20ValuePct = totalPortfolioValue ? (top20Value / totalPortfolioValue) * 100 : 0;
    
    const formatShort = (val) => {
      if (val >= 100000) return `Rs. ${(val/100000).toFixed(1)}L`;
      if (val >= 1000) return `Rs. ${(val/1000).toFixed(1)}K`;
      return `Rs. ${Math.round(val)}`;
    };

    return (
      <span className="insight-callout-text">
        <strong style={{ color: 'var(--text-primary)' }}>Portfolio Concentration:</strong> While 80% of the selected bookings have EMIs below <strong>{formatShort(p80Emi)}</strong> on tickets under <strong>{formatShort(p80Ticket)}</strong>, the top 20% of high-ticket loans (&gt; {formatShort(p80Ticket)}) drive <strong>{top20ValuePct.toFixed(1)}%</strong> of the selected portfolio value.
      </span>
    );
  })() : (
    <span className="insight-callout-text">
      <strong style={{ color: 'var(--text-primary)' }}>Select a tenure</strong> from the legend above to view portfolio concentration insights.
    </span>
  );

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="card-title">Ticket Size vs Monthly EMI</h2>
          <p className="card-subtitle">Each dot is a booking. Colored by tenure. Clusters show where customers prefer to land.</p>
        </div>
        {isZoomed && (
          <button 
            onClick={resetZoom}
            style={{
              padding: '6px 12px',
              backgroundColor: 'var(--primary)',
              border: 'none',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.4)'
            }}
          >
            Reset Zoom
          </button>
        )}
      </div>
      
      <div
        className="booking-map-canvas"
        style={{
          width: '100%', 
          height: 450, 
          minHeight: 450, 
          marginTop: '10px',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onDoubleClick={handleDoubleClick}
      >
        <Scatter ref={chartRef} data={data} options={options} />
      </div>

      <div className="chart-pill-legend" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', marginTop: '2rem', alignItems: 'center', position: 'relative' }}>
        {TENURE_CONFIG.map((item) => {
          const color = item.hex;
          const isSelected = selectedTenures.includes(item.value);
          const isHovered = hoveredTenure === item.value;
          return (
            <div 
              key={item.value} 
              style={{ position: 'relative' }}
              onMouseEnter={() => setHoveredTenure(item.value)}
              onMouseLeave={() => setHoveredTenure(null)}
            >
              <div
                onClick={() => {
                  setSelectedTenures(prev => {
                    if (prev.includes(item.value)) {
                      return prev.filter(t => t !== item.value);
                    }
                    return [...prev, item.value];
                  });
                }}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  cursor: 'pointer',
                  opacity: isSelected ? 1 : 0.5,
                  transition: 'all 0.2s ease',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: isSelected ? `1px solid ${color}` : '1px solid var(--border-subtle)',
                  backgroundColor: isSelected ? `${color}15` : 'transparent',
                  boxShadow: isSelected ? `0 0 10px ${color}20` : 'none',
                }}
              >
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color, boxShadow: isSelected ? `0 0 5px ${color}` : 'none' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: isSelected ? 500 : 400, color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {item.label}
                </span>
              </div>
              
              {/* Custom Tooltip */}
              {isHovered && (
                <div style={{
                  position: 'absolute',
                  bottom: '110%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: chartTheme.tooltipBg,
                  border: `1px solid ${chartTheme.tooltipBorder}`,
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  color: chartTheme.tooltipTitle,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  zIndex: 50,
                  boxShadow: 'var(--shadow-md)'
                }}>
                  {isSelected ? `Click to hide ${item.label}` : `Click to show ${item.label}`}
                </div>
              )}
            </div>
          );
        })}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem', padding: '6px 14px', borderRadius: '20px', backgroundColor: chartTheme.roiBadgeBg, border: `1px solid ${chartTheme.roiOutline}` }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'transparent', border: `2px solid ${chartTheme.roiOutline}` }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>ROI 18%+</span>
        </div>
      </div>
      
      <div className="insight-callout">
        <span className="insight-callout-icon">💡</span>
        {insightContent}
      </div>
    </div>
  );
};

export default BookingMapChart;
