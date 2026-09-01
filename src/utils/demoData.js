const makeRng = (seed = 38038) => {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const weightedPick = (rng, values, weights) => {
  const total = weights.reduce((sum, value) => sum + value, 0);
  let roll = rng() * total;
  for (let i = 0; i < values.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return values[i];
  }
  return values[values.length - 1];
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const roundTo = (value, step) => Math.round(value / step) * step;
const pad = (value, size = 4) => String(value).padStart(size, '0');

const buildTimestamp = (rng, index) => {
  const start = new Date('2026-04-01T00:00:00+05:30').getTime();
  const end = new Date('2026-08-31T23:59:59+05:30').getTime();
  const daySpread = (index * 104729) % (end - start);
  const jitter = Math.floor(rng() * 48 * 60 * 60 * 1000);
  const date = new Date(start + ((daySpread + jitter) % (end - start)));

  const hour = weightedPick(
    rng,
    [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
    [2, 4, 8, 11, 12, 11, 8, 5, 5, 7, 10, 13, 14, 12, 7, 3]
  );
  date.setHours(hour, Math.floor(rng() * 60), Math.floor(rng() * 60), 0);
  return date.toISOString();
};

const calculateEmi = (principal, annualRate, tenure) => {
  const monthlyRate = annualRate / 1200;
  if (!monthlyRate) return principal / tenure;
  const factor = Math.pow(1 + monthlyRate, tenure);
  return principal * monthlyRate * factor / (factor - 1);
};

export const generateDemoCsv = () => {
  const rng = makeRng();
  const rows = [];
  const totalBookings = 840;
  const userPool = 560;

  for (let i = 0; i < totalBookings; i += 1) {
    const repeatBias = rng();
    const userIndex = repeatBias < 0.72
      ? i % userPool
      : Math.floor(rng() * Math.min(userPool, Math.max(1, i + 1)));

    const userId = `demo_user_${pad(userIndex + 1)}`;
    const cardSlot = rng() < 0.18 ? 2 : 1;
    const cardId = `demo_card_${pad(userIndex + 1)}_${cardSlot}`;
    const loanId = `demo_loan_${pad(i + 1, 5)}`;

    const ticketAnchor = Math.pow(rng(), 1.65);
    let convertedAmount = 6500 + ticketAnchor * 145000;
    if (rng() < 0.08) convertedAmount += 70000 + rng() * 90000;
    convertedAmount = roundTo(clamp(convertedAmount, 5000, 250000), 500);

    const tenure = weightedPick(rng, [6, 12, 24, 36, 48], [27, 36, 22, 10, 5]);
    const interestRate = Number(clamp(17.2 + rng() * 9 + (tenure >= 36 ? 0.8 : 0), 17, 27).toFixed(2));
    const emi = roundTo(calculateEmi(convertedAmount, interestRate, tenure), 1);
    const totalPayable = roundTo(emi * tenure, 1);
    const totalInterest = roundTo(Math.max(0, totalPayable - convertedAmount), 1);

    const processingFee = convertedAmount < 25000
      ? weightedPick(rng, [199, 299], [65, 35])
      : convertedAmount < 75000
        ? weightedPick(rng, [299, 499], [55, 45])
        : weightedPick(rng, [499, 799, 999], [35, 40, 25]);

    rows.push({
      auth_id: userId,
      os_type: rng() < 0.69 ? 'Android' : 'iOS',
      aan_number: cardId,
      loan_number: loanId,
      converted_amount: convertedAmount,
      interest_rate: interestRate,
      referral_flag: rng() < 0.19 ? 'Yes' : 'No',
      tenure,
      processing_fee: processingFee,
      emi_amount_per_month: emi,
      principal_amount: convertedAmount,
      total_interest_amount: totalInterest,
      total_payable_amount: totalPayable,
      conversion_status: 'Y',
      consent_timestamp: buildTimestamp(rng, i),
    });
  }

  const headers = [
    'auth_id',
    'os_type',
    'aan_number',
    'loan_number',
    'converted_amount',
    'interest_rate',
    'referral_flag',
    'tenure',
    'processing_fee',
    'emi_amount_per_month',
    'principal_amount',
    'total_interest_amount',
    'total_payable_amount',
    'conversion_status',
    'consent_timestamp',
  ];

  return [
    headers.join(','),
    ...rows.map(row => headers.map(header => row[header]).join(',')),
  ].join('\n');
};
