import { lazy, Suspense, useState, useEffect, useMemo } from 'react';
import { DollarSign, Star, TrendingUp, LayoutGrid, Sliders } from 'lucide-react';
import { processCsvData, calculateMetrics, sanitizeCsvForStorage } from './utils/dataProcessor';
import { generateDemoCsv } from './utils/demoData';
import DashboardHeader from './components/DashboardHeader';
import GlobalSlicers from './components/GlobalSlicers';
import { EmptyDatabaseState, ErrorState, LoadingState, NoMatchingRecordsState } from './components/DashboardStates';

const SummaryCards = lazy(() => import('./components/SummaryCards'));
const BookingSizeChart = lazy(() => import('./components/BookingSizeChart'));
const EmiComfortChart = lazy(() => import('./components/EmiComfortChart'));
const TenureBehaviorChart = lazy(() => import('./components/TenureBehaviorChart'));
const ValueConcentrationChart = lazy(() => import('./components/ValueConcentrationChart'));
const RoiMatrix = lazy(() => import('./components/RoiMatrix'));
const SegmentMatrix = lazy(() => import('./components/SegmentMatrix'));
const KeyTakeaways = lazy(() => import('./components/KeyTakeaways'));
const TemporalTrendsChart = lazy(() => import('./components/TemporalTrendsChart'));
const ProcessingFeeAnalysis = lazy(() => import('./components/ProcessingFeeAnalysis'));
const TopBookingsTable = lazy(() => import('./components/TopBookingsTable'));
const UserAveragesCard = lazy(() => import('./components/UserAveragesCard'));
const SectionDivider = lazy(() => import('./components/SectionDivider'));

const FeeBurdenChart = lazy(() => import('./components/FeeBurdenChart'));
const ProfitabilityQuadrant = lazy(() => import('./components/ProfitabilityQuadrant'));
const MarketingHeatmap = lazy(() => import('./components/MarketingHeatmap'));
const RevenueYieldCharts = lazy(() => import('./components/RevenueYieldCharts'));
const BookingMapChart = lazy(() => import('./components/BookingMapChart'));
const RepeatUserAnalytics = lazy(() => import('./components/RepeatUserAnalytics'));
const PlatformMix = lazy(() => import('./components/PlatformMix'));

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState('Demo portfolio');
  const [theme, setTheme] = useState(localStorage.getItem('semi_theme') || 'light');
  const [showThemeHint, setShowThemeHint] = useState(true);
  const [isUploadHovered, setIsUploadHovered] = useState(false);
  const [filters, setFilters] = useState({ startDate: '', endDate: '' });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('semi_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!showThemeHint) return;

    const timer = window.setTimeout(() => {
      setShowThemeHint(false);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [showThemeHint]);

  const processAndSetData = (csvString) => {
    processCsvData(csvString)
      .then(result => {
        if (!result.rawData || result.rawData.length === 0) {
          setData(null);
          setLoading(false);
          return;
        }

        const validDates = result.rawData
          .filter(d => d.date && !isNaN(d.date.getTime()))
          .map(d => d.date);

        let minDateStr = '';
        let maxDateStr = '';
        let minDateTime = '';
        let maxDateTime = '';

        if (validDates.length) {
          const minEpoch = Math.min(...validDates);
          const maxEpoch = Math.max(...validDates);
          minDateStr = new Date(minEpoch).toISOString().split('T')[0];
          maxDateStr = new Date(maxEpoch).toISOString().split('T')[0];
          minDateTime = new Date(minEpoch).toISOString();
          maxDateTime = new Date(maxEpoch).toISOString();
        }

        setData({ ...result, minDateStr, maxDateStr, minDateTime, maxDateTime });
        setFilters({ startDate: minDateStr, endDate: maxDateStr });
        setError(null);
        setLoading(false);
      })
      .catch(parseErr => {
        console.error('Failed to parse dashboard data', parseErr);
        setError('Failed to initialize the dashboard.');
        setLoading(false);
      });
  };

  useEffect(() => {
    try {
      localStorage.removeItem('latest_csv');
    } catch (storageErr) {
      console.warn('Could not clear legacy CSV cache.', storageErr);
    }

    processAndSetData(generateDemoCsv());
  }, []);

  const filteredLocalMetrics = useMemo(() => {
    if (!data?.rawData) return null;

    let filteredData = data.rawData;
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      filteredData = filteredData.filter(d => d.date && d.date >= start);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      filteredData = filteredData.filter(d => d.date && d.date <= end);
    }

    return calculateMetrics(filteredData);
  }, [data?.rawData, filters.startDate, filters.endDate]);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const MAX_FILE_SIZE = 4.5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      alert('Please upload a CSV smaller than 4.5MB.');
      event.target.value = '';
      return;
    }

    setFileName(`${file.name} · local session only`);
    setLoading(true);
    setError(null);
    setFilters({ startDate: '', endDate: '' });

    const reader = new FileReader();
    reader.onload = (e) => {
      const sanitizedCsv = sanitizeCsvForStorage(e.target.result);

      processCsvData(sanitizedCsv)
        .then(result => {
          if (!result.rawData || result.rawData.length === 0) {
            throw new Error('No valid data found in CSV');
          }

          const validDates = result.rawData
            .filter(d => d.date && !isNaN(d.date.getTime()))
            .map(d => d.date);

          let minDateStr = '';
          let maxDateStr = '';
          let minDateTime = '';
          let maxDateTime = '';

          if (validDates.length) {
            const minEpoch = Math.min(...validDates);
            const maxEpoch = Math.max(...validDates);
            minDateStr = new Date(minEpoch).toISOString().split('T')[0];
            maxDateStr = new Date(maxEpoch).toISOString().split('T')[0];
            minDateTime = new Date(minEpoch).toISOString();
            maxDateTime = new Date(maxEpoch).toISOString();
          }

          setData({ ...result, minDateStr, maxDateStr, minDateTime, maxDateTime });
          setFilters({ startDate: minDateStr, endDate: maxDateStr });
          setError(null);
          setLoading(false);
        })
        .catch(err => {
          setError(
            err.message === 'No valid data found in CSV'
              ? 'The uploaded file contains no valid EMI records.'
              : 'Failed to parse CSV file locally.'
          );
          setLoading(false);
        });
    };
    reader.readAsText(file);
  };

  const m = filteredLocalMetrics || data?.metrics;

  return (
    <div className="app-container">
      <DashboardHeader
        data={data}
        fileName={fileName}
        theme={theme}
        showThemeHint={showThemeHint}
        isUploadHovered={isUploadHovered}
        onFileUpload={handleFileUpload}
        onUploadHoverChange={setIsUploadHovered}
        onThemeToggle={() => {
          setTheme(t => t === 'dark' ? 'light' : 'dark');
          setShowThemeHint(false);
        }}
      />

      {loading && <LoadingState />}

      {error && <ErrorState error={error} />}

      {!loading && !data && !error && <EmptyDatabaseState />}

      {!loading && data && <GlobalSlicers data={data} filters={filters} setFilters={setFilters} />}

      {!loading && !m && (data?.rawData || data?.minDateStr) && <NoMatchingRecordsState />}

      {!loading && m && (
        <Suspense fallback={<LoadingState />}>
        <div id="dashboard-content" className="dashboard-content">
          <div className="pdf-page-section">
            <div className="dashboard-grid">
              <div className="col-span-12 glass-card animate-fade-in delay-2 flex-col">
                <div className="card-header overview-card-header">
                  <h2 className="card-title overview-card-title">Portfolio Overview</h2>
                  <span className="date-pill">
                    {m.summary.dateRange}
                  </span>
                </div>
                <Suspense fallback={<div className="loading-overview">Loading overview...</div>}>
                  <SummaryCards metrics={m.summary} />
                </Suspense>
              </div>
            </div>
          </div>

          <SectionDivider icon={<TrendingUp size={16} />} title="Conversion Activity" subtitle="When does demand arrive? Volume, velocity and day-of-week patterns" />

          <div className="pdf-page-section">
            <div className="dashboard-grid">
              <div className="col-span-12 glass-card animate-fade-in delay-3 flex-col">
                <TemporalTrendsChart timeData={m.timeData} insight={m.insights.biggestDay} />
              </div>
            </div>
          </div>

          <div className="pdf-page-section">
            <div className="dashboard-grid">
              <div className="col-span-12 glass-card animate-fade-in delay-3 flex-col">
                <MarketingHeatmap data={m.heatmapData} />
              </div>
            </div>
          </div>

          <SectionDivider icon={<LayoutGrid size={16} />} title="Segment Landscape" subtitle="Ticket size × EMI footprint × ROI distribution across all bookings" />

          <div className="pdf-page-section">
            <div className="dashboard-grid">
              <div className="col-span-12 glass-card animate-fade-in delay-2 flex-col">
                <BookingMapChart scatterData={m.scatterData} />
              </div>
            </div>
          </div>

          <div className="pdf-page-section">
            <div className="dashboard-grid">
              <div className="col-span-12 glass-card animate-fade-in delay-3 flex-col">
                <SegmentMatrix matrix={m.matrix} ticketKeys={m.ticketKeys} emiKeys={m.emiKeys} />
              </div>
            </div>
          </div>

          <div className="pdf-page-section">
            <div className="dashboard-grid">
              <div className="col-span-12 glass-card animate-fade-in delay-4 flex-col">
                <RoiMatrix matrix={m.roiMatrix} ticketKeys={m.ticketKeys} roiKeys={m.roiKeys} />
              </div>
            </div>
          </div>

          <SectionDivider icon={<DollarSign size={16} />} title="Revenue & Profitability" subtitle="Yield, fee structure and income concentration across the portfolio" />

          <div className="pdf-page-section">
            <div className="dashboard-grid">
              <div className="col-span-12 glass-card animate-fade-in delay-3 flex-col">
                <RevenueYieldCharts tenureData={m.revenueByTenureData} roiData={m.revenueByRoiData} summary={m.summary} roiInsight={m.insights.roi} />
              </div>
            </div>
          </div>

          <div className="pdf-page-section">
            <div className="dashboard-grid">
              <div className="col-span-12 glass-card animate-fade-in delay-3 flex-col">
                <ProfitabilityQuadrant data={m.quadrantData} />
              </div>
            </div>
          </div>

          <div className="pdf-page-section">
            <div className="dashboard-grid">
              <div className="col-span-6 glass-card animate-fade-in delay-3 flex-col">
                <ProcessingFeeAnalysis feeData={m.feeData} insight={m.insights.fee} />
              </div>
              <div className="col-span-6 glass-card animate-fade-in delay-3 flex-col">
                <FeeBurdenChart data={m.quadrantData} feeBurdenByBracket={m.feeBurdenData} />
              </div>
            </div>
          </div>

          <div className="pdf-page-section">
            <div className="dashboard-grid">
              <div className="col-span-12 glass-card animate-fade-in delay-3 flex-col">
                <PlatformMix data={m.platformData} insight={m.insights.platform} />
              </div>
            </div>
          </div>

          <SectionDivider icon={<Sliders size={16} />} title="Loan Product Behaviour" subtitle="Ticket distribution, EMI affordability and tenure preference across the book" />

          <div className="pdf-page-section">
            <div className="dashboard-grid">
              <div className="col-span-12 glass-card animate-fade-in delay-3 flex-col">
                <div className="card-header">
                  <h2 className="card-title">Loan Averages</h2>
                  <p className="card-subtitle">Typical ticket and EMI across the converted portfolio</p>
                </div>
                <UserAveragesCard metrics={m.summary} />
              </div>
            </div>
          </div>

          <div className="pdf-page-section">
            <div className="dashboard-grid">
              <div className="col-span-6 glass-card animate-fade-in delay-3 flex-col">
                <BookingSizeChart data={m.ticketData} insight={m.insights.ticket} />
              </div>
              <div className="col-span-6 glass-card animate-fade-in delay-3 flex-col">
                <EmiComfortChart data={m.emiData} insight={m.insights.emi} />
              </div>
            </div>
          </div>

          <div className="pdf-page-section">
            <div className="dashboard-grid">
              <div className="col-span-12 glass-card animate-fade-in delay-3 flex-col">
                <TenureBehaviorChart data={m.tenureData} tenureByTicket={m.tenureByTicket} insight={m.insights.tenure} />
              </div>
            </div>
          </div>

          <SectionDivider icon={<Star size={16} />} title="Customer Quality & Loyalty" subtitle="Who is coming back, how much they bring, and what the top cohort looks like" />

          <div className="pdf-page-section">
            <div className="dashboard-grid">
              <div className="col-span-12 glass-card animate-fade-in delay-3 flex-col">
                <ValueConcentrationChart topBookings={m.topBookings} totalConverted={m.summary.totalConverted} insight={m.insights.concentration} />
              </div>
            </div>
          </div>

          <div className="pdf-page-section">
            <div className="dashboard-grid">
              <RepeatUserAnalytics metrics={m.summary} />
            </div>
          </div>

          <div className="pdf-page-section">
            <div className="dashboard-grid">
              <div className="col-span-12 glass-card animate-fade-in delay-3 flex-col">
                <TopBookingsTable topBookings={m.topBookingsDetailed} />
              </div>
            </div>
          </div>

          <KeyTakeaways takeaways={m.keyTakeaways} />
        </div>
        </Suspense>
      )}
    </div>
  );
}

export default App;
