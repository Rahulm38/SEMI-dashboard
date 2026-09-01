import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import Papa from 'papaparse';
import nodemailer from 'nodemailer';
import { processCsvData, formatCurrency } from '../src/utils/dataProcessor.js';

const execFileAsync = promisify(execFile);

const DASHBOARD_URL = 'https://rahulm38.github.io/SEMI-dashboard/';
const FIREBASE_CSV_URL = 'https://semidb-73e25-default-rtdb.firebaseio.com/latest_csv.json';

const DEFAULT_STATE_FILE = './.semi-dashboard-email-state.json';
const DEFAULT_OUTPUT_DIR = './scratch/emails';

const args = process.argv.slice(2);
const command = args[0] || 'prepare';

const optionValue = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const repoRoot = process.cwd();
const stateFile = path.resolve(repoRoot, optionValue('--state-file', DEFAULT_STATE_FILE));
const outputDir = path.resolve(repoRoot, optionValue('--output-dir', DEFAULT_OUTPUT_DIR));
const dashboardUrl = optionValue('--dashboard-url', DASHBOARD_URL);
const csvFile = optionValue('--csv-file');

const parseNumber = (value) => {
  if (value === null || value === undefined) return 0;
  const cleaned = String(value).replace(/[₹,\s]/g, '').replace(/^Rs\./i, '');
  return parseFloat(cleaned) || 0;
};

const parseDate = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(raw);
  const isoCandidate = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const parsed = new Date(hasTimezone ? isoCandidate : `${isoCandidate}+05:30`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const dateOnly = (date) => date.toISOString().slice(0, 10);

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const stripTags = (value) => String(value ?? '').replace(/<[^>]*>/g, '');

const formatNumber = (value) => Math.round(Number(value || 0)).toLocaleString('en-IN');
const formatPct = (value) => `${Number(value || 0).toFixed(1)}%`;
const formatMoney = (value) => formatCurrency(Number(value || 0));
const formatDayMonth = (value) => new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Asia/Kolkata',
}).format(new Date(value));
const formatDayMonthTime = (value) => new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Asia/Kolkata',
}).format(new Date(value)).replace(/\b(am|pm)\b/gi, (match) => match.toUpperCase());

const formatChartDate = (value) => {
  const parsed = new Date(`${value}T00:00:00+05:30`);
  return Number.isNaN(parsed.getTime()) ? value : formatDayMonth(parsed);
};

const formatTakeawayDate = (value) => {
  if (!value || value === 'N/A') return 'N/A';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).replace(/\s+\d{2}:\d{2}:\d{2}.*$/, '');
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(date);
};

const readJson = async (file, fallback) => {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
};

const writeJson = async (file, value) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
};

const fetchLatestCsv = async () => {
  if (csvFile) {
    return fs.readFile(path.resolve(repoRoot, csvFile), 'utf8');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    try {
      const response = await fetch(FIREBASE_CSV_URL, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Firebase returned ${response.status} ${response.statusText}`);
      }
      const csv = await response.json();
      if (typeof csv !== 'string' || csv.trim().length === 0) {
        throw new Error('Firebase latest_csv is empty or not a CSV string');
      }
      return csv;
    } catch (fetchError) {
      const { stdout } = await execFileAsync('curl', [
        '--fail',
        '--silent',
        '--show-error',
        '--max-time',
        '20',
        FIREBASE_CSV_URL,
      ], { timeout: 25_000, maxBuffer: 10 * 1024 * 1024 });

      try {
        const csv = JSON.parse(stdout);
        if (typeof csv !== 'string' || csv.trim().length === 0) {
          throw new Error('Firebase latest_csv is empty or not a CSV string');
        }
        return csv;
      } catch (parseError) {
        throw new Error(`Firebase CSV fetch failed: ${fetchError.message}; curl fallback returned invalid JSON: ${parseError.message}`);
      }
    }
  } finally {
    clearTimeout(timeout);
  }
};

const getLatestDataDate = (csv) => {
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
  if (parsed.errors?.length) {
    const firstError = parsed.errors[0];
    throw new Error(`CSV parse failed: ${firstError.message}`);
  }

  let latest = null;
  let validRows = 0;

  for (const row of parsed.data) {
    const convertedAmount = parseNumber(row.converted_amount);
    if (row.conversion_status !== 'Y' || convertedAmount <= 0) continue;

    const rowDate = parseDate(row.consent_timestamp || row.created_at || row.date);
    if (!rowDate) continue;

    validRows += 1;
    if (!latest || rowDate > latest) latest = rowDate;
  }

  if (!latest) {
    throw new Error('No valid converted rows with dates were found in latest_csv');
  }

  return {
    latestDataDate: dateOnly(latest),
    latestDataDateTime: latest.toISOString(),
    latestDataLabel: formatDayMonth(latest),
    lastBookingTimestampLabel: formatDayMonthTime(latest),
    validRows,
  };
};

const barTable = (title, rows, valueKey, subtitle = '') => {
  const cleanRows = rows.filter((row) => Number(row[valueKey] || 0) > 0).slice(0, 14);
  const max = Math.max(...cleanRows.map((row) => Number(row[valueKey] || 0)), 1);
  const body = cleanRows.map((row) => {
    const value = Number(row[valueKey] || 0);
    const width = Math.max(4, Math.round((value / max) * 100));
    return `
      <tr>
        <td style="width:120px;padding:8px 8px 8px 0;color:#475569;font-size:12px;">${escapeHtml(row.name)}</td>
        <td style="padding:8px 0;">
          <div style="background:#e2e8f0;border-radius:4px;height:12px;overflow:hidden;">
            <div style="width:${width}%;height:12px;background:#2563eb;border-radius:4px;"></div>
          </div>
        </td>
        <td style="width:88px;padding:8px 0 8px 10px;text-align:right;color:#0f172a;font-size:12px;font-weight:700;">${formatNumber(value)}</td>
      </tr>`;
  }).join('');

  return `
    <div style="padding:28px 0 36px;border-bottom:1px solid #e6edf5;">
      <h2 style="font-size:16px;margin:0 0 14px;color:#0f172a;">${escapeHtml(title)}</h2>
      ${subtitle ? `<p style="margin:0 0 18px;color:#64748b;font-size:12px;line-height:1.45;">${escapeHtml(stripTags(subtitle))}</p>` : ''}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">${body}</table>
    </div>`;
};

const dailyVolumeEmailTable = (rows) => {
  const cleanRows = rows.filter((row) => Number(row.count || 0) > 0 || Number(row.amount || 0) > 0).slice(-7);
  if (cleanRows.length === 0) return '';

  const maxCount = Math.max(...cleanRows.map((row) => Number(row.count || 0)), 1);
  const amountCells = cleanRows.map((row) => `
    <td align="center" style="padding:0 4px 8px;color:#d97706;font-size:10px;font-weight:800;white-space:nowrap;">${escapeHtml(formatMoney(row.amount))}</td>
  `).join('');
  const barCells = cleanRows.map((row) => {
    const height = Math.max(6, Math.round((Number(row.count || 0) / maxCount) * 124));
    return `
      <td valign="bottom" align="center" style="height:132px;padding:0 8px;border-bottom:1px solid #d1d5db;">
        <div style="width:28px;height:${height}px;background:#5146d9;border-radius:5px 5px 0 0;font-size:1px;line-height:1px;">&nbsp;</div>
      </td>`;
  }).join('');
  const countCells = cleanRows.map((row) => `
    <td align="center" style="padding:7px 4px 2px;color:#0f172a;font-size:11px;font-weight:800;">${formatNumber(row.count)}</td>
  `).join('');
  const dateCells = cleanRows.map((row) => `
    <td align="center" style="padding:0 4px;color:#64748b;font-size:10px;white-space:nowrap;">${escapeHtml(row.name)}</td>
  `).join('');

  return `
    <div style="padding:28px 0 36px;border-bottom:1px solid #e6edf5;">
      <h2 style="font-size:16px;margin:0 0 6px;color:#0f172a;">Last 7 days daily conversions</h2>
      <p style="margin:0 0 14px;color:#64748b;font-size:12px;line-height:1.45;">Daily booking volume and converted amount trend.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;table-layout:fixed;">
        <tr>${amountCells}</tr>
        <tr>${barCells}</tr>
        <tr>${countCells}</tr>
        <tr>${dateCells}</tr>
      </table>
    </div>`;
};

const feeBurdenInsight = (feeBurdenData) => {
  const top = feeBurdenData
    .filter((row) => Number(row.avgBurden || 0) > 0)
    .sort((a, b) => Number(b.avgBurden || 0) - Number(a.avgBurden || 0))[0];
  if (!top) return 'Fee burden shows processing fee as a share of ticket size by band.';
  return `${top.name} has the highest average fee burden at ${formatPct(top.avgBurden)} of ticket size; use this to spot where pricing feels heaviest for users.`;
};

const insightBox = (text, tone = '#2563eb') => text ? `
  <div style="margin:14px 0 0;padding:11px 13px;background:#f8fafc;border-left:4px solid ${tone};color:#334155;font-size:12px;line-height:1.5;">
    ${escapeHtml(stripTags(text).replace(/^The sweet spot:\s*/i, ''))}
  </div>` : '';

const section = (title, subtitle, body) => `
  <div style="background:#ffffff;border:1px solid #dbe4ee;border-radius:12px;padding:22px;margin-top:18px;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#2563eb;font-weight:800;margin-bottom:7px;">${escapeHtml(title)}</div>
    ${subtitle ? `<p style="margin:0 0 14px;color:#64748b;font-size:12px;line-height:1.45;">${escapeHtml(stripTags(subtitle))}</p>` : ''}
    ${body}
  </div>`;

const metricCard = (label, value) => `
  <td style="width:33.33%;padding:6px;">
    <div style="border:1px solid #dbe4ee;border-radius:10px;padding:15px;background:#ffffff;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#64748b;">${escapeHtml(label)}</div>
      <div style="font-size:20px;line-height:1.25;font-weight:800;color:#0f172a;margin-top:4px;">${escapeHtml(value)}</div>
    </div>
  </td>`;

const overviewPill = (label, color, bg = '#ffffff') => `
  <span style="display:inline-block;margin:3px 3px 3px 0;padding:6px 10px;border:1px solid ${color};border-radius:999px;background:${bg};color:${color};font-size:10px;font-weight:800;white-space:nowrap;">
    ${escapeHtml(label)}
  </span>`;

const overviewMetric = (label, value, color = '#0f172a') => `
  <td style="width:50%;padding:5px;">
    <div style="border:1px solid #e2e8f0;border-radius:9px;background:#ffffff;padding:11px;">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#7b8190;font-weight:800;line-height:1.25;">${escapeHtml(label)}</div>
      <div style="font-size:16px;line-height:1.2;font-weight:900;color:${color};margin-top:7px;white-space:nowrap;">${escapeHtml(value)}</div>
    </div>
  </td>`;

const overviewPanel = (title, insight, rows) => `
  <td style="width:50%;padding:7px;vertical-align:top;">
    <div style="border:1px solid #e2e8f0;border-radius:11px;background:#fafbfe;padding:14px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#0f172a;font-weight:900;margin-bottom:9px;">${escapeHtml(title)}</div>
      <p style="margin:0 0 13px;color:#525866;font-size:11px;line-height:1.45;">${escapeHtml(stripTags(insight))}</p>
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        ${rows.map((row) => `<tr>${row.join('')}</tr>`).join('')}
      </table>
    </div>
  </td>`;

const overviewSection = (summary, latest) => `
  <div style="background:#ffffff;border:1px solid #e4eaf2;border-radius:13px;padding:17px;margin-bottom:18px;">
    <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <tr>
        <td style="vertical-align:top;width:64%;">
          <div style="font-size:11px;color:#6b7280;line-height:1.45;">
            Covers bookings from ${escapeHtml(summary.dateRange)}.<br>
            Last booking in this sync: ${escapeHtml(latest.lastBookingTimestampLabel)} IST.
          </div>
        </td>
        <td align="right" style="vertical-align:top;width:36%;">
          <a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:12px;font-weight:800;padding:10px 14px;border-radius:8px;">Best experienced on the dashboard</a>
        </td>
      </tr>
    </table>
    <div style="margin-top:12px;">
      ${overviewPill(`${formatNumber(summary.totalBookings)} bookings`, '#0f172a')}
      ${overviewPill(`${formatNumber(summary.uniqueUsers)} unique users`, '#459b72', '#eef8f2')}
      ${summary.repeatConverters > 0 ? overviewPill(`${formatNumber(summary.repeatConverters)} repeat converters`, '#8b5cf6', '#f3eafd') : ''}
      ${summary.repeatAnalytics?.multiCardUsers > 0 ? overviewPill(`${formatNumber(summary.repeatAnalytics.multiCardUsers)} multi-card users`, '#d97706', '#fff4e8') : ''}
    </div>
    <div style="font-size:16px;font-weight:900;color:#0f172a;margin-top:18px;margin-bottom:2px;">Overview</div>
    <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:14px;">
      <tr>
        ${overviewPanel('Conversion Value', summary.conversionInsight, [
          [
            overviewMetric('Converted amount', formatMoney(summary.totalConverted), '#4f46e5'),
            overviewMetric('Total payable', formatMoney(summary.totalPayable), '#0f172a'),
          ],
          [
            overviewMetric('Total interest', formatMoney(summary.totalInterest), '#d97706'),
            overviewMetric('Processing fee', formatMoney(summary.totalProcessingFee), '#8b5cf6'),
          ],
        ])}
        ${overviewPanel('User Averages & Medians', summary.averagesInsight, [
          [
            overviewMetric('Avg ticket', formatMoney(summary.avgTicket), '#0f172a'),
            overviewMetric('Median ticket', formatMoney(summary.medianTicket), '#6b7280'),
          ],
          [
            overviewMetric('Avg EMI', `${formatMoney(summary.avgEmi)}/mo`, '#459b72'),
            overviewMetric('Median EMI', `${formatMoney(summary.medianEmi)}/mo`, '#6b7280'),
          ],
        ])}
      </tr>
    </table>
  </div>`;

const dataTable = (title, rows, columns, insight = '') => {
  const header = columns.map((column) => `<th align="${column.align || 'left'}" style="padding:8px;border-bottom:1px solid #dbe4ee;color:#475569;font-size:11px;text-transform:uppercase;">${escapeHtml(column.label)}</th>`).join('');
  const body = rows.slice(0, 8).map((row) => `
    <tr>
      ${columns.map((column) => `<td align="${column.align || 'left'}" style="padding:9px 8px;border-bottom:1px solid #edf2f7;color:#0f172a;font-size:12px;">${escapeHtml(column.format ? column.format(row[column.key], row) : row[column.key])}</td>`).join('')}
    </tr>`).join('');

  return `
    <div style="padding:28px 0 36px;border-bottom:1px solid #e6edf5;">
      <h2 style="font-size:16px;margin:0 0 14px;color:#0f172a;">${escapeHtml(title)}</h2>
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #dbe4ee;border-radius:8px;overflow:hidden;">
        <tr>${header}</tr>
        ${body}
      </table>
      ${insightBox(insight)}
    </div>`;
};

const matrixTable = (title, rowKeys, columnKeys, matrix, options = {}) => {
  const valueKey = options.valueKey || 'count';
  const amountKey = options.amountKey || 'amount';
  const allCells = rowKeys.flatMap((rowKey) => columnKeys.map((columnKey) => Number(matrix[rowKey]?.[columnKey]?.[valueKey] || 0)));
  const max = Math.max(...allCells, 1);
  const rows = rowKeys.map((rowKey) => {
    const cells = columnKeys.map((columnKey) => {
      const cell = matrix[rowKey]?.[columnKey] || {};
      const value = Number(cell[valueKey] || 0);
      const amount = Number(cell[amountKey] || 0);
      const opacity = value > 0 ? Math.min(0.92, 0.12 + (value / max) * 0.8) : 0.04;
      return `<td align="center" style="padding:7px;border:1px solid #e2e8f0;background:rgba(37,99,235,${opacity});color:${opacity > 0.55 ? '#ffffff' : '#0f172a'};font-size:11px;line-height:1.35;">
        <strong>${formatNumber(value)}</strong><br>
        <span style="font-size:10px;">${amount ? formatMoney(amount) : '-'}</span>
      </td>`;
    }).join('');
    return `<tr><th align="left" style="padding:7px;border:1px solid #e2e8f0;background:#f8fafc;color:#475569;font-size:11px;">${escapeHtml(rowKey)}</th>${cells}</tr>`;
  }).join('');

  const header = columnKeys.map((key) => `<th style="padding:7px;border:1px solid #e2e8f0;background:#f8fafc;color:#475569;font-size:10px;">${escapeHtml(key)}</th>`).join('');
  return `
    <div style="padding:28px 0 36px;border-bottom:1px solid #e6edf5;">
      <h2 style="font-size:16px;margin:0 0 14px;color:#0f172a;">${escapeHtml(title)}</h2>
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;table-layout:fixed;">
        <tr><th style="width:90px;padding:7px;border:1px solid #e2e8f0;background:#f8fafc;"></th>${header}</tr>
        ${rows}
      </table>
      ${insightBox(options.insight)}
    </div>`;
};

const heatmapTable = (heatmapData) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = [0, 3, 6, 9, 12, 15, 18, 21];
  const bucketValue = (day, startHour) => heatmapData
    .filter((item) => item.day === day && item.hour >= startHour && item.hour < startHour + 3)
    .reduce((sum, item) => sum + item.count, 0);
  const values = days.flatMap((day) => hours.map((hour) => bucketValue(day, hour)));
  const max = Math.max(...values, 1);
  const rows = days.map((day) => {
    const cells = hours.map((hour) => {
      const value = bucketValue(day, hour);
      const opacity = value > 0 ? Math.min(0.9, 0.1 + (value / max) * 0.8) : 0.04;
      return `<td align="center" style="padding:8px;border:1px solid #e2e8f0;background:rgba(16,185,129,${opacity});color:${opacity > 0.55 ? '#ffffff' : '#0f172a'};font-size:11px;font-weight:700;">${formatNumber(value)}</td>`;
    }).join('');
    return `<tr><th align="left" style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;color:#475569;font-size:11px;">${day}</th>${cells}</tr>`;
  }).join('');
  const header = hours.map((hour) => `<th style="padding:7px;border:1px solid #e2e8f0;background:#f8fafc;color:#475569;font-size:10px;">${hour}:00</th>`).join('');
  return `
    <div style="padding:28px 0 36px;border-bottom:1px solid #e6edf5;">
      <h2 style="font-size:16px;margin:0 0 14px;color:#0f172a;">Time x Bookings</h2>
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;table-layout:fixed;">
        <tr><th style="width:48px;padding:7px;border:1px solid #e2e8f0;background:#f8fafc;"></th>${header}</tr>
        ${rows}
      </table>
      ${insightBox('Use this as the campaign timing map: darker cells show when bookings cluster by day and time band.', '#059669')}
    </div>`;
};

const tenureBehaviorChart = (tenureByTicket, insight = '') => {
  const tenureKeys = ['6M', '12M', '24M', '36M', '48M'];
  const colors = {
    '6M': '#8b5cf6',
    '12M': '#459b72',
    '24M': '#d4893f',
    '36M': '#4b9bb6',
    '48M': '#5b55dc',
  };
  const rows = tenureByTicket
    .filter((row) => Number(row.total || 0) > 0)
    .map((row) => {
      const total = Number(row.total || 0);
      const segments = tenureKeys.map((tenure) => {
        const value = Number(row[tenure] || 0);
        if (value <= 0) return '';
        const width = (value / total) * 100;
        return `<td style="width:${width}%;background:${colors[tenure]};color:#ffffff;text-align:center;font-size:10px;font-weight:800;padding:4px 2px;border-right:1px solid #ffffff;">
          ${value >= 3 ? formatNumber(value) : ''}
        </td>`;
      }).join('');

      return `
        <tr>
          <td style="width:72px;padding:6px 10px 6px 0;color:#64748b;font-size:11px;text-align:right;">${escapeHtml(row.name)}</td>
          <td style="padding:6px 0;">
            <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:7px;overflow:hidden;background:#f8fafc;">
              <tr>${segments}</tr>
            </table>
          </td>
          <td style="width:34px;padding:6px 0 6px 6px;text-align:right;color:#0f172a;font-size:11px;font-weight:800;">${formatNumber(total)}</td>
        </tr>`;
    }).join('');

  const legend = tenureKeys.map((tenure) => `
    <span style="display:inline-block;margin:4px 14px 4px 0;color:#64748b;font-size:12px;">
      <span style="display:inline-block;width:9px;height:9px;border-radius:3px;background:${colors[tenure]};margin-right:6px;"></span>${tenure}
    </span>`).join('');

  return `
    <div style="padding:28px 0 36px;border-bottom:1px solid #e6edf5;">
      <h2 style="font-size:16px;margin:0 0 8px;color:#0f172a;">Tenure Behavior</h2>
      <p style="margin:0 0 14px;color:#64748b;font-size:12px;line-height:1.45;">Tenure mix by ticket band. Use this to see where shorter vs longer tenures are carrying volume.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">${rows}</table>
      <div style="margin-top:10px;">${legend}</div>
      ${insightBox(insight)}
    </div>`;
};

const emiAffordabilityChart = (rows, insight = '') => {
  const cleanRows = rows.filter((row) => Number(row.users || 0) > 0);
  if (cleanRows.length === 0) return '';

  const maxUsers = Math.max(...cleanRows.map((row) => Number(row.users || 0)), 1);
  const axisMax = Math.max(25, Math.ceil(maxUsers / 25) * 25);
  const rowsHtml = cleanRows.map((row, index) => {
    const value = Number(row.users || 0);
    const width = Math.max(4, (value / axisMax) * 100);
    const color = index < Math.max(1, cleanRows.length - 2) ? '#459b72' : '#5146d9';
    return `
      <tr>
        <td style="width:86px;padding:10px 14px 10px 0;color:#64748b;font-size:12px;text-align:right;">${escapeHtml(row.name)}</td>
        <td style="padding:10px 0;">
          <div style="background:#f8fafc;border-radius:5px;height:22px;overflow:visible;">
            <div style="width:${width}%;height:22px;background:${color};border-radius:5px;"></div>
          </div>
        </td>
        <td style="width:54px;padding:10px 0 10px 12px;color:#525866;font-size:12px;">${formatNumber(value)}</td>
      </tr>`;
  }).join('');

  return `
    <div style="background:#ffffff;border-radius:11px;padding:18px;margin:10px 0 18px;">
      <h2 style="font-size:18px;margin:0 0 6px;color:#0f172a;">EMI Affordability</h2>
      <p style="margin:0 0 18px;color:#64748b;font-size:12px;line-height:1.4;">Distribution of users across EMI bands.</p>
      <div style="width:772px;background:#ffffff;padding-top:8px;">
        <table role="presentation" width="710" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:16px;">
          ${rowsHtml}
        </table>
        <div style="margin:16px 0 0 318px;color:#5f6370;font-size:11px;font-weight:700;">Number of Bookings</div>
      </div>
      ${insightBox(insight)}
    </div>`;
};

const takeawayBlocks = (takeaways) => {
  if (!takeaways) return '';
  const affordability = takeaways.affordability || {};
  const affordabilityUsers = affordability.usersUnderThreshold ?? 0;
  const affordabilityThreshold = affordability.thresholdFormatted || 'Rs. 7K';
  const blocks = [
    ['Value concentration', `${formatNumber(takeaways.valueConcentration.users)} users = ${takeaways.valueConcentration.percentage}%`, takeaways.valueConcentration.text, '#2D7A4F', '#EBF5F0'],
    ['Affordability is the hook', `${formatNumber(affordabilityUsers)}/${formatNumber(affordability.totalUsers)} under ${affordabilityThreshold} EMI`, affordability.text, '#CF6330', '#FDF3EE'],
    ['ROI tolerance is real', `${formatNumber(takeaways.roiTolerance.usersAt18)}/${formatNumber(takeaways.roiTolerance.totalUsers)} at ROI 18%+`, takeaways.roiTolerance.text, '#B54040', '#FDF0F0'],
  ];
  if (takeaways.bestSegment) {
    const peakDate = formatTakeawayDate(takeaways.bestSegment.peakDate);
    const peakCount = Number(takeaways.bestSegment.peakCount || 0);
    blocks.push([
      'Current best operating segment',
      `${formatNumber(takeaways.bestSegment.bookings)} bookings = ${formatMoney(takeaways.bestSegment.amount)}`,
      `Ticket Rs. 25K-Rs. 1L, EMI under Rs. 7K/month, tenure up to 24M. This is where conversion, ticket size and affordability line up best. Peak day so far: ${peakDate} with ${formatNumber(peakCount)} ${peakCount === 1 ? 'booking' : 'bookings'} worth ${formatMoney(takeaways.bestSegment.peakAmount)}. That segment is ${takeaways.bestSegment.percentage}% of converted value.`,
      '#D98C2B',
      '#FDF6EE',
    ]);
  }
  return blocks.map(([title, value, text, color, bg]) => `
    <div style="border-left:4px solid ${color};border-radius:0 12px 12px 0;padding:16px 18px;margin:10px 0;background:${bg};">
      <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;font-weight:700;margin:0 0 6px;color:#1A1714;letter-spacing:-0.01em;">${escapeHtml(title)}</div>
      <div style="font-size:22px;font-family:'JetBrains Mono',monospace;font-weight:600;color:${color};margin:6px 0 4px;letter-spacing:-0.03em;">${escapeHtml(value)}</div>
      <div style="font-size:12.5px;line-height:1.65;color:#6B6763;">${escapeHtml(stripTags(text))}</div>
    </div>`).join('');
};

const genericInsight = (text) => insightBox(text, '#64748b');const buildEmailReport = async (csv, latest) => {
  await fs.mkdir(outputDir, { recursive: true });
  const reportPath = path.join(outputDir, 'email-report.html');
  const tempCsvPath = path.join(outputDir, 'temp-latest.csv');
  const templatePath = path.join(repoRoot, 'email-templates/email-report.html');
  
  await fs.copyFile(templatePath, reportPath);
  await fs.writeFile(tempCsvPath, csv);
  
  try {
    await execFileAsync('node', ['scripts/update-reviewed-html-from-csv.mjs', tempCsvPath, reportPath]);
  } finally {
    await fs.unlink(tempCsvPath).catch(() => {});
  }
  
  return reportPath;
};

const prepare = async () => {
  const force = args.includes('--force');
  try {
    const [state, rawCsv] = await Promise.all([
      readJson(stateFile, {}),
      fetchLatestCsv(),
    ]);

    const nowIst = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    const todayIstDateOnly = new Date(nowIst.getFullYear(), nowIst.getMonth(), nowIst.getDate());
    
    // Calculate the threshold for "full data" (e.g., at least 23:00 IST of yesterday)
    const yesterdayIstDateOnly = new Date(todayIstDateOnly.getTime() - 24 * 60 * 60 * 1000);
    const yesterday2300 = new Date(yesterdayIstDateOnly.getTime() + 23 * 60 * 60 * 1000);

    const parsedRaw = Papa.parse(rawCsv, { header: true, skipEmptyLines: true });
    if (parsedRaw.errors?.length) {
      throw new Error(`CSV parse failed: ${parsedRaw.errors[0].message}`);
    }

    let maxTimestamp = null;
    const filteredRows = [];

    for (const row of parsedRaw.data) {
      const rowDate = parseDate(row.consent_timestamp || row.created_at || row.date);
      if (!rowDate) {
        filteredRows.push(row);
        continue;
      }

      if (maxTimestamp === null || rowDate > maxTimestamp) {
        maxTimestamp = rowDate;
      }

      if (rowDate < todayIstDateOnly) {
        filteredRows.push(row);
      }
    }

    if (!force && (maxTimestamp === null || maxTimestamp < yesterday2300)) {
      return {
        status: 'skip',
        reason: `Data is partial for yesterday. Max timestamp ${maxTimestamp ? maxTimestamp.toISOString() : 'none'} is before 11:00 PM IST yesterday. Waiting for full data.`,
        stateFile,
      };
    }

    const csv = Papa.unparse({ fields: parsedRaw.meta.fields, data: filteredRows });

    const latest = getLatestDataDate(csv);
    const lastSentDate = state.lastSentDate || null;

    if (!force && lastSentDate && latest.latestDataDate <= lastSentDate) {
      return {
        status: 'skip',
        reason: `Latest data date ${latest.latestDataDate} is not newer than last emailed date ${lastSentDate}.`,
        ...latest,
        lastSentDate,
        stateFile,
      };
    }

    const bodyFile = await buildEmailReport(csv, latest);

    const pending = {
      preparedAt: new Date().toISOString(),
      dashboardUrl,
      stateFile,
      bodyFile,
      attachmentFiles: [],
      lastSentDate,
      forced: force,
      ...latest,
    };
    const pendingFile = path.join(outputDir, `pending-${latest.latestDataDate}.json`);
    await writeJson(pendingFile, pending);

    const result = {
      status: 'send',
      reason: lastSentDate
        ? `Latest data date ${latest.latestDataDate} is newer than last emailed date ${lastSentDate}.`
        : `No previous sent date found; latest data date is ${latest.latestDataDate}.`,
      pendingFile,
      email: {
        to: process.env.EMAIL_TO_RECIPIENTS || process.env.GMAIL_USER || '',
        subject: 'SEMI data updates',
        body: `Hi Rahul,

The SEMI dashboard data has been updated through ${latest.latestDataLabel}.
Last booking: ${latest.lastBookingTimestampLabel} IST.
The chart view is included in this email.

Dashboard: ${dashboardUrl}

--
You are receiving this automated email because you are subscribed to SEMI Dashboard updates.`,
        bodyFile,
        attachmentFiles: [],
      },
      ...pending,
    };

    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      console.log('Sending email via Nodemailer...');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: `"SEMI Dashboard" <${process.env.GMAIL_USER}>`,
        to: result.email.to,
        replyTo: process.env.GMAIL_USER,
        subject: result.email.subject,
        text: result.email.body,
        html: await fs.readFile(result.email.bodyFile, 'utf8'),
      });
      console.log('Email sent successfully!');
    } else {
      console.log('GMAIL_USER and GMAIL_APP_PASSWORD not set. Skipping email dispatch.');
    }

    return result;
  } catch (error) {
    return {
      status: 'error',
      reason: `Unable to prepare SEMI update email: ${error.message}`,
      fetchUrl: FIREBASE_CSV_URL,
      stateFile,
    };
  }
};

const markSent = async () => {
  const pendingFile = optionValue('--pending-file', args[1]);
  if (!pendingFile) {
    throw new Error('mark-sent requires --pending-file <path>');
  }

  const pending = await readJson(path.resolve(repoRoot, pendingFile), null);
  if (!pending?.latestDataDate) {
    throw new Error(`Pending file ${pendingFile} does not contain latestDataDate`);
  }

  const state = {
    lastSentDate: pending.latestDataDate,
    lastSentDataDateTime: pending.latestDataDateTime,
    lastSentAt: new Date().toISOString(),
    dashboardUrl: pending.dashboardUrl || dashboardUrl,
    attachmentFiles: pending.attachmentFiles || [],
  };

  await writeJson(stateFile, state);
  return {
    status: 'marked-sent',
    stateFile,
    ...state,
  };
};

const main = async () => {
  if (command === 'prepare') return prepare();
  if (command === 'mark-sent') return markSent();
  throw new Error(`Unknown command: ${command}`);
};

main()
  .then((result) => {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result && result.status === 'error') {
      process.exitCode = 1;
    }
  })
  .catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
