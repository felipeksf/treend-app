import { useState } from 'react'
import { useQuotes } from '../lib/rates'
import { CLASSES, CLASS_LIST, priceDigits, useClassScan, type ClassKey } from '../lib/classes'
import { num } from '../lib/format'

/** Live quotes for the navy panels (login, offer): pick an asset class, see a few of its assets in real time. */
const FX = ['USD', 'EUR', 'GBP', 'CNY', 'USDT', 'BTC']
const ORDER: ClassKey[] = ['fx', 'b3', 'us', 'crypto', 'commod', 'fii']

function Item({ label, price, change }: { label: string; price: string; change: number | null }) {
  return (
    <div className="stack gap-4">
      <span className="lq-k">{label}</span>
      <span className="mono lq-v">{price}</span>
      <span className="mono lq-d" style={{ color: (change ?? 0) >= 0 ? '#7ff0c6' : '#ff8a96' }}>{change == null ? '—' : `${change >= 0 ? '+' : ''}${num(change, 2)}%`}</span>
    </div>
  )
}

function ClassRow({ k }: { k: ClassKey }) {
  const { data } = useClassScan(k, k === 'fii' ? undefined : 12)
  const rows = (data ?? []).filter((r) => r.price != null).slice(0, 6)
  if (!rows.length) return <div className="login-quotes">{Array.from({ length: 6 }, (_, i) => <div key={i} className="lq-skel" />)}</div>
  return (
    <div className="login-quotes">
      {rows.map((r) => <Item key={r.symbol} label={k === 'commod' ? r.name.split(' ').slice(0, 2).join(' ') : r.ticker} price={`${r.cur || CLASSES[k].currency} ${num(r.price!, priceDigits(r.price))}`} change={r.change_pct} />)}
    </div>
  )
}

export default function LiveQuotes() {
  const [k, setK] = useState<ClassKey>('fx')
  const { data: q } = useQuotes()
  return (
    <div className="lq">
      <div className="lq-tabs" role="tablist">
        {ORDER.map((c) => { const x = CLASS_LIST.find((y) => y.key === c)!; return <button key={c} role="tab" aria-selected={k === c} className={k === c ? 'on' : ''} onClick={() => setK(c)}>{x.emoji} {x.label}</button> })}
      </div>
      {k === 'fx' ? (
        <div className="login-quotes">
          {FX.map((c) => (q?.[c] ? <Item key={c} label={q[c].short} price={`${q[c].prefix} ${num(q[c].bid, c === 'BTC' ? 0 : 4)}`} change={q[c].pctChange} /> : null))}
        </div>
      ) : <ClassRow key={k} k={k} />}
    </div>
  )
}
