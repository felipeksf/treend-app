import { CalendarClock, Coins } from 'lucide-react'
import { useDividend, fmtDate, daysFrom } from '../lib/dividends'
import { Hint } from './ui'
import { num } from '../lib/format'

/** Dividend block on an asset's full analysis (B3 and US stocks): yield, payout, last/next payment and streak. */
const iso = (d: string | null) => (d ? d.split('-').reverse().join('/') : '—')

export default function AssetDividends({ symbol, ticker, currency }: { symbol: string; ticker: string; currency: string }) {
  const { data: d, isLoading } = useDividend(symbol)
  if (isLoading || !d) return null
  const kNext = daysFrom(d.nextEx)
  const yoc = d.dps != null && d.price ? (d.dps / d.price) * 100 : null
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-h"><h3><Coins /> Dividendos de {ticker}<Hint text="Proventos da empresa segundo a fonte de mercado. A data ex é o primeiro dia em que a ação é negociada sem direito ao provento: quem compra até o dia anterior recebe." /></h3>{d.years ? <span className="pill">{d.years} {d.years === 1 ? 'ano' : 'anos'} seguidos pagando</span> : null}</div>
      <div className="adiv">
        <div><span>Dividend yield 12 meses</span><b className="mono">{d.dy != null ? `${num(d.dy, 2)}%` : '—'}</b></div>
        <div><span>{d.precise ? 'Proventos por ação (12 meses)' : 'Provento por ação no ano'}</span><b className="mono">{d.dps != null ? `${currency} ${num(d.dps, 4)}` : '—'}</b>{yoc != null && <i>{num(yoc, 2)}% sobre o preço atual</i>}</div>
        <div><span>Payout<Hint text="Parcela do lucro distribuída aos acionistas nos últimos 12 meses." /></span><b className="mono">{d.payout != null ? `${num(d.payout, 0)}%` : '—'}</b></div>
        <div><span>Último provento</span><b className="mono">{d.lastAmt != null ? `${currency} ${num(d.lastAmt, 4)}` : '—'}</b><i>ex {fmtDate(d.lastEx)} · pagamento {fmtDate(d.lastPay)}</i></div>
        <div className={d.nextAmt != null || d.nextEx ? 'next' : ''}><span><CalendarClock size={13} style={{ verticalAlign: -2 }} /> Próximo provento</span><b className="mono">{d.nextAmt != null ? `${currency} ${num(d.nextAmt, 4)}` : d.nextEx ? 'Anunciado' : 'Não anunciado'}</b>{(d.nextEx || d.nextPay) && <i>ex {fmtDate(d.nextEx)}{kNext != null && kNext >= 0 ? ` (em ${kNext} ${kNext === 1 ? 'dia' : 'dias'})` : ''} · pagamento {fmtDate(d.nextPay)}</i>}</div>
      </div>
      {d.byYear && Object.keys(d.byYear).length > 1 && (
        <div className="adiv-years">
          <div className="small muted" style={{ marginBottom: 8 }}>Proventos por ano (por ação)</div>
          <div className="adiv-bars">
            {(() => { const ys = Object.entries(d.byYear).sort((a, b) => a[0].localeCompare(b[0])).slice(-8); const mx = Math.max(...ys.map(([, v]) => v)) || 1; return ys.map(([y, v]) => (
              <div key={y} className="adiv-bar"><span className="mono">{num(v, 2)}</span><i style={{ height: `${Math.max(4, (v / mx) * 100)}%` }} /><b>{y}</b></div>
            )) })()}
          </div>
        </div>
      )}
      {d.events && d.events.length > 0 && (
        <div style={{ overflowX: 'auto', padding: '0 20px 8px' }}>
          <table className="div-table">
            <thead><tr><th>Tipo</th><th>Valor por ação</th><th>Data com</th><th>Data ex</th><th>Pagamento</th></tr></thead>
            <tbody>
              {d.events.slice(0, 12).map((e, i) => (
                <tr key={i} style={{ cursor: 'default' }}>
                  <td><span className="pill tone" style={{ ['--c' as string]: e.type === 'JCP' ? 'var(--amber)' : 'var(--up)' }}>{e.type}</span></td>
                  <td className="mono"><b>{currency} {num(e.value, 6)}</b></td>
                  <td className="mono">{iso(e.record)}</td>
                  <td className="mono">{iso(e.ex)}</td>
                  <td className="mono">{iso(e.pay)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="tiny faint" style={{ padding: '0 20px 16px' }}>{d.precise ? 'Histórico de proventos atualizado diariamente. ' : ''}Valores por ação, brutos (JCP tem 15% de IR retido na fonte). Datas podem ser revistas pela empresa — confirme nos comunicados oficiais. Informação, não recomendação de investimento.</div>
    </div>
  )
}
