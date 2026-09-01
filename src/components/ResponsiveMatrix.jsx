const getKey = (item, fallback) => {
  if (item === null || item === undefined) return fallback;
  if (typeof item === 'string' || typeof item === 'number') return item;
  return item.key || item.id || item.label || fallback;
};

const ResponsiveMatrix = ({
  xLabel,
  yLabel,
  columns,
  rows,
  renderColumnHeader = column => column,
  renderRowHeader = row => row,
  renderCell,
}) => (
  <div className="matrix-container responsive-matrix">
    <div className="matrix-label responsive-matrix-x-label">{xLabel}</div>
    <div className="responsive-matrix-body">
      <div className="responsive-matrix-y-label">
        <span>{yLabel}</span>
      </div>
      <div
        className="responsive-matrix-grid"
        style={{ '--matrix-columns': columns.length }}
      >
        <div className="matrix-row responsive-matrix-row">
          <div className="matrix-header"></div>
          {columns.map((column, columnIndex) => (
            <div key={`header-${getKey(column, columnIndex)}`} className="matrix-header-col">
              {renderColumnHeader(column)}
            </div>
          ))}
        </div>

        {rows.map((row, rowIndex) => (
          <div key={`row-${getKey(row, rowIndex)}`} className="matrix-row responsive-matrix-row">
            <div className="matrix-header">{renderRowHeader(row)}</div>
            {columns.map((column, columnIndex) => (
              <div key={`cell-${getKey(row, rowIndex)}-${getKey(column, columnIndex)}`} className="responsive-matrix-cell-slot">
                {renderCell(row, column)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default ResponsiveMatrix;
