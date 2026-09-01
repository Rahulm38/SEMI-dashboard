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

const buildTimestamp = (rng, index, totalBookings) => {
  if (index === 0) return new Date('2026-05-27T14:23:00+05:30').toISOString();
  if (index === totalBookings - 1) return new Date('2026-08-31T14:26:00+05:30').toISOString();

  const month = weightedPick(rng, [6, 7, 8], [2608, 5903, 6616]);
  const daysInMonth = new Date(2026, month, 0).getDate();
  const weekdayWeights = [1872, 2214, 2000, 1978, 2756, 2333, 1975];
  const maxWeekdayWeight = Math.max(...weekdayWeights);
  let date;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const day = 1 + Math.floor(rng() * daysInMonth);
    const candidate = new Date(2026, month - 1, day);
    date = candidate;
    if (rng() <= weekdayWeights[candidate.getDay()] / maxWeekdayWeight) break;
  }

  const hour = weightedPick(
    rng,
    [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
    [12, 35, 67, 74, 106, 247, 466, 1145, 1022, 1036, 1033, 1046, 972, 946, 895, 936, 984, 1138, 795, 707, 627, 566, 273]
  );
  date.setHours(hour, Math.floor(rng() * 60), Math.floor(rng() * 60), 0);
  return date.toISOString();
};

const buildConvertedAmount = (rng) => {
  const band = weightedPick(
    rng,
    [
      [2500, 10000],
      [10000, 25000],
      [25000, 50000],
      [50000, 100000],
      [100000, 150000],
      [150000, 200000],
      [200000, 900000],
    ],
    [3247, 5488, 3881, 1931, 391, 98, 109]
  );

  const [min, max] = band;
  const sampled = min >= 200000
    ? min + Math.min(max - min, -Math.log(1 - rng()) * 75000)
    : min + Math.pow(rng(), 1.25) * (max - min);

  return roundTo(clamp(sampled, 2500, 900000), 10);
};

const buildInterestRate = (rng) => {
  const anchor = weightedPick(
    rng,
    [10.08, 11.88, 14.4, 16.44, 18.6, 21, 23.64, 24.84, 24.96],
    [4, 6, 8, 7, 10, 10, 20, 15, 20]
  );
  const jitter = anchor === 24.96 ? 0 : (rng() - 0.5) * 0.24;
  return Number(clamp(anchor + jitter, 10.08, 24.96).toFixed(2));
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
  const totalBookings = 15145;
  const userPool = 13000;

  for (let i = 0; i < totalBookings; i += 1) {
    const userIndex = i < userPool ? i : Math.floor(rng() * userPool);

    const userId = `demo_user_${pad(userIndex + 1, 5)}`;
    const cardSlot = i >= userPool && rng() < 0.09 ? 2 : 1;
    const cardId = `demo_card_${pad(userIndex + 1, 5)}_${cardSlot}`;
    const loanId = `demo_loan_${pad(i + 1, 6)}`;

    const convertedAmount = buildConvertedAmount(rng);
    const tenure = weightedPick(rng, [6, 12, 24, 36, 48], [8110, 4035, 1464, 473, 1063]);
    const interestRate = buildInterestRate(rng);
    const emi = roundTo(calculateEmi(convertedAmount, interestRate, tenure), 1);
    const totalPayable = roundTo(emi * tenure, 1);
    const totalInterest = roundTo(Math.max(0, totalPayable - convertedAmount), 1);
    const processingFee = weightedPick(
      rng,
      [199, 499, 699, 849, 899, 999],
      [23, 68, 553, 1, 3483, 11017]
    );

    rows.push({
      auth_id: userId,
      os_type: weightedPick(rng, ['Android', 'iOS'], [11354, 3791]),
      aan_number: cardId,
      loan_number: loanId,
      converted_amount: convertedAmount,
      interest_rate: interestRate,
      referral_flag: weightedPick(rng, ['No', 'Yes'], [15078, 67]),
      tenure,
      processing_fee: processingFee,
      emi_amount_per_month: emi,
      principal_amount: convertedAmount,
      total_interest_amount: totalInterest,
      total_payable_amount: totalPayable,
      conversion_status: 'Y',
      consent_timestamp: buildTimestamp(rng, i, totalBookings),
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
