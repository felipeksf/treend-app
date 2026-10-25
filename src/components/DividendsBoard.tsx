import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDownWideNarrow, CalendarClock, Coins, Search } from 'lucide-react'
import { useB3Dividends, fmtDate, daysFrom, type Div } from '../lib/dividends'
import { openAsset } from '../pages/Mercado'
import type { Row } from '../lib/classes'
import { Empty, Hint, Skel } from './ui'
import Select from './Select'
import { num } from '../lib/format'

/* Ações B3 → Dividendos: every dividend-paying company with yield, dividend per share, payout,
   last and next payment (amount, ex-date, payment date), consecutive years paying, plus a calendar
   of upcoming ex-dates and payments. */

type SortKey = 'dy' | 'next' | 'years' | 'payout' | 'ticker'
const SORTS: { value: SortKey; label: string }[] = [
  { value: 'dy', label: 'Maior dividend yield' }, { value: 'next', label: 'Próxima data ex' },
  { value: 'years', label: 'Mais anos pagando' }, { value: 'payout', label: 'Maior payout' }, { value: 'ticker', label: 'Código (A–Z)' },
]

const Logo = ({ d, size = 28 }: { d: Div; size?: number }) => (
  <span className="asset-logo" style={{ width: size, height: size }}>{d.logo ? <img src={d.logo} alt="" /> : <b style={{ fontSize: size * 0.32 }}>{d.ticker.slice(0, 2)}</b>}</span>
)

export default function DividendsBoard() {
  const { data, isLoading, isError } = useB3Dividends()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [sort, setSort] = useState<SortKey>('dy')
  const open = (d: Div) => openAsset(nav, { symbol: d.symbol, ticker: d.ticker, name: d.name, logo: d.logo, cur: 'R$', sector: d.category } as unknown as Row, 'b3')

  const all = data ?? []
  const cats = useMemo(() => [...new Set(all.map((d) => d.category).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'pt')), [all])
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    const l = all.filter((d) => (cat === 'all' || d.category === cat) && (!s || `${d.ticker} ${d.name}`.toLowerCase().includes(s)))
    const cmp: Record<SortKey, (a: Div, b: Div) => number> = {
      dy: (a, b) => (b.dy ?? -1) - (a.dy ?? -1),
      next: (a, b) => (a.nextEx ?? 9e12) - (b.nextEx ?? 9e12),
      years: (a, b) => (b.years ?? -1) - (a.years ?? -1),
      payout: (a, b) => (b.payout ?? -1) - (a.payout ?? -1),
      ticker: (a, b) => a.ticker.localeCompare(b.ticker),
    }
    return [...l].sort(cmp[sort])
  }, [all, q, cat, sort])

  const stats = useMemo(() => {
    const dys = all.map((d) => d.dy).filter((x): x is number => x != null && x > 0)
    const top = [...all].sort((a, b) => (b.dy ?? 0) - (a.dy ?? 0))[0]
    const soon = all.filter((d) => { const k = daysFrom(d.nextEx); return k != null && k >= 0 && k <= 30 }).length
    return { payers: all.length, avg: dys.length ? dys.reduce((a, b) => a + b, 0) / dys.length : 0, top, soon }
  }, [all])

  // calendar: upcoming ex-dates and payment dates (next 90 days)
  const agenda = useMemo(() => {
    const ev: { t: number; kind: 'ex' | 'pay'; d: Div }[] = []
    for (const d of all) {
      for (const [t, kind] of [[d.nextEx, 'ex'], [d.nextPay, 'pay'], [d.lastPay, 'pay']] as [number | null, 'ex' | 'pay'][]) {
        const k = daysFrom(t)
        if (t && k != null && k >= 0 && k <= 90) ev.push({ t, kind, d })
      }
    }
    const seen = new Set<string>()
    return ev.sort((a, b) => a.t - b.t).filter((e) => { const key = `${e.d.ticker}${e.kind}${e.t}`; if (seen.has(key)) return false; seen.add(key); return true }).slice(0, 40)
  }, [all])

  if (isLoading) return <Skel h={520} />
  if (isError) return <div className="card"><Empty icon={<Coins size={20} />} title="Dados de proventos indisponíveis">Tente novamente em instantes.</Empty></div>

  return (
    <div className="stack gap-16">
      <div className="insights">
        <div className="ins"><span className="ins-k">Empresas com proventos</span><span className="ins-v">{stats.payers}</span><span className="ins-s">pagamentos nos últimos 12 meses</span></div>
        <div className="ins"><span className="ins-k">Dividend yield médio<Hint text="Média do dividend yield dos últimos 12 meses entre as empresas pagadoras." /></span><span className="ins-v">{num(stats.avg, 2)}%</span><span className="ins-s">últimos 12 meses</span></div>
        <div className="ins"><span className="ins-k">Maior dividend yield</span><span className="ins-v">{stats.top ? `${num(stats.top.dy ?? 0, 2)}%` : '—'}</span><span className="ins-s">{stats.top?.ticker ?? ''}</span></div>
        <div className="ins"><span className="ins-k">Datas ex nos próximos 30 dias</span><span className="ins-v">{stats.soon}</span><span className="ins-s">empresas com provento anunciado</span></div>
      </div>

      <div className="grid g-main" style={{ alignItems: 'start' }}>
        <div className="card" style={{ overflowX: 'auto' }}>
          <div className="card-h wrap gap-8">
            <h3><Coins /> Proventos por empresa<Hint text="Dividend yield dos últimos 12 meses, provento por ação no ano fiscal, payout e o último e o próximo provento (valor, data ex e data de pagamento). Quem compra até o dia anterior à data ex tem direito ao provento." /></h3>
            <span className="tiny faint">{list.length} empresas</span>
          </div>
          <div className="div-tools">
            <div className="input-affix" style={{ flex: 1, minWidth: 180 }}><span><Search size={15} /></span><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar empresa ou código" /></div>
            <div style={{ width: 220 }}><Select value={cat} onChange={setCat} options={[{ value: 'all', label: 'Todos os setores' }, ...cats.map((c) => ({ value: c, label: c }))]} /></div>
            <div style={{ width: 220 }}><Select value={sort} onChange={(v) => setSort(v as SortKey)} options={SORTS.map((s) => ({ value: s.value, label: <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><ArrowDownWideNarrow size={14} /> {s.label}</span> }))} /></div>
          </div>
          <table className="div-table">
            <thead><tr><th>Empresa</th><th>DY 12m</th><th>Proventos/ação 12m</th><th>Payout</th><th>Último provento</th><th>Próximo provento</th><th>Anos seguidos</th></tr></thead>
            <tbody>
              {list.map((d) => {
                const kNext = daysFrom(d.nextEx)
                return (
                  <tr key={d.symbol} onClick={() => open(d)}>
                    <td><span className="row gap-8"><Logo d={d} /><span><b>{d.ticker}</b><div className="tiny faint">{d.category ?? d.name}</div></span></span></td>
                    <td><b className="mono" style={{ color: (d.dy ?? 0) >= 8 ? 'var(--up)' : undefined }}>{d.dy != null ? `${d.precise ? '' : '≈ '}${num(d.dy, 2)}%` : '—'}</b></td>
                    <td className="mono">{d.dps != null ? `R$ ${num(d.dps, 4)}` : '—'}</td>
                    <td className="mono">{d.payout != null ? `${num(d.payout, 0)}%` : '—'}</td>
                    <td>{d.lastAmt != null ? <><b className="mono">R$ {num(d.lastAmt, 4)}</b><div className="tiny faint">ex {fmtDate(d.lastEx)} · pag. {fmtDate(d.lastPay)}</div></> : <span className="faint">—</span>}</td>
                    <td>{d.nextAmt != null || d.nextEx ? <><b className="mono" style={{ color: 'var(--brand)' }}>{d.nextAmt != null ? `R$ ${num(d.nextAmt, 4)}` : 'Anunciado'}</b><div className="tiny faint">ex {fmtDate(d.nextEx)}{kNext != null && kNext >= 0 ? ` (em ${kNext} d)` : ''} · pag. {fmtDate(d.nextPay)}</div></> : <span className="faint">—</span>}</td>
                    <td className="mono">{d.years ? `${d.years}` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-h"><h3><CalendarClock /> Agenda de proventos<Hint text="Próximas datas ex (último dia em que a ação passa a ser negociada sem o direito ao provento) e datas de pagamento, nos próximos 90 dias." /></h3></div>
          {!agenda.length ? <div className="card-b small muted">Sem datas anunciadas para os próximos 90 dias.</div> : (
            <div className="div-agenda">
              {agenda.map((e) => (
                <button key={`${e.d.symbol}${e.kind}${e.t}`} className="div-ev" onClick={() => open(e.d)}>
                  <span className="div-date"><b>{new Date(e.t * 1000).toLocaleDateString('pt-BR', { day: '2-digit', timeZone: 'America/Sao_Paulo' })}</b><span>{new Date(e.t * 1000).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'America/Sao_Paulo' }).replace('.', '')}</span></span>
                  <Logo d={e.d} size={26} />
                  <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}><b>{e.d.ticker}</b><div className="tiny faint">{e.kind === 'ex' ? 'Data ex' : 'Pagamento'}{e.d.nextAmt != null ? ` · R$ ${num(e.d.nextAmt, 4)}/ação` : ''}</div></span>
                  <span className={`pill tone`} style={{ ['--c' as string]: e.kind === 'ex' ? 'var(--amber)' : 'var(--up)' }}>{e.kind === 'ex' ? 'Ex' : 'Pag.'}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <p className="tiny faint">Histórico de proventos atualizado diariamente; “≈” indica valor estimado pela fonte de mercado quando o histórico completo não está disponível; valores por ação, antes de impostos sobre JCP. Datas podem ser revistas pelas empresas — confirme nos comunicados oficiais. Informação, não recomendação de investimento.</p>
    </div>
  )
}
