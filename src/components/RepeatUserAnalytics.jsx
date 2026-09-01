import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip as ChartJsTooltip, Legend } from 'chart.js';
import { BarChart, Bar as RBar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, LabelList } from 'recharts';
import { formatCurrency } from '../utils/dataProcessor';
import { getChartJsTooltipOptions, useChartTheme } from '../utils/uiTheme';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, ChartJsTooltip, Legend);

const RepeatUserAnalytics = ({ metrics }) => {
  const chartTheme = useChartTheme();

  if (!metrics || !metrics.repeatAnalytics || metrics.repeatAnalytics.totalRepeatUsers === 0) return null;

  const stats = metrics.repeatAnalytics;
  const totalUsers = stats.totalRepeatUsers + stats.totalSingleUsers;
  const repeatRate = totalUsers > 0 ? Math.round((stats.totalRepeatUsers / totalUsers) * 100) : 0;
  const totalVolume = stats.repeatVolume + stats.singleVolume;
  const repeatVolumePct = totalVolume > 0 ? Math.round((stats.repeatVolume / totalVolume) * 100) : 0;
  const crossCardPct = stats.totalRepeatUsers > 0 ? Math.round((stats.crossCardRepeatUsers / stats.totalRepeatUsers) * 100) : 0;

  const barChartData = {
    labels: ['1st Loan', '2nd Loan (Repeat)'],
    datasets: [
      {
        label: 'Average Ticket Size (Rs)',
        data: [stats.avgFirstTicket, stats.avgSecondTicket],
        backgroundColor: ['rgba(16, 185, 129, 0.58)', 'rgba(16, 185, 129, 0.92)'],
        borderColor: ['#34d399', '#34d399'],
        borderWidth: 1,
        yAxisID: 'y',
        borderRadius: 6
      },
      {
        label: 'Average EMI (Rs)',
        data: [stats.avgFirstEmi, stats.avgSecondEmi],
        backgroundColor: ['rgba(99, 102, 241, 0.58)', 'rgba(99, 102, 241, 0.92)'],
        borderColor: ['#818cf8', '#818cf8'],
        borderWidth: 1,
        yAxisID: 'y1',
        borderRadius: 6
      }
    ]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: 20 },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        labels: { color: chartTheme.axisTick, font: { family: 'Inter, sans-serif', size: 12 } }
      },
      tooltip: getChartJsTooltipOptions(chartTheme, {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw).replace('Rs. ', '₹')}`
        }
      })
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Ticket Size (₹)',
          color: chartTheme.axisLabel,
          font: { size: 12, weight: '500' }
        },
        grid: { color: chartTheme.grid },
        border: { color: chartTheme.axisLine },
        ticks: { color: chartTheme.axisTick, callback: (value) => `₹${value/1000}K` }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'EMI Amount (₹)',
          color: chartTheme.axisLabel,
          font: { size: 12, weight: '500' }
        },
        grid: { drawOnChartArea: false },
        border: { color: chartTheme.axisLine },
        ticks: { color: chartTheme.axisTick, callback: (value) => value >= 1000 ? `₹${value/1000}K` : `₹${value}` }
      },
      x: {
        title: {
          display: true,
          text: 'Loan Sequence',
          color: chartTheme.axisLabel,
          font: { size: 12, weight: '500' }
        },
        grid: { display: false },
        border: { color: chartTheme.axisLine },
        ticks: { color: chartTheme.axisTick, font: { weight: 'bold' } }
      }
    }
  };

  const portfolioData = [
    { name: 'Single-Loan Users', volume: stats.singleVolume, fill: 'var(--text-tertiary)' },
    { name: 'Repeat Users', volume: stats.repeatVolume, fill: 'var(--primary)' }
  ];

  const ticketIncreasePct = stats.avgFirstTicket > 0 ? 
    Math.round(((stats.avgSecondTicket - stats.avgFirstTicket) / stats.avgFirstTicket) * 100) : 0;
  
  return (
    <>
      <div className="col-span-12 glass-card animate-fade-in delay-2 flex-col">
        <h2 className="card-title">Repeat & Cross-Sell Behaviour</h2>
        <p className="card-subtitle">Repeat behavior uses anonymized loan and card keys; raw phone, card and loan identifiers are not displayed.</p>

        <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
          <div className="metric-item">
            <span className="metric-label">Repeat Rate</span>
            <span className="metric-value text-blue">{repeatRate}%</span>
            <span className="metric-sub">{stats.totalRepeatUsers} of {totalUsers} users</span>
          </div>
          
          <div className="metric-item">
            <span className="metric-label">Portfolio Share</span>
            <span className="metric-value text-purple">{repeatVolumePct}%</span>
            <span className="metric-sub">repeat cohort vol</span>
          </div>

          <div className="metric-item">
            <span className="metric-label">Multi-card Users</span>
            <span className="metric-value" style={{ color: 'var(--accent-teal)' }}>
              {stats.multiCardUsers || 0}
            </span>
            <span className="metric-sub">{crossCardPct}% of repeat users (2+ cards)</span>
          </div>

          <div className="metric-item">
            <span className="metric-label">Avg Return Time</span>
            <span className="metric-value" style={{ color: 'var(--amber)' }}>{stats.avgDaysBetweenLoans} days</span>
            <span className="metric-sub">before next loan</span>
          </div>

          <div className="metric-item">
            <span className="metric-label">Ticket Shift</span>
            <span className="metric-value" style={{ color: ticketIncreasePct >= 0 ? 'var(--accent-teal)' : 'var(--accent-red)' }}>
              {ticketIncreasePct >= 0 ? '+' : ''}{ticketIncreasePct}%
            </span>
            <span className="metric-sub">on 2nd loan</span>
          </div>
        </div>
        
        <div className="insight-callout" style={{ marginTop: 0, marginBottom: '1rem' }}>
          <span className="insight-callout-icon">📈</span>
          <span className="insight-callout-text">
            <strong style={{ color: 'var(--text-primary)' }}>Upsell Dynamics:</strong> Repeat users wait an average of <strong>{stats.avgDaysBetweenLoans} days</strong> before returning. When they do, their ticket size {ticketIncreasePct >= 0 ? 'increases' : 'decreases'} by <strong>{Math.abs(ticketIncreasePct)}%</strong>. This small but mighty cohort of {repeatRate}% drives <strong>{repeatVolumePct}%</strong> of your total volume!
            {stats.crossCardRepeatUsers > 0 ? <> <strong>{stats.crossCardRepeatUsers}</strong> repeat users used a different card.</> : null}
          </span>
        </div>

      </div>

      <div className="col-span-6 glass-card animate-fade-in delay-3 flex-col">
        <h3 className="card-title" style={{ fontSize: '1rem', marginBottom: '1rem', textAlign: 'center' }}>Behavioral Shift (1st vs 2nd Loan)</h3>
        <div style={{ height: '300px', width: '100%' }}>
          <Bar data={barChartData} options={barOptions} />
        </div>
      </div>

      <div className="col-span-6 glass-card animate-fade-in delay-3 flex-col">
        <h3 className="card-title" style={{ fontSize: '1rem', marginBottom: '1rem', textAlign: 'center' }}>Portfolio Value by Cohort</h3>
        <div style={{ height: '300px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={portfolioData} layout="vertical" margin={{ top: 20, right: 90, left: 20, bottom: 20 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} width={120} />
              <RTooltip cursor={{fill: 'var(--chart-cursor-fill)'}} contentStyle={{ backgroundColor: 'var(--chart-tooltip-bg)', color: 'var(--chart-tooltip-body)', borderColor: 'var(--chart-tooltip-border)', borderRadius: 'var(--radius-md)' }} formatter={(val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val)} />
              <RBar dataKey="volume" radius={[0, 4, 4, 0]} barSize={40}>
                <LabelList dataKey="volume" position="right" formatter={(val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val)} fill="var(--text-primary)" fontSize={12} />
              </RBar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="col-span-12 animate-fade-in delay-3 flex-col">

        <details style={{ background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <summary style={{ padding: '12px 16px', fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)', outline: 'none' }}>
            Show detailed user-level pattern table
          </summary>
          <div style={{ padding: '16px', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ 
              fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '6px', 
              background: 'var(--bg-surface)', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border-subtle)',
              marginBottom: '1rem'
            }}>
              <span style={{ fontSize: '0.9rem' }}>👉</span> Scroll table horizontally to see more columns
            </div>
            <div className="table-container" style={{ width: '100%', overflowX: 'auto' }}>
              <table className="top-bookings-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr>
                    <th>USER</th>
                    <th style={{ textAlign: 'right' }}>BOOKINGS</th>
                    <th style={{ textAlign: 'right' }}>LOANS</th>
                    <th style={{ textAlign: 'right' }}>CARDS</th>
                    <th style={{ textAlign: 'right' }}>TOTAL AMOUNT</th>
                    <th style={{ textAlign: 'center' }}>TENURE SEQUENCE</th>
                    <th style={{ textAlign: 'center' }}>CARD SEQUENCE</th>
                    <th style={{ textAlign: 'center' }}>PLATFORM</th>
                    <th style={{ textAlign: 'center' }}>DATE SEQUENCE</th>
                    <th style={{ textAlign: 'center' }}>TIME SEQUENCE</th>
                    <th>PATTERN</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.repeatUsersList && stats.repeatUsersList.map((user, idx) => (
                    <tr key={idx}>
                      <td>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'monospace' }}>User {idx + 1}</div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '600', color: 'var(--text-primary)' }}>{user.bookings}</td>
                      <td style={{ textAlign: 'right', fontWeight: '600', color: 'var(--text-primary)' }}>{user.loanCount}</td>
                      <td style={{ textAlign: 'right', fontWeight: '600', color: user.cardCount > 1 ? 'var(--emerald)' : 'var(--text-primary)' }}>{user.cardCount}</td>
                      <td style={{ textAlign: 'right', fontWeight: '600', color: 'var(--primary-light)' }}>{formatCurrency(user.totalAmount).replace('Rs. ', '₹')}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="segment-tag">{user.tenureSequence}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="segment-tag">{user.cardSequence}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="segment-tag">{user.osSequence}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="segment-tag">{user.dates}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="segment-tag">{user.timeSequence}</span>
                      </td>
                      <td style={{ minWidth: '350px' }}>
                        <div style={{ 
                          fontSize: '0.8rem', 
                          color: user.pattern.includes('Warning') ? '#f87171' : 
                                 user.pattern.includes('another card') ? '#818cf8' : 
                                 user.pattern.includes('larger') ? '#34d399' : 
                                 user.pattern.includes('smaller') ? '#fbbf24' : 
                                 'var(--text-secondary)',
                          lineHeight: '1.4',
                          padding: '0.5rem',
                          background: user.pattern.includes('Warning') ? 'rgba(248, 113, 113, 0.05)' : 
                                      user.pattern.includes('another card') ? 'rgba(129, 140, 248, 0.05)' : 
                                      'transparent',
                          borderRadius: '6px',
                          border: user.pattern.includes('Warning') ? '1px solid rgba(248, 113, 113, 0.2)' : 
                                  user.pattern.includes('another card') ? '1px solid rgba(129, 140, 248, 0.2)' : 
                                  'none'
                        }}>
                          {user.pattern}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </details>
      </div>
    </>
  );
};

export default RepeatUserAnalytics;
