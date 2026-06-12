import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../utils/dataProcessor';

const RoiBandChart = ({ data, insight }) => {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 className="card-title">ROI Acceptance</h2>
      <p className="card-subtitle">Users still convert at higher ROI when EMI remains acceptable.</p>
      
      <div style={{ width: '100%', height: 300, minHeight: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--text-tertiary)" tick={{fill: 'var(--text-tertiary)'}} />
            <YAxis yAxisId="left" stroke="var(--primary-light)" tick={{fill: 'var(--text-tertiary)'}} />
            <YAxis yAxisId="right" orientation="right" stroke="var(--accent-orange)" tick={{fill: 'var(--text-tertiary)'}} tickFormatter={(val) => formatCurrency(val)} />
            
            <Tooltip 
              contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', borderRadius: '8px' }}
              cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
              formatter={(value, name) => {
                if (name === 'Users') return [value, name];
                return [formatCurrency(value), 'Converted Amount'];
              }}
            />
            <Legend wrapperStyle={{ color: 'var(--text-tertiary)' }} />
            
            <Bar yAxisId="left" dataKey="users" name="Users" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="right" dataKey="amount" name="Converted Amount" fill="var(--accent-orange)" radius={[4, 4, 0, 0]} />
          </BarChart>
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

export default RoiBandChart;
