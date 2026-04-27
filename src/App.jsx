import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { useEffect, useState } from 'react'
import './App.css'
import introImage from './assets/intro.png'
import TradeEntryPage from './components/TradeEntryPage'
import DashboardPage from './components/DashboardPage'
import { preload } from 'react-dom'
import preloader from './assets/preloader.png'
import header from './assets/header.png'
import footerImage from './assets/footer.jpeg'
import { supabase } from './lib/supabaseClient'
const tradeSides = ['Long', 'Short']
const tradeSymbols = ['XAUUSD', 'USOIL', 'SILVER', 'BTC', 'ETHEREUM', 'EURUSD']
const tradeTimeFrames = ['5 M', '15 M', '30 M', '45 M', '1 H', '4 H']
const riskRewardOptions = ['1:1', '1:2', '1:3', '1:4', '1:5']
const tradeStrategies = [
  'Trend Following',
  'Breakout Trading',
  'Support & Resistance',
  'Supply and Demand',
  'Smart Money Concepts (SMC / ICT)',
  'Scalping',
  'Swing Trading',
  'Range analysis',
  'Price Action Trading',
  'Structure base',
  'Moving Average Strategy',
  'Fibonacci Retracement',
  'News Trading',
  'Liquidity Trading',
  'Mean Reversion',
  'Momentum Trading',
  'Order Block Trading',
]

const createExecution = () => ({
  lotSize: '',
  hitTrade: '',
  hitAmount: '',
})

const parseRiskReward = (value) => {
  const parts = value.trim().split(':')
  if (parts.length !== 2) {
    return null
  }

  const risk = Number(parts[0])
  const reward = Number(parts[1])
  if (!risk || !reward || risk <= 0 || reward <= 0) {
    return null
  }

  return reward / risk
}

function App() {
  const [showPreloader, setShowPreloader] = useState(true)
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [tradeRecords, setTradeRecords] = useState([])
  const [formData, setFormData] = useState({
    type: 'Forex & Cryptop Trading',
    symbol: '',
    side: '',
    timeFrame: '',
    riskRewardRatio: '',
    strategy: '',
    tradeDateTime: '',
    buyExecutions: [createExecution()],
    sellExecutions: [createExecution()],
  })

  const updateField = (field, value) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  const updateExecution = (group, index, field, value) => {
    setFormData((previous) => ({
      ...previous,
      [group]: previous[group].map((execution, executionIndex) =>
        executionIndex === index
          ? {
              ...execution,
              [field]: value,
              ...(field === 'hitTrade' ? { hitAmount: '' } : {}),
            }
          : execution
      ),
    }))
  }

  const addExecution = (group) => {
    setFormData((previous) => ({
      ...previous,
      [group]: [...previous[group], createExecution()],
    }))
  }

  const removeExecution = (group, index) => {
    setFormData((previous) => {
      if (previous[group].length === 1) {
        return previous
      }

      return {
        ...previous,
        [group]: previous[group].filter(
          (_, executionIndex) => executionIndex !== index
        ),
      }
    })
  }

  const saveTrade = async (event) => {
    event.preventDefault()
    if (
      !formData.symbol.trim() ||
      !formData.side ||
      !formData.tradeDateTime ||
      !parseRiskReward(formData.riskRewardRatio)
    ) {
      return
    }

    if (!currentUser) {
      navigate('/signin', { replace: true })
      return
    }

    const tradeToSave = {
      ...formData,
      rrValue: parseRiskReward(formData.riskRewardRatio),
      symbol: formData.symbol.toUpperCase(),
      createdAt: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('trades')
      .insert({
        user_id: currentUser.id,
        payload: tradeToSave,
      })
      .select('id, created_at')
      .single()

    if (error) {
      return
    }

    setTradeRecords((previous) => [
      { ...tradeToSave, id: data.id, createdAt: data.created_at },
      ...previous,
    ])
    setFormData({
      type: formData.type,
      symbol: '',
      side: '',
      timeFrame: '',
      riskRewardRatio: '',
      strategy: '',
      tradeDateTime: '',
      buyExecutions: [createExecution()],
      sellExecutions: [createExecution()],
    })
  }

  useEffect(() => {
    if (!currentUser) {
      setTradeRecords([])
      return
    }

    let cancelled = false

    const loadTrades = async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('id, payload, created_at')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })

      if (cancelled) return
      if (error) {
        setTradeRecords([])
        return
      }

      const mapped = (data ?? []).map((row) => ({
        ...(row.payload ?? {}),
        id: row.id,
        createdAt: row.created_at,
      }))
      setTradeRecords(mapped)
    }

    loadTrades()

    return () => {
      cancelled = true
    }
  }, [currentUser])

  const handleSignUp = async ({ name, email, password }) => {
    const normalizedEmail = email.trim().toLowerCase()
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { name: name.trim() },
      },
    })

    if (error) {
      return { ok: false, message: error.message }
    }

    if (!data.session) {
      return { ok: true, message: 'Check your email to confirm your account.' }
    }

    navigate('/trade-entry', { replace: true })
    return { ok: true }
  }

  const handleSignIn = async ({ email, password }) => {
    const normalizedEmail = email.trim().toLowerCase()
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (error) {
      return { ok: false, message: error.message }
    }

    navigate('/trade-entry', { replace: true })
    return { ok: true }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setCurrentUser(null)
    setTradeRecords([])
    navigate('/signin', { replace: true })
  }

  useEffect(() => {
    let cancelled = false

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (cancelled) return

      const user = data.session?.user ?? null
      setCurrentUser(
        user
          ? {
              id: user.id,
              email: user.email ?? '',
              name: user.user_metadata?.name ?? 'User',
            }
          : null
      )
    }

    syncSession()

    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      syncSession()
    })

    return () => {
      cancelled = true
      subscription?.subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setShowPreloader(false)
    }, 2000)

    return () => window.clearTimeout(timeoutId)
  }, [])

  if (showPreloader) {
    return (
      <main className="preloader">
        <img src={preloader} alt="App logo" className="preloader-logo" />
      </main>
    )
  }

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route
          path="/signin"
          element={
            currentUser ? (
              <Navigate to="/" replace />
            ) : (
              <SignInPage onSignIn={handleSignIn} />
            )
          }
        />
        <Route
          path="/signup"
          element={
            currentUser ? (
              <Navigate to="/" replace />
            ) : (
              <SignUpPage onSignUp={handleSignUp} />
            )
          }
        />
        <Route
          path="/*"
          element={
            currentUser ? (
              <main className="app-shell">
                <header className="top-bar">
                  <div className="top-bar-head">
                    <div className="header-content">
                      <div className="brand-row">
                        <img src={header} alt="App logo" className="app-logo" />
                        <p className="brand-name">MindTrade Edge</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="logout-button"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </div>
                </header>

                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route
                    path="/trade-entry"
                    element={
                      <TradeEntryPage
                        formData={formData}
                        tradeRecords={tradeRecords}
                        updateField={updateField}
                        updateExecution={updateExecution}
                        addExecution={addExecution}
                        removeExecution={removeExecution}
                        saveTrade={saveTrade}
                        tradeSymbols={tradeSymbols}
                        tradeSides={tradeSides}
                        tradeTimeFrames={tradeTimeFrames}
                        riskRewardOptions={riskRewardOptions}
                        tradeStrategies={tradeStrategies}
                      />
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <DashboardPage
                        tradeRecords={tradeRecords}
                        tradeSymbols={tradeSymbols}
                      />
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                <footer className="app-footer">
                  <span>
                    Copyright © 2026 All rights reserved. Developed by AbdulRehman
                    Nadeem
                  </span>
                  <img
                    src={footerImage}
                    alt="Trade Tracker logo name"
                    className="footer-logo-name"
                  />
                </footer>
              </main>
            ) : (
              <Navigate to="/signin" replace />
            )
          }
        />
      </Routes>
    </>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])

  return null
}

function HomePage() {
  return (
    <section className="summary-card intro-card">
      <div className="intro-layout">
        <div className="intro-copy">
          <img src={introImage} alt="Trading illustration" className="intro-image" />
          <h2>Trade Tracker</h2>
          <p>
            This Trade Tracker is designed to help maintain discipline,
            consistency, and data-driven decision-making in trading. Every trade
            recorded here represents not just an entry and exit, but a learning
            opportunity.
          </p>
          <p>
            The purpose of this tracker is to monitor performance over time by
            analyzing key factors such as strategy effectiveness, risk
            management, win rate, and psychological behavior during trades. By
            tracking both profitable and losing trades, it becomes possible to
            identify strengths, eliminate recurring mistakes, and improve
            overall trading performance.
          </p>
          <p>This journal focuses on:</p>
          <ul className="intro-list">
            <li>Following a structured trading plan</li>
            <li>Maintaining proper risk-to-reward ratios</li>
            <li>Evaluating strategy-based outcomes</li>
            <li>Tracking emotional discipline and execution</li>
          </ul>
          <p>
            Consistent use of this tracker will provide clear insights into what
            works and what does not, allowing for continuous improvement and
            long-term profitability.
          </p>
          <p className="intro-closing">
            Trade with a plan. Track with honesty. Improve with data.
          </p>
        </div>
      </div>

      <nav className="page-nav" aria-label="Primary navigation">
        <NavLink
          to="/trade-entry"
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        >
          Trade Entry
        </NavLink>
        <NavLink
          to="/dashboard"
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        >
          Dashboard
        </NavLink>
      </nav>
    </section>
  )
}

function SignInPage({ onSignIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState('')

  const submitSignIn = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setInfoMessage('')
    const result = await onSignIn({ email, password })
    if (!result.ok) {
      setErrorMessage(result.message)
    }
    if (result.message) {
      setInfoMessage(result.message)
    }
  }

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={submitSignIn}>
        <img src={preloader} alt="App logo" className="auth-logo" />
        <h2>Sign In</h2>
        <p className="auth-subtitle">Login to access your trade journal.</p>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
        {infoMessage ? <p className="auth-info">{infoMessage}</p> : null}
        <button type="submit" className="save-button auth-button">
          Sign In
        </button>
        <p className="auth-helper">
          No account? <Link to="/signup">Sign Up</Link>
        </p>
      </form>
    </main>
  )
}

function SignUpPage({ onSignUp }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState('')

  const submitSignUp = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setInfoMessage('')
    const result = await onSignUp({ name, email, password })
    if (!result.ok) {
      setErrorMessage(result.message)
      return
    }

    if (result.message) {
      setInfoMessage(result.message)
    }
  }

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={submitSignUp}>
        <img src={preloader} alt="App logo" className="auth-logo" />
        <h2>Sign Up</h2>
        <p className="auth-subtitle">Create your account to save trade records.</p>
        <label className="field">
          <span>Full Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />
        </label>
        {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
        {infoMessage ? <p className="auth-info">{infoMessage}</p> : null}
        <button type="submit" className="save-button auth-button">
          Sign Up
        </button>
        <p className="auth-helper">
          Already have an account? <Link to="/signin">Sign In</Link>
        </p>
      </form>
    </main>
  )
}

export default App
