import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label } from 'recharts';
import { formatCurrency } from '../utils/dataProcessor';

const FeeBurdenChart = ({ data, feeBurdenByBracket }) => {
  if (!data || data.length === 0 || !feeBurdenByBracket) return null;

  // Find lowest and highest average burden brackets
  let bestBracket = feeBurdenByBracket[0];
  let worstBracket = feeBurdenByBracket[0];
  
  feeBurdenByBracket.forEach(b => {
    if (b.avgBurden > 0 && b.avgBurden < bestBracket.avgBurden) bestBracket = b;
    if (b.avgBurden > worstBracket.avgBurden) worstBracket = b;
  });
  
  const insight = `${bestBracket.name} loans average only ${bestBracket.avgBurden.toFixed(1)}% fee burden vs ${worstBracket.avgBurden.toFixed(1)}% for ${worstBracket.name}. Fee economics strongly favor larger ticket sizes.`;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 className="card-title">Processing Fee vs Ticket Size</h2>
      <p className="card-subtitle">Flat fees become a heavier burden on smaller loans. This shows the relationship per booking.</p>
      
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
              label={{ value: 'Ticket Size (₹)', position: 'insideBottom', offset: -5, fill: 'var(--text-secondary)', fontSize: 12, dy: 15 }}
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
              tickFormatter={(val) => `${val.toFixed(0)}%`} 
            >
              <Label value="Fee vs Principal (%)" angle={-90} position="insideLeft" fill="var(--text-secondary)" fontSize={12} dx={-10} style={{ textAnchor: 'middle' }} />
            </YAxis>
            
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }}
              contentClassName="custom-tooltip"
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

      <div className="insight-callout">
        <span className="insight-callout-icon">✨</span>
        <span className="insight-callout-text">{insight}</span>
      </div>
    </div>
  );
};

export default FeeBurdenChart;
