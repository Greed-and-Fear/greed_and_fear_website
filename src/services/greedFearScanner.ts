/**
 * Greed & Fear Indian F&O Stock Market Scanner Engine
 * 
 * Computes:
 * - Day 0, Day 1, Day 2 historical trading records (accounting for non-calendar trading days)
 * - 1-Day & 2-Day MWPL Absolute & Percentage changes
 * - 1-Day & 2-Day Open Interest (OI) Absolute & Percentage changes
 * - Price % Change
 * - MWPL Utilization % against exchange-mandated limits
 * - Position Classification (Long Buildup, Short Buildup, Short Covering, Long Unwinding, Neutral)
 * - Signal Strength & Reasons
 */

export interface RawStockMWPLRecord {
  id?: number | string | null;
  stock_id?: number | string | null;
  trade_date?: string | null;
  isin?: string | null;
  scrip_code?: number | string | null;
  scrip_name?: string | null;
  mwpl: number | string | null;
  open_interest: number | string | null;
  recorded_at?: string | null;
  stock?: {
    id?: number | string | null;
    symbol?: string | null;
    company_name?: string | null;
    exchange?: {
      name?: string | null;
    } | null;
    stock_current_price?: {
      close?: number | string | null;
      previous_close?: number | string | null;
      change?: number | string | null;
      change_percent?: number | string | null;
      volume?: number | string | null;
      price_at?: string | null;
    } | null;
  } | null;
}

export type PositionSignal =
  | 'Long build-up'
  | 'Short build-up'
  | 'Short covering'
  | 'Long unwinding'
  | 'Neutral / Weak';

export type SignalStrength = 'Weak' | 'Moderate' | 'Strong' | 'Very strong';

export type MwplRiskZone = 'Normal' | 'Elevated' | 'High risk' | 'Ban zone';

export type DataQuality = 'GOOD' | 'MODERATE' | 'INSUFFICIENT';

export interface ProcessedStockData {
  symbol: string;
  companyName: string;
  exchange: string;
  isin: string;
  scripCode: string;
  stockId: number | null;

  // Price
  currentPrice: number | null;
  previousClose: number | null;
  priceChange: number;
  priceChangePercent: number;

  // MWPL
  currentMWPL: number;
  previousMWPL: number | null;
  day2MWPL: number | null;
  mwpl1DayChange: number;
  mwpl1DayChangePercent: number;
  mwpl2DayChange: number;
  mwpl2DayChangePercent: number;
  mwplUtilizationPercent: number;
  mwplRiskZone: MwplRiskZone;

  // Open Interest
  currentOI: number;
  previousOI: number | null;
  day2OI: number | null;
  oi1DayChange: number;
  oi1DayChangePercent: number;
  oi2DayChange: number;
  oi2DayChangePercent: number;

  // Signal & Classification
  signal: PositionSignal;
  signalStrength: SignalStrength;
  reasons: string[];
  dataQuality: DataQuality;
  latestTradeDate: string | null;
}

export interface ScannerConfig {
  banThreshold: number;        // Default: 95%
  highRiskThreshold: number;   // Default: 90%
  elevatedThreshold: number;   // Default: 80%
  weakOiThreshold: number;     // Default: 2%
  moderateOiThreshold: number; // Default: 5%
  strongOiThreshold: number;   // Default: 10%
  priceThreshold: number;      // Default: 0.1% deadband
}

export const DEFAULT_SCANNER_CONFIG: ScannerConfig = {
  banThreshold: 95,
  highRiskThreshold: 90,
  elevatedThreshold: 80,
  weakOiThreshold: 2,
  moderateOiThreshold: 5,
  strongOiThreshold: 10,
  priceThreshold: 0.1,
};

/**
 * Safely computes absolute change: current - previous
 */
export function calculateAbsoluteChange(current: number | null | undefined, previous: number | null | undefined): number {
  if (current == null || previous == null) return 0;
  return Number((current - previous).toFixed(4));
}

/**
 * Safely computes percentage change: ((current - previous) / previous) * 100
 * Handles division by zero or null gracefully
 */
export function calculatePercentageChange(current: number | null | undefined, previous: number | null | undefined): number {
  if (current == null || previous == null || previous === 0) return 0;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  return Number(pct.toFixed(2));
}

/**
 * Computes MWPL Utilization %: (Open Interest / MWPL) * 100
 */
export function calculateMWPLUtilization(openInterest: number | null | undefined, mwpl: number | null | undefined): number {
  if (openInterest == null || mwpl == null || mwpl <= 0) return 0;
  const util = (openInterest / mwpl) * 100;
  return Number(util.toFixed(2));
}

/**
 * Categorizes MWPL risk zone based on utilization percentage
 */
export function getMwplRiskZone(utilizationPercent: number, config = DEFAULT_SCANNER_CONFIG): MwplRiskZone {
  if (utilizationPercent >= config.banThreshold) return 'Ban zone';
  if (utilizationPercent >= config.highRiskThreshold) return 'High risk';
  if (utilizationPercent >= config.elevatedThreshold) return 'Elevated';
  return 'Normal';
}

/**
 * Classifies trading position based on Price direction + OI direction
 * 
 * - Price ↑ + OI ↑ => Long Buildup
 * - Price ↓ + OI ↑ => Short Buildup
 * - Price ↑ + OI ↓ => Short Covering
 * - Price ↓ + OI ↓ => Long Unwinding
 */
export function classifyPosition(
  priceChangePercent: number,
  oi1DayChangePercent: number,
  config = DEFAULT_SCANNER_CONFIG
): PositionSignal {
  const isPriceUp = priceChangePercent > config.priceThreshold;
  const isPriceDown = priceChangePercent < -config.priceThreshold;
  const isOiUp = oi1DayChangePercent > 0.05;
  const isOiDown = oi1DayChangePercent < -0.05;

  if (isPriceUp && isOiUp) {
    return 'Long build-up';
  }
  if (isPriceDown && isOiUp) {
    return 'Short build-up';
  }
  if (isPriceUp && isOiDown) {
    return 'Short covering';
  }
  if (isPriceDown && isOiDown) {
    return 'Long unwinding';
  }

  return 'Neutral / Weak';
}

/**
 * Determines signal strength based on the magnitude of OI percentage change
 */
export function calculateSignalStrength(
  oiChangePercent: number,
  config = DEFAULT_SCANNER_CONFIG
): SignalStrength {
  const absOi = Math.abs(oiChangePercent);
  if (absOi > config.strongOiThreshold) return 'Very strong';
  if (absOi > config.moderateOiThreshold) return 'Strong';
  if (absOi > config.weakOiThreshold) return 'Moderate';
  return 'Weak';
}

/**
 * Generates transparent, human-readable reasons explaining the scanner signal
 */
export function generateReasons(
  symbol: string,
  priceChangePercent: number,
  oi1DayChangePercent: number,
  oi2DayChangePercent: number,
  mwpl1DayChangePercent: number,
  mwplUtilization: number,
  signal: PositionSignal,
  strength: SignalStrength
): string[] {
  const reasons: string[] = [];

  // Primary signal reason
  reasons.push(`${symbol}: Identified as ${signal} (${strength} setup)`);

  // Price reason
  if (priceChangePercent > 0) {
    reasons.push(`Price increased +${priceChangePercent}%`);
  } else if (priceChangePercent < 0) {
    reasons.push(`Price decreased ${priceChangePercent}%`);
  } else {
    reasons.push('Price remained unchanged');
  }

  // OI 1-Day reason
  if (oi1DayChangePercent > 0) {
    reasons.push(`1-Day Open Interest added +${oi1DayChangePercent}% (${strength.toLowerCase()} buildup)`);
  } else if (oi1DayChangePercent < 0) {
    reasons.push(`1-Day Open Interest dropped ${oi1DayChangePercent}% (${strength.toLowerCase()} unwinding/covering)`);
  } else {
    reasons.push('1-Day Open Interest remained flat');
  }

  // OI 2-Day reason
  if (oi2DayChangePercent !== 0) {
    reasons.push(`2-Day Open Interest change is ${oi2DayChangePercent >= 0 ? '+' : ''}${oi2DayChangePercent}%`);
  }

  // MWPL Utilization & change
  reasons.push(`MWPL utilization at ${mwplUtilization}%`);
  if (mwpl1DayChangePercent !== 0) {
    reasons.push(`MWPL changed ${mwpl1DayChangePercent >= 0 ? '+' : ''}${mwpl1DayChangePercent}% over 1 day`);
  }

  if (mwplUtilization >= 95) {
    reasons.push('WARNING: Stock in F&O Ban Zone (>=95% MWPL utilized)');
  } else if (mwplUtilization >= 90) {
    reasons.push('ALERT: Approaching F&O Ban threshold (>=90% MWPL utilized)');
  }

  return reasons;
}

/**
 * Evaluates the quality and completeness of data for a stock
 */
export function evaluateDataQuality(
  recordsCount: number,
  currentPrice: number | null,
  currentMwpl: number,
  currentOi: number
): DataQuality {
  if (recordsCount < 1 || currentMwpl <= 0 || currentOi < 0) {
    return 'INSUFFICIENT';
  }
  if (recordsCount === 1 || currentPrice == null) {
    return 'MODERATE';
  }
  return 'GOOD';
}

/**
 * Process a group of raw history records for a single stock
 * Records are expected to be ordered by trade_date DESC (Day 0 = index 0, Day 1 = index 1, Day 2 = index 2)
 */
export function processStockHistory(
  records: RawStockMWPLRecord[],
  config = DEFAULT_SCANNER_CONFIG
): ProcessedStockData {
  // Sort records by trade_date DESC, then recorded_at DESC to guarantee Day 0 / Day 1 / Day 2 ordering
  const sorted = [...records].sort((a, b) => {
    const dateA = a.trade_date || (a.recorded_at ? a.recorded_at.split('T')[0] : '');
    const dateB = b.trade_date || (b.recorded_at ? b.recorded_at.split('T')[0] : '');
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    const recA = a.recorded_at || '';
    const recB = b.recorded_at || '';
    return recB.localeCompare(recA);
  });

  const day0 = sorted[0] || { mwpl: 0, open_interest: 0 };
  const day1 = sorted[1] || null;
  const day2 = sorted[2] || null;

  const symbol = day0.stock?.symbol || day0.scrip_name || 'UNKNOWN';
  const companyName = day0.stock?.company_name || day0.scrip_name || symbol;
  const exchange = day0.stock?.exchange?.name || 'NSE';
  const isin = day0.isin || '';
  const scripCode = String(day0.scrip_code || '');
  const stockId = typeof day0.stock_id === 'number' ? day0.stock_id : (typeof day0.stock?.id === 'number' ? day0.stock.id : null);

  // Price calculations
  const priceObj = day0.stock?.stock_current_price;
  const currentPrice = priceObj?.close != null ? Number(priceObj.close) : null;
  const previousClose = priceObj?.previous_close != null ? Number(priceObj.previous_close) : null;

  let priceChange = 0;
  let priceChangePercent = 0;

  if (priceObj?.change_percent != null) {
    priceChangePercent = Number(priceObj.change_percent);
    priceChange = priceObj.change != null ? Number(priceObj.change) : calculateAbsoluteChange(currentPrice, previousClose);
  } else if (currentPrice != null && previousClose != null) {
    priceChange = calculateAbsoluteChange(currentPrice, previousClose);
    priceChangePercent = calculatePercentageChange(currentPrice, previousClose);
  }

  // MWPL Values
  const currentMWPL = Number(day0.mwpl || 0);
  const previousMWPL = day1?.mwpl != null ? Number(day1.mwpl) : null;
  const day2MWPL = day2?.mwpl != null ? Number(day2.mwpl) : null;

  const mwpl1DayChange = calculateAbsoluteChange(currentMWPL, previousMWPL);
  const mwpl1DayChangePercent = calculatePercentageChange(currentMWPL, previousMWPL);

  const mwpl2DayChange = calculateAbsoluteChange(previousMWPL, day2MWPL);
  const mwpl2DayChangePercent = calculatePercentageChange(previousMWPL, day2MWPL);

  // Open Interest Values
  const currentOI = Number(day0.open_interest || 0);
  const previousOI = day1?.open_interest != null ? Number(day1.open_interest) : null;
  const day2OI = day2?.open_interest != null ? Number(day2.open_interest) : null;

  const oi1DayChange = calculateAbsoluteChange(currentOI, previousOI);
  const oi1DayChangePercent = calculatePercentageChange(currentOI, previousOI);

  const oi2DayChange = calculateAbsoluteChange(previousOI, day2OI);
  const oi2DayChangePercent = calculatePercentageChange(previousOI, day2OI);

  // MWPL Utilization
  const mwplUtilizationPercent = calculateMWPLUtilization(currentOI, currentMWPL);
  const mwplRiskZone = getMwplRiskZone(mwplUtilizationPercent, config);

  // Classification & Strength
  const signal = classifyPosition(priceChangePercent, oi1DayChangePercent, config);
  const signalStrength = calculateSignalStrength(oi1DayChangePercent, config);
  const dataQuality = evaluateDataQuality(sorted.length, currentPrice, currentMWPL, currentOI);
  const latestTradeDate = day0.trade_date || (day0.recorded_at ? day0.recorded_at.split('T')[0] : null);

  const reasons = generateReasons(
    symbol,
    priceChangePercent,
    oi1DayChangePercent,
    oi2DayChangePercent,
    mwpl1DayChangePercent,
    mwplUtilizationPercent,
    signal,
    signalStrength
  );

  return {
    symbol,
    companyName,
    exchange,
    isin,
    scripCode,
    stockId,
    currentPrice,
    previousClose,
    priceChange,
    priceChangePercent,
    currentMWPL,
    previousMWPL,
    day2MWPL,
    mwpl1DayChange,
    mwpl1DayChangePercent,
    mwpl2DayChange,
    mwpl2DayChangePercent,
    mwplUtilizationPercent,
    mwplRiskZone,
    currentOI,
    previousOI,
    day2OI,
    oi1DayChange,
    oi1DayChangePercent,
    oi2DayChange,
    oi2DayChangePercent,
    signal,
    signalStrength,
    reasons,
    dataQuality,
    latestTradeDate,
  };
}

/**
 * Groups an array of raw stock_mwpl_history records by stock (symbol or scrip_name)
 * and processes each stock through the calculation engine.
 */
export function scanStockUniverse(
  rawRecords: RawStockMWPLRecord[],
  config = DEFAULT_SCANNER_CONFIG
): ProcessedStockData[] {
  if (!Array.isArray(rawRecords) || rawRecords.length === 0) {
    return [];
  }

  // Group by unique stock key
  const grouped = new Map<string, RawStockMWPLRecord[]>();

  for (const record of rawRecords) {
    const key = record.stock?.symbol || record.scrip_name || (record.stock_id ? String(record.stock_id) : 'UNKNOWN');
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(record);
  }

  const results: ProcessedStockData[] = [];
  for (const records of grouped.values()) {
    results.push(processStockHistory(records, config));
  }

  return results;
}
