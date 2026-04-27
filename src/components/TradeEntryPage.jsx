import { Link } from 'react-router-dom'

function getTradeNetResult(trade) {
  const executions =
    trade.side === 'Long' ? trade.buyExecutions ?? [] : trade.sellExecutions ?? []

  return executions.reduce((sum, execution) => {
    const amount = Math.abs(Number(execution.hitAmount) || 0)
    if (execution.hitTrade === 'TP') {
      return sum + amount
    }
    if (execution.hitTrade === 'SL') {
      return sum - amount
    }
    return sum
  }, 0)
}

function ExecutionGroup({
  title,
  executions,
  groupKey,
  onAdd,
  onRemove,
  onChange,
}) {
  return (
    <section className="execution-section">
      <div className="execution-heading">
        <h3>{title}</h3>
        <button
          type="button"
          className="small-button"
          onClick={() => onAdd(groupKey)}
        >
          + Add
        </button>
      </div>

      {executions.map((execution, index) => (
        <div className="execution-row" key={`${groupKey}-${index}`}>
          <label className="field">
            <span>Lot Size</span>
            <input
              type="number"
              value={execution.lotSize}
              onChange={(event) =>
                onChange(groupKey, index, 'lotSize', event.target.value)
              }
              placeholder="e.g. 0.10"
              step="0.01"
            />
          </label>
          <label className="field">
            <span>Hit Trade</span>
            <select
              value={execution.hitTrade}
              onChange={(event) =>
                onChange(groupKey, index, 'hitTrade', event.target.value)
              }
            >
              <option value="">Select</option>
              <option value="SL">SL</option>
              <option value="TP">TP</option>
            </select>
          </label>
          {execution.hitTrade ? (
            <label className="field">
              <span>{execution.hitTrade === 'TP' ? 'Profit $' : 'Loss $'}</span>
              <input
                type="number"
                value={execution.hitAmount}
                onChange={(event) =>
                  onChange(groupKey, index, 'hitAmount', event.target.value)
                }
                placeholder={execution.hitTrade === 'TP' ? 'e.g. 100' : 'e.g. 50'}
                step="0.01"
              />
            </label>
          ) : null}
          <button
            type="button"
            className="remove-button"
            onClick={() => onRemove(groupKey, index)}
            aria-label="Remove execution row"
          >
            x
          </button>
        </div>
      ))}
    </section>
  )
}

function TradeEntryPage({
  formData,
  tradeRecords,
  saveTradeMessage,
  updateField,
  updateExecution,
  addExecution,
  removeExecution,
  saveTrade,
  tradeSymbols,
  tradeSides,
  tradeTimeFrames,
  riskRewardOptions,
  tradeStrategies,
}) {
  return (
    <section className="content-grid">
      <Link to="/" className="nav-link back-link">
        Back to Home
      </Link>
      <form className="trade-form" onSubmit={saveTrade}>
        <div className="field-group">
          <p className="label">Type:</p>
          <p className="forex-tag">{formData.type}</p>
        </div>

        <div className="form-row">
          <div className="field-stack">
            <label className="field">
              <span>Symbol</span>
              <select
                value={formData.symbol}
                onChange={(event) => updateField('symbol', event.target.value)}
                required
              >
                <option value="">Select symbol</option>
                {tradeSymbols.map((symbol) => (
                  <option key={symbol} value={symbol}>
                    {symbol}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Date &amp; Time</span>
              <input
                type="datetime-local"
                value={formData.tradeDateTime}
                onChange={(event) => updateField('tradeDateTime', event.target.value)}
                required
              />
            </label>
          </div>
          <div className="field-stack">
            <label className="field">
              <span>Side</span>
              <select
                value={formData.side}
                onChange={(event) => updateField('side', event.target.value)}
                required
              >
                <option value="">Select side</option>
                {tradeSides.map((side) => (
                  <option key={side} value={side}>
                    {side}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Time Frame</span>
              <select
                value={formData.timeFrame}
                onChange={(event) => updateField('timeFrame', event.target.value)}
              >
                <option value="">Select time frame</option>
                {tradeTimeFrames.map((timeFrame) => (
                  <option key={timeFrame} value={timeFrame}>
                    {timeFrame}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="field-stack">
            <label className="field">
              <span>Risk Reward Ratio</span>
              <select
                value={formData.riskRewardRatio}
                onChange={(event) =>
                  updateField('riskRewardRatio', event.target.value)
                }
                required
              >
                <option value="">Select risk reward ratio</option>
                {riskRewardOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Strategy</span>
              <select
                value={formData.strategy}
                onChange={(event) => updateField('strategy', event.target.value)}
              >
                <option value="">Select strategy</option>
                {tradeStrategies.map((strategy) => (
                  <option key={strategy} value={strategy}>
                    {strategy}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {formData.side === 'Long' ? (
          <ExecutionGroup
            title="Buy Executions"
            executions={formData.buyExecutions}
            groupKey="buyExecutions"
            onAdd={addExecution}
            onRemove={removeExecution}
            onChange={updateExecution}
          />
        ) : null}

        {formData.side === 'Short' ? (
          <ExecutionGroup
            title="Sell Executions"
            executions={formData.sellExecutions}
            groupKey="sellExecutions"
            onAdd={addExecution}
            onRemove={removeExecution}
            onChange={updateExecution}
          />
        ) : null}

        <button type="submit" className="save-button">
          Save Trade
        </button>
        {saveTradeMessage ? <p className="auth-info">{saveTradeMessage}</p> : null}
      </form>

      <aside className="history-card">
        <h2>Recent Trades</h2>
        {tradeRecords.length === 0 ? (
          <p className="empty-state">No trades yet. Save your first trade.</p>
        ) : (
          <ul className="history-list">
            {tradeRecords.slice(0, 10).map((trade) => (
              <li key={trade.id} className="history-item">
                <div>
                  <strong>{trade.symbol?.toUpperCase()}</strong>
                  <p>{trade.strategy || 'No strategy selected'}</p>
                </div>
                <span
                  className={`rr-pill ${
                    getTradeNetResult(trade) < 0 ? 'rr-pill-loss' : ''
                  }`}
                >
                  R:R {trade.riskRewardRatio}
                </span>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </section>
  )
}

export default TradeEntryPage
