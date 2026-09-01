import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label, LabelList } from 'recharts';
import DOMPurify from 'dompurify';
import { formatCurrency } from '../utils/dataProcessor';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="chart-tooltip">
        <div className="tooltip-title">{label}</div>
        <div className="tooltip-item">
          <span className="tooltip-label">Share of Principal:</span>
          <span className="tooltip-value" style={{ color: 'var(--text-tertiary)' }}>
            {data.pShare.toFixed(1)}%
          </span>
        </div>
        <div className="tooltip-item">
          <span className="tooltip-label">Share of Interest:</span>
          <span className="tooltip-value" style={{ color: 'var(--money)' }}>
            {data.iShare.toFixed(1)}%
          </span>
        </div>
      </div>
    );
  }
  return null;
};

const RevenueYieldCharts = ({ tenureData, roiData, summary, roiInsight }) => {
  if (!tenureData || tenureData.length === 0 || !roiData || roiData.length === 0) return null;

  // Calculate dynamic insight for tenure gap
  let insightContent = null;
  let widest = null;
  tenureData.forEach(r => {
    const gap = r.iShare - r.pShare;
    if (r.pShare > 0 && (!widest || Math.abs(gap) > Math.abs(widest.gap))) {
      widest = { ...r, gap };
    }
  });

  if (widest) {
    if (widest.gap > 0) {
      insightContent = `<strong>${widest.name}</strong> tenure contributes ${widest.pShare.toFixed(1)}% of principal but ${widest.iShare.toFixed(1)}% of interest — a <strong>+${widest.gap.toFixed(1)}pt yield premium</strong> driven by compounding over a longer term.`;
    } else {
      insightContent = `<strong>${widest.name}</strong> tenure contributes ${widest.pShare.toFixed(1)}% of principal but only ${widest.iShare.toFixed(1)}% of interest.`;
    }
  }

  const safeSummary = summary || {};


  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 className="card-title revenue-yield-title">Interest Income</h2>
      <p className="card-subtitle revenue-yield-subtitle">What the book actually earns: comparing capital deployed vs interest returned</p>
      <div className="revenue-stat-grid">
        <div className="metric-item revenue-stat-card">
          <span className="metric-label">Total Income (Int+Fee)</span>
          <span className="metric-value" style={{ color: 'var(--emerald)' }}>
            {formatCurrency(safeSummary.totalInterestIncome || 0)}
          </span>
        </div>
        <div className="metric-item revenue-stat-card">
          <span className="metric-label">Interest Income</span>
          <span className="metric-value" style={{ color: 'var(--accent-orange)' }}>
            {formatCurrency(safeSummary.totalInterest || 0)}
          </span>
        </div>
        <div className="metric-item revenue-stat-card">
          <span className="metric-label">Processing Fee</span>
          <span className="metric-value" style={{ color: 'var(--accent-purple)' }}>
            {formatCurrency(safeSummary.totalProcessingFee || 0)}
          </span>
        </div>
        <div className="metric-item revenue-stat-card">
          <span className="metric-label">Income / Booking</span>
          <span className="metric-value">
            {formatCurrency(safeSummary.incomePerUser || 0)}
          </span>
        </div>
        <div className="metric-item revenue-stat-card">
          <span className="metric-label">Referral Users</span>
          <span className="metric-value" style={{ color: 'var(--text-tertiary)' }}>
            {safeSummary.referralCount || 0}/{safeSummary.totalBookings || 0}
          </span>
        </div>
      </div>


      <h3 className="revenue-chart-heading">Interest Income by Segment</h3>
      <p className="card-subtitle">Comparing capital deployed vs interest returned across tenure and ROI bands</p>

      <div className="revenue-chart-grid">
        
        {/* By Tenure Chart */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <h3 style={{ fontSize: '14px', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Interest Income by Tenure</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer>
              <BarChart data={tenureData} margin={{ top: 10, right: 30, left: 30, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--text-tertiary)" 
                  tick={{ fill: 'var(--text-tertiary)' }}
                  tickLine={false}
                  axisLine={false}
                >
                  <Label value="Tenure" offset={-10} position="insideBottom" fill="var(--text-tertiary)" fontSize={11} />
                </XAxis>
                <YAxis 
                  stroke="var(--text-tertiary)" 
                  tick={{ fill: 'var(--text-tertiary)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`}
                  domain={[0, 100]}
                >
                  <Label 
                    value="Share (%)" 
                    angle={-90} 
                    position="insideLeft" 
                    style={{ textAnchor: 'middle', fill: 'var(--text-secondary)' }} 
                    dx={-10}
                    fontSize={11}
                  />
                </YAxis>
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--chart-cursor-fill)' }} />
                <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '12px', paddingBottom: '20px' }} />
                <Bar name="Share of Principal" dataKey="pShare" fill="var(--primary)" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="pShare" position="top" formatter={(v) => `${v.toFixed(0)}%`} fill="var(--text-secondary)" fontSize={10} />
                </Bar>
                <Bar name="Share of Interest Income" dataKey="iShare" fill="var(--emerald)" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="iShare" position="top" formatter={(v) => `${v.toFixed(0)}%`} fill="var(--text-secondary)" fontSize={10} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {insightContent && (
            <div className="insight-callout" style={{ marginTop: '0.5rem' }}>
              <span className="insight-callout-icon">💡</span>
              <span className="insight-callout-text" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(insightContent) }}></span>
            </div>
          )}
        </div>

        {/* By ROI Chart */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <h3 style={{ fontSize: '14px', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Interest Income by ROI Band</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer>
              <BarChart data={roiData} margin={{ top: 10, right: 30, left: 30, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--text-tertiary)" 
                  tick={{ fill: 'var(--text-tertiary)' }}
                  tickLine={false}
                  axisLine={false}
                >
                  <Label value="ROI Band" offset={-10} position="insideBottom" fill="var(--text-tertiary)" fontSize={11} />
                </XAxis>
                <YAxis 
                  stroke="var(--text-tertiary)" 
                  tick={{ fill: 'var(--text-tertiary)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`}
                  domain={[0, 100]}
                >
                  <Label 
                    value="Share (%)" 
                    angle={-90} 
                    position="insideLeft" 
                    style={{ textAnchor: 'middle', fill: 'var(--text-secondary)' }} 
                    dx={-10}
                    fontSize={11}
                  />
                </YAxis>
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--chart-cursor-fill)' }} />
                <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '12px', paddingBottom: '20px' }} />
                <Bar name="Share of Principal" dataKey="pShare" fill="var(--primary)" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="pShare" position="top" formatter={(v) => `${v.toFixed(0)}%`} fill="var(--text-secondary)" fontSize={10} />
                </Bar>
                <Bar name="Share of Interest Income" dataKey="iShare" fill="var(--emerald)" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="iShare" position="top" formatter={(v) => `${v.toFixed(0)}%`} fill="var(--text-secondary)" fontSize={10} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {roiInsight && (
            <div className="insight-callout" style={{ marginTop: '0.5rem' }}>
              <span className="insight-callout-icon">💡</span>
              <span className="insight-callout-text">
                <strong>ROI tolerance is real.</strong> {roiInsight}
              </span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default RevenueYieldCharts;
