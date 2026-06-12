import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, LabelList, ComposedChart, Line } from 'recharts';
import { formatCurrency } from '../utils/dataProcessor';

const TemporalTrendsChart = ({ timeData, insight }) => {
  if (!timeData) return null;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 className="card-title">Temporal Trends</h2>
      <p className="card-subtitle">Daily volumes and peak hours</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1rem', flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)', marginBottom: '1rem' }}>Daily Volume</h3>
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timeData.daily} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--text-tertiary)" 
                  tick={{fill: 'var(--text-tertiary)', fontSize: 10}}
                  tickFormatter={(val) => {
                    const d = new Date(val);
                    return `${d.getDate()}/${d.getMonth()+1}`;
                  }}
                />
                <YAxis yAxisId="left" stroke="var(--primary)" tick={{fill: 'var(--text-tertiary)', fontSize: 12}} />
                <YAxis yAxisId="right" orientation="right" stroke="var(--accent-orange)" tick={{fill: 'var(--text-tertiary)', fontSize: 12}} tickFormatter={formatCurrency} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', borderRadius: '8px' }}
                  formatter={(value, name) => [name === 'Amount' ? formatCurrency(value) : value, name]}
                />
                <Bar yAxisId="left" dataKey="count" name="Bookings" fill="var(--primary)" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="count" position="top" fill="var(--text-tertiary)" fontSize={10} />
                </Bar>
                <Line yAxisId="right" type="monotone" dataKey="amount" name="Amount" stroke="var(--accent-orange)" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)', marginBottom: '1rem' }}>Hour of Day</h3>
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeData.hourly} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--text-tertiary)" 
                  tick={{fill: 'var(--text-tertiary)', fontSize: 10}}
                  interval={2}
                />
                <YAxis stroke="var(--text-tertiary)" tick={{fill: 'var(--text-tertiary)', fontSize: 12}} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', borderRadius: '8px' }}
                />
                <Bar dataKey="count" name="Bookings" fill="var(--accent-orange)" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="count" position="top" fill="var(--text-tertiary)" fontSize={10} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="insight-box">
        <span className="insight-icon">✨</span>
        <span className="insight-text">{insight}</span>
      </div>
    </div>
  );
};

export default TemporalTrendsChart;
