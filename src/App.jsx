import React, { useState, useEffect } from 'react';
import { UploadCloud, FileSpreadsheet, RefreshCw, Filter } from 'lucide-react';
import { processCsvData, calculateMetrics } from './utils/dataProcessor';
import SummaryCards from './components/SummaryCards';
import BookingSizeChart from './components/BookingSizeChart';
import EmiComfortChart from './components/EmiComfortChart';
import TenureBehaviorChart from './components/TenureBehaviorChart';
import RoiBandChart from './components/RoiBandChart';
import ValueConcentrationChart from './components/ValueConcentrationChart';
import SegmentMatrix from './components/SegmentMatrix';
import TemporalTrendsChart from './components/TemporalTrendsChart';
import CostOfBorrowingChart from './components/CostOfBorrowingChart';
import ProcessingFeeAnalysis from './components/ProcessingFeeAnalysis';
import TopBookingsTable from './components/TopBookingsTable';
import BestSegmentCard from './components/BestSegmentCard';
import FeeBurdenChart from './components/FeeBurdenChart';
import ProfitabilityQuadrant from './components/ProfitabilityQuadrant';
import MarketingHeatmap from './components/MarketingHeatmap';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState('data.csv');
  
  const [filters, setFilters] = useState({ tenure: 'All', roi: 'All' });

  useEffect(() => {
    fetch('/data.csv')
      .then(response => {
        if (!response.ok) throw new Error("Could not find default data.csv");
        return response.text();
      })
      .then(csv => processCsvData(csv))
      .then(result => {
        setData(result);
        setLoading(false);
      })
      .catch(err => {
        console.log("No default data, wait for upload.", err);
        setLoading(false);
      });
  }, []);

  // Handle Global Filters
  useEffect(() => {
    if (data && data.rawData) {
      let filteredData = data.rawData;
      if (filters.tenure !== 'All') {
        filteredData = filteredData.filter(d => d.tenure.toString() === filters.tenure);
      }
      if (filters.roi !== 'All') {
        if (filters.roi === '<=12%') filteredData = filteredData.filter(d => d.interest_rate <= 12);
        else if (filters.roi === '12-18%') filteredData = filteredData.filter(d => d.interest_rate > 12 && d.interest_rate <= 18);
        else if (filters.roi === '18-22%') filteredData = filteredData.filter(d => d.interest_rate > 18 && d.interest_rate <= 22);
        else if (filters.roi === '22%+') filteredData = filteredData.filter(d => d.interest_rate > 22);
      }
      
      const newMetrics = calculateMetrics(filteredData);
      setData(prev => ({ ...prev, metrics: newMetrics }));
    }
  }, [filters, data?.rawData]);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setFileName(file.name);
    setLoading(true);
    setFilters({ tenure: 'All', roi: 'All' }); // Reset filters
    
    const reader = new FileReader();
    reader.onload = (e) => {
      processCsvData(e.target.result)
        .then(result => {
          setData(result);
          setError(null);
          setLoading(false);
        })
        .catch(err => {
          setError("Failed to parse CSV file");
          setLoading(false);
        });
    };
    reader.readAsText(file);
  };

  const m = data?.metrics;

  return (
    <div className="app-container">
      <header className="header animate-fade-in delay-1">
        <div>
          <h1 className="header-title">SEMI Analytics</h1>
          <p className="header-subtitle">Interactive dashboard for Smart EMI conversions · <span style={{ opacity: 0.7 }}>{fileName}</span></p>
        </div>
        
        <label className="drop-zone">
          <UploadCloud size={20} color="var(--primary-light)" />
          <span className="drop-text">Upload new CSV</span>
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
          />
        </label>
      </header>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--primary)' }}>
          <RefreshCw className="spin" size={32} />
        </div>
      )}

      {error && (
        <div style={{ color: 'var(--accent-orange)', padding: '2rem', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {/* Global Filters UI */}
      {!loading && data?.rawData && (
        <div className="filters-container animate-fade-in delay-2" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', background: 'var(--bg-card)', padding: '1rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', alignItems: 'center' }}>
          <Filter size={18} color="var(--text-muted)" />
          <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem', marginRight: '1rem' }}>Global Slicers:</span>
          
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tenure:</label>
            <select 
              value={filters.tenure} 
              onChange={(e) => setFilters(p => ({...p, tenure: e.target.value}))}
              style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.25rem 0.5rem', outline: 'none' }}
            >
              <option value="All">All Tenures</option>
              <option value="6">6 Months</option>
              <option value="12">12 Months</option>
              <option value="24">24 Months</option>
              <option value="36">36 Months</option>
              <option value="48">48 Months</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: '1.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ROI Band:</label>
            <select 
              value={filters.roi} 
              onChange={(e) => setFilters(p => ({...p, roi: e.target.value}))}
              style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.25rem 0.5rem', outline: 'none' }}
            >
              <option value="All">All ROI</option>
              <option value="<=12%">Under 12%</option>
              <option value="12-18%">12% - 18%</option>
              <option value="18-22%">18% - 22%</option>
              <option value="22%+">22%+</option>
            </select>
          </div>
        </div>
      )}

      {/* Empty State when filters yield 0 results */}
      {!loading && !m && data?.rawData && (
        <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
          <h2>No matching records</h2>
          <p>Try adjusting your global filters.</p>
        </div>
      )}

      {!loading && m && (
        <div className="dashboard-grid">
          {/* ━━━ Overview ━━━ */}
          <div className="col-span-12 glass-card animate-fade-in delay-2">
            <SummaryCards metrics={m.summary} />
          </div>

          {/* ━━━ Size & Affordability ━━━ */}
          <div className="section-divider">
            <span className="section-label">📊 Size & Affordability</span>
          </div>

          <div className="col-span-8 glass-card animate-fade-in delay-3" style={{ display: 'flex', flexDirection: 'column' }}>
            <BookingSizeChart data={m.ticketData} insight={m.insights.ticket} />
          </div>

          <div className="col-span-4 glass-card animate-fade-in delay-3" style={{ display: 'flex', flexDirection: 'column' }}>
            <EmiComfortChart data={m.emiData} insight={m.insights.emi} />
          </div>

          {/* ━━━ Segmentation & Concentration ━━━ */}
          <div className="section-divider">
            <span className="section-label">🎯 Segmentation & Concentration</span>
          </div>

          <div className="col-span-12 glass-card animate-fade-in delay-3">
            <SegmentMatrix matrix={m.matrix} />
            <BestSegmentCard insight={{
              ticketRange: m.bestSegmentData?.ticketRange ? `Rs. ${m.bestSegmentData.ticketRange}` : 'N/A',
              emiRange: m.bestSegmentData?.emiRange ? `${m.bestSegmentData.emiRange}/mo` : 'N/A',
              users: m.bestSegmentData?.users,
              amountShare: m.bestSegmentData?.amount 
                ? ((m.bestSegmentData.amount / m.summary.totalConverted) * 100).toFixed(1)
                : '0',
              description: m.insights.bestSegment
            }} />
          </div>

          {/* ━━━ Profitability Quadrant ━━━ */}
          <div className="col-span-12 glass-card animate-fade-in delay-3">
            <ProfitabilityQuadrant data={m.quadrantData} />
          </div>

          {/* ━━━ Value Concentration ━━━ */}
          <div className="col-span-12 glass-card animate-fade-in delay-3" style={{ display: 'flex', flexDirection: 'column' }}>
            <ValueConcentrationChart topBookings={m.topBookings} totalConverted={m.summary.totalConverted} insight={m.insights.concentration} />
          </div>

          {/* ━━━ Tenure & Interest ━━━ */}
          <div className="section-divider">
            <span className="section-label">📈 Average Interest and Tenure</span>
          </div>

          <div className="col-span-12 glass-card animate-fade-in delay-3" style={{ display: 'flex', flexDirection: 'column' }}>
            <TenureBehaviorChart data={m.tenureData} tenureByTicket={m.tenureByTicket} insight={m.insights.tenure} />
          </div>

          <div className="col-span-6 glass-card animate-fade-in delay-3" style={{ display: 'flex', flexDirection: 'column' }}>
            <RoiBandChart data={m.roiData} insight={m.insights.roi} />
          </div>

          <div className="col-span-6 glass-card animate-fade-in delay-3" style={{ display: 'flex', flexDirection: 'column' }}>
            <CostOfBorrowingChart costData={m.costData} />
          </div>

          {/* ━━━ Temporal Analysis ━━━ */}
          <div className="section-divider">
            <span className="section-label">⏱️ Temporal Trends</span>
          </div>
          
          <div className="col-span-12 glass-card animate-fade-in delay-3" style={{ display: 'flex', flexDirection: 'column' }}>
            <TemporalTrendsChart timeData={m.timeData} insight={`${m.insights.time} ${m.insights.biggestDay}`} />
          </div>

          {/* ━━━ Unit Economics & Pricing ━━━ */}
          <div className="section-divider">
            <span className="section-label">💸 Unit Economics & Pricing</span>
          </div>

          <div className="col-span-12 glass-card animate-fade-in delay-3">
            <FeeBurdenChart data={m.quadrantData} />
          </div>
          
          <div className="col-span-6 glass-card animate-fade-in delay-3" style={{ display: 'flex', flexDirection: 'column' }}>
            <ProcessingFeeAnalysis feeData={m.feeData} insight={m.insights.fee} />
          </div>

          <div className="col-span-6 glass-card animate-fade-in delay-3">
            <MarketingHeatmap data={m.heatmapData} />
          </div>

          {/* ━━━ Top Bookings ━━━ */}
          <div className="section-divider">
            <span className="section-label">🏆 Top Bookings Details</span>
          </div>

          <div className="col-span-12 glass-card animate-fade-in delay-3" style={{ marginBottom: '2rem' }}>
            <TopBookingsTable topBookings={m.topBookingsDetailed} />
          </div>
        </div>
      )}
      
      {!loading && !data && !error && (
        <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
          <FileSpreadsheet size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
          <h2>No data available</h2>
          <p>Please upload a SEMI user details CSV to view insights.</p>
        </div>
      )}
    </div>
  );
}

export default App;
