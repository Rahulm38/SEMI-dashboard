import { Moon, Sun, UploadCloud } from 'lucide-react';

const formatDataRange = (data, fileName) => {
  if (!data?.minDateTime || !data?.maxDateTime) return fileName;

  const format = value => new Date(value).toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return `Data from ${format(data.minDateTime)} to ${format(data.maxDateTime)}`;
};

const DashboardHeader = ({
  data,
  fileName,
  theme,
  showThemeHint,
  isUploadHovered,
  onFileUpload,
  onUploadHoverChange,
  onThemeToggle,
}) => (
  <header className="header animate-fade-in delay-1">
    <div>
      <h1 className="header-title">SEMI Analytics</h1>
      <p className="header-subtitle">
        Synthetic Smart EMI portfolio · no real customer data ·
        <span className="header-data-range">{formatDataRange(data, fileName)}</span>
      </p>
    </div>

    <div className="header-actions">
      <div
        className="upload-control"
        onMouseEnter={() => onUploadHoverChange(true)}
        onMouseLeave={() => onUploadHoverChange(false)}
      >
        <label className="btn-secondary">
          <UploadCloud size={16} color="var(--primary-light)" />
          <span>Upload CSV locally</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={onFileUpload}
            className="visually-hidden-input"
          />
        </label>
        {isUploadHovered && (
          <div className="upload-help">
            <strong className="upload-help-title">Private session</strong>
            Uploaded CSVs are processed in this browser session only and are not saved or synced.
          </div>
        )}
      </div>

      <button
        onClick={onThemeToggle}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        className={`theme-toggle ${showThemeHint ? 'theme-toggle--hinting' : ''}`}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
      </button>
    </div>
  </header>
);

export default DashboardHeader;
