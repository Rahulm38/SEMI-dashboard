import { useMemo } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label } from 'recharts';
import { formatCurrency } from '../utils/dataProcessor';
import DOMPurify from 'dompurify';

const ValueConcentrationChart = ({ topBookings, totalConverted, insight }) => {
  const chartData = useMemo(() => {
    return topBookings.map((booking, index) => {
      const cumulative = topBookings
        .slice(0, index + 1)
        .reduce((sum, item) => sum + item.converted_amount, 0);
      return {
        name: `Top ${index + 1}`,
        amount: booking.converted_amount,
        cumulativePct: (cumulative / totalConverted) * 100
      };
    });
  }, [topBookings, totalConverted]);

  if (!chartData.length) return null;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 className="card-title">Value Concentration</h2>
      <p className="card-subtitle">Are a small percentage of users driving most of the value?</p>
      
      <div style={{ height: 350, minHeight: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis dataKey="name" stroke="var(--text-tertiary)" tick={{fill: 'var(--text-tertiary)', fontSize: 12}} angle={-45} textAnchor="end">
            <Label value="Top Users (Ranked)" offset={-5} position="insideBottom" fill="var(--text-secondary)" fontSize={12} dy={30} />
          </XAxis>
          <YAxis yAxisId="left" stroke="var(--primary-light)" tick={{fill: 'var(--text-tertiary)', fontSize: 12}} tickFormatter={(val) => {
            if (val >= 100000) return `${(val/100000).toFixed(1)}L`;
            if (val >= 1000) return `${(val/1000).toFixed(0)}K`;
            return val;
          }}>
            <Label value="Loan Amount (₹)" angle={-90} position="insideLeft" fill="var(--text-secondary)" fontSize={12} dx={-10} style={{ textAnchor: 'middle' }} />
          </YAxis>
          <YAxis yAxisId="right" orientation="right" stroke="var(--accent-purple)" tick={{fill: 'var(--text-tertiary)'}} tickFormatter={(val) => `${val.toFixed(0)}%`}>
            <Label value="Cumulative Share (%)" angle={90} position="insideRight" fill="var(--text-secondary)" fontSize={12} dx={10} style={{ textAnchor: 'middle' }} />
          </YAxis>
          
          <Tooltip 
            contentClassName="custom-tooltip"
            cursor={{ fill: 'var(--bg-hover)' }}
            formatter={(value, name) => {
              if (name === 'Cumulative Share') return [`${value.toFixed(1)}%`, name];
              return [formatCurrency(value), name];
            }}
          />
          
          <Bar yAxisId="left" dataKey="amount" name="Booking Amount" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
          <Line yAxisId="right" type="monotone" dataKey="cumulativePct" name="Cumulative Share" stroke="var(--accent-purple)" strokeWidth={3} dot={{r: 4}} />
          
          <ReferenceLine yAxisId="right" y={80} stroke="var(--accent-orange)" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: '80% Value Threshold', fill: 'var(--accent-orange)', fontSize: 12 }} />
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

export default ValueConcentrationChart;
