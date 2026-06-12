import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const EmiComfortChart = ({ data, insight }) => {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 className="card-title">EMI Affordability</h2>
      <p className="card-subtitle">Distribution of users across EMI bands.</p>
      
      <div style={{ height: 300, minHeight: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 20, bottom: 25 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
          <XAxis type="number" stroke="var(--text-tertiary)" tick={{fill: 'var(--text-tertiary)'}} />
          <YAxis dataKey="name" type="category" stroke="var(--text-tertiary)" tick={{fill: 'var(--text-tertiary)'}} width={80} />
          <Tooltip 
            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
            contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', borderRadius: '8px' }}
          />
          <Bar dataKey="users" name="Users" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={index < 4 ? 'var(--secondary)' : 'var(--primary)'} />
            ))}
          </Bar>
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

export default EmiComfortChart;
