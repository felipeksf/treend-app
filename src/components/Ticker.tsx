import { useQuotes, ORDER } from '../lib/rates'
import { num } from '../lib/format'

export default function Ticker() {
  const { data } = useQuotes()
  if (!data) return <div className="ticker" />
  const items = ORDER.filter((c) => data[c]).map((c) => data[c])
  const row = items.map((q) => {
    const d = q.code === 'BTC' || q.code === 'ETH' ? 2 : q.bid < 1 ? 4 : 4
    return (
      <span className="tick" key={q.code}>
        <span>{q.flag}</span>
        <b>{q.short}</b>
        <span className="mono">
          {q.prefix} {num(q.bid, d)}
        </span>
        <span className={`mono ${q.pctChange > 0 ? 'up' : q.pctChange < 0 ? 'down' : 'faint'}`}>
          {q.pctChange >= 0 ? '▲' : '▼'} {num(Math.abs(q.pctChange), 2)}%
        </span>
      </span>
    )
  })
  return (
    <div className="ticker" aria-label="Cotações ao vivo">
      <div className="ticker-track">
        {row}
        {row.map((r, i) => (
          <span key={i} style={{ display: 'contents' }}>
            {r}
          </span>
        ))}
      </div>
    </div>
  )
}
