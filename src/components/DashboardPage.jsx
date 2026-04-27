import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

function DashboardPage({ tradeRecords, tradeSymbols }) {
  const [selectedRange, setSelectedRange] = useState('complete')
  const [selectedSymbol, setSelectedSymbol] = useState('all')

  const rangeOptions = [
    { id: 'complete', label: 'Complete' },
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'Last week' },
    { id: 'month', label: 'Last month' },
  ]

  const getRangeBounds = () => {
    if (selectedRange === 'complete') {
      return {
        fromBoundary: null,
        toBoundary: null,
      }
    }

    const now = new Date()
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)

    if (selectedRange === 'today') {
      const endOfToday = new Date(now)
      endOfToday.setHours(23, 59, 59, 999)
      return { fromBoundary: startOfToday, toBoundary: endOfToday }
    }

    const daysBackMap = { week: 7, month: 31 }
    const fromBoundary = new Date(startOfToday)
    fromBoundary.setDate(fromBoundary.getDate() - daysBackMap[selectedRange])
    return { fromBoundary, toBoundary: now }
  }

  const filteredTrades = useMemo(() => {
    const { fromBoundary, toBoundary } = getRangeBounds()

    return tradeRecords.filter((trade) => {
      if (
        selectedSymbol !== 'all' &&
        trade.symbol?.toUpperCase() !== selectedSymbol
      ) {
        return false
      }
      const tradeDateValue = trade.tradeDateTime || trade.createdAt
      if (!tradeDateValue) {
        return false
      }
      const tradeDate = new Date(tradeDateValue)
      if (Number.isNaN(tradeDate.getTime())) {
        return false
      }
      if (fromBoundary && tradeDate < fromBoundary) {
        return false
      }
      if (toBoundary && tradeDate > toBoundary) {
        return false
      }
      return true
    })
  }, [tradeRecords, selectedRange, selectedSymbol])

  const clampPercent = (value) => Math.min(100, Math.max(0, value))

  const totals = useMemo(() => {
    let profit = 0
    let loss = 0
    let winningTrades = 0
    let tpHitTrades = 0
    let slHitTrades = 0

    filteredTrades.forEach((trade) => {
      const executions =
        trade.side === 'Long' ? trade.buyExecutions : trade.sellExecutions
      let tradeProfit = 0
      let tradeLoss = 0
      let hasTpHit = false
      let hasSlHit = false

      executions.forEach((execution) => {
        const amount = Math.abs(Number(execution.hitAmount) || 0)
        if (execution.hitTrade === 'TP') {
          tradeProfit += amount
          hasTpHit = true
        } else if (execution.hitTrade === 'SL') {
          tradeLoss += amount
          hasSlHit = true
        }
      })

      profit += tradeProfit
      loss += tradeLoss
      if (hasTpHit) {
        tpHitTrades += 1
      }
      if (hasSlHit) {
        slHitTrades += 1
      }
      if (tradeProfit - tradeLoss > 0) {
        winningTrades += 1
      }
    })

    const total = profit - loss
    const winningRatio = filteredTrades.length
      ? (winningTrades / filteredTrades.length) * 100
      : 0

    return {
      profit,
      loss,
      total,
      winningRatio,
      tpHitTrades,
      slHitTrades,
      tradeCount: filteredTrades.length,
    }
  }, [filteredTrades])

  const totalTradesLabel =
    selectedSymbol === 'all'
      ? 'Total Trades'
      : `Total Trades in "${selectedSymbol}"`

  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(value)

  const getProgressTone = (percent) => {
    if (percent <= 50) {
      return 'danger'
    }
    if (percent <= 80) {
      return 'warning'
    }
    return 'success'
  }

  const getToneColor = (tone) => {
    if (tone === 'danger') {
      return '#f43f5e'
    }
    if (tone === 'warning') {
      return '#f5d86b'
    }
    return '#5ced73'
  }

  const winningTone = getProgressTone(totals.winningRatio)
  const winningToneColor = getToneColor(winningTone)
  const winningRatioPercent = clampPercent(totals.winningRatio)

  const strategyBreakdown = useMemo(() => {
    const strategyMap = {}
    filteredTrades.forEach((trade) => {
      if (!trade.strategy) {
        return
      }

      const executions =
        trade.side === 'Long' ? trade.buyExecutions : trade.sellExecutions
      let tradeProfit = 0
      let tradeLoss = 0
      executions.forEach((execution) => {
        const amount = Math.abs(Number(execution.hitAmount) || 0)
        if (execution.hitTrade === 'TP') {
          tradeProfit += amount
        } else if (execution.hitTrade === 'SL') {
          tradeLoss += amount
        }
      })
      const hasTpHit = executions.some((execution) => execution.hitTrade === 'TP')

      if (!strategyMap[trade.strategy]) {
        strategyMap[trade.strategy] = {
          strategy: trade.strategy,
          totalTrades: 0,
          tpHitTrades: 0,
          profit: 0,
          loss: 0,
        }
      }
      strategyMap[trade.strategy].totalTrades += 1
      if (hasTpHit) {
        strategyMap[trade.strategy].tpHitTrades += 1
      }
      strategyMap[trade.strategy].profit += tradeProfit
      strategyMap[trade.strategy].loss += tradeLoss
    })

    return Object.values(strategyMap)
      .map((item) => ({
        ...item,
        percent: item.totalTrades
          ? (item.tpHitTrades / item.totalTrades) * 100
          : 0,
      }))
      .sort((a, b) => b.percent - a.percent)
  }, [filteredTrades])

  return (
    <section className="dashboard-page">
      <Link to="/" className="nav-link back-link">
        Back to Home
      </Link>
      <section className="summary-card dashboard-filters">
        <h2>Set Date</h2>
        <label className="field">
          <span>Date Range</span>
          <select
            value={selectedRange}
            onChange={(event) => setSelectedRange(event.target.value)}
          >
            {rangeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Symbol</span>
          <select
            value={selectedSymbol}
            onChange={(event) => setSelectedSymbol(event.target.value)}
          >
            <option value="all">All</option>
            {tradeSymbols.map((symbol) => (
              <option key={symbol} value={symbol}>
                {symbol}
              </option>
            ))}
          </select>
        </label>
        <p className="filter-note">
          Dashboard stats are calculated from the selected period.
        </p>
      </section>

      <section className="dashboard-grid">
        <section className="winrate-panel">
          <div className="winrate-circle-wrap">
            <div
              className="winrate-circle"
              style={{
                background: `conic-gradient(${winningToneColor} ${winningRatioPercent}%, #2a2a2a ${winningRatioPercent}% 100%)`,
              }}
              role="img"
              aria-label={`Winning ratio ${totals.winningRatio.toFixed(1)} percent`}
            >
              <div className="winrate-inner">
                <span className={`winrate-value ${winningTone}`}>
                  {totals.winningRatio.toFixed(1)}%
                </span>
                <span className="winrate-label">Winning Ratio</span>
              </div>
            </div>
          </div>

          <div className="winrate-stats">
            <div className={`metric-row ${totals.total >= 0 ? 'positive' : 'negative'}`}>
              <p>Total</p>
              <strong>{formatCurrency(totals.total)}</strong>
            </div>
            <div className="metric-row positive">
              <p>Profit</p>
              <strong>{formatCurrency(totals.profit)}</strong>
            </div>
            <div className="metric-row negative">
              <p>Loss</p>
              <strong>{formatCurrency(totals.loss)}</strong>
            </div>
            <div className="metric-row">
              <p>Profitable Trades</p>
              <strong>{totals.tpHitTrades}</strong>
            </div>
            <div className="metric-row">
              <p>Losing Trade</p>
              <strong>{totals.slHitTrades}</strong>
            </div>
            <div className="metric-row">
              <p>{totalTradesLabel}</p>
              <strong>{totals.tradeCount}</strong>
            </div>
          </div>
        </section>
      </section>

      <section className="summary-card">
        <h2>Strategy Performance</h2>
        {strategyBreakdown.length === 0 ? (
          <p>No strategy data found in selected filters.</p>
        ) : (
          <div className="strategy-list">
            {strategyBreakdown.map((item) => (
              <div className="strategy-item" key={item.strategy}>
                <div className="strategy-item-head">
                  <span>{item.strategy}</span>
                  <strong className={`progress-text ${getProgressTone(item.percent)}`}>
                    {clampPercent(item.percent).toFixed(1)}%
                  </strong>
                </div>
                <div className="strategy-progress-track">
                  <div
                    className={`strategy-progress-fill ${getProgressTone(item.percent)}`}
                    style={{ width: `${clampPercent(item.percent)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="summary-card">
        <h2>Performance Overview</h2>
        <p>
          Showing <strong>{filteredTrades.length}</strong> trades in selected range
          out of <strong>{tradeRecords.length}</strong> total trades.
        </p>
      </section>
    </section>
  )
}

export default DashboardPage
