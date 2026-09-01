import { FileSpreadsheet, RefreshCw } from 'lucide-react';

export const LoadingState = () => (
  <div className="dashboard-state dashboard-state--loading">
    <RefreshCw className="spin" size={32} />
  </div>
);

export const ErrorState = ({ error }) => (
  <div className="dashboard-state dashboard-state--error">
    {error}
  </div>
);

export const EmptyDatabaseState = () => (
  <div className="dashboard-state dashboard-state--empty animate-fade-in">
    <FileSpreadsheet size={48} className="dashboard-state-icon" />
    <h2>No Data Available</h2>
    <p>
      The global database is currently empty. Please use the <strong>Upload CSV</strong> button in the top right to analyze your file and sync it with the team.
    </p>
  </div>
);

export const NoMatchingRecordsState = () => (
  <div className="dashboard-state dashboard-state--no-results">
    <h2>No matching records</h2>
    <p>Try adjusting your global filters.</p>
  </div>
);
