import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../utils/dataProcessor';

const FeeBurdenChart = ({ data }) => {
  if (!data || data.length === 0) return null;

  // Find max burden for insight
  let maxBurden = 0;
  data.forEach(d => {
    if (d.feePct > maxBurden) maxBurden = d.feePct;
  });
  
  const insight = `Pattern: For small ticket loans, the flat processing fee can consume up to ${maxBurden.toFixed(1)}% of the loan principal.`;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 className="card-title">Processing Fee vs Ticket Size</h2>
      <p className="card-subtitle">Showing how flat fees disproportionately tax smaller loans. Each dot is a booking.</p>
      
      <div style={{ height: 300, minHeight: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis 
              type="number" 
              dataKey="ticketSize" 
              name="Ticket Size" 
              stroke="var(--text-tertiary)" 
              tick={{fill: 'var(--text-tertiary)'}}
              label={{ value: 'Ticket Size (Rs)', position: 'insideBottom', offset: -10, fill: 'var(--text-tertiary)' }}
              tickFormatter={(val) => {
                if (val >= 100000) return `${(val/100000).toFixed(1)}L`;
                if (val >= 1000) return `${(val/1000).toFixed(0)}K`;
                return val;
              }}
            />
            <YAxis 
              type="number" 
              dataKey="feePct" 
              name="Fee Burden" 
              stroke="var(--text-tertiary)" 
              tick={{fill: 'var(--text-tertiary)'}}
              label={{ value: 'Fee as % of Loan', angle: -90, position: 'insideLeft', fill: 'var(--text-tertiary)' }}
              tickFormatter={(val) => `${val.toFixed(0)}%`} 
            />
            
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', borderRadius: '8px' }}
              formatter={(value, name) => {
                if (name === 'Ticket Size') return formatCurrency(value);
                if (name === 'Fee Burden') return `${value.toFixed(2)}%`;
                return value;
              }}
            />
            
            <Scatter name="Bookings" data={data} fill="var(--accent-purple)" opacity={0.7} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="insight-box">
        <span className="insight-icon">✨</span>
        <span className="insight-text">{insight}</span>
      </div>
    </div>
  );
};

export default FeeBurdenChart;
