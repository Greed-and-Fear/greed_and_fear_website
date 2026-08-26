import { FormEvent, ReactNode, useEffect, useState } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { courses, plans, testimonials, type PlanId } from './data'
import { getNews, submitContact, type NewsArticle } from './services/mockApi'
import MemberPortal, { ThemeToggle, type Theme } from './MemberPortal'
import logo from '../images/logo/logo.jpg'
import heroImage from '../images/background/software.png'
import contactImage from '../images/background/contactbackground.jpg'
import launchImage from '../images/background/launch_day.webp'
import telegramIcon from '../images/svg/telegram-icon.svg'
import tele1 from '../images/telegram/tele1.jpg'
import tele2 from '../images/telegram/tele2.jpg'
import tele3 from '../images/telegram/tele3.jpg'
import tele4 from '../images/telegram/tele4.jpg'
import tele5 from '../images/telegram/tele5.jpg'
import apollo from '../images/intraday/apollotire.webp'
import coforge from '../images/intraday/coforge.webp'
import crudeOil from '../images/intraday/crudeoil.webp'
import abbIndia from '../images/positional/abbindia.jpg'
import hul from '../images/positional/hul.jpg'
import tataCom from '../images/positional/tatacom.jpg'

const TELEGRAM_URL = 'https://t.me/menezes725'
const TELEGRAM_GROUP_URL = 'https://t.me/+RqumyUtpnyZiY2Jl'
const WHATSAPP_URL = 'https://wa.me/9591463584'

type Policy = 'cookies' | 'terms' | 'privacy' | 'refund' | 'disclaimer' | 'careers'

const policyContent: Record<Policy, { title: string; body: string[] }> = {
  cookies: { title: 'Cookie Policy', body: ['We use essential browser storage to remember your cookie preference and keep the website working.', 'You can clear this preference at any time from your browser settings.'] },
  terms: { title: 'Terms & Conditions', body: ['This website provides educational market content. It does not provide investment advice or guarantee returns.', 'By using the site, you accept responsibility for your own trading and investment decisions.'] },
  privacy: { title: 'Privacy Policy', body: ['We only use details you deliberately provide to contact us. Do not submit sensitive financial or payment information through the contact form.', 'Third-party checkout, Telegram, WhatsApp and YouTube services apply their own privacy policies.'] },
  refund: { title: 'Refund Policy', body: ['For incorrect or duplicate payments, contact greedandfearacademy@gmail.com with your transaction details.', 'Eligibility is reviewed according to the product delivered and the applicable checkout provider terms.'] },
  disclaimer: { title: 'Market Disclaimer', body: ['All posts, discussions and setups are for educational purposes only. We do not provide tips, recommendations or advisory services.', 'Markets and derivatives involve significant risk. Consult a registered financial adviser before making decisions.'] },
  careers: { title: 'Careers', body: ['There are currently no open positions.'] },
}

function App() {
  const location = useLocation()
  const [theme, setTheme] = useState<Theme>(() => localStorage.getItem('theme') === 'light' ? 'light' : 'dark')
  const [policy, setPolicy] = useState<Policy | null>(null)
  const [cookieVisible, setCookieVisible] = useState(() => localStorage.getItem('cookie-consent') === null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('theme', theme)
  }, [theme])

  if (['/login', '/dashboard', '/sentiment', '/stocks', '/market-data'].some((path) => location.pathname.startsWith(path))) {
    return <MemberPortal theme={theme} onThemeChange={setTheme} />
  }

  const setConsent = (value: 'accepted' | 'rejected') => {
    localStorage.setItem('cookie-consent', value)
    setCookieVisible(false)
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <ScrollManager />
      <Header theme={theme} onThemeChange={setTheme} />
      <main id="main-content">
        <Routes>
          <Route path="/" element={<HomePage onPolicy={setPolicy} />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/daily" element={<ProductsPage />} />
          <Route path="/products/cartesian-waveshots" element={<LaunchPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/checkout/:planId" element={<CheckoutPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/account" element={<Navigate to="/login" replace />} />
          <Route path="/internal/chat" element={<UnavailablePage title="Community chat" />} />
          <Route path="/index.html" element={<Navigate to="/" replace />} />
          <Route path="/productpage.html" element={<Navigate to="/products/daily" replace />} />
          <Route path="/bookpage.html" element={<Navigate to="/courses" replace />} />
          <Route path="/launch.html" element={<Navigate to="/products/cartesian-waveshots" replace />} />
          <Route path="/news.html" element={<Navigate to="/news" replace />} />
          <Route path="/result.html" element={<Navigate to="/results" replace />} />
          <Route path="/secretpage.html" element={<Navigate to="/join" replace />} />
          <Route path="/dev.html" element={<Navigate to="/internal/chat" replace />} />
          <Route path="/orderpages/:legacy" element={<LegacyCheckout />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer onPolicy={setPolicy} />
      <a className="telegram-float" href={TELEGRAM_URL} target="_blank" rel="noreferrer" aria-label="Join us on Telegram"><img src={telegramIcon} alt="" /></a>
      {cookieVisible && <CookieBanner onChoice={setConsent} onRead={() => setPolicy('cookies')} />}
      {policy && <PolicyModal policy={policy} onClose={() => setPolicy(null)} />}
    </div>
  )
}

function Header({ theme, onThemeChange }: { theme: Theme; onThemeChange: (theme: Theme) => void }) {
  const [open, setOpen] = useState(false)
  const navClass = ({ isActive }: { isActive: boolean }) => isActive ? 'active' : undefined
  return (
    <header className="site-header">
      <Link to="/" className="brand"><img src={logo} alt="Greed and Fear" /></Link>
      <button className="menu-button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Toggle navigation"><span /><span /><span /></button>
      <nav className={open ? 'site-nav open' : 'site-nav'} onClick={() => setOpen(false)}>
        <NavLink to="/" end className={navClass}>Home</NavLink><NavLink to="/courses" className={navClass}>Learn</NavLink>
        {/* <NavLink to="/products" className={navClass}>Membership</NavLink> */}
        <NavLink to="/results" className={navClass}>Results</NavLink><NavLink to="/news" className={navClass}>News</NavLink><ThemeToggle theme={theme} onChange={onThemeChange} compact /><Link className="button login-button" to="/login">Member login</Link>
      </nav>
    </header>
  )
}

function ScrollManager() {
  const location = useLocation()
  useEffect(() => {
    if (location.hash) {
      window.requestAnimationFrame(() => document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth' }))
      return
    }
    window.scrollTo({ top: 0 })
  }, [location.pathname, location.hash])
  return null
}

function HomePage({ onPolicy }: { onPolicy: (policy: Policy) => void }) {
  const charts = [apollo, coforge, crudeOil]
  const positions = [abbIndia, hul, tataCom]
  return <>
    <section className="hero section-pad">
      <div><h1>Start your trading journey by understanding the <span>market structure</span></h1><p className="lead">Advanced technical analysis built around Eliott Wave Theory, Fibonacci and price action.</p><div className="button-row"><ExternalButton href={TELEGRAM_URL}>Join the trading desk</ExternalButton><Link className="button login-button" to="/courses">Learn the strategy</Link><Link className="button login-button" to="/login">Open terminal →</Link></div><div className="trust-row"><span>Risk-first approach</span><span>Multi-timeframe analysis</span><span>Real chart studies</span></div></div>
      <div className="hero-art"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><img src={heroImage} alt="Trading analysis workspace" /></div>
    </section>
    <section className="community-section section-pad">
      <TelegramGallery />
      <div><p className="eyebrow">Telegram community</p><h2>Market thinking, shared openly.</h2><p>Follow free Elliott Wave trade setups, market observations and educational chart breakdowns.</p><ExternalButton href={TELEGRAM_URL}>Open Telegram</ExternalButton></div>
    </section>
    <section id="about" className="about section-pad">
      <div><p className="eyebrow">About us</p><h2>Built on Structure, Driven by Analysis.</h2><p>GREED & FEAR is a technical analysis platform focused on understanding markets through structure, cycles and price behaviour. Our methodology combines Eliott Wave Theory, Fibonacci relationships and price action to study market trends and potential scenarios across equities, indices and other financial markets. We don't aim to predict every move. We aim to understand what the market is telling us.</p><button className="text-button" onClick={() => onPolicy('disclaimer')}>Read our market disclaimer</button></div>
      <div className="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/crcPugw4Ddk" title="Why choose Greed and Fear" loading="lazy" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div>
    </section>
    <ChartStrip title="Recent intraday charts" charts={charts} />
    <ChartStrip title="Positional market studies" charts={positions} />
    {/* <PlanPreview /> */}
    <section className="testimonials section-pad"><SectionTitle eyebrow="Community" title="What our students say" /><div className="testimonial-grid">{testimonials.map((item) => <article className="quote-card" key={item.name}><p>“{item.text}”</p><strong>{item.name}</strong></article>)}</div></section>
    <ContactSection />
  </>
}

function TelegramGallery() {
  const images = [tele1, tele2, tele3, tele4, tele5]
  const [active, setActive] = useState(0)
  useEffect(() => { const timer = window.setInterval(() => setActive((value) => (value + 1) % images.length), 2500); return () => window.clearInterval(timer) }, [images.length])
  return <div className="gallery"><img src={images[active]} alt={`Telegram community result ${active + 1}`} /><div className="gallery-dots">{images.map((_, index) => <button className={index === active ? 'active' : ''} onClick={() => setActive(index)} key={index} aria-label={`Show image ${index + 1}`} />)}</div></div>
}

function ChartStrip({ title, charts }: { title: string; charts: string[] }) {
  return <section className="chart-section section-pad"><SectionTitle eyebrow="Track record" title={title} /><div className="chart-strip">{charts.map((chart) => <img src={chart} alt="Technical analysis chart" loading="lazy" key={chart} />)}</div></section>
}

function PlanPreview() {
  return <section className="plans-section section-pad"><SectionTitle eyebrow="Membership" title="Choose the depth you need" /><div className="plan-grid">{plans.map((plan) => <PlanCard planId={plan.id} key={plan.id} />)}</div></section>
}

function PlanCard({ planId }: { planId: PlanId }) {
  const plan = plans.find((item) => item.id === planId)!
  return <article className={plan.id === 'premium' ? 'plan-card featured' : 'plan-card'}>{plan.id === 'premium' && <span className="popular-badge">Most popular</span>}<p className="eyebrow">{plan.name}</p><h3>₹{plan.weeklyPrice}<small>/week</small></h3><p className="monthly-price">or ₹{plan.monthlyPrice} monthly</p><ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul><Link className="button" to={`/checkout/${plan.id}`}>See {plan.name.toLowerCase()} details</Link></article>
}

function ProductsPage() {
  return <Page><PageHero eyebrow="Greed & Fear Daily" title="A plan for every stage of your process." copy="Every membership is built around educational setups and transparent chart analysis. Choose the cadence and market coverage that suits you." /><div className="plan-grid wide">{plans.map((plan) => <PlanCard planId={plan.id} key={plan.id} />)}</div><p className="page-note">After successful payment, the checkout provider will share access instructions for the relevant community.</p></Page>
}

function CoursesPage() {
  return <Page><PageHero eyebrow="Market education" title="Learn the logic behind the chart." copy="Structured learning paths for traders who want to move beyond signals and build independent analysis skills." /><div className="course-grid">{courses.map((course, index) => <article className="course-card" key={course.name}><span>0{index + 1}</span><h2>{course.name}</h2><p>{course.description}</p><ExternalButton href={WHATSAPP_URL}>Register interest</ExternalButton></article>)}</div></Page>
}

function CheckoutPage() {
  const { planId } = useParams()
  const plan = plans.find((item) => item.id === planId)
  if (!plan) return <NotFoundPage />
  return <Page><PageHero eyebrow="Secure checkout" title={`${plan.name} plan`} copy="Select a billing period. Payment is handled by Cosmofeed in a separate, secure window." /><div className="checkout-layout"><article className="checkout-summary"><h2>What is included</h2><ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul></article><div className="billing-options"><BillingOption label="Weekly" price={plan.weeklyPrice} href={plan.weeklyCheckout} /><BillingOption label="Monthly" price={plan.monthlyPrice} href={plan.monthlyCheckout} /></div></div><div className="support-box"><p>Questions before joining?</p><ExternalButton href={WHATSAPP_URL}>Contact on WhatsApp</ExternalButton><ExternalButton href={TELEGRAM_GROUP_URL} secondary>Contact on Telegram</ExternalButton></div></Page>
}

function BillingOption({ label, price, href }: { label: string; price: number; href: string }) {
  return <article className="billing-card"><span>{label}</span><strong>₹{price}</strong><ExternalButton href={href}>Continue to payment</ExternalButton></article>
}

function LegacyCheckout() {
  const { legacy = '' } = useParams()
  const planId = legacy.toLowerCase().includes('elite') ? 'elite' : legacy.toLowerCase().includes('premium') ? 'premium' : 'basic'
  return <Navigate to={`/checkout/${planId}`} replace />
}

function ResultsPage() {
  const services = [{ title: 'Analysis', text: 'Elliott Wave analysis across stocks, indices and commodities.' }, { title: 'Market news', text: 'Context for market conditions, corporate actions and global events.' }, { title: 'Premium services', text: 'More frequent educational setups with detailed market logic.' }, { title: 'Education', text: 'Learn the process behind structure, entries and risk management.' }]
  return <Page><PageHero eyebrow="Educational trade studies" title="Review the chart, not just the outcome." copy="Our published studies preserve the market context and technical reasoning behind each setup." /><div className="service-grid">{services.map((service) => <article key={service.title}><span>↗</span><h2>{service.title}</h2><p>{service.text}</p></article>)}</div><ChartStrip title="Selected analysis" charts={[apollo, coforge, abbIndia]} /><div className="center"><ExternalButton href={TELEGRAM_URL}>See current studies</ExternalButton></div></Page>
}

function NewsPage() {
  const [query, setQuery] = useState('')
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const loadNews = async (search = '') => { setLoading(true); setArticles(await getNews(search)); setLoading(false) }
  useEffect(() => { void getNews().then((data) => { setArticles(data); setLoading(false) }) }, [])
  const search = (event: FormEvent) => { event.preventDefault(); void loadNews(query) }
  return <Page><PageHero eyebrow="Market brief preview" title="Find the context behind the move." copy="Browse sample market updates while our live data service is being prepared." /><form className="news-search" onSubmit={search}><label htmlFor="news-query">What would you like to read about?</label><div><input id="news-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try crude, Nifty, or earnings" /><button className="button" type="submit">Search updates</button></div></form>{loading ? <p className="data-state" aria-live="polite">Loading market updates...</p> : articles.length ? <div className="topic-grid">{articles.map((article) => <article className="news-card" key={article.id}><span>{article.category}</span><h2>{article.title}</h2><p>{article.summary}</p><small>{article.source} · {new Date(article.publishedAt).toLocaleDateString('en-IN')}</small></article>)}</div> : <div className="data-state"><p>No updates match “{query}”.</p><button className="text-button" onClick={() => { setQuery(''); void loadNews() }}>Show all updates</button></div>}</Page>
}

function LaunchPage() {
  return <section className="launch-page" style={{ backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.94), rgba(0,0,0,.45)), url(${launchImage})` }}><p className="eyebrow">Cartesian Waveshots</p><h1>A new market experience is taking shape.</h1><p>Launch timing will be announced to our community.</p><ExternalButton href={TELEGRAM_URL}>Get launch updates</ExternalButton></section>
}

function JoinPage() {
  return <Page><PageHero eyebrow="Join us" title="Continue the conversation." copy="Choose the channel that works for you. Telegram carries community updates, while WhatsApp is best for direct support." /><div className="join-grid"><article><img src={telegramIcon} alt="" /><h2>Telegram community</h2><p>Educational setups, charts and market discussions.</p><ExternalButton href={TELEGRAM_GROUP_URL}>Join Telegram</ExternalButton></article><article><span className="whatsapp-mark">W</span><h2>WhatsApp support</h2><p>Ask a direct question about membership or access.</p><ExternalButton href={WHATSAPP_URL}>Open WhatsApp</ExternalButton></article></div></Page>
}

function ContactSection() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [reference, setReference] = useState('')
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setStatus('sending')
    const response = await submitContact({ name: String(data.get('name')), phone: String(data.get('phone')), subject: String(data.get('subject')), message: String(data.get('message')) })
    setReference(response.reference)
    setStatus('sent')
    form.reset()
  }
  return <section id="contact" className="contact-section section-pad"><img src={contactImage} alt="Analyst working at a desk" loading="lazy" /><form onSubmit={submit}><p className="eyebrow">We’re here to help</p><h2>What would you like to know?</h2><p>Send your question and keep the reference number for follow-up.</p><label>Name <span>Required</span><input name="name" autoComplete="name" placeholder="Your name" required /></label><label>Phone <span>Optional</span><input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="Your phone number" /></label><label>Subject <span>Required</span><input name="subject" placeholder="How can we help?" required /></label><label>Message <span>Required</span><textarea name="message" rows={4} placeholder="Tell us a little more..." required /></label><button className="button" type="submit" disabled={status === 'sending'}>{status === 'sending' ? 'Sending your enquiry...' : 'Send enquiry'}</button>{status === 'sent' && <p className="form-success" role="status">Thanks, your enquiry is saved. Reference: <strong>{reference}</strong></p>}<small className="preview-note">Preview mode: enquiries are saved only in this browser.</small></form></section>
}

function Footer({ onPolicy }: { onPolicy: (policy: Policy) => void }) {
  return <footer><div className="footer-contact"><a href="mailto:greedandfearacademy@gmail.com">greedandfearacademy@gmail.com</a><a href="tel:+917899404714">+91 78994 04714</a></div><div className="footer-grid"><div><img src={logo} alt="Greed and Fear" /><p>Technical analysis education for thoughtful market participants.</p></div><div><h3>Explore</h3><Link to="/products">Memberships</Link><Link to="/courses">Courses</Link><Link to="/results">Results</Link><Link to="/news">News</Link></div><div><h3>Community</h3><a href={TELEGRAM_URL} target="_blank" rel="noreferrer">Telegram</a><a href={WHATSAPP_URL} target="_blank" rel="noreferrer">WhatsApp</a><Link to="/login">Member login</Link><button onClick={() => onPolicy('careers')}>Careers</button></div><div><h3>Policies</h3>{(['terms', 'privacy', 'refund', 'cookies', 'disclaimer'] as Policy[]).map((item) => <button onClick={() => onPolicy(item)} key={item}>{policyContent[item].title}</button>)}</div></div><div className="copyright">© {new Date().getFullYear()} Greed & Fear. Educational content only.</div></footer>
}

function CookieBanner({ onChoice, onRead }: { onChoice: (choice: 'accepted' | 'rejected') => void; onRead: () => void }) {
  return <aside className="cookie-banner" aria-label="Cookie preferences"><p>We use essential storage to remember your preferences.</p><div><button className="button" onClick={() => onChoice('accepted')}>Accept</button><button className="button secondary" onClick={() => onChoice('rejected')}>Reject</button><button className="text-button" onClick={onRead}>Read policy</button></div></aside>
}

function PolicyModal({ policy, onClose }: { policy: Policy; onClose: () => void }) {
  const content = policyContent[policy]
  useEffect(() => { const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose(); document.addEventListener('keydown', close); return () => document.removeEventListener('keydown', close) }, [onClose])
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="policy-modal" role="dialog" aria-modal="true" aria-labelledby="policy-title"><button className="modal-close" onClick={onClose} aria-label="Close">×</button><p className="eyebrow">Greed & Fear</p><h2 id="policy-title">{content.title}</h2>{content.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<button className="button" onClick={onClose}>Close</button></section></div>
}

function Page({ children }: { children: ReactNode }) { return <div className="page section-pad">{children}</div> }
function PageHero({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) { return <header className="page-hero"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{copy}</p></header> }
function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) { return <header className="section-title"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></header> }
function ExternalButton({ href, children, secondary = false }: { href: string; children: ReactNode; secondary?: boolean }) { return <a className={secondary ? 'button secondary' : 'button login-button'} href={href} target="_blank" rel="noreferrer">{children}</a> }
function UnavailablePage({ title }: { title: string }) { return <Page><PageHero eyebrow="In development" title={title} copy="This prototype did not have a working backend in the legacy site. It has been retained as a route but is not available yet." /><Link className="button" to="/">Return home</Link></Page> }
function NotFoundPage() { return <Page><PageHero eyebrow="404" title="This page has moved." copy="Use the navigation to find the current page." /><Link className="button" to="/">Return home</Link></Page> }

export default App
