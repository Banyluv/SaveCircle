/**
 * Loan Calculator Utility (ESM port of LoanApp's loanCalculator)
 * Supports: Flat Rate, Reducing Balance, Compound Interest
 * Frequencies: daily, weekly, monthly, quarterly, annually, lump_sum
 */

export const FREQUENCIES = ['daily', 'weekly', 'monthly', 'quarterly', 'annually', 'lump_sum'];
export const INTEREST_TYPES = ['flat', 'reducing', 'compound'];
export const LOAN_TYPES = ['personal', 'business', 'cooperative', 'emergency', 'mortgage', 'auto'];

const FREQUENCY_MONTHS = {
  daily: 1 / 30,
  weekly: 7 / 30,
  monthly: 1,
  quarterly: 3,
  annually: 12,
  lump_sum: null,
};

/**
 * Calculate number of installments based on tenure and frequency
 */
export const getInstallmentCount = (tenureMonths, frequency) => {
  if (frequency === 'lump_sum') return 1;
  if (frequency === 'daily') return tenureMonths * 30;
  if (frequency === 'weekly') return Math.ceil((tenureMonths * 30) / 7);
  if (frequency === 'monthly') return tenureMonths;
  if (frequency === 'quarterly') return Math.ceil(tenureMonths / 3);
  if (frequency === 'annually') return Math.ceil(tenureMonths / 12);
  return tenureMonths;
};

/**
 * Get next due date based on frequency
 */
const getNextDueDate = (currentDate, frequency) => {
  const date = new Date(currentDate);
  switch (frequency) {
    case 'daily': date.setDate(date.getDate() + 1); break;
    case 'weekly': date.setDate(date.getDate() + 7); break;
    case 'monthly': date.setMonth(date.getMonth() + 1); break;
    case 'quarterly': date.setMonth(date.getMonth() + 3); break;
    case 'annually': date.setFullYear(date.getFullYear() + 1); break;
    case 'lump_sum':
      // entire tenure
      break;
  }
  return date;
};

/**
 * FLAT RATE: Interest calculated on original principal throughout
 * Monthly rate applied * number of periods
 */
export const calculateFlatRate = (principal, annualRate, tenureMonths, frequency) => {
  const totalInterest = (principal * (annualRate / 100) * tenureMonths) / 12;
  const totalPayable = principal + totalInterest;
  const installments = getInstallmentCount(tenureMonths, frequency);
  const installmentAmount = totalPayable / installments;
  const interestPerInstallment = totalInterest / installments;
  const principalPerInstallment = principal / installments;

  return {
    principal,
    annualRate,
    tenureMonths,
    totalInterest: +totalInterest.toFixed(2),
    totalPayable: +totalPayable.toFixed(2),
    installmentAmount: +installmentAmount.toFixed(2),
    interestPerInstallment: +interestPerInstallment.toFixed(2),
    principalPerInstallment: +principalPerInstallment.toFixed(2),
    installments,
    effectiveAnnualRate: +(annualRate * 1.8).toFixed(2), // approx
  };
};

/**
 * REDUCING BALANCE: Interest calculated on outstanding principal
 * EMI = P * r * (1+r)^n / ((1+r)^n - 1)
 */
export const calculateReducingBalance = (principal, annualRate, tenureMonths, frequency) => {
  const installments = getInstallmentCount(tenureMonths, frequency);

  // Periodic rate
  let periodicRate;
  if (frequency === 'daily') periodicRate = annualRate / 100 / 365;
  else if (frequency === 'weekly') periodicRate = annualRate / 100 / 52;
  else if (frequency === 'monthly') periodicRate = annualRate / 100 / 12;
  else if (frequency === 'quarterly') periodicRate = annualRate / 100 / 4;
  else if (frequency === 'annually') periodicRate = annualRate / 100;
  else periodicRate = annualRate / 100 / 12; // lump sum

  if (frequency === 'lump_sum') {
    const totalInterest = principal * periodicRate * tenureMonths;
    return {
      principal,
      annualRate,
      tenureMonths,
      totalInterest: +totalInterest.toFixed(2),
      totalPayable: +(principal + totalInterest).toFixed(2),
      installmentAmount: +(principal + totalInterest).toFixed(2),
      installments: 1,
      periodicRate,
    };
  }

  // EMI formula
  const emi =
    periodicRate === 0
      ? principal / installments
      : (principal * periodicRate * Math.pow(1 + periodicRate, installments)) /
        (Math.pow(1 + periodicRate, installments) - 1);

  const totalPayable = emi * installments;
  const totalInterest = totalPayable - principal;

  return {
    principal,
    annualRate,
    tenureMonths,
    totalInterest: +totalInterest.toFixed(2),
    totalPayable: +totalPayable.toFixed(2),
    installmentAmount: +emi.toFixed(2),
    installments,
    periodicRate,
    effectiveAnnualRate: +(annualRate).toFixed(2),
  };
};

/**
 * COMPOUND INTEREST: A = P(1 + r/n)^(nt)
 */
export const calculateCompound = (principal, annualRate, tenureMonths, frequency) => {
  const years = tenureMonths / 12;
  let n; // compounding periods per year
  if (frequency === 'daily') n = 365;
  else if (frequency === 'weekly') n = 52;
  else if (frequency === 'monthly') n = 12;
  else if (frequency === 'quarterly') n = 4;
  else if (frequency === 'annually') n = 1;
  else n = 12;

  const r = annualRate / 100;
  const totalPayable = principal * Math.pow(1 + r / n, n * years);
  const totalInterest = totalPayable - principal;
  const installments = getInstallmentCount(tenureMonths, frequency);
  const installmentAmount = totalPayable / installments;

  return {
    principal,
    annualRate,
    tenureMonths,
    totalInterest: +totalInterest.toFixed(2),
    totalPayable: +totalPayable.toFixed(2),
    installmentAmount: +installmentAmount.toFixed(2),
    installments,
  };
};

/**
 * Generate full amortization schedule
 */
export const generateAmortizationSchedule = (
  principal,
  annualRate,
  tenureMonths,
  frequency,
  interestType,
  startDate = new Date()
) => {
  let summary;
  if (interestType === 'flat') {
    summary = calculateFlatRate(principal, annualRate, tenureMonths, frequency);
  } else if (interestType === 'reducing') {
    summary = calculateReducingBalance(principal, annualRate, tenureMonths, frequency);
  } else {
    summary = calculateCompound(principal, annualRate, tenureMonths, frequency);
  }

  const schedule = [];
  let balance = principal;
  let currentDate = new Date(startDate);

  for (let i = 1; i <= summary.installments; i++) {
    const dueDate = getNextDueDate(currentDate, frequency);
    let principalComponent, interestComponent, installmentAmount;

    if (interestType === 'flat' || interestType === 'compound') {
      principalComponent = summary.principalPerInstallment || principal / summary.installments;
      interestComponent = summary.interestPerInstallment || summary.totalInterest / summary.installments;
      installmentAmount = summary.installmentAmount;
    } else {
      // reducing balance - recalculate interest on remaining balance
      const periodicRate = summary.periodicRate;
      interestComponent = balance * periodicRate;
      installmentAmount = summary.installmentAmount;
      // Last installment adjustment for rounding
      if (i === summary.installments) {
        principalComponent = balance;
        installmentAmount = balance + interestComponent;
      } else {
        principalComponent = installmentAmount - interestComponent;
      }
    }

    balance = Math.max(0, balance - principalComponent);

    schedule.push({
      installment_number: i,
      due_date: dueDate.toISOString().split('T')[0],
      principal_component: +principalComponent.toFixed(2),
      interest_component: +interestComponent.toFixed(2),
      total_installment: +installmentAmount.toFixed(2),
      outstanding_balance: +balance.toFixed(2),
      status: 'pending',
    });

    currentDate = new Date(dueDate);
  }

  return { summary, schedule };
};

/**
 * Calculate processing fee
 */
export const calculateProcessingFee = (principal, feePercent) => {
  return +((principal * feePercent) / 100).toFixed(2);
};

/**
 * Calculate late payment penalty
 */
export const calculatePenalty = (installmentAmount, penaltyPercent, daysOverdue) => {
  if (daysOverdue <= 0) return 0;
  const dailyPenaltyRate = penaltyPercent / 100 / 30;
  return +(installmentAmount * dailyPenaltyRate * daysOverdue).toFixed(2);
};

/**
 * Quick quote for frontend calculator (no DB)
 */
export const quickQuote = ({ principal, annualRate, tenureMonths, frequency, interestType, processingFeePercent = 0 }) => {
  const { summary, schedule } = generateAmortizationSchedule(
    parseFloat(principal),
    parseFloat(annualRate),
    parseInt(tenureMonths),
    frequency,
    interestType
  );

  const processingFee = calculateProcessingFee(principal, processingFeePercent);
  const maturityDate = schedule[schedule.length - 1]?.due_date;

  return {
    summary: {
      ...summary,
      processingFee,
      netDisbursement: +(principal - processingFee).toFixed(2),
      maturityDate,
      firstPaymentDate: schedule[0]?.due_date,
    },
    schedule: schedule.slice(0, 24), // preview first 24
    fullScheduleCount: schedule.length,
  };
};
