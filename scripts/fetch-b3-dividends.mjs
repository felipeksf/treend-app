// Builds b3-dividends.json: dividend history (type, amount, record date, ex-date, payment date) of every
// B3 stock, from dadosdemercado.com.br, plus derived figures (12-month dividend yield, last/next payment,
// yearly totals). Runs once a day in GitHub Actions. Usage: node scripts/fetch-b3-dividends.mjs out.json
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const OUT = process.argv[2] || 'b3-dividends.json'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'

const scan = await (await fetch('https://scanner.tradingview.com/brazil/scan', { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ filter: [{ left: 'type', operation: 'equal', right: 'stock' }], columns: ['name', 'close'], sort: { sortBy: 'Value.Traded', sortOrder: 'desc' }, range: [0, 600] }) })).json()
const stocks = (scan.data ?? []).map((x) => ({ t: String(x.d[0]), p: x.d[1] })).filter((x) => !x.t.endsWith('F'))

const br = (s) => { const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : null }
const num = (s) => parseFloat(s.replace(/\./g, '').replace(',', '.'))
const strip = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

let blocked = 0
async function history(t, retry = true) {
  const r = await fetch(`https://www.dadosdemercado.com.br/acoes/${t.toLowerCase()}/dividendos`, { headers: { 'user-agent': UA, accept: 'text/html' } })
  if (r.status === 403 || r.status === 429) {
    if (retry) { await new Promise((x) => setTimeout(x, 60_000)); return history(t, false) }
    blocked++
    return null
  }
  if (!r.ok) return null
  const html = await r.text()
  const table = html.match(/<table[\s\S]*?<\/table>/i)?.[0]
  if (!table) return []
  const rows = [...table.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((m) => [...m[0].matchAll(/<td[\s\S]*?<\/td>/gi)].map((c) => strip(c[0])))
  return rows.filter((c) => c.length >= 5).map((c) => ({ type: /jcp|juros/i.test(c[0]) ? 'JCP' : /rend/i.test(c[0]) ? 'Rendimento' : 'Dividendo', value: num(c[1]), record: br(c[2]), ex: br(c[3]), pay: br(c[4]) }))
    .filter((e) => isFinite(e.value) && e.value > 0 && e.ex)
}

// previous file: kept for stocks that can't be fetched today
let prev = {}
try { prev = (await (await fetch('https://novo.treend.com.br/b3-dividends.json')).json()).stocks ?? {} } catch { /* ignore */ }
const today = new Date().toISOString().slice(0, 10)
const yearAgo = new Date(Date.now() - 365 * 86400e3).toISOString().slice(0, 10)
const out = {}
let i = 0, ok = 0
await Promise.all(Array.from({ length: 1 }, async () => {
  while (i < stocks.length) {
    const s = stocks[i++]
    if (blocked >= 3) { if (prev[s.t]) out[s.t] = prev[s.t]; continue } // source is refusing: keep yesterday's data
    try {
      const h = await history(s.t)
      if (h === null && prev[s.t]) { out[s.t] = prev[s.t]; continue }
      if (!h || !h.length) continue
      const ttm = h.filter((e) => e.ex > yearAgo && e.ex <= today)
      const ttmSum = ttm.reduce((a, e) => a + e.value, 0)
      const past = h.filter((e) => e.ex <= today).sort((a, b) => b.ex.localeCompare(a.ex))
      const future = h.filter((e) => e.ex > today || (e.pay && e.pay >= today)).sort((a, b) => (a.ex > b.ex ? 1 : -1))
      const years = {}
      for (const e of h) { const y = e.ex.slice(0, 4); years[y] = +((years[y] ?? 0) + e.value).toFixed(6) }
      out[s.t] = {
        dy: s.p && ttmSum ? +((ttmSum / s.p) * 100).toFixed(2) : null,
        ttm: +ttmSum.toFixed(6),
        last: past[0] ?? null,
        next: future.filter((e) => e.ex > today)[0] ?? null,
        upcoming: future.slice(0, 6),
        years,
        events: h.slice(0, 40),
      }
      ok++
    } catch { /* ignore */ }
    await new Promise((r) => setTimeout(r, 2500)) // be gentle with the source: one page every ~2.5 s
  }
}))

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), source: 'dadosdemercado.com.br', stocks: out }))
console.log(`b3-dividends.json: ${Object.keys(out).length} ações (${ok} atualizadas hoje, ${blocked} recusadas pela fonte)`)
