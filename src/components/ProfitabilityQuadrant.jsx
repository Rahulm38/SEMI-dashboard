import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ZAxis } from 'recharts';
import { formatCurrency } from '../utils/dataProcessor';

const ProfitabilityQuadrant = ({ data }) => {
  if (!data || data.length === 0) return null;

  // Calculate medians to draw quadrant lines
  const sortedTickets = [...data].sort((a, b) => a.ticketSize - b.ticketSize);
  const sortedProfits = [...data].sort((a, b) => a.profit - b.profit);
  
  const medianTicket = sortedTickets[Math.floor(sortedTickets.length / 2)]?.ticketSize || 0;
  const medianProfit = sortedProfits[Math.floor(sortedProfits.length / 2)]?.profit || 0;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 className="card-title">Profitability Quadrants</h2>
      <p className="card-subtitle">Ticket Size vs Gross Profit. Top-Right = "Cash Cows".</p>
      
      <div style={{ height: 350, minHeight: 350 }}>
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
              dataKey="profit" 
              name="Total Profit" 
              stroke="var(--text-tertiary)" 
              tick={{fill: 'var(--text-tertiary)'}}
              label={{ value: 'Gross Profit (Rs)', angle: -90, position: 'insideLeft', fill: 'var(--text-tertiary)' }}
              tickFormatter={(val) => {
                if (val >= 100000) return `${(val/100000).toFixed(1)}L`;
                if (val >= 1000) return `${(val/1000).toFixed(0)}K`;
                return val;
              }}
            />
            <ZAxis type="number" dataKey="roi" range={[40, 40]} name="ROI" />
            
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', borderRadius: '8px' }}
              formatter={(value, name) => {
                if (name === 'Ticket Size' || name === 'Total Profit') return formatCurrency(value);
                if (name === 'ROI') return `${value}%`;
                return value;
              }}
            />
            
            <ReferenceLine x={medianTicket} stroke="var(--text-tertiary)" strokeDasharray="3 3" />
            <ReferenceLine y={medianProfit} stroke="var(--text-tertiary)" strokeDasharray="3 3" />
            
            <Scatter name="Bookings" data={data} fill="var(--primary)" opacity={0.6} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      
      <div className="insight-box">
        <span className="insight-icon">✨</span>
        <span className="insight-text">
          Pattern: Bookings to the top-right of the crosshairs represent maximum business value (high volume, high margin). The bottom-left is the high-maintenance "Long Tail".
        </span>
      </div>
    </div>
  );
};

export default ProfitabilityQuadrant;
