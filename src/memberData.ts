export interface Opportunity {
  stock: string
  mwpl: number
  oneDay: number
  twoDay: number
  price: number
  oi: number
  volume: number
  signal: 'Long build-up' | 'Short build-up' | 'Short covering'
  score: number
}

export const opportunities: Opportunity[] = [
  { stock: 'IBULHSGFIN', mwpl: 92.4, oneDay: 8.4, twoDay: 5.1, price: 3.2, oi: 18, volume: 35, signal: 'Long build-up', score: 96 },
  { stock: 'BHEL', mwpl: 91.2, oneDay: 7.2, twoDay: 4.3, price: -2.8, oi: 16.2, volume: 42, signal: 'Short build-up', score: 93 },
  { stock: 'PNB', mwpl: 88.7, oneDay: 6.8, twoDay: 3.6, price: 2.1, oi: 14.5, volume: 28, signal: 'Long build-up', score: 87 },
  { stock: 'SAIL', mwpl: 82.1, oneDay: 5.9, twoDay: 2.8, price: -1.7, oi: 12.3, volume: 31, signal: 'Short build-up', score: 82 },
  { stock: 'ZEEL', mwpl: 78.4, oneDay: 8.1, twoDay: 2.8, price: -9.2, oi: 25, volume: 16, signal: 'Short covering', score: 78 },
]

export const heatmap = [
  ['IBULHSGFIN', 92.4], ['BHEL', 91.2], ['PNB', 88.7], ['SAIL', 82.1], ['ZEEL', 78.4],
  ['HINDCOPPER', 76.2], ['INDUSTOWER', 75.1], ['NMDC', 71.3], ['CANBK', 63.8], ['MANAPPURAM', 61.2],
  ['BALRAMCHIN', 60.3], ['INDIACEM', 59.7], ['BIRLACORPN', 58.4], ['NBCC', 55.8],
] as const

export const alerts = [
  ['IBULHSGFIN', 'Reached 92.4% MWPL. High probability of F&O ban tomorrow.', '06:32 PM'],
  ['BHEL', 'Strong short build-up: OI +16.2%, price -2.8%, volume +42%.', '06:31 PM'],
  ['PNB', 'Entered ban watch at 88.7% with strong momentum.', '06:28 PM'],
  ['ZEEL', 'Short covering activity with a +25% volume spike.', '06:26 PM'],
] as const

export const marketCards = [
  { name: 'NASDAQ', value: '-0.51%', detail: 'Close 26,047.656', tone: 'negative' },
  { name: 'Dow Jones', value: '+0.13%', detail: 'Close 53,346.23', tone: 'positive' },
  { name: 'NSE Advances/Declines', value: '23 / 26', detail: 'Advances / Declines', tone: 'warning' },
  { name: 'GIFT Nifty', value: '-0.26%', detail: 'Close 24,211', tone: 'negative' },
  { name: 'India VIX', value: '11.70', detail: '+4.51% vs previous close', tone: 'violet' },
] as const
