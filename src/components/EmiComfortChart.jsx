import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Label, LabelList } from 'recharts';
import DOMPurify from 'dompurify';

const EmiComfortChart = ({ data, insight }) => {
  return (
    <div className="w-full h-full flex-col">
      <h2 className="card-title">EMI Affordability</h2>
      <p className="card-subtitle">Distribution of users across EMI bands.</p>
      
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 30, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
          <XAxis type="number" stroke="var(--text-tertiary)" tick={{fill: 'var(--text-tertiary)'}}>
            <Label value="Number of Bookings" offset={-5} position="insideBottom" fill="var(--text-secondary)" fontSize={12} dy={15} />
          </XAxis>
          <YAxis dataKey="name" type="category" stroke="var(--text-tertiary)" tick={{fill: 'var(--text-tertiary)'}} width={80}>
            <Label value="Monthly EMI (₹)" angle={-90} position="insideLeft" fill="var(--text-secondary)" fontSize={12} dx={-10} style={{ textAnchor: 'middle' }} />
          </YAxis>
          <Tooltip 
            cursor={{ fill: 'var(--bg-hover)' }}
            contentClassName="custom-tooltip"
          />
          <Bar dataKey="users" name="Users" radius={[0, 4, 4, 0]} fill="var(--secondary)">
            <LabelList dataKey="users" position="right" fill="var(--text-primary)" fontSize={11} offset={8} />
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={index < 4 ? 'var(--secondary)' : 'var(--primary)'} />
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

export default EmiComfortChart;
