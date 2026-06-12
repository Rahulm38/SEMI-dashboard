import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['var(--primary)', 'var(--accent-teal)', 'var(--accent-orange)', 'var(--accent-purple)', 'var(--secondary)'];

const ProcessingFeeAnalysis = ({ feeData, insight }) => {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <h2 className="card-title">Processing Fee Analysis</h2>
      <p className="card-subtitle">Distribution of users across different processing fee brackets.</p>
      
      <div style={{ height: '280px', marginTop: '1rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={feeData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={5}
              dataKey="count"
            >
              {feeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, name) => [`${value} Users`, name]}
              contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', borderRadius: '8px' }}
            />
            <Legend wrapperStyle={{ color: 'var(--text-tertiary)' }} />
          </PieChart>
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

export default ProcessingFeeAnalysis;
