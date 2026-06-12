import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

const CostOfBorrowingChart = ({ costData }) => {
  if (!costData || costData.length === 0) return null;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 className="card-title">Average Interest Rate by Tenure</h2>
      <p className="card-subtitle">Are longer tenures charged higher ROI?</p>
      
      <div style={{ height: 300, minHeight: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={costData} margin={{ top: 30, right: 30, left: 20, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis 
              dataKey="tenure" 
              tickFormatter={(t) => `${t} Months`} 
              stroke="var(--text-tertiary)" 
              tick={{fill: 'var(--text-tertiary)'}} 
            />
            <YAxis 
              stroke="var(--text-tertiary)" 
              tick={{fill: 'var(--text-tertiary)'}}
              tickFormatter={(val) => `${val}%`} 
              domain={[0, 'dataMax + 5']}
            />
            
            <Tooltip 
              cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
              contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', borderRadius: '8px' }}
              formatter={(value) => [`${value}%`, 'Average ROI']}
              labelFormatter={(label) => `${label} Months`}
            />
            
            <Line type="monotone" dataKey="avg_interest_rate" name="Average ROI" stroke="var(--accent-orange)" strokeWidth={3} dot={{ r: 6, fill: 'var(--bg-surface)', strokeWidth: 2 }}>
              <LabelList dataKey="avg_interest_rate" position="top" formatter={(val) => `${val}%`} fill="var(--text-tertiary)" fontSize={12} offset={10} />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="insight-box">
        <span className="insight-icon">✨</span>
        <span className="insight-text">
          Pattern: Comparing the average ROI across different tenures to see if pricing scales with duration.
        </span>
      </div>
    </div>
  );
};

export default CostOfBorrowingChart;
