import { useEffect, useState } from 'react';

export const TENURE_CONFIG = [
  { label: '6M tenure', value: 6, hex: '#a855f7' },
  { label: '12M tenure', value: 12, hex: '#10b981' },
  { label: '24M tenure', value: 24, hex: '#f59e0b' },
  { label: '36M tenure', value: 36, hex: '#06b6d4' },
  { label: '48M+ tenure', value: 48, hex: '#6366f1' },
];

export const getTenureCategory = (tenure) => {
  if (tenure <= 6) return 6;
  if (tenure <= 12) return 12;
  if (tenure <= 24) return 24;
  if (tenure <= 36) return 36;
  return 48;
};

export const getTenureColor = (tenure) => {
  const category = getTenureCategory(tenure);
  return TENURE_CONFIG.find((item) => item.value === category)?.hex || '#6366f1';
};

export const withAlpha = (hex, alpha = 'cc') => `${hex}${alpha}`;

const fallbackTheme = {
  axisLabel: '#e5e7eb',
  axisTick: '#cbd5e1',
  axisLine: 'rgba(203, 213, 225, 0.28)',
  grid: 'rgba(203, 213, 225, 0.14)',
  annotationLine: 'rgba(203, 213, 225, 0.38)',
  tooltipBg: 'rgba(24, 24, 27, 0.96)',
  tooltipTitle: '#fafafa',
  tooltipBody: '#e4e4e7',
  tooltipMuted: '#a1a1aa',
  tooltipBorder: 'rgba(255, 255, 255, 0.12)',
  cursorFill: 'rgba(99, 102, 241, 0.08)',
  roiOutline: '#f8fafc',
  roiBadgeBg: 'rgba(248, 250, 252, 0.06)',
};

export const getChartTheme = () => {
  if (typeof window === 'undefined') return fallbackTheme;

  const root = document.documentElement;
  const styles = getComputedStyle(root);
  const theme = root.getAttribute('data-theme') || 'dark';
  const readVar = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;
  const light = theme === 'light';

  return {
    axisLabel: readVar('--chart-axis-label', light ? '#27272a' : '#e4e4e7'),
    axisTick: readVar('--chart-axis-tick', light ? '#52525b' : '#a1a1aa'),
    axisLine: readVar('--chart-axis-line', light ? 'rgba(9, 9, 11, 0.16)' : 'rgba(244, 244, 245, 0.18)'),
    grid: readVar('--chart-grid', light ? 'rgba(9, 9, 11, 0.08)' : 'rgba(244, 244, 245, 0.08)'),
    annotationLine: readVar('--chart-annotation-line', light ? 'rgba(9, 9, 11, 0.28)' : 'rgba(244, 244, 245, 0.30)'),
    tooltipBg: readVar('--chart-tooltip-bg', light ? 'rgba(255, 255, 255, 0.96)' : 'rgba(24, 24, 27, 0.96)'),
    tooltipTitle: readVar('--chart-tooltip-title', light ? '#09090b' : '#fafafa'),
    tooltipBody: readVar('--chart-tooltip-body', light ? '#27272a' : '#e4e4e7'),
    tooltipMuted: readVar('--chart-tooltip-muted', light ? '#52525b' : '#a1a1aa'),
    tooltipBorder: readVar('--chart-tooltip-border', light ? 'rgba(9, 9, 11, 0.12)' : 'rgba(255, 255, 255, 0.12)'),
    cursorFill: readVar('--chart-cursor-fill', light ? 'rgba(79, 70, 229, 0.08)' : 'rgba(99, 102, 241, 0.10)'),
    roiOutline: light ? '#27272a' : '#f8fafc',
    roiBadgeBg: light ? 'rgba(9, 9, 11, 0.035)' : 'rgba(248, 250, 252, 0.06)',
  };
};

export const useChartTheme = () => {
  const [theme, setTheme] = useState(() => getChartTheme());

  useEffect(() => {
    const refreshTheme = () => setTheme(getChartTheme());
    refreshTheme();

    const observer = new MutationObserver(refreshTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return theme;
};

export const getChartJsTooltipOptions = (theme, overrides = {}) => ({
  backgroundColor: theme.tooltipBg,
  titleColor: theme.tooltipTitle,
  bodyColor: theme.tooltipBody,
  borderColor: theme.tooltipBorder,
  borderWidth: 1,
  padding: 10,
  boxPadding: 6,
  displayColors: false,
  ...overrides,
});
