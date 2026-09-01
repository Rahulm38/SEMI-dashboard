import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label } from 'recharts';
import DOMPurify from 'dompurify';

const BookingSizeChart = ({ data, insight }) => {
  return (
    <div className="w-full h-full flex-col">
      <h2 className="card-title">Booking Size vs Value</h2>
      <p className="card-subtitle">Comparing user count vs amount share across ticket sizes.</p>
      
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart
            data={data}
            margin={{ top: 20, right: 60, left: 40, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--text-tertiary)" tick={{fill: 'var(--text-tertiary)', fontSize: 12}}>
              <Label value="Ticket Size Bracket" offset={-5} position="insideBottom" fill="var(--text-secondary)" fontSize={12} dy={15} />
            </XAxis>
            <YAxis yAxisId="left" stroke="var(--primary-light)" tick={{fill: 'var(--text-tertiary)', fontSize: 12}}>
              <Label value="Number of Bookings" angle={-90} position="insideLeft" fill="var(--text-secondary)" fontSize={12} dx={-15} style={{ textAnchor: 'middle' }} />
            </YAxis>
            <YAxis yAxisId="right" orientation="right" stroke="var(--accent-teal)" tick={{fill: 'var(--text-tertiary)', fontSize: 12}} tickFormatter={(val) => `${val.toFixed(0)}%`}>
              <Label value="Amount Share (%)" angle={90} position="insideRight" fill="var(--text-secondary)" fontSize={12} dx={15} style={{ textAnchor: 'middle' }} />
            </YAxis>
            
            <Tooltip 
              contentClassName="custom-tooltip"
              cursor={{ fill: 'var(--bg-hover)' }}
              formatter={(value, name) => {
                if (name === 'Users') return [value, name];
                return [`${value.toFixed(1)}%`, 'Amount Share'];
              }}
            />
            <Legend verticalAlign="top" height={40} wrapperStyle={{ color: 'var(--text-tertiary)' }} />
            
            <Bar yAxisId="left" dataKey="users" name="Users" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Line yAxisId="right" type="monotone" dataKey="amountShare" name="Amount Share (%)" stroke="var(--accent-teal)" strokeWidth={3} dot={{ r: 5 }} />
          </ComposedChart>
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

export default BookingSizeChart;
