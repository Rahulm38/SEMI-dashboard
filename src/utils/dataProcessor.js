import Papa from 'papaparse';

export const processCsvData = (csvString) => {
  return new Promise((resolve, reject) => {
    Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data.map(row => ({
          ...row,
          converted_amount: parseFloat(row.converted_amount) || 0,
          interest_rate: parseFloat(row.interest_rate) || 0,
          tenure: parseInt(row.tenure, 10) || 0,
          processing_fee: parseFloat(row.processing_fee) || 0,
          emi_amount_per_month: parseFloat(row.emi_amount_per_month) || 0,
          principal_amount: parseFloat(row.principal_amount) || 0,
          total_payable_amount: parseFloat(row.total_payable_amount) || 0,
          date: row.consent_timestamp ? new Date(row.consent_timestamp) : null
        })).filter(row => row.conversion_status === 'Y');

        const metrics = calculateMetrics(data);
        resolve({ rawData: data, metrics });
      },
      error: (error) => reject(error)
    });
  });
};

const formatCurrency = (value) => {
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
  const conversionInsight = `Total revenue earned: ${formatCurrency(totalInterest + totalProcessingFee)} (Interest ${formatCurrency(totalInterest)} + Fees ${formatCurrency(totalProcessingFee)}). Effective cost to users: ${((totalInterest / totalConverted) * 100).toFixed(1)}% of principal.`;
  const averagesInsight = avgTicket > medianTicket
    ? `Average ticket (${formatCurrency(avgTicket)}) is ${((avgTicket - medianTicket) / medianTicket * 100).toFixed(0)}% above the median (${formatCurrency(medianTicket)}), suggesting a few high-value outliers. Target mid-range users for growth.`
    : `Average and Median are close, indicating an even distribution — no extreme outlier bookings.`;

  // Ticket Size Buckets & Fee Burden
  const ticketBuckets = { '<7.5K': 0, '7.5K-10K': 0, '10K-25K': 0, '25K-50K': 0, '50K-1L': 0, '1L+': 0 };
  const ticketAmounts = { '<7.5K': 0, '7.5K-10K': 0, '10K-25K': 0, '25K-50K': 0, '50K-1L': 0, '1L+': 0 };
  const ticketFeeBurdenSum = { '<7.5K': 0, '7.5K-10K': 0, '10K-25K': 0, '25K-50K': 0, '50K-1L': 0, '1L+': 0 };
  
  // EMI Comfort Buckets
  const emiBuckets = { '<1K': 0, '1K-2.5K': 0, '2.5K-5K': 0, '5K-7K': 0, '7K-10K': 0, '10K+': 0 };

  // Tenure
  const tenureBuckets = { '6': { count: 0, amount: 0 }, '12': { count: 0, amount: 0 }, '24': { count: 0, amount: 0 }, '36': { count: 0, amount: 0 }, '48': { count: 0, amount: 0 } };

  // ROI Bands
  const roiBuckets = { '<=12%': { count: 0, amount: 0 }, '12-18%': { count: 0, amount: 0 }, '18-22%': { count: 0, amount: 0 }, '22%+': { count: 0, amount: 0 } };

  // Processing Fees
  const feeBuckets = {};

  // Temporal Tracking
  const dayBuckets = {};
  const hourBuckets = Array(24).fill(0);
  
  // Heatmap: dayOfWeek x hour
  const heatmapBuckets = Array(7).fill(0).map(() => Array(24).fill(0));
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Segment Matrix: Ticket x EMI
  const matrix = {};

  let referralCount = 0;

  // Repeat Converter Detection
  const authIdCounts = {};
  data.forEach(row => {
    const id = row.auth_id;
    if (id) authIdCounts[id] = (authIdCounts[id] || 0) + 1;
  });
  const repeatConverters = Object.values(authIdCounts).filter(c => c > 1).length;
  const uniqueUsers = Object.keys(authIdCounts).length;
  const totalBookings = data.length;
  
  // Gross Revenue = Interest Earned + Processing Fee
  const grossRevenue = totalInterest + totalProcessingFee;
  const revenuePerUser = grossRevenue / data.length;
  const effectiveCostPct = (grossRevenue / totalConverted * 100);

  data.forEach(row => {
    // Referral
    if (row.referral_flag && row.referral_flag.toLowerCase() === 'yes') referralCount++;

    // Processing Fee
    const fee = row.processing_fee;
    if (!feeBuckets[fee]) feeBuckets[fee] = { count: 0, amount: 0 };
    feeBuckets[fee].count++;
    feeBuckets[fee].amount += fee;

    // Time
    if (row.date && !isNaN(row.date.getTime())) {
      const dayStr = row.date.toISOString().split('T')[0]; // YYYY-MM-DD
      const hour = row.date.getHours();
      const dayOfWeek = row.date.getDay();
      
      if (!dayBuckets[dayStr]) dayBuckets[dayStr] = { count: 0, amount: 0 };
      dayBuckets[dayStr].count++;
      dayBuckets[dayStr].amount += row.converted_amount;
      
      hourBuckets[hour]++;
      heatmapBuckets[dayOfWeek][hour]++;
    }

    // Ticket Size
    const amt = row.converted_amount;
    let tKey = '';
    if (amt < 7500) tKey = '<7.5K';
    else if (amt < 10000) tKey = '7.5K-10K';
    else if (amt < 25000) tKey = '10K-25K';
    else if (amt < 50000) tKey = '25K-50K';
    else if (amt < 100000) tKey = '50K-1L';
    else tKey = '1L+';
    
    ticketBuckets[tKey]++;
    ticketAmounts[tKey] += amt;
    ticketFeeBurdenSum[tKey] += (row.processing_fee / amt) * 100;

    // EMI
    const emi = row.emi_amount_per_month;
    let eKey = '';
    if (emi < 1000) eKey = '<1K';
    else if (emi < 2500) eKey = '1K-2.5K';
    else if (emi < 5000) eKey = '2.5K-5K';
    else if (emi < 7000) eKey = '5K-7K';
    else if (emi < 10000) eKey = '7K-10K';
    else eKey = '10K+';

    emiBuckets[eKey]++;

    // Tenure
    if (tenureBuckets[row.tenure]) {
      tenureBuckets[row.tenure].count++;
      tenureBuckets[row.tenure].amount += amt;
    }

    // ROI
    const roi = row.interest_rate;
    if (roi <= 12) { roiBuckets['<=12%'].count++; roiBuckets['<=12%'].amount += amt; }
    else if (roi <= 18) { roiBuckets['12-18%'].count++; roiBuckets['12-18%'].amount += amt; }
    else if (roi <= 22) { roiBuckets['18-22%'].count++; roiBuckets['18-22%'].amount += amt; }
    else { roiBuckets['22%+'].count++; roiBuckets['22%+'].amount += amt; }

    // Matrix
    if (!matrix[eKey]) matrix[eKey] = {};
    if (!matrix[eKey][tKey]) matrix[eKey][tKey] = { count: 0, amount: 0 };
    matrix[eKey][tKey].count++;
    matrix[eKey][tKey].amount += amt;
  });

  // Top bookings (All sorted for Pareto)
  const topBookings = sortedTickets.slice().reverse();

  // --- Insight Generation Algorithms ---
  
  // 1. Ticket Size Insight
  let maxUsersTicket = Object.keys(ticketBuckets)[0];
  let maxAmountTicket = Object.keys(ticketAmounts)[0];
  Object.keys(ticketBuckets).forEach(k => {
    if (ticketBuckets[k] > ticketBuckets[maxUsersTicket]) maxUsersTicket = k;
    if (ticketAmounts[k] > ticketAmounts[maxAmountTicket]) maxAmountTicket = k;
  });
  const maxAmountShare = ((ticketAmounts[maxAmountTicket] / totalConverted) * 100).toFixed(1);
  const ticketInsight = maxUsersTicket === maxAmountTicket 
    ? `Pattern: The ${maxUsersTicket} bucket dominates both user count (${ticketBuckets[maxUsersTicket]}) and value.`
    : `Pattern: ${maxUsersTicket} has the most users (${ticketBuckets[maxUsersTicket]}), but ${maxAmountTicket} drives the highest value (${maxAmountShare}%).`;

  // 2. EMI Insight
  const under7kCount = emiBuckets['<1K'] + emiBuckets['1K-2.5K'] + emiBuckets['2.5K-5K'] + emiBuckets['5K-7K'];
  const under5kCount = emiBuckets['<1K'] + emiBuckets['1K-2.5K'] + emiBuckets['2.5K-5K'];
  const emiInsight = `${under5kCount} of ${data.length} users pay under Rs. 5K EMI — the sweet spot for conversions. Only ${emiBuckets['10K+'] || 0} users have EMI above Rs. 10K, confirming affordability drives adoption.`;

  // 3. Peak Hour Insight
  let peakHour = 0;
  for (let i = 1; i < 24; i++) {
    if (hourBuckets[i] > hourBuckets[peakHour]) peakHour = i;
  }
  const displayHour = peakHour === 0 ? '12 AM' : peakHour < 12 ? `${peakHour} AM` : peakHour === 12 ? '12 PM' : `${peakHour - 12} PM`;
  const timeInsight = `Peak booking hour by count is ${displayHour}, with ${hourBuckets[peakHour]} bookings.`;

  // 4. Processing Fee Insight
  let mostCommonFee = Object.keys(feeBuckets)[0];
  Object.keys(feeBuckets).forEach(k => {
    if (feeBuckets[k].count > feeBuckets[mostCommonFee].count) mostCommonFee = k;
  });
  const feeInsight = `Processing fee Rs. ${mostCommonFee} is the most common (${feeBuckets[mostCommonFee].count} users).`;

  // 5. Value Concentration Insight
  const top10Val = topBookings.slice(0, 10).reduce((sum, b) => sum + b.converted_amount, 0);
  const top10Share = ((top10Val / totalConverted) * 100).toFixed(1);
  const top20pctCount = Math.ceil(data.length * 0.2);
  const top20pctVal = topBookings.slice(0, top20pctCount).reduce((sum, b) => sum + b.converted_amount, 0);
  const top20pctShare = ((top20pctVal / totalConverted) * 100).toFixed(1);
  const concentrationInsight = `Top ${top20pctCount} users (20%) account for ${top20pctShare}% of total value — classic Pareto pattern. The top 10 bookings alone drive ${top10Share}%.`;

  // 6. Tenure Insight
  let maxTenureByUsers = Object.keys(tenureBuckets)[0];
  let maxTenureByAmount = Object.keys(tenureBuckets)[0];
  Object.keys(tenureBuckets).forEach(k => {
    if (tenureBuckets[k].count > tenureBuckets[maxTenureByUsers].count) maxTenureByUsers = k;
    if (tenureBuckets[k].amount > tenureBuckets[maxTenureByAmount].amount) maxTenureByAmount = k;
  });
  const tenureInsight = maxTenureByUsers === maxTenureByAmount
    ? `The ${maxTenureByUsers} Months tenure is the most popular, capturing both the highest number of users (${tenureBuckets[maxTenureByUsers].count}) and the most converted value (${formatCurrency(tenureBuckets[maxTenureByAmount].amount)}).`
    : `Pattern: ${maxTenureByUsers}M dominates by user volume, but ${maxTenureByAmount}M captures the highest total value (${formatCurrency(tenureBuckets[maxTenureByAmount].amount)}). Users taking larger loans prefer ${maxTenureByAmount}M.`;

  // 7. ROI Insight
  const lowRoiCount = roiBuckets['<=12%'].count + roiBuckets['12-18%'].count;
  const highRoiCount = roiBuckets['18-22%'].count + roiBuckets['22%+'].count;
  const highRoiAmount = roiBuckets['18-22%'].amount + roiBuckets['22%+'].amount;
  const roiInsight = highRoiCount > 0 
    ? `${lowRoiCount} users converted at ≤18% ROI, while ${highRoiCount} users still converted at 18%+ ROI (${formatCurrency(highRoiAmount)} value). High-ROI users are price-insensitive — an upsell opportunity.`
    : `All ${lowRoiCount} users converted at ≤18% ROI.`;

  // 8. Biggest Day Insight
  let biggestDayKey = Object.keys(dayBuckets)[0] || '';
  Object.keys(dayBuckets).forEach(d => {
    if (dayBuckets[d].count > (dayBuckets[biggestDayKey]?.count || 0)) biggestDayKey = d;
  });
  const biggestDayDate = biggestDayKey ? new Date(biggestDayKey + 'T00:00:00') : null;
  const biggestDayLabel = biggestDayDate ? biggestDayDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'N/A';
  const biggestDayInsight = biggestDayKey
    ? `${biggestDayLabel} is the biggest day: ${dayBuckets[biggestDayKey].count} bookings, ${formatCurrency(dayBuckets[biggestDayKey].amount)}.`
    : 'No daily booking data available.';

  // 9. Referral Insight
  const referralInsight = `Referral is almost absent: only ${referralCount}/${data.length} users have referral flag as Yes.`;

  // 10. Best Segment Insight (algorithmically find best operating segment from matrix)
  let bestSegKey = '';
  let bestSegScore = -1;
  let bestSegmentData = { emiRange: '', ticketRange: '', users: 0, amount: 0 };
  Object.keys(matrix).forEach(emiKey => {
    Object.keys(matrix[emiKey]).forEach(ticketKey => {
      const cell = matrix[emiKey][ticketKey];
      // Score = count * avgAmount (balances volume and value)
      const score = cell.count * (cell.amount / cell.count);
      if (score > bestSegScore) {
        bestSegScore = score;
        bestSegKey = `${emiKey} EMI × ${ticketKey} Ticket`;
        // Store best segment components for dynamic UI rendering
        bestSegmentData = {
          emiRange: emiKey,
          ticketRange: ticketKey,
          users: cell.count,
          amount: cell.amount
        };
      }
    });
  });
  const bestCell = (() => {
    for (const ek of Object.keys(matrix)) {
      for (const tk of Object.keys(matrix[ek])) {
        const c = matrix[ek][tk];
        if (c.count * (c.amount / c.count) === bestSegScore) return c;
      }
    }
    return { count: 0, amount: 0 };
  })();
  const bestSegmentInsight = bestSegKey
    ? `Best operating segment: ${bestSegKey} — ${bestCell.count} users, ${formatCurrency(bestCell.amount)} total value.`
    : 'No segment data available.';

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
    let tKey = '';
    if (amt < 7500) tKey = '<7.5K';
    else if (amt < 10000) tKey = '7.5K-10K';
    else if (amt < 25000) tKey = '10K-25K';
    else if (amt < 50000) tKey = '25K-50K';
    else if (amt < 100000) tKey = '50K-1L';
    else tKey = '1L+';
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

  // Heatmap Formatting
  const heatmapData = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      heatmapData.push({
        day: daysOfWeek[d],
        dayIndex: d,
        hour: h,
        count: heatmapBuckets[d][h]
      });
    }
  }

  // Quadrant Formatting
  const quadrantData = data.map(row => ({
    ticketSize: row.converted_amount,
    profit: row.total_payable_amount - row.converted_amount + row.processing_fee,
    roi: row.interest_rate,
    tenure: row.tenure,
    feePct: (row.processing_fee / row.converted_amount) * 100
  }));

  // Fee Burden Formatting
  const feeBurdenData = Object.keys(ticketBuckets).map(key => ({
    name: key,
    avgBurden: ticketBuckets[key] > 0 ? (ticketFeeBurdenSum[key] / ticketBuckets[key]) : 0
  }));


  return {
    summary: {
      users: data.length,
      totalConverted,
      totalPayable,
      totalInterest,
      totalProcessingFee,
      avgTicket,
      medianTicket,
      avgEmi,
      medianEmi,
      referralCount,
      dateRange,
      conversionInsight,
      averagesInsight,
      repeatConverters,
      uniqueUsers,
      totalBookings,
      grossRevenue,
      revenuePerUser,
      effectiveCostPct
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
    matrix,
    topBookings,
    tenureByTicket,
    topBookingsDetailed,
    heatmapData,
    quadrantData,
    feeBurdenData,
    bestSegmentData
  };
};

export { formatCurrency };
