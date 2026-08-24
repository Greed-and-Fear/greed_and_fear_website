export type PlanId = 'basic' | 'premium' | 'elite'

export interface Plan {
  id: PlanId
  name: string
  weeklyPrice: number
  monthlyPrice: number
  features: string[]
  weeklyCheckout: string
  monthlyCheckout: string
}

export const plans: Plan[] = [
  {
    id: 'basic',
    name: 'Basic',
    weeklyPrice: 199,
    monthlyPrice: 799,
    features: ['1 index intraday setup daily', '2 intraday setups daily', '3 positional setups weekly'],
    weeklyCheckout: 'https://cosmofeed.com/vp/64df76506e8874001e34920f',
    monthlyCheckout: 'https://cosmofeed.com/vp/64df776a20a6ff001e72fcd9',
  },
  {
    id: 'premium',
    name: 'Premium',
    weeklyPrice: 399,
    monthlyPrice: 1399,
    features: ['1 index scalping setup daily', '3 intraday setups daily', '3 swing setups weekly', '3 positional setups weekly', '2 commodity setups weekly'],
    weeklyCheckout: 'https://cosmofeed.com/vp/64df77af55aa07001e4ceec7',
    monthlyCheckout: 'https://cosmofeed.com/vp/64df782abbab04001d31d57a',
  },
  {
    id: 'elite',
    name: 'Elite',
    weeklyPrice: 699,
    monthlyPrice: 2499,
    features: ['2 indices setups daily', '1 scalping setup daily', '3 intraday setups daily', '5 positional setups weekly', '5 swing setups weekly', '2 commodity setups weekly', 'WhatsApp discussion group', 'Trade logic explained thoroughly'],
    weeklyCheckout: 'https://cosmofeed.com/vp/64df77ef55aa07001e4cf1c7',
    monthlyCheckout: 'https://cosmofeed.com/vp/64df788484a783001db5e8bf',
  },
]

export const courses = [
  { name: 'Elliott Wave Analysis', description: 'Read market structure and identify high-probability wave patterns.' },
  { name: 'Fibonacci & SMC', description: 'Combine Fibonacci confluence with smart-money market concepts.' },
  { name: 'Advanced Price Action', description: 'Build repeatable trading decisions from price, structure and risk.' },
]

export const testimonials = [
  { name: 'Ravi', text: 'Greed & Fear combines accurate analysis with transparent methods and excellent learning support.' },
  { name: 'Nidhil', text: 'Very helpful for beginners and novice traders. The shared charts made each setup easy to understand.' },
  { name: 'Sridharan N', text: 'The analysis is clear, practical and affordable, with a strong focus on education.' },
  { name: 'Gopal', text: 'The strategies and technical breakdowns in the elite batch have been exceptionally useful.' },
]
