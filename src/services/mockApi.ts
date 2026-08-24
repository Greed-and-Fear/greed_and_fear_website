export interface NewsArticle {
  id: string
  category: string
  title: string
  summary: string
  source: string
  publishedAt: string
}

export interface ContactRequest {
  name: string
  phone: string
  subject: string
  message: string
}

export interface ContactResponse {
  reference: string
  receivedAt: string
}

export interface DemoUser {
  id: string
  name: string
  phone: string
  plan: 'demo'
}

const articles: NewsArticle[] = [
  { id: 'market-structure', category: 'Indian markets', title: 'Nifty consolidates as traders watch the next structural breakout', summary: 'A fictional market brief demonstrating how live news will appear after the new backend is connected.', source: 'Greed & Fear Demo Desk', publishedAt: '2026-08-24T09:30:00+05:30' },
  { id: 'crude-range', category: 'Commodities', title: 'Crude oil remains range-bound near a major weekly decision zone', summary: 'Momentum is balanced while price tests an area watched by both short-term and positional participants.', source: 'Greed & Fear Demo Desk', publishedAt: '2026-08-23T16:15:00+05:30' },
  { id: 'global-session', category: 'Global indices', title: 'Global indices open mixed ahead of the next macroeconomic release', summary: 'Asian and European sessions show divergent risk appetite in this simulated news update.', source: 'Greed & Fear Demo Desk', publishedAt: '2026-08-22T12:10:00+05:30' },
  { id: 'earnings-watch', category: 'Corporate actions', title: 'Earnings watchlist highlights volume expansion across large caps', summary: 'This dummy article illustrates corporate-action coverage without calling the retired NewsAPI integration.', source: 'Greed & Fear Demo Desk', publishedAt: '2026-08-21T18:45:00+05:30' },
]

const delay = (milliseconds = 450) => new Promise((resolve) => window.setTimeout(resolve, milliseconds))

export async function getNews(query = ''): Promise<NewsArticle[]> {
  await delay()
  const normalized = query.trim().toLowerCase()
  if (!normalized) return articles
  return articles.filter((article) => `${article.category} ${article.title} ${article.summary}`.toLowerCase().includes(normalized))
}

export async function submitContact(request: ContactRequest): Promise<ContactResponse> {
  await delay(650)
  const response = { reference: `GF-${Date.now().toString(36).toUpperCase()}`, receivedAt: new Date().toISOString() }
  const stored = JSON.parse(localStorage.getItem('mock-contact-requests') ?? '[]') as Array<ContactRequest & ContactResponse>
  localStorage.setItem('mock-contact-requests', JSON.stringify([...stored, { ...request, ...response }]))
  return response
}

export async function login(phone: string, password: string): Promise<DemoUser> {
  await delay(600)
  if (phone.replace(/\D/g, '').length < 10 || password.length < 6) throw new Error('Use a 10-digit phone number and a password of at least 6 characters.')
  const user = { id: 'demo-user', name: 'Demo Member', phone, plan: 'demo' as const }
  localStorage.setItem('mock-session', JSON.stringify(user))
  return user
}
