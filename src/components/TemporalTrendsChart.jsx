import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, ComposedChart, Line, Label, LabelList } from 'recharts';
import DOMPurify from 'dompurify';
import { formatCurrency } from '../utils/dataProcessor';

const TemporalTrendsChart = ({ timeData, insight }) => {
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const [y, m, d] = dateString.split('-');
      if (!y || !m || !d) return dateString;
      const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      if (isNaN(date.getTime())) return dateString;
      return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(date);
    } catch {
      return dateString;
    }
  };

  if (!timeData) return null;
  const chartData = timeData.daily || [];

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 className="card-title">Daily Volume</h2>
      <p className="card-subtitle">Daily volumes and value trends</p>
      
      <div style={{ height: 350, minHeight: 350, marginTop: '1.5rem', flex: 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 30, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke="var(--text-tertiary)" 
              tick={{fill: 'var(--text-tertiary)', fontSize: 10, angle: -45, textAnchor: 'end', dy: 5}}
              minTickGap={15}
              height={60}
              interval={chartData.length > 15 ? Math.floor(chartData.length / 10) : 0}
              tickFormatter={formatDate}
            >
              <Label value="Date" position="insideBottom" fill="var(--text-secondary)" fontSize={12} dy={15} />
            </XAxis>
            <YAxis yAxisId="left" stroke="var(--primary)" tick={{fill: 'var(--text-tertiary)', fontSize: 12}} domain={[0, dataMax => Math.ceil(dataMax * 1.5)]}>
              <Label value="Number of Bookings" angle={-90} position="insideLeft" fill="var(--text-secondary)" fontSize={12} dx={-15} style={{ textAnchor: 'middle' }} />
            </YAxis>
            <YAxis yAxisId="right" orientation="right" stroke="var(--accent-orange)" tick={{fill: 'var(--text-tertiary)', fontSize: 12}} tickFormatter={formatCurrency} domain={[0, dataMax => dataMax * 1.15]}>
              <Label value="Total Amount (₹)" angle={90} position="insideRight" fill="var(--text-secondary)" fontSize={12} dx={15} style={{ textAnchor: 'middle' }} />
            </YAxis>
            <Tooltip 
              contentClassName="custom-tooltip"
              formatter={(value, name) => {
                if (name.includes('Amount')) return [formatCurrency(value), name];
                return [value, name];
              }}
              labelFormatter={formatDate}
            />
            <Bar 
              yAxisId="left" 
              dataKey="count" 
              name="Bookings" 
              fill="var(--primary)" 
              radius={[4, 4, 0, 0]} 
              maxBarSize={40} 
              isAnimationActive={false}
            />
            <Line yAxisId="right" type="monotone" dataKey="amount" name="Total Amount" stroke="var(--accent-orange)" strokeWidth={3} dot={chartData.length <= 20 ? { r: 4 } : false} isAnimationActive={false}>
              {chartData.length <= 12 ? (
                <LabelList dataKey="amount" position="top" formatter={formatCurrency} fill="var(--text-primary)" stroke="var(--bg-surface)" strokeWidth={4} paintOrder="stroke" fontWeight={600} fontSize={11} offset={10} />
              ) : null}
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {insight && (
        <div className="insight-callout">
          <span className="insight-callout-icon">✨</span>
          <span className="insight-callout-text" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(insight) }}></span>
        </div>
      )}
    </div>
  );
};

export default TemporalTrendsChart;
