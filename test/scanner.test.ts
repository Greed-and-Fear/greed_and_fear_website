import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateAbsoluteChange,
  calculatePercentageChange,
  calculateMWPLUtilization,
  getMwplRiskZone,
  classifyPosition,
  evaluateDataQuality,
  processStockHistory,
  scanStockUniverse,
} from '../src/services/greedFearScanner.ts';

describe('Greed & Fear Indian F&O Stock Market Scanner Engine', () => {

  // Test 1: Day-1 MWPL Calculation
  it('1. should accurately calculate Day-1 MWPL absolute and percentage change', () => {
    // Day 0 = 100, Day 1 = 80
    const absChange = calculateAbsoluteChange(100, 80);
    const pctChange = calculatePercentageChange(100, 80);

    assert.strictEqual(absChange, 20);
    assert.strictEqual(pctChange, 25.0); // ((100 - 80) / 80) * 100 = +25%
  });

  // Test 2: Day-2 MWPL Calculation
  it('2. should accurately calculate Day-2 MWPL absolute and percentage change', () => {
    // Day 1 = 80, Day 2 = 90
    const absChange = calculateAbsoluteChange(80, 90);
    const pctChange = calculatePercentageChange(80, 90);

    assert.strictEqual(absChange, -10);
    assert.strictEqual(pctChange, -11.11); // ((80 - 90) / 90) * 100 = -11.11%
  });

  // Test 3: Day-1 OI Calculation
  it('3. should accurately calculate Day-1 OI absolute and percentage change', () => {
    // Day 0 OI = 210771595, Day 1 OI = 213783984 (SAIL real data)
    const absChange = calculateAbsoluteChange(210771595, 213783984);
    const pctChange = calculatePercentageChange(210771595, 213783984);

    assert.strictEqual(absChange, -3012389);
    assert.strictEqual(pctChange, -1.41);
  });

  // Test 4: Day-2 OI Calculation
  it('4. should accurately calculate Day-2 OI absolute and percentage change', () => {
    // Day 1 OI = 213783984, Day 2 OI = 218978153
    const absChange = calculateAbsoluteChange(213783984, 218978153);
    const pctChange = calculatePercentageChange(213783984, 218978153);

    assert.strictEqual(absChange, -5194169);
    assert.strictEqual(pctChange, -2.37);
  });

  // Test 5: Price percentage calculation
  it('5. should accurately calculate price percentage change', () => {
    // Current price = 184.59, Previous close = 179.65
    const pct = calculatePercentageChange(184.59, 179.65);
    assert.strictEqual(pct, 2.75);
  });

  // Test 6: MWPL Utilization %
  it('6. should compute MWPL utilization %: (OI / MWPL) * 100', () => {
    // SAIL: OI = 210771595, MWPL limit = 216861410
    const util = calculateMWPLUtilization(210771595, 216861410);
    assert.strictEqual(util, 97.19); // 97.19%
  });

  // Test 7: MWPL Risk Zone
  it('7. should correctly assign MWPL risk zones (<80% Normal, 80-90% Elevated, 90-95% High Risk, >=95% Ban Zone)', () => {
    assert.strictEqual(getMwplRiskZone(65.0), 'Normal');
    assert.strictEqual(getMwplRiskZone(82.5), 'Elevated');
    assert.strictEqual(getMwplRiskZone(91.4), 'High risk');
    assert.strictEqual(getMwplRiskZone(97.19), 'Ban zone');
  });

  // Test 8: Long Buildup classification
  it('8. should classify Price ↑ + OI ↑ as Long Buildup', () => {
    const signal = classifyPosition(2.4, 8.2);
    assert.strictEqual(signal, 'Long build-up');
  });

  // Test 9: Short Buildup classification
  it('9. should classify Price ↓ + OI ↑ as Short Buildup', () => {
    const signal = classifyPosition(-2.1, 9.4);
    assert.strictEqual(signal, 'Short build-up');
  });

  // Test 10: Short Covering classification
  it('10. should classify Price ↑ + OI ↓ as Short Covering', () => {
    const signal = classifyPosition(1.8, -4.5);
    assert.strictEqual(signal, 'Short covering');
  });

  // Test 11: Long Unwinding classification
  it('11. should classify Price ↓ + OI ↓ as Long Unwinding', () => {
    const signal = classifyPosition(-3.2, -6.1);
    assert.strictEqual(signal, 'Long unwinding');
  });

  // Test 12: Missing data / Data Quality
  it('12. should evaluate data quality accurately', () => {
    assert.strictEqual(evaluateDataQuality(3, 184.59, 216861410, 210771595), 'GOOD');
    assert.strictEqual(evaluateDataQuality(1, null, 216861410, 210771595), 'MODERATE');
    assert.strictEqual(evaluateDataQuality(0, null, 0, 0), 'INSUFFICIENT');
  });

  // Test 13: Zero previous value safe division handling
  it('13. should safely handle zero and null in percentage calculations without NaN or throwing', () => {
    assert.strictEqual(calculatePercentageChange(100, 0), 0);
    assert.strictEqual(calculatePercentageChange(100, null), 0);
    assert.strictEqual(calculatePercentageChange(null, 100), 0);
    assert.strictEqual(calculateMWPLUtilization(null, null), 0);
    assert.strictEqual(calculateMWPLUtilization(100, 0), 0);
  });

  // Test 14: Non-calendar trade_date sorting (weekends & holidays)
  it('14. should sort historical records by available trade_date descending rather than calendar days', () => {
    const mockRecords = [
      { trade_date: '2026-08-26', open_interest: 218978153, mwpl: 216861410, scrip_name: 'SAIL' },
      { trade_date: '2026-08-28', open_interest: 210771595, mwpl: 216861410, scrip_name: 'SAIL' },
      { trade_date: '2026-08-27', open_interest: 213783984, mwpl: 216861410, scrip_name: 'SAIL' },
    ];

    const result = processStockHistory(mockRecords);
    assert.strictEqual(result.latestTradeDate, '2026-08-28'); // Day 0
    assert.strictEqual(result.currentOI, 210771595); // Day 0 OI
    assert.strictEqual(result.previousOI, 213783984); // Day 1 OI
    assert.strictEqual(result.day2OI, 218978153); // Day 2 OI
    assert.strictEqual(result.oi1DayChangePercent, -1.41);
    assert.strictEqual(result.oi2DayChangePercent, -2.37);
  });

  // Test 15: Candidate universe scanning & grouping
  it('15. should process an entire stock universe from raw GraphQL records', () => {
    const mockUniverse = [
      { trade_date: '2026-08-28', open_interest: 210771595, mwpl: 216861410, scrip_name: 'SAIL' },
      { trade_date: '2026-08-27', open_interest: 213783984, mwpl: 216861410, scrip_name: 'SAIL' },
      { trade_date: '2026-08-28', open_interest: 42517737, mwpl: 45183075, scrip_name: 'LICHSGFIN' },
      { trade_date: '2026-08-27', open_interest: 44099745, mwpl: 45183075, scrip_name: 'LICHSGFIN' },
    ];

    const scanned = scanStockUniverse(mockUniverse);
    assert.strictEqual(scanned.length, 2);
    const sail = scanned.find(s => s.symbol === 'SAIL');
    const lichsgfin = scanned.find(s => s.symbol === 'LICHSGFIN');

    assert.ok(sail);
    assert.ok(lichsgfin);
    assert.strictEqual(sail.mwplUtilizationPercent, 97.19);
    assert.strictEqual(sail.mwplRiskZone, 'Ban zone');
    assert.strictEqual(lichsgfin.mwplUtilizationPercent, 94.1);
    assert.strictEqual(lichsgfin.mwplRiskZone, 'High risk');
  });
});
