import React, { useMemo } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatCurrency } from '../utils/dataProcessor';

const ValueConcentrationChart = ({ topBookings, totalConverted, insight }) => {
  const chartData = useMemo(() => {
    let cumulative = 0;
    return topBookings.map((booking, index) => {
      cumulative += booking.converted_amount;
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
      <h2 className="card-title">Value Concentration (Pareto Analysis)</h2>
      <p className="card-subtitle">Are a small percentage of users driving most of the value? (Power Law)</p>
      
      <div style={{ height: 350, minHeight: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis dataKey="name" stroke="var(--text-tertiary)" tick={{fill: 'var(--text-tertiary)', fontSize: 12}} angle={-45} textAnchor="end" />
          <YAxis yAxisId="left" stroke="var(--primary-light)" tick={{fill: 'var(--text-tertiary)', fontSize: 12}} tickFormatter={(val) => {
            if (val >= 100000) return `${(val/100000).toFixed(1)}L`;
            if (val >= 1000) return `${(val/1000).toFixed(0)}K`;
            return val;
          }} />
          <YAxis yAxisId="right" orientation="right" stroke="var(--accent-purple)" tick={{fill: 'var(--text-tertiary)'}} tickFormatter={(val) => `${val.toFixed(0)}%`} />
          
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', borderRadius: '8px' }}
            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
            formatter={(value, name) => {
              if (name === 'Cumulative Share') return [`${value.toFixed(1)}%`, name];
              return [formatCurrency(value), name];
            }}
          />
          
          <Bar yAxisId="left" dataKey="amount" name="Booking Amount" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="cumulativePct" name="Cumulative Share" stroke="var(--accent-purple)" strokeWidth={3} dot={{r: 4}} />
          
          <ReferenceLine yAxisId="right" y={80} stroke="var(--accent-orange)" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: '80% Value Threshold', fill: 'var(--accent-orange)', fontSize: 12 }} />
        </ComposedChart>
      </ResponsiveContainer>
      </div>
      
      {insight && (
        <div className="insight-box">
          <span className="insight-icon">✨</span>
          <span className="insight-text" dangerouslySetInnerHTML={{ __html: insight }}></span>
        </div>
      )}
    </div>
  );
};

export default ValueConcentrationChart;
