const SectionDivider = ({ icon, title, subtitle }) => {
  return (
    <div className="section-divider">
      <div className="section-divider-content">
        {icon && <span className="section-divider-icon">{icon}</span>}
        <h3 className="section-divider-title">
          {title}
        </h3>
      </div>
      {subtitle && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginLeft: '12px' }}>{subtitle}</span>
      )}
    </div>
  );
};

export default SectionDivider;
