import Papa from 'papaparse';

const getPercentile = (arr, p) => {
  if (arr.length === 0) return 0;
  const index = (arr.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  if (upper >= arr.length) return arr[lower];
  return arr[lower] * (1 - weight) + arr[upper] * weight;
};

const getNiceRoundNumber = (num, isPercentage = false) => {
  if (isPercentage) {
    return Math.round(num); // Round to nearest whole percentage
  }
  if (num < 100) return Math.round(num / 10) * 10 || Math.round(num);
  if (num < 1000) {
    return Math.round(num / 100) * 100;
  } else if (num < 100000) {
    return Math.round(num / 1000) * 1000;
  } else {
    return Math.round(num / 10000) * 10000;
  }
};

const formatBracketLabel = (num, isPercentage = false) => {
  if (isPercentage) return `${num}%`;
  if (num >= 100000) return `${+(num / 100000).toFixed(2)}L`;
  if (num >= 1000) return `${+(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const getBracketKey = (val, brackets, isPercentage = false) => {
  if (brackets.length === 0) return '';
  if (val < brackets[0]) return `<${formatBracketLabel(brackets[0], isPercentage)}`;
  
  for (let i = 0; i < brackets.length - 1; i++) {
    if (val >= brackets[i] && val < brackets[i + 1]) {
      return `${formatBracketLabel(brackets[i], isPercentage)}-${formatBracketLabel(brackets[i + 1], isPercentage)}`;
    }
  }
  
  return `${formatBracketLabel(brackets[brackets.length - 1], isPercentage)}+`;
};

const parseValueStr = (str) => {
  if (!str) return 0;
  str = str.replace('Rs. ', '').trim();
  let multiplier = 1;
  if (str.endsWith('K')) {
    multiplier = 1000;
    str = str.slice(0, -1);
  } else if (str.endsWith('L')) {
    multiplier = 100000;
    str = str.slice(0, -1);
  }
  return parseFloat(str) * multiplier;
};

const parseBracketRange = (rangeStr) => {
  if (rangeStr.startsWith('<')) {
    return { min: 0, max: parseValueStr(rangeStr.slice(1)) };
  }
  if (rangeStr.endsWith('+')) {
    return { min: parseValueStr(rangeStr.slice(0, -1)), max: Infinity };
  }
  const parts = rangeStr.split('-');
  if (parts.length === 2) {
    return { min: parseValueStr(parts[0]), max: parseValueStr(parts[1]) };
  }
  return { min: 0, max: Infinity };
};

export const generateDrillDownMatrix = (rawData, emiRangeStr, ticketRangeStr) => {
  const emiBounds = parseBracketRange(emiRangeStr);
  const ticketBounds = parseBracketRange(ticketRangeStr);

  const subset = rawData.filter(row => {
    const amt = row.converted_amount;
    const emi = row.emi_amount_per_month;
    return amt >= ticketBounds.min && amt < ticketBounds.max &&
           emi >= emiBounds.min && emi < emiBounds.max;
  });

  if (subset.length === 0) return null;

  const sortedTickets = [...subset].map(r => r.converted_amount).sort((a, b) => a - b);
  const sortedEmis = [...subset].map(r => r.emi_amount_per_month).sort((a, b) => a - b);

  const generateMicroBrackets = (values) => {
    if (values.length < 3) return [];
    const pVals = [0.2, 0.4, 0.6, 0.8, 0.95].map(p => getPercentile(values, p));
    const rounded = pVals.map(getNiceRoundNumber);
    const unique = Array.from(new Set(rounded)).filter(v => v > 0);
    return unique.sort((a, b) => a - b);
  };

  let tBrackets = generateMicroBrackets(sortedTickets);
  let eBrackets = generateMicroBrackets(sortedEmis);

  const formatKeyList = (brackets, bounds) => {
    if (brackets.length === 0) return [`${formatBracketLabel(bounds.min)}-${bounds.max === Infinity ? '+' : formatBracketLabel(bounds.max)}`];
    return [
      `<${formatBracketLabel(brackets[0])}`,
      ...brackets.slice(0, -1).map((b, i) => `${formatBracketLabel(b)}-${formatBracketLabel(brackets[i+1])}`),
      `${formatBracketLabel(brackets[brackets.length - 1])}+`
    ];
  };

  const microTicketKeys = formatKeyList(tBrackets, ticketBounds);
  const microEmiKeys = formatKeyList(eBrackets, emiBounds);

  const microMatrix = {};
  microEmiKeys.forEach(e => {
    microMatrix[e] = {};
    microTicketKeys.forEach(t => microMatrix[e][t] = { count: 0, amount: 0, income: 0 });
  });

  subset.forEach(row => {
    let tKey = tBrackets.length === 0 ? microTicketKeys[0] : getBracketKey(row.converted_amount, tBrackets);
    let eKey = eBrackets.length === 0 ? microEmiKeys[0] : getBracketKey(row.emi_amount_per_month, eBrackets);
    
    if (microMatrix[eKey] && microMatrix[eKey][tKey]) {
      microMatrix[eKey][tKey].count++;
      microMatrix[eKey][tKey].amount += row.converted_amount;
      microMatrix[eKey][tKey].income += (row.total_payable_amount - row.converted_amount) + row.processing_fee;
    }
  });

  return { microMatrix, microTicketKeys, microEmiKeys, count: subset.length };
};

export const generateRoiDrillDownMatrix = (rawData, roiRangeStr, ticketRangeStr) => {
  const roiBounds = parseBracketRange(roiRangeStr);
  const ticketBounds = parseBracketRange(ticketRangeStr);

  const subset = rawData.filter(row => {
    const amt = row.converted_amount;
    const roi = row.interest_rate;
    return amt >= ticketBounds.min && amt < ticketBounds.max &&
           roi >= roiBounds.min && roi < roiBounds.max;
  });

  if (subset.length === 0) return null;

  const sortedTickets = [...subset].map(r => r.converted_amount).sort((a, b) => a - b);
  const sortedRois = [...subset].map(r => r.interest_rate).sort((a, b) => a - b);

  const generateMicroBrackets = (values, isPercentage = false) => {
    if (values.length < 3) return [];
    const pVals = [0.2, 0.4, 0.6, 0.8, 0.95].map(p => getPercentile(values, p));
    const rounded = pVals.map(v => getNiceRoundNumber(v, isPercentage));
    const unique = Array.from(new Set(rounded)).filter(v => v > 0);
    return unique.sort((a, b) => a - b);
  };

  let tBrackets = generateMicroBrackets(sortedTickets);
  let rBrackets = generateMicroBrackets(sortedRois, true);

  const formatKeyList = (brackets, bounds, isPercentage = false) => {
    if (brackets.length === 0) return [`${formatBracketLabel(bounds.min, isPercentage)}-${bounds.max === Infinity ? '+' : formatBracketLabel(bounds.max, isPercentage)}`];
    return [
      `<${formatBracketLabel(brackets[0], isPercentage)}`,
      ...brackets.slice(0, -1).map((b, i) => `${formatBracketLabel(b, isPercentage)}-${formatBracketLabel(brackets[i+1], isPercentage)}`),
      `${formatBracketLabel(brackets[brackets.length - 1], isPercentage)}+`
    ];
  };

  const microTicketKeys = formatKeyList(tBrackets, ticketBounds);
  const microRoiKeys = formatKeyList(rBrackets, roiBounds, true);

  const microMatrix = {};
  microRoiKeys.forEach(r => {
    microMatrix[r] = {};
    microTicketKeys.forEach(t => microMatrix[r][t] = { count: 0, amount: 0, income: 0 });
  });

  subset.forEach(row => {
    let tKey = tBrackets.length === 0 ? microTicketKeys[0] : getBracketKey(row.converted_amount, tBrackets);
    let rKey = rBrackets.length === 0 ? microRoiKeys[0] : getBracketKey(row.interest_rate, rBrackets, true);
    
    if (microMatrix[rKey] && microMatrix[rKey][tKey]) {
      microMatrix[rKey][tKey].count++;
      microMatrix[rKey][tKey].amount += row.converted_amount;
      microMatrix[rKey][tKey].income += (row.total_payable_amount - row.converted_amount) + row.processing_fee;
    }
  });

  // We return 'microEmiKeys' as microRoiKeys because the DrillDownModal expects 'microEmiKeys' to map rows.
  return { microMatrix, microTicketKeys, microEmiKeys: microRoiKeys, count: subset.length };
};

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
  return isNaN(parsed.getTime()) ? null : parsed;
};

const anonymizeId = (value, prefix) => {
  if (!value) return '';
  if (String(value).startsWith(`${prefix}_`)) return String(value);
  const input = `${prefix}:${String(value)}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}_${(hash >>> 0).toString(36)}`;
};

const normalizeUploadRow = (row) => {
  const converted = parseNumber(row.converted_amount);
  const emi = parseNumber(row.emi_amount_per_month);
  const tenure = parseInt(row.tenure, 10) || parseInt(row.tenure_in_months, 10) || 0;
  const interest = parseNumber(row.total_interest_amount);
  
  let payable = parseNumber(row.total_payable_amount);
  if (!payable) {
    if (emi && tenure) payable = emi * tenure;
    else if (converted && interest) payable = converted + interest;
    else payable = converted; // Fallback to avoid huge negative income
  }

  return {
    user_phone_number: '',
    auth_id: anonymizeId(row.auth_id || row.user_id || row.user_phone_number, 'user'),
    os_type: row.os_type || row.platform || 'Unknown',
    aan_number: anonymizeId(row.aan_number || row.r_number || row.card_reference, 'card'),
    loan_number: anonymizeId(row.loan_number || row.loan_id, 'loan'),
    converted_amount: converted,
    interest_rate: parseNumber(row.interest_rate),
    tenure: tenure,
    processing_fee: parseNumber(row.processing_fee),
    emi_amount_per_month: emi,
    principal_amount: parseNumber(row.principal_amount) || converted,
    total_interest_amount: interest,
    total_payable_amount: payable,
    referral_flag: row.referral_flag || 'No',
    conversion_status: row.conversion_status || '',
    date: parseDate(row.consent_timestamp || row.created_at || row.date)
  };
};

export const sanitizeCsvForStorage = (csvString) => {
  const parsed = Papa.parse(csvString, { header: true, skipEmptyLines: true });
  const rows = parsed.data.map(normalizeUploadRow).map(row => ({
    auth_id: row.auth_id,
    os_type: row.os_type,
    aan_number: row.aan_number,
    loan_number: row.loan_number,
    converted_amount: row.converted_amount,
    interest_rate: row.interest_rate,
    referral_flag: row.referral_flag,
    tenure: row.tenure,
    processing_fee: row.processing_fee,
    emi_amount_per_month: row.emi_amount_per_month,
    principal_amount: row.principal_amount,
    total_interest_amount: row.total_interest_amount,
    total_payable_amount: row.total_payable_amount,
    conversion_status: row.conversion_status,
    consent_timestamp: row.date && !isNaN(row.date.getTime()) ? row.date.toISOString() : ''
  }));

  return Papa.unparse(rows);
};

export const processCsvData = (csvString) => {
  return new Promise((resolve, reject) => {
    Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data
          .map(normalizeUploadRow)
          .filter(row => row.conversion_status === 'Y' && row.converted_amount > 0);

        const metrics = calculateMetrics(data);
        resolve({ rawData: data, metrics });
      },
      error: (error) => reject(error)
    });
  });
};

const formatCurrency = (value) => {
  if (value >= 10000000) return `Rs. ${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `Rs. ${(value / 100000).toFixed(2)}L`;
  if (value >= 1000) return `Rs. ${(value / 1000).toFixed(1)}K`;
  return `Rs. ${value.toFixed(0)}`;
};

export const calculateMetrics = (data) => {
  if (!data || data.length === 0) return null;
  const totalConverted = data.reduce((sum, row) => sum + row.converted_amount, 0);
  const totalPayable = data.reduce((sum, row) => sum + row.total_payable_amount, 0);
  const totalInterest = totalPayable - totalConverted;
  const totalProcessingFee = data.reduce((sum, row) => sum + row.processing_fee, 0);
  const avgTicket = totalConverted / data.length;
  const avgEmi = data.reduce((sum, row) => sum + row.emi_amount_per_month, 0) / data.length;

  // Medians
  const sortedTickets = [...data].sort((a, b) => a.converted_amount - b.converted_amount);
  const medianTicket = sortedTickets[Math.floor(sortedTickets.length / 2)]?.converted_amount || 0;
  
  const sortedEmis = [...data].sort((a, b) => a.emi_amount_per_month - b.emi_amount_per_month);
  const medianEmi = sortedEmis[Math.floor(sortedEmis.length / 2)]?.emi_amount_per_month || 0;

  const validDates = data.filter(d => d.date && !isNaN(d.date.getTime())).map(d => d.date);
  const minDateStr = validDates.length ? new Date(Math.min(...validDates)).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
  const maxDateStr = validDates.length ? new Date(Math.max(...validDates)).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
  
  const dateRange = `${minDateStr} - ${maxDateStr}`;
  const conversionInsight = `Total interest income generated: ${formatCurrency(totalInterest + totalProcessingFee)} (Interest ${formatCurrency(totalInterest)} + Fees ${formatCurrency(totalProcessingFee)}).`;
  const averagesInsight = avgTicket > medianTicket
    ? `Average ticket (${formatCurrency(avgTicket)}) is ${((avgTicket - medianTicket) / medianTicket * 100).toFixed(0)}% above the median (${formatCurrency(medianTicket)}), suggesting a few high-value outliers.`
    : `Average and Median are close, indicating an even distribution - no extreme outlier bookings.`;

  // Fixed Business Brackets
  const ticketBrackets = [10000, 25000, 50000, 100000];
  const emiBrackets = [2500, 5000, 7000, 10000];

  const allTicketKeys = [
    `<${formatBracketLabel(ticketBrackets[0])}`,
    ...ticketBrackets.slice(0, -1).map((b, i) => `${formatBracketLabel(b)}-${formatBracketLabel(ticketBrackets[i+1])}`),
    `${formatBracketLabel(ticketBrackets[ticketBrackets.length - 1])}+`
  ];
  
  const allEmiKeys = [
    `<${formatBracketLabel(emiBrackets[0])}`,
    ...emiBrackets.slice(0, -1).map((b, i) => `${formatBracketLabel(b)}-${formatBracketLabel(emiBrackets[i+1])}`),
    `${formatBracketLabel(emiBrackets[emiBrackets.length - 1])}+`
  ];

  // Ticket Size Buckets & Fee Burden
  let ticketBuckets = {};
  let ticketAmounts = {};
  let ticketFeeBurdenSum = {};
  allTicketKeys.forEach(k => { ticketBuckets[k] = 0; ticketAmounts[k] = 0; ticketFeeBurdenSum[k] = 0; });
  
  // EMI Comfort Buckets
  let emiBuckets = {};
  allEmiKeys.forEach(k => emiBuckets[k] = 0);

  // Tenure
  const tenureBuckets = { '6': { count: 0, amount: 0, interest: 0 }, '12': { count: 0, amount: 0, interest: 0 }, '24': { count: 0, amount: 0, interest: 0 }, '36': { count: 0, amount: 0, interest: 0 }, '48': { count: 0, amount: 0, interest: 0 } };

  // Fixed ROI Bands
  const roiBrackets = [18, 21, 24];

  const allRoiKeys = [
    `<${formatBracketLabel(roiBrackets[0], true)}`,
    ...roiBrackets.slice(0, -1).map((b, i) => `${formatBracketLabel(b, true)}-${formatBracketLabel(roiBrackets[i+1], true)}`),
    `${formatBracketLabel(roiBrackets[roiBrackets.length - 1], true)}+`
  ];
  
  const roiBuckets = {};
  allRoiKeys.forEach(k => roiBuckets[k] = { count: 0, amount: 0 });

  const roiMatrix = {};
  allRoiKeys.forEach(r => {
    roiMatrix[r] = {};
    allTicketKeys.forEach(t => roiMatrix[r][t] = { count: 0, amount: 0, interest: 0, income: 0 });
  });

  // Processing Fees
  const feeBuckets = {};
  const osBuckets = {};

  // Temporal Tracking
  const dayBuckets = {};
  const hourBuckets = Array(24).fill(0);
  
  // Heatmap: dayOfWeek x hour
  const createHeatmapBucket = () => ({
    count: 0,
    amount: 0,
    income: 0,
    rows: []
  });
  const heatmapBuckets = Array(7).fill(0).map(() => Array(24).fill(0).map(createHeatmapBucket));
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Segment Matrix: Ticket x EMI
  const matrix = {};

  let referralCount = 0;

  // Repeat Converter Detection & Analytics
  const userMap = {};
  const authIdCounts = {};
  data.forEach(row => {
    const id = row.auth_id;
    if (id) {
      if (!userMap[id]) userMap[id] = [];
      userMap[id].push(row);
      authIdCounts[id] = (authIdCounts[id] || 0) + 1;
    }
  });

  const repeatAnalytics = {
    totalRepeatUsers: 0,
    totalSingleUsers: 0,
    totalRepeatBookings: 0,
    totalSingleBookings: 0,
    multiCardUsers: 0,
    crossCardRepeatUsers: 0,
    repeatVolume: 0,
    singleVolume: 0,
    avgDaysBetweenLoans: 0,
    avgFirstTicket: 0,
    avgSecondTicket: 0,
    avgFirstEmi: 0,
    avgSecondEmi: 0,
    repeatUsersList: []
  };

  let totalDaysBetween = 0, firstTicketSum = 0, secondTicketSum = 0, firstEmiSum = 0, secondEmiSum = 0;

  Object.values(userMap).forEach(userBookings => {
    const sorted = [...userBookings].sort((a, b) => {
      const aValid = a.date && typeof a.date.getTime === 'function' && !isNaN(a.date.getTime());
      const bValid = b.date && typeof b.date.getTime === 'function' && !isNaN(b.date.getTime());
      if (aValid && bValid) return a.date.getTime() - b.date.getTime();
      return 0;
    });

    const loanIds = new Set(sorted.map(b => b.loan_number).filter(Boolean));
    const cardIds = new Set(sorted.map(b => b.aan_number).filter(Boolean));
    const loanCount = loanIds.size || sorted.length;
    const cardCount = cardIds.size || (sorted.some(b => b.aan_number) ? 1 : 0);
    const isRepeat = loanCount > 1;
    const userTotalVolume = sorted.reduce((sum, b) => sum + (b.converted_amount || 0), 0);

    if (cardCount > 1) repeatAnalytics.multiCardUsers++;

    if (isRepeat) {
      repeatAnalytics.totalRepeatUsers++;
      repeatAnalytics.totalRepeatBookings += sorted.length;
      repeatAnalytics.repeatVolume += userTotalVolume;
      if (cardCount > 1) repeatAnalytics.crossCardRepeatUsers++;

      const first = sorted[0];
      const second = sorted[1];
      
      firstTicketSum += first.converted_amount || 0;
      secondTicketSum += second.converted_amount || 0;
      firstEmiSum += first.emi_amount_per_month || 0;
      secondEmiSum += second.emi_amount_per_month || 0;
      
      const firstValid = first.date && typeof first.date.getTime === 'function' && !isNaN(first.date.getTime());
      const secondValid = second.date && typeof second.date.getTime === 'function' && !isNaN(second.date.getTime());
      
      let diffDays = null;
      if (firstValid && secondValid) {
        // Shift epochs by IST offset so that rounding to 24h intervals correctly matches IST midnight boundaries
        const firstIstMs = first.date.getTime() + (330 * 60000);
        const secondIstMs = second.date.getTime() + (330 * 60000);
        diffDays = Math.floor(secondIstMs / 86400000) - Math.floor(firstIstMs / 86400000);
        totalDaysBetween += diffDays;
      }

      const datesList = sorted.map(b => b.date && typeof b.date.getTime === 'function' && !isNaN(b.date.getTime()) ? b.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Unknown').join(' → ');
      const timeSequence = sorted.map(b => b.date && typeof b.date.getTime === 'function' && !isNaN(b.date.getTime()) ? b.date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Unknown').join(' → ');
      const tenureSequence = sorted.map(b => `${b.tenure}M`).join(' → ');
      const cardLabelMap = new Map();
      const getCardLabel = (cardKey) => {
        if (!cardKey) return 'Card N/A';
        if (!cardLabelMap.has(cardKey)) cardLabelMap.set(cardKey, `Card ${cardLabelMap.size + 1}`);
        return cardLabelMap.get(cardKey);
      };
      const cardSequence = sorted.map(b => getCardLabel(b.aan_number)).join(' → ');
      const loanSequence = sorted.map((_, idx) => `Loan ${idx + 1}`).join(' → ');
      const osSequence = Array.from(new Set(sorted.map(b => b.os_type || 'Unknown'))).join(' / ');
      const formatShort = (val) => val >= 1000 ? `${(val/1000).toFixed(1)}K` : val;
      const amt1 = first.converted_amount || 0;
      const amt2 = second.converted_amount || 0;
      
      let pattern = "Cross-sell";
      if (diffDays === 0) {
        if (first.loan_number && second.loan_number && first.loan_number === second.loan_number) {
           pattern = `Warning: same loan number repeated on the same day. Likely duplicate or retry, not a fresh loan.`;
        } else if (amt1 === amt2 && first.tenure === second.tenure && first.aan_number === second.aan_number) {
           pattern = `⚠️ Warning: Exact duplicate loan (Rs. ${formatShort(amt1)}, ${first.tenure}M) on the same day. Possible system retry bug.`;
        } else {
           const cardText = first.aan_number !== second.aan_number ? ' on another card' : '';
           pattern = `Same-day top-up${cardText}: Took a 2nd loan of Rs. ${formatShort(amt2)} (${second.tenure}M) alongside the first Rs. ${formatShort(amt1)}.`;
        }
      } else if (diffDays !== null) {
        if (first.loan_number && second.loan_number && first.loan_number === second.loan_number) {
           pattern = `Same loan number appears again after ${diffDays} days; treat as possible duplicate before calling it repeat behavior.`;
        } else if (amt1 === amt2 && first.tenure === second.tenure) {
           pattern = `Returned after ${diffDays} days for the exact same loan (Rs. ${formatShort(amt1)}, ${first.tenure}M).`;
        } else {
           const pctChange = amt1 > 0 ? Math.round(((amt2 - amt1) / amt1) * 100) : 0;
           const direction = pctChange > 0 ? "larger" : pctChange < 0 ? "smaller" : "different";
           const cardText = first.aan_number !== second.aan_number ? ' using another card' : '';
           pattern = `Returned after ${diffDays} days${cardText} for a ${Math.abs(pctChange)}% ${direction} ticket size (Rs. ${formatShort(amt2)} vs Rs. ${formatShort(amt1)}).`;
        }
      }

      repeatAnalytics.repeatUsersList.push({
        auth_id: first.auth_id,
        bookings: sorted.length,
        loanCount,
        cardCount,
        totalAmount: userTotalVolume,
        tenureSequence,
        cardSequence,
        loanSequence,
        osSequence,
        dates: datesList,
        timeSequence,
        pattern
      });
    } else {
      repeatAnalytics.totalSingleUsers++;
      repeatAnalytics.totalSingleBookings += 1;
      repeatAnalytics.singleVolume += userTotalVolume;
    }
  });

  if (repeatAnalytics.totalRepeatUsers > 0) {
    repeatAnalytics.avgDaysBetweenLoans = Math.round(totalDaysBetween / repeatAnalytics.totalRepeatUsers);
    repeatAnalytics.avgFirstTicket = firstTicketSum / repeatAnalytics.totalRepeatUsers;
    repeatAnalytics.avgSecondTicket = secondTicketSum / repeatAnalytics.totalRepeatUsers;
    repeatAnalytics.avgFirstEmi = firstEmiSum / repeatAnalytics.totalRepeatUsers;
    repeatAnalytics.avgSecondEmi = secondEmiSum / repeatAnalytics.totalRepeatUsers;
  }
  
  const repeatConverters = repeatAnalytics.totalRepeatUsers;
  const uniqueUsers = Object.keys(authIdCounts).length;
  const totalBookings = data.length;
  
  // Gross Revenue = Interest Earned + Processing Fee
  const totalInterestIncome = totalInterest + totalProcessingFee;
  const incomePerUser = totalInterestIncome / data.length;
  const effectiveCostPct = (totalInterestIncome / totalConverted * 100);

  data.forEach(row => {
    const os = row.os_type || 'Unknown';
    if (!osBuckets[os]) {
      osBuckets[os] = { name: os, bookings: 0, amount: 0, income: 0, users: new Set(), repeatUsers: 0 };
    }
    osBuckets[os].bookings++;
    osBuckets[os].amount += row.converted_amount;
    osBuckets[os].income += (row.total_payable_amount - row.converted_amount) + row.processing_fee;
    if (row.auth_id) osBuckets[os].users.add(row.auth_id);

    // Referral
    if (row.referral_flag && row.referral_flag.toLowerCase() === 'yes') referralCount++;

    // Processing Fee
    const fee = row.processing_fee;
    if (!feeBuckets[fee]) feeBuckets[fee] = { count: 0, amount: 0 };
    feeBuckets[fee].count++;
    feeBuckets[fee].amount += fee;

    // Time
    if (row.date && !isNaN(row.date.getTime())) {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: 'numeric', hourCycle: 'h23',
        weekday: 'short'
      }).formatToParts(row.date);
      
      const map = {};
      for (const { type, value } of parts) map[type] = value;
      
      const dayStr = `${map.year}-${map.month}-${map.day}`; // YYYY-MM-DD in IST
      const hour = parseInt(map.hour, 10);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayOfWeek = days.indexOf(map.weekday);
      
      if (!dayBuckets[dayStr]) dayBuckets[dayStr] = { count: 0, amount: 0 };
      dayBuckets[dayStr].count++;
      dayBuckets[dayStr].amount += row.converted_amount;
      
      hourBuckets[hour]++;
      const heatmapBucket = heatmapBuckets[dayOfWeek][hour];
      heatmapBucket.count++;
      heatmapBucket.amount += row.converted_amount;
      heatmapBucket.income += (row.total_payable_amount - row.converted_amount) + row.processing_fee;
      heatmapBucket.rows.push({
        date: row.date.toISOString(),
        amount: row.converted_amount,
        emi: row.emi_amount_per_month,
        tenure: row.tenure,
        roi: row.interest_rate,
        platform: row.os_type || 'Unknown',
        income: (row.total_payable_amount - row.converted_amount) + row.processing_fee
      });
    }

    // Ticket Size
    const amt = row.converted_amount;
    let tKey = getBracketKey(amt, ticketBrackets);
    
    ticketBuckets[tKey]++;
    ticketAmounts[tKey] += amt;
    ticketFeeBurdenSum[tKey] += (row.processing_fee / amt) * 100;

    // EMI
    const emi = row.emi_amount_per_month;
    let eKey = getBracketKey(emi, emiBrackets);

    emiBuckets[eKey]++;

    // Tenure
    if (tenureBuckets[row.tenure]) {
      tenureBuckets[row.tenure].count++;
      tenureBuckets[row.tenure].amount += amt;
      tenureBuckets[row.tenure].interest += (row.total_payable_amount - row.converted_amount);
    }

    // ROI
    const roi = row.interest_rate;
    let rKey = getBracketKey(roi, roiBrackets, true);
    
    if (!roiBuckets[rKey]) roiBuckets[rKey] = { count: 0, amount: 0 };
    roiBuckets[rKey].count++;
    roiBuckets[rKey].amount += amt;

    if (!roiMatrix[rKey]) roiMatrix[rKey] = {};
    if (!roiMatrix[rKey][tKey]) roiMatrix[rKey][tKey] = { count: 0, amount: 0, interest: 0, income: 0 };
    
    roiMatrix[rKey][tKey].count++;
    roiMatrix[rKey][tKey].amount += amt;
    roiMatrix[rKey][tKey].interest += (row.total_payable_amount - row.converted_amount) || 0;
    roiMatrix[rKey][tKey].income += (row.total_payable_amount - row.converted_amount) + row.processing_fee;

    // Matrix
    if (!matrix[eKey]) matrix[eKey] = {};
    if (!matrix[eKey][tKey]) matrix[eKey][tKey] = { count: 0, amount: 0, interest: 0, income: 0 };
    matrix[eKey][tKey].count++;
    matrix[eKey][tKey].amount += amt;
    matrix[eKey][tKey].interest += (row.total_payable_amount - row.converted_amount) || 0;
    matrix[eKey][tKey].income += (row.total_payable_amount - row.converted_amount) + row.processing_fee;
  });

  // Top bookings (All sorted for Pareto)
  const topBookings = sortedTickets.slice().reverse();

  // --- Insight Generation Algorithms ---
  
  // 1. Ticket Size Insight
  const bottom50Count = Math.floor(data.length / 2);
  const bottom50MaxTicket = sortedTickets[bottom50Count]?.converted_amount || 0;
  
  let cumulativeVal = 0;
  let topValueThreshold = 0;
  for (let i = sortedTickets.length - 1; i >= 0; i--) {
    cumulativeVal += sortedTickets[i].converted_amount;
    if (cumulativeVal >= totalConverted * 0.5) {
      topValueThreshold = sortedTickets[i].converted_amount;
      break;
    }
  }
  
  const ticketInsight = `Pattern: 50% of users take loans below ${formatCurrency(bottom50MaxTicket)}, yet the top 50% of the total portfolio value is driven exclusively by ticket sizes above ${formatCurrency(topValueThreshold)}.`;

  // 2. EMI Insight
  // 3. Peak Hour Insight
  let peakHour = 0;
  for (let i = 1; i < 24; i++) {
    if (hourBuckets[i] > hourBuckets[peakHour]) peakHour = i;
  }
  const displayHour = peakHour === 0 ? '12 AM' : peakHour < 12 ? `${peakHour} AM` : peakHour === 12 ? '12 PM' : `${peakHour - 12} PM`;
  const hourPct = ((hourBuckets[peakHour] / data.length) * 100).toFixed(1);
  const timeInsight = `Peak booking hour is ${displayHour}, capturing ${hourPct}% (${hourBuckets[peakHour]}) of all daily bookings.`;

  // 4. Processing Fee Insight
  let mostCommonFee = Object.keys(feeBuckets)[0];
  Object.keys(feeBuckets).forEach(k => {
    if (feeBuckets[k].count > feeBuckets[mostCommonFee].count) mostCommonFee = k;
  });
  const feePct = ((feeBuckets[mostCommonFee].count / data.length) * 100).toFixed(1);
  const feeInsight = `Rs. ${mostCommonFee} is the most common processing fee, covering ${feePct}% of all bookings (${feeBuckets[mostCommonFee].count} users). This is a fixed flat fee regardless of ticket size.`;

  // 5. Value Concentration Insight (Matched to HTML prototype)
  const big = data.filter(d => d.converted_amount >= 50000);
  const bigShare = totalConverted > 0 ? (big.reduce((s, d) => s + d.converted_amount, 0) / totalConverted * 100).toFixed(1) : 0;
  const concentrationInsight = `Bookings of ₹50K+ make up ${big.length} of ${data.length} but drive ${bigShare}% of converted value - high-ticket users are the value engine, worth protecting with priority support and renewal nudges.`;

  // 6. Tenure Insight
  let maxTenureByUsers = Object.keys(tenureBuckets)[0];
  let maxTenureByAmount = Object.keys(tenureBuckets)[0];
  Object.keys(tenureBuckets).forEach(k => {
    if (tenureBuckets[k].count > tenureBuckets[maxTenureByUsers].count) maxTenureByUsers = k;
    if (tenureBuckets[k].amount > tenureBuckets[maxTenureByAmount].amount) maxTenureByAmount = k;
  });
  const maxTenUsersPct = ((tenureBuckets[maxTenureByUsers].count / data.length) * 100).toFixed(1);
  const maxTenAmtPct = ((tenureBuckets[maxTenureByAmount].amount / totalConverted) * 100).toFixed(1);
  const tenureInsight = maxTenureByUsers === maxTenureByAmount
    ? `The ${maxTenureByUsers} Months tenure is the absolute driver, capturing ${maxTenUsersPct}% of all users and ${maxTenAmtPct}% of the total converted value.`
    : `Pattern: ${maxTenureByUsers}M dominates user volume (${maxTenUsersPct}% of users), but ${maxTenureByAmount}M captures the highest total value (${maxTenAmtPct}%).`;

  // 7. Affordability is the hook (Matched to HTML prototype)
  const emi80 = getPercentile(sortedEmis.map(e => e.emi_amount_per_month), 0.8) || 7000;
  const emiUnder80Count = data.filter(d => d.emi_amount_per_month <= emi80).length;
  const emiPct = Math.round((emiUnder80Count / data.length) * 100);

  const affordabilityInsight = `${emiPct}% of users anchor on a monthly EMI under ${formatCurrency(emi80)}, suggesting that a comfortable monthly payment is the primary driver for conversion.`;
  const emiInsight = affordabilityInsight;

  // 8. ROI tolerance is real (Matched to HTML prototype)
  const roi18 = data.filter(d => d.interest_rate >= 18).length;
  const roi18Pct = ((roi18 / data.length) * 100).toFixed(1);
  const roi18Amount = data.filter(d => d.interest_rate >= 18).reduce((acc, d) => acc + (d.converted_amount || 0), 0);
  let roiInsight = `${roi18} users (${roi18Pct}%) successfully converted at 18% or higher, contributing ${formatCurrency(roi18Amount)} to the total volume.`;

  // 9. Biggest Day Insight
  let biggestDayKey = Object.keys(dayBuckets)[0] || '';
  Object.keys(dayBuckets).forEach(d => {
    if (dayBuckets[d].count > (dayBuckets[biggestDayKey]?.count || 0)) biggestDayKey = d;
  });
  const biggestDayDate = biggestDayKey ? new Date(biggestDayKey + 'T00:00:00') : null;
  const biggestDayLabel = biggestDayDate ? biggestDayDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'N/A';
  const biggestDayPct = biggestDayKey ? ((dayBuckets[biggestDayKey].count / data.length) * 100).toFixed(1) : 0;
  const biggestDayInsight = biggestDayKey
    ? `${biggestDayLabel} generated ${biggestDayPct}% of total bookings (${dayBuckets[biggestDayKey].count} users).`
    : 'No daily booking data available.';

  // 10. Referral Insight
  const referralPct = ((referralCount / data.length) * 100).toFixed(1);
  const referralInsight = `Referrals are under-utilized, driving only ${referralPct}% of conversions (${referralCount} users).`;

  Object.values(userMap).forEach(userBookings => {
    const distinctLoans = new Set(userBookings.map(b => b.loan_number).filter(Boolean));
    const isRepeatUser = (distinctLoans.size || userBookings.length) > 1;
    if (!isRepeatUser) return;
    const platforms = new Set(userBookings.map(b => b.os_type || 'Unknown'));
    platforms.forEach(os => {
      if (osBuckets[os]) osBuckets[os].repeatUsers++;
    });
  });

  const platformData = Object.values(osBuckets)
    .map(item => ({
      name: item.name,
      bookings: item.bookings,
      users: item.users.size || item.bookings,
      amount: item.amount,
      income: item.income,
      avgTicket: item.bookings ? item.amount / item.bookings : 0,
      repeatUsers: item.repeatUsers,
      bookingShare: data.length ? (item.bookings / data.length) * 100 : 0,
      valueShare: totalConverted ? (item.amount / totalConverted) * 100 : 0
    }))
    .sort((a, b) => b.bookings - a.bookings);

  const topPlatform = platformData[0];
  const platformInsight = topPlatform
    ? `${topPlatform.name} leads conversion volume with ${topPlatform.bookings} bookings (${topPlatform.bookingShare.toFixed(1)}%) and ${formatCurrency(topPlatform.amount)} converted value.`
    : 'No platform split available in this upload.';

  // Pre-calculate Drill Down Matrices for the frontend
  Object.keys(matrix).forEach(eKey => {
    Object.keys(matrix[eKey]).forEach(tKey => {
      const cell = matrix[eKey][tKey];
      if (cell.count > 0) {
        cell.drillDown = generateDrillDownMatrix(data, eKey, tKey);
      }
    });
  });

  Object.keys(roiMatrix).forEach(rKey => {
    Object.keys(roiMatrix[rKey]).forEach(tKey => {
      const cell = roiMatrix[rKey][tKey];
      if (cell.count > 0) {
        cell.drillDown = generateRoiDrillDownMatrix(data, rKey, tKey);
      }
    });
  });

  // 10. Segment Insights
  let highestVolumeCount = -1;
  let highestVolumeData = { emiRange: '', ticketRange: '', count: 0, drillDown: null };

  let highestValueAmount = -1;
  let highestValueData = { emiRange: '', ticketRange: '', amount: 0, count: 0, drillDown: null };

  let highestInterestAmount = -1;
  let highestInterestData = { emiRange: '', ticketRange: '', interest: 0, count: 0, drillDown: null };

  Object.keys(matrix).forEach(emiKey => {
    Object.keys(matrix[emiKey]).forEach(ticketKey => {
      const cell = matrix[emiKey][ticketKey];
      
      if (cell.count > highestVolumeCount) {
        highestVolumeCount = cell.count;
        highestVolumeData = { emiRange: emiKey, ticketRange: ticketKey, count: cell.count, drillDown: cell.drillDown };
      }

      if (cell.amount > highestValueAmount) {
        highestValueAmount = cell.amount;
        highestValueData = { emiRange: emiKey, ticketRange: ticketKey, amount: cell.amount, count: cell.count, drillDown: cell.drillDown };
      }
      
      if (cell.interest > highestInterestAmount) {
        highestInterestAmount = cell.interest;
        highestInterestData = { emiRange: emiKey, ticketRange: ticketKey, interest: cell.interest, count: cell.count, drillDown: cell.drillDown };
      }
    });
  });

  const topSegments = {
    volume: highestVolumeData,
    value: highestValueData,
    interest: highestInterestData
  };

  const segmentInsight = `The sweet spot: Tickets <strong>${topSegments.volume.ticketRange}</strong> with EMI <strong>${topSegments.volume.emiRange}</strong> generated the highest volume (${topSegments.volume.count} bookings). Highest value came from tickets <strong>${topSegments.value.ticketRange}</strong> with EMI <strong>${topSegments.value.emiRange}</strong> (${formatCurrency(topSegments.value.amount)}).`;

  let roiHighestVolumeCount = -1;
  let roiHighestVolumeData = { emiRange: '', ticketRange: '', count: 0, drillDown: null };

  let roiHighestValueAmount = -1;
  let roiHighestValueData = { emiRange: '', ticketRange: '', amount: 0, count: 0, drillDown: null };

  let roiHighestInterestAmount = -1;
  let roiHighestInterestData = { emiRange: '', ticketRange: '', interest: 0, count: 0, drillDown: null };

  Object.keys(roiMatrix).forEach(roiKey => {
    Object.keys(roiMatrix[roiKey]).forEach(ticketKey => {
      const cell = roiMatrix[roiKey][ticketKey];
      
      if (cell.count > roiHighestVolumeCount) {
        roiHighestVolumeCount = cell.count;
        roiHighestVolumeData = { emiRange: roiKey, ticketRange: ticketKey, count: cell.count, drillDown: cell.drillDown };
      }

      if (cell.amount > roiHighestValueAmount) {
        roiHighestValueAmount = cell.amount;
        roiHighestValueData = { emiRange: roiKey, ticketRange: ticketKey, amount: cell.amount, count: cell.count, drillDown: cell.drillDown };
      }
      
      if (cell.interest > roiHighestInterestAmount) {
        roiHighestInterestAmount = cell.interest;
        roiHighestInterestData = { emiRange: roiKey, ticketRange: ticketKey, interest: cell.interest, count: cell.count, drillDown: cell.drillDown };
      }
    });
  });

  const topRoiSegments = {
    volume: roiHighestVolumeData,
    value: roiHighestValueData,
    interest: roiHighestInterestData
  };

  const roiMatrixInsight = `The sweet spot: Tickets <strong>${topRoiSegments.volume.ticketRange}</strong> with ROI <strong>${topRoiSegments.volume.emiRange}</strong> generated the highest volume (${topRoiSegments.volume.count} bookings). Highest value came from tickets <strong>${topRoiSegments.value.ticketRange}</strong> with ROI <strong>${topRoiSegments.value.emiRange}</strong> (${formatCurrency(topRoiSegments.value.amount)}).`;

  // Best segment logic from HTML prototype
  const bestSeg = data.filter(d => d.converted_amount >= 25000 && d.converted_amount < 100000 && d.emi_amount_per_month < 7000 && d.tenure <= 24);
  const bestAmt = bestSeg.reduce((sum, d) => sum + d.converted_amount, 0);
  
  const byDate = {};
  data.forEach(d => {
    if (!byDate[d.date]) byDate[d.date] = { count: 0, amount: 0 };
    byDate[d.date].count++;
    byDate[d.date].amount += d.converted_amount;
  });
  const sortedDates = Object.keys(byDate).sort((a, b) => byDate[b].amount - byDate[a].amount);
  const peakDate = sortedDates[0];
  const peakData = peakDate ? byDate[peakDate] : { count: 0, amount: 0 };

  const bestSegmentInsight = {
    bookings: bestSeg.length,
    amount: bestAmt,
    percentage: totalConverted > 0 ? ((bestAmt / totalConverted) * 100).toFixed(1) : '0.0',
    peakDate: peakDate || 'N/A',
    peakCount: peakData.count,
    peakAmount: peakData.amount
  };

  // ROI insight is statically set above to match HTML prototype.

  // 11. Tenure by Ticket Size (stacked bar data)
  const ticketKeys = Object.keys(ticketBuckets);
  const tenureKeys = Object.keys(tenureBuckets);
  const tenureByTicketMap = {};
  ticketKeys.forEach(tk => {
    tenureByTicketMap[tk] = {};
    tenureKeys.forEach(ten => { tenureByTicketMap[tk][ten] = 0; });
  });
  data.forEach(row => {
    const amt = row.converted_amount;
    let tKey = getBracketKey(amt, ticketBrackets);
    const ten = String(row.tenure);
    if (tenureByTicketMap[tKey] && tenureByTicketMap[tKey][ten] !== undefined) {
      tenureByTicketMap[tKey][ten]++;
    }
  });
  const tenureByTicket = ticketKeys.map(tk => {
    const entry = { name: tk };
    let total = 0;
    tenureKeys.forEach(ten => {
      entry[`${ten}M`] = tenureByTicketMap[tk][ten];
      total += tenureByTicketMap[tk][ten];
    });
    entry.total = total;
    return entry;
  });

  // 12. Top 10 Bookings Detailed
  const topBookingsDetailed = topBookings.slice(0, 10).map((row, idx) => ({
    rank: idx + 1,
    amount: row.converted_amount,
    emi: row.emi_amount_per_month,
    tenure: row.tenure,
    roi: row.interest_rate
  }));

  // --- NEW LOGIC FOR HTML PROTOTYPE CHARTS ---
  // A. Revenue Yield By Tenure
  const revenueByTenureData = Object.keys(tenureBuckets).map(ten => {
    const p = tenureBuckets[ten].amount;
    const i = tenureBuckets[ten].interest;
    return {
      name: `${ten}M`,
      principal: p,
      interest: i,
      pShare: totalConverted > 0 ? (p / totalConverted) * 100 : 0,
      iShare: totalInterest > 0 ? (i / totalInterest) * 100 : 0
    };
  });

  // B. Revenue Yield By ROI Band & ROI Acceptance
  const ROI_BANDS = ['<=12%', '12%-18%', '18%-22%', '22%+'];
  const getRoiBand = (roi) => roi <= 12 ? '<=12%' : roi <= 18 ? '12%-18%' : roi <= 22 ? '18%-22%' : '22%+';
  
  const roiBandsData = ROI_BANDS.reduce((acc, band) => {
    acc[band] = { bookings: 0, principal: 0, interest: 0 };
    return acc;
  }, {});

  data.forEach(row => {
    const band = getRoiBand(row.interest_rate);
    const inc = row.total_payable_amount - row.converted_amount;
    roiBandsData[band].bookings += 1;
    roiBandsData[band].principal += row.converted_amount;
    roiBandsData[band].interest += inc;
  });

  const roiAcceptanceData = ROI_BANDS.map(band => ({
    name: band,
    bookings: roiBandsData[band].bookings,
    interest: roiBandsData[band].interest,
    principal: roiBandsData[band].principal,
    pShare: totalConverted > 0 ? (roiBandsData[band].principal / totalConverted) * 100 : 0,
    iShare: totalInterest > 0 ? (roiBandsData[band].interest / totalInterest) * 100 : 0,
    effectiveYield: roiBandsData[band].principal > 0 ? (roiBandsData[band].interest / roiBandsData[band].principal) * 100 : 0
  }));

  const revenueByRoiData = roiAcceptanceData;

  // -------------------------------------------

  // Heatmap Formatting
  const heatmapData = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      heatmapData.push({
        day: daysOfWeek[d],
        dayIndex: d,
        hour: h,
        count: heatmapBuckets[d][h].count,
        amount: heatmapBuckets[d][h].amount,
        income: heatmapBuckets[d][h].income,
        rows: heatmapBuckets[d][h].rows
      });
    }
  }

  // Quadrant Formatting
  const quadrantData = data.map(row => ({
    ticketSize: row.converted_amount,
    interestIncome: row.total_payable_amount - row.converted_amount + row.processing_fee,
    roi: row.interest_rate,
    tenure: row.tenure,
    feePct: row.converted_amount > 0 ? (row.processing_fee / row.converted_amount) * 100 : 0
  }));

  // Fee Burden Formatting
  const feeBurdenData = Object.keys(ticketBuckets).map(key => ({
    name: key,
    avgBurden: ticketBuckets[key] > 0 ? (ticketFeeBurdenSum[key] / ticketBuckets[key]) : 0
  }));
  // 13. Dynamic Scatter Data for Booking Map
  const MAX_SCATTER_POINTS = 2000;
  let scatterDataRaw = data;
  if (data.length > MAX_SCATTER_POINTS) {
    const step = Math.ceil(data.length / MAX_SCATTER_POINTS);
    scatterDataRaw = data.filter((_, i) => i % step === 0);
  }
  const scatterData = scatterDataRaw.map(d => ({
    ticket: d.converted_amount,
    emi: d.emi_amount_per_month,
    tenure: d.tenure_in_months || d.tenure,
    roiHigh: d.interest_rate >= 18
  }));

  const thresholds = {
    ticket: [0, ...ticketBrackets, data.length > 0 ? Math.max(...data.map(d => d.converted_amount)) : 0],
    emi: [0, ...emiBrackets, data.length > 0 ? Math.max(...data.map(d => d.emi_amount_per_month)) : 0]
  };

  const countWeightedRoi = data.length > 0 ? data.reduce((acc, row) => acc + (row.interest_rate || 0), 0) / data.length : 0;
  const principalWeightedYield = totalConverted > 0 ? data.reduce((acc, row) => acc + ((row.interest_rate || 0) * (row.converted_amount || 0)), 0) / totalConverted : 0;
  const takeRate = totalConverted > 0 ? ((totalInterest + totalProcessingFee) / totalConverted) * 100 : 0;

  return {
    summary: {
      users: data.length,
      totalConverted,
      totalPayable,
      totalRevenue: totalInterest + totalProcessingFee,
      avgTicket: Math.round(avgTicket),
      medianTicket: Math.round(medianTicket),
      avgEmi: Math.round(avgEmi),
      medianEmi: Math.round(medianEmi),
      totalInterest,
      totalProcessingFee,
      referralCount,
      dateRange,
      conversionInsight,
      averagesInsight,
      repeatConverters,
      repeatAnalytics,
      uniqueUsers,
      totalBookings,
      totalInterestIncome,
      incomePerUser,
      effectiveCostPct,
      countWeightedRoi,
      principalWeightedYield,
      takeRate
    },
    insights: {
      ticket: ticketInsight,
      emi: emiInsight,
      time: timeInsight,
      fee: feeInsight,
      concentration: concentrationInsight,
      tenure: tenureInsight,
      roi: roiInsight,
      biggestDay: biggestDayInsight,
      referral: referralInsight,
      segment: segmentInsight,
      roiMatrix: roiMatrixInsight,
      platform: platformInsight,
      bestSegment: bestSegmentInsight
    },
    keyTakeaways: {
      valueConcentration: {
        users: big.length,
        percentage: bigShare,
        text: concentrationInsight
      },
      affordability: {
        usersUnderThreshold: emiUnder80Count,
        thresholdFormatted: formatCurrency(emi80),
        totalUsers: data.length,
        text: emiInsight
      },
      roiTolerance: {
        usersAt18: roi18,
        totalUsers: data.length,
        text: roiInsight
      },
      bestSegment: bestSegmentInsight
    },
    timeData: {
      daily: Object.keys(dayBuckets).sort().map(d => ({ name: d, count: dayBuckets[d].count, amount: dayBuckets[d].amount })),
      hourly: hourBuckets.map((count, hr) => ({ name: `${hr}:00`, count }))
    },
    feeData: Object.keys(feeBuckets).map(fee => ({ name: `Rs. ${fee}`, count: feeBuckets[fee].count })),
    costData: data.map(row => ({
      interest_rate: row.interest_rate,
      tenure: row.tenure,
      amount: row.converted_amount,
      interestBurden: row.total_payable_amount - row.converted_amount
    })).reduce((acc, row) => {
      // Group by tenure to calculate average ROI for the new Cost of Borrowing chart
      const existing = acc.find(item => item.tenure === row.tenure);
      if (existing) {
        existing.users += 1;
        existing.total_interest_rate += row.interest_rate;
        existing.avg_interest_rate = parseFloat((existing.total_interest_rate / existing.users).toFixed(2));
      } else {
        acc.push({
          tenure: row.tenure,
          users: 1,
          total_interest_rate: row.interest_rate,
          avg_interest_rate: row.interest_rate
        });
      }
      return acc;
    }, []).sort((a, b) => a.tenure - b.tenure),
    ticketData: Object.keys(ticketBuckets).map(key => ({
      name: key,
      users: ticketBuckets[key],
      amount: ticketAmounts[key],
      amountShare: (ticketAmounts[key] / totalConverted) * 100
    })),
    emiData: Object.keys(emiBuckets).map(key => ({
      name: key,
      users: emiBuckets[key]
    })),
    tenureData: Object.keys(tenureBuckets).map(key => ({
      name: `${key}M`,
      users: tenureBuckets[key].count,
      amount: tenureBuckets[key].amount
    })).filter(item => item.users > 0),
    roiData: Object.keys(roiBuckets).map(key => ({
      name: key,
      users: roiBuckets[key].count,
      amount: roiBuckets[key].amount
    })),
    roiKeys: allRoiKeys,
    roiMatrix,
    ticketKeys: allTicketKeys,
    emiKeys: allEmiKeys,
    matrix,
    topBookings,
    tenureByTicket,
    topBookingsDetailed,
    heatmapData,
    quadrantData,
    feeBurdenData,
    platformData,
    topSegments,
    topRoiSegments,
    scatterData,
    thresholds,
    revenueByTenureData,
    revenueByRoiData,
    roiAcceptanceData
  };
};

export { formatCurrency };
