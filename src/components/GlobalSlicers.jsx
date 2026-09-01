import { Filter } from 'lucide-react';

const GlobalSlicers = ({ data, filters, setFilters }) => (
  <div className="global-slicers-card animate-fade-in delay-2">
    <div className="slicers-header">
      <Filter size={18} className="slicers-icon" />
      <span className="slicers-title">Global Slicers</span>
    </div>

    <div className="slicer-group">
      <label className="slicer-label">Start Date</label>
      <input
        type="date"
        className="slicer-input"
        min={data.minDateStr}
        max={filters.endDate || data.maxDateStr}
        value={filters.startDate}
        onChange={(event) => setFilters(previous => ({ ...previous, startDate: event.target.value }))}
      />
    </div>

    <div className="slicer-group">
      <label className="slicer-label">End Date</label>
      <input
        type="date"
        className="slicer-input"
        min={filters.startDate || data.minDateStr}
        max={data.maxDateStr}
        value={filters.endDate}
        onChange={(event) => setFilters(previous => ({ ...previous, endDate: event.target.value }))}
      />
    </div>
  </div>
);

export default GlobalSlicers;
