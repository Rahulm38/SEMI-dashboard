import { BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import DOMPurify from 'dompurify';

const COLORS = ['var(--primary)', 'var(--accent-teal)', 'var(--accent-orange)', 'var(--accent-purple)', 'var(--secondary)'];

const ProcessingFeeAnalysis = ({ feeData, insight }) => {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 className="card-title">Processing Fee Analysis</h2>
      <p className="card-subtitle">Distribution of users across different processing fee brackets.</p>
      
      <div style={{ height: '280px', marginTop: '1rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={feeData}
            margin={{ top: 10, right: 30, left: 20, bottom: 0 }}
          >
            <XAxis type="number" hide />
            <YAxis 
              dataKey="name" 
              type="category" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
              width={60}
            />
            <Tooltip 
              cursor={{ fill: 'var(--bg-hover)' }}
              formatter={(value) => [`${value} Users`, 'Count']}
              contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
            />
            <Bar 
              dataKey="count" 
              radius={[0, 4, 4, 0]}
              barSize={24}
              label={{ position: 'right', fill: 'var(--text-primary)', fontSize: 12, fontWeight: 500 }}
            >
              {feeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {insight && (
        <div className="insight-callout">
          <span className="insight-callout-icon">✨</span>
          <span className="insight-callout-text" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(insight) }}></span>
        </div>
      )}
    </div>
  );
};

export default ProcessingFeeAnalysis;
