import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

const MarketingHeatmap = ({ data }) => {
  if (!data || data.length === 0) return null;

  // Aggregate by day of week
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayTotals = daysOfWeek.map(day => ({ day, count: 0 }));
  
  data.forEach(d => {
    const dayObj = dayTotals.find(dt => dt.day === d.day);
    if (dayObj) dayObj.count += d.count;
  });

  // Find max day for insight
  let maxDay = dayTotals[0];
  dayTotals.forEach(d => {
    if (d.count > maxDay.count) maxDay = d;
  });

  const insight = `Golden Window: ${maxDay.day} sees the highest density of conversions. Target Push Notifications on this day.`;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 className="card-title">Conversions by Day of Week</h2>
      <p className="card-subtitle">Which days drive the most volume?</p>
      
      <div style={{ height: 350, minHeight: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dayTotals} margin={{ top: 30, right: 30, left: 20, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis 
              dataKey="day" 
              stroke="var(--text-tertiary)" 
              tick={{fill: 'var(--text-tertiary)', fontSize: 12}}
            />
            <YAxis 
              stroke="var(--text-tertiary)" 
              tick={{fill: 'var(--text-tertiary)', fontSize: 12}}
            />
            
            <Tooltip 
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', borderRadius: '8px' }}
            />
            
            <Bar dataKey="count" name="Bookings" fill="var(--accent-orange)" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="count" position="top" fill="var(--text-tertiary)" fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="insight-box">
        <span className="insight-icon">✨</span>
        <span className="insight-text">{insight}</span>
      </div>
    </div>
  );
};

export default MarketingHeatmap;
