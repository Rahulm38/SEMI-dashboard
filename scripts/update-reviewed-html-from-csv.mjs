import fs from 'node:fs/promises';
import { processCsvData, formatCurrency } from '../src/utils/dataProcessor.js';

const [, , csvFile, htmlFile] = process.argv;

if (!csvFile) {
  throw new Error('Usage: node update-reviewed-html-from-csv.mjs <csv-file> [html-file]');
}

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const formatNumber = (value) => Math.round(Number(value || 0)).toLocaleString('en-IN');
const formatMoney = (value) => formatCurrency(Number(value || 0));
const cleanInsight = (value) => String(value ?? '')
  .replace(/<\/?strong>/g, '')
  .replace(/^The sweet spot:\s*/i, '');

const dateTimeLabel = (date) => new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Asia/Kolkata',
}).format(date);

const dayMonthLabel = (date) => new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Asia/Kolkata',
}).format(date);

const replaceAllPairs = (html, pairs) => {
  let next = html;
  for (const [pattern, value] of pairs) next = next.replace(pattern, value);
  return next;
};



const buildDailyRows = (dailyRows) => {
  const rows = dailyRows.slice(-7);
  const max = Math.max(...rows.map((row) => Number(row.count || 0)), 1);
  const amountRow = rows.map((row) => `<td align="center" style="padding:0 4px 8px;color:#D98C2B;font-size:10px;font-weight:800;white-space:nowrap;">${escapeHtml(formatMoney(row.amount))}</td>`).join('');
  const barRow = rows.map((row) => {
    const height = Math.max(6, Math.round((Number(row.count || 0) / max) * 124));
    return `<td valign="bottom" align="center" style="height:132px;padding:0 8px;border-bottom:1px solid #D4CFC8;"><div style="width:28px;height:${height}px;background:#CF6330;border-radius:5px 5px 0 0;font-size:1px;line-height:1px;">&nbsp;</div></td>`;
  }).join('');
  const countRow = rows.map((row) => `<td align="center" style="padding:7px 4px 2px;color:#1A1714;font-size:11px;font-weight:800;">${formatNumber(row.count)}</td>`).join('');
  const dateRow = rows.map((row) => `<td align="center" style="padding:0 4px;color:#6B6763;font-size:10px;white-space:nowrap;">${escapeHtml(dayMonthLabel(new Date(`${row.name}T00:00:00+05:30`)))}</td>`).join('');
  return `<tr>${amountRow}</tr>\n        <tr>${barRow}</tr>\n        <tr>${countRow}</tr>\n        <tr>${dateRow}</tr>`;
};

const buildDailyBlock = (dailyRows) => `
    <div style="padding:0 0 28px;border-bottom:1px solid #E8E4DE;">
      <h2 style="font-family:&#39;Plus Jakarta Sans&#39;,sans-serif;font-size:16px;font-weight:800;margin:0 0 4px;color:#1A1714;letter-spacing:-0.02em;">Last 7 days daily conversions</h2>
      <p style="margin:0 0 14px;color:#A8A49F;font-size:12px;line-height:1.45;">Daily booking volume and converted amount trend.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;table-layout:fixed;">
        ${buildDailyRows(dailyRows)}
      </table>
    </div>`;

const buildHorizontalBars = (rows, valueKey, colors) => {
  const max = Math.max(...rows.map((row) => Number(row[valueKey] || 0)), 1);
  return rows.map((row, index) => {
    const value = Number(row[valueKey] || 0);
    const width = Math.max(1, (value / max) * 100);
    const color = colors[index] || colors.at(-1);
    return `
      <tr>
        <td style="width:86px;padding:10px 14px 10px 0;color:#A8A49F;font-size:12px;text-align:right;">${escapeHtml(row.name)}</td>
        <td style="padding:10px 0;">
          <div style="background:#F0EFEA;border-radius:5px;height:22px;overflow:visible;">
            <div style="width:${width}%;height:22px;background:${color};border-radius:5px;"></div>
          </div>
        </td>
        <td style="width:54px;padding:10px 0 10px 12px;color:#6B6763;font-size:12px;">${formatNumber(value)}</td>
      </tr>`;
  }).join('');
};

const buildInsight = (text) => `
  <div style="background:#FAF9F7;border-left:3px solid #CF6330;border-radius:0 10px 10px 0;padding:12px 16px;margin:18px 0 0;font-size:12.5px;color:#6B6763;line-height:1.65;">
    ${escapeHtml(cleanInsight(text))}
  </div>`;

const rgbaToHex = (r, g, b, a) => {
  const blend = (color) => Math.round(color * a + 255 * (1 - a)).toString(16).padStart(2, '0');
  return `#${blend(r)}${blend(g)}${blend(b)}`;
};

const buildMatrixBlock = (title, rowKeys, columnKeys, matrix, insight) => {
  const values = rowKeys.flatMap((rowKey) => columnKeys.map((columnKey) => Number(matrix[rowKey]?.[columnKey]?.count || 0)));
  const max = Math.max(...values, 1);
  const header = columnKeys.map((columnKey) => `<th style="padding:9px;border:1px solid #E8E4DE;background:#F5F3EF;color:#6B6763;font-size:10px;font-weight:700;">${escapeHtml(columnKey)}</th>`).join('');
  const rows = rowKeys.map((rowKey) => {
    const cells = columnKeys.map((columnKey) => {
      const cell = matrix[rowKey]?.[columnKey] || {};
      const value = Number(cell.count || 0);
      const amount = Number(cell.amount || 0);
      const opacity = value > 0 ? Math.min(0.92, 0.04 + (value / max) * 0.88) : 0.04;
      return `<td align="center" style="padding:10px;border:1px solid #E8E4DE;background:${rgbaToHex(207, 99, 48, opacity)};color:${opacity > 0.58 ? '#ffffff' : '#1A1714'};font-size:11px;line-height:1.35;">
        <strong>${formatNumber(value)}</strong><br>
        <span style="font-size:10px;">${amount ? escapeHtml(formatMoney(amount)) : '-'}</span>
      </td>`;
    }).join('');
    return `<tr><th align="left" style="padding:10px;border:1px solid #E8E4DE;background:#F5F3EF;color:#6B6763;font-size:11px;">${escapeHtml(rowKey)}</th>${cells}</tr>`;
  }).join('');

  return `
  <div style="background:#ffffff;border:1px solid #E8E4DE;box-shadow:0 1px 4px rgba(26,23,20,.06);border-radius:16px;padding:22px 24px;margin-bottom:16px;">
      <h2 style="font-family:&#39;Plus Jakarta Sans&#39;,sans-serif;font-size:16px;font-weight:800;margin:0 0 4px;color:#1A1714;letter-spacing:-0.02em;">${escapeHtml(title)}</h2>
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;table-layout:fixed;">
        <tbody><tr><th style="width:90px;padding:10px;border:1px solid #E8E4DE;background:#F5F3EF;"></th>${header}</tr>
        ${rows}
      </tbody></table>
      ${buildInsight(insight)}
    </div>`;
};

const buildTimeRows = (heatmapData) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const chunks = [0, 3, 6, 9, 12, 15, 18, 21];
  
  const matrix = Array.from({ length: 7 }, () => Array(8).fill(0));
  let max = 1;
  heatmapData.forEach((d) => {
    const chunkIdx = Math.floor(d.hour / 3);
    matrix[d.dayIndex][chunkIdx] += d.count;
    if (matrix[d.dayIndex][chunkIdx] > max) {
      max = matrix[d.dayIndex][chunkIdx];
    }
  });

  return days.map((day, dIdx) => {
    const cells = chunks.map((_, cIdx) => {
      const val = matrix[dIdx][cIdx];
      const opacity = val > 0 ? Math.min(0.9, 0.04 + (val / max) * 0.86) : 0.04;
      const color = val > 0 && opacity > 0.5 ? '#ffffff' : '#1A1714';
      return `<td align="center" style="padding:8px;border:1px solid #E8E4DE;background:${rgbaToHex(16, 185, 129, opacity)};color:${color};font-size:11px;font-weight:700;">${val}</td>`;
    }).join('');
    return `<tr><th align="left" style="padding:8px;border:1px solid #E8E4DE;background:#FAF9F7;color:#6B6763;font-size:11px;">${day}</th>${cells}</tr>`;
  }).join('');
};

const update = async () => {
  const [csv, originalHtml] = await Promise.all([
    fs.readFile(csvFile, 'utf8'),
    fs.readFile(htmlFile, 'utf8'),
  ]);
  const processed = await processCsvData(csv);
  const metrics = processed.metrics;
  const summary = metrics.summary;
  const validDates = processed.rawData
    .filter((row) => row.date && !Number.isNaN(row.date.getTime()))
    .map((row) => row.date)
    .sort((a, b) => a - b);
  const firstDate = validDates[0];
  const lastDate = validDates.at(-1);

  let html = originalHtml;

  html = replaceAllPairs(html, [
    [/Data from .*? to .*?<\/div>/, `Data from ${dateTimeLabel(firstDate)} to ${dateTimeLabel(lastDate)}</div>`],
    [/\b\d+ bookings\b/, `${formatNumber(summary.totalBookings)} bookings`],
    [/\b\d+ unique users\b/, `${formatNumber(summary.uniqueUsers)} unique users`],
    [/\b\d+ repeat converters\b/, `${formatNumber(summary.repeatConverters)} repeat converters`],
    [/\b\d+ multi-card users\b/, `${formatNumber(summary.repeatAnalytics.multiCardUsers)} multi-card users`],
    [/(Converted amount<\/div>\s*<div[^>]*>).*?(<\/div>)/s, `$1${formatMoney(summary.totalConverted)}$2`],
    [/(Total payable<\/div>\s*<div[^>]*>).*?(<\/div>)/s, `$1${formatMoney(summary.totalPayable)}$2`],
    [/(Total interest<\/div>\s*<div[^>]*>).*?(<\/div>)/s, `$1${formatMoney(summary.totalInterest)}$2`],
    [/(Processing fee<\/div>\s*<div[^>]*>).*?(<\/div>)/s, `$1${formatMoney(summary.totalProcessingFee)}$2`],
    [/(Avg ticket<\/div>\s*<div[^>]*>).*?(<\/div>)/s, `$1${formatMoney(summary.avgTicket)}$2`],
    [/(Avg EMI<\/div>\s*<div[^>]*>).*?(<\/div>)/s, `$1${formatMoney(summary.avgEmi)}/mo$2`],
    [/(Unique users<\/div>\s*<div[^>]*>).*?(<\/div>)/s, `$1${formatNumber(summary.uniqueUsers)}$2`],
    [/(Repeat converters<\/div>\s*<div[^>]*>).*?(<\/div>)/s, `$1${formatNumber(summary.repeatConverters)}$2`],
    [/(Repeat bookings<\/div>\s*<div[^>]*>).*?(<\/div>)/s, `$1${formatNumber(summary.repeatAnalytics.totalRepeatBookings)}$2`],
    [/(Repeat volume<\/div>\s*<div[^>]*>).*?(<\/div>)/s, `$1${formatMoney(summary.repeatAnalytics.repeatVolume)}$2`],
    [/(Single volume<\/div>\s*<div[^>]*>).*?(<\/div>)/s, `$1${formatMoney(summary.repeatAnalytics.singleVolume)}$2`],
    [/(Avg days between loans<\/div>\s*<div[^>]*>).*?(<\/div>)/s, `$1${formatNumber(summary.repeatAnalytics.avgDaysBetweenLoans)}$2`],
    [/Total interest income generated: .*?suggesting a few high-value outliers\./s, `${summary.conversionInsight} ${summary.averagesInsight}`],
  ]);

  const dailyTitleStart = html.indexOf('Last 7 days daily conversions');
  const timeTitleStart = html.indexOf('Time x Bookings', dailyTitleStart);
  if (dailyTitleStart >= 0 && timeTitleStart > dailyTitleStart) {
    const dailyH2Start = html.lastIndexOf('<h2', dailyTitleStart);
    const dailyBlockStart = html.lastIndexOf('<div', dailyH2Start);
    
    const timeH2Start = html.lastIndexOf('<h2', timeTitleStart);
    const timeBlockStart = html.lastIndexOf('<div', timeH2Start);
    
    if (dailyBlockStart >= 0 && timeBlockStart > dailyBlockStart) {
      html = `${html.slice(0, dailyBlockStart)}${buildDailyBlock(metrics.timeData.daily)}\n    ${html.slice(timeBlockStart)}`;
    }
  }

  html = html.replace(
    /(<h2[^>]*>Time x Bookings<\/h2>[\s\S]*?<tbody>\s*<tr[^>]*>[\s\S]*?<\/tr>)[\s\S]*?(<\/tbody><\/table>)/,
    `$1\n        ${buildTimeRows(metrics.heatmapData)}\n        $2`
  );

  const segmentBlock = buildMatrixBlock(
    'EMI x Ticket segment matrix',
    metrics.emiKeys,
    metrics.ticketKeys,
    metrics.matrix,
    metrics.insights.segment,
  );
  const roiBlock = buildMatrixBlock(
    'ROI x Ticket matrix',
    metrics.roiKeys,
    metrics.ticketKeys,
    metrics.roiMatrix,
    metrics.insights.roiMatrix,
  );
  const firstMatrixStart = html.indexOf('<h2 style="font-family:&#39;Plus Jakarta Sans&#39;,sans-serif;font-size:16px;font-weight:800;margin:0 0 4px;color:#1A1714;letter-spacing:-0.02em;">EMI x Ticket segment matrix</h2>');
  const affordabilityStart = html.indexOf('<h2 style="font-family:&#39;Plus Jakarta Sans&#39;,sans-serif;font-size:16px;font-weight:800;margin:0 0 4px;color:#1A1714;letter-spacing:-0.02em;">EMI Affordability</h2>');
  if (firstMatrixStart >= 0 && affordabilityStart > firstMatrixStart) {
    const matrixBlockStart = html.lastIndexOf('<div style="background:#ffffff;border:1px solid #E8E4DE;', firstMatrixStart);
    const affordabilityBlockStart = html.lastIndexOf('<div style="background:#ffffff;border:1px solid #E8E4DE;', affordabilityStart);
    if (matrixBlockStart >= 0 && affordabilityBlockStart > matrixBlockStart) {
      html = `${html.slice(0, matrixBlockStart)}${segmentBlock}\n        ${roiBlock}\n  ${html.slice(affordabilityBlockStart)}`;
    }
  }

  html = html.replace(
    /(<h2[^>]*>EMI Affordability<\/h2>[\s\S]*?<tbody>)[\s\S]*?(<\/tbody><\/table>)/,
    `$1${buildHorizontalBars(metrics.emiData, 'users', ['#1E7A5F', '#1E7A5F', '#1E7A5F', '#1E7A5F', '#CF6330', '#CF6330'])}\n        $2`,
  );
  html = html.replace(/^\s*<div style="position:absolute;[^"]*border-top:1px dashed #E8E4DE;height:0;"><\/div>\n/gm, '');

  html = html.replace(
    /(<h2[^>]*>Processing Fee Analysis<\/h2>[\s\S]*?<tbody>)[\s\S]*?(<\/tbody><\/table>)/,
    `$1${buildHorizontalBars(metrics.feeData.map((row) => ({ name: row.name, users: row.count })), 'users', ['#CF6330', '#1593aa', '#D98C2B', '#7E5BD6', '#1E7A5F'])}\n    $2`,
  );



  html = replaceAllPairs(html, [
    [/Processing fee Rs\. \d+ is applied to .*? bookings\)\./g, metrics.insights.fee],
    [/80% of users anchor on a monthly EMI under Rs\. [0-9A-Z.]+, suggesting that a comfortable monthly payment is the primary driver for conversion\.(?:.*?total converted value\.)?/g, `${metrics.insights.emi} ${metrics.insights.tenure}`],
    [/\d+ users = \d+(?:\.\d+)?%/g, `${formatNumber(metrics.keyTakeaways.valueConcentration.users)} users = ${metrics.keyTakeaways.valueConcentration.percentage}%`],
    [/Bookings of ₹50K\+ make up .*?renewal nudges\./g, metrics.keyTakeaways.valueConcentration.text],
    [/\d+\/\d+ under Rs\. [0-9.A-Z]+ EMI/g, `${formatNumber(metrics.keyTakeaways.affordability.usersUnderThreshold)}/${formatNumber(metrics.keyTakeaways.affordability.totalUsers)} under ${metrics.keyTakeaways.affordability.thresholdFormatted} EMI`],
    [/\d+\/\d+ at ROI 18%\+/g, `${formatNumber(metrics.keyTakeaways.roiTolerance.usersAt18)}/${formatNumber(metrics.keyTakeaways.roiTolerance.totalUsers)} at ROI 18%+`],
    [/Even though the system assigns ROI based on risk, \d+ users successfully converted at 18% or higher\./g, `Even though the system assigns ROI based on risk, ${formatNumber(metrics.keyTakeaways.roiTolerance.usersAt18)} users successfully converted at 18% or higher.`],
    [/\d+ bookings = Rs\. [0-9.A-Za-z]+/g, `${formatNumber(metrics.keyTakeaways.bestSegment.bookings)} bookings = ${formatMoney(metrics.keyTakeaways.bestSegment.amount)}`],
    [/That segment is <b>\d+(?:\.\d+)?%<\/b> of converted value\./g, `That segment is <b>${metrics.keyTakeaways.bestSegment.percentage}%</b> of converted value.`],
  ]);

  await fs.writeFile(htmlFile, html);
  console.log(JSON.stringify({
    htmlFile,
    latestDataThrough: dateTimeLabel(lastDate),
    bookings: summary.totalBookings,
    uniqueUsers: summary.uniqueUsers,
  }));
};

update();
