// Resolves Google News article links (news.google.com/rss/articles/…) to the publisher's URL, so readers
// open the original site directly — Google News itself is blocked for some (Workspace) accounts.
// Results are cached in gnews-map.json, published next to the feeds.
const UA = { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', cookie: 'CONSENT=YES+' }
const SITE = 'https://novo.treend.com.br/gnews-map.json'

export async function loadMap(path) {
  const fs = await import('node:fs')
  try { if (path && fs.existsSync(path)) return JSON.parse(fs.readFileSync(path, 'utf8')) } catch { /* ignore */ }
  try { const r = await fetch(SITE); if (r.ok) return await r.json() } catch { /* ignore */ }
  return {}
}

export const isGoogle = (u) => /^https?:\/\/news\.google\.com\//.test(u || '')

async function resolveOne(link) {
  const id = link.match(/articles\/([^?]+)/)?.[1]
  if (!id) return null
  const html = await (await fetch(`https://news.google.com/rss/articles/${id}`, { headers: UA })).text()
  const sg = html.match(/data-n-a-sg="([^"]+)"/)?.[1]
  const ts = html.match(/data-n-a-ts="([^"]+)"/)?.[1]
  if (!sg || !ts) return null
  const req = [[['Fbv4je', JSON.stringify(['garturlreq', [['X', 'X', ['X', 'X'], null, null, 1, 1, 'US:en', null, 1, null, null, null, null, null, 0, 1], 'X', 'X', 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0], id, Number(ts), sg]), null, 'generic']]]
  const r = await fetch('https://news.google.com/_/DotsSplashUi/data/batchexecute', { method: 'POST', headers: { ...UA, 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body: 'f.req=' + encodeURIComponent(JSON.stringify(req)) })
  const t = await r.text()
  const m = t.match(/garturlres\\",\\"(https?:[^\\"]+)\\"/)
  return m ? m[1].replace(/\\\\u003d/g, '=').replace(/\\\\u0026/g, '&') : null
}

/** Resolves every Google News link in `items` in place; items that can't be resolved are dropped. */
export async function resolveAll(items, map, concurrency = 6) {
  const todo = [...new Set(items.map((n) => n.link).filter((l) => isGoogle(l) && !(l in map)))]
  let i = 0
  const worker = async () => {
    while (i < todo.length) {
      const l = todo[i++]
      try { map[l] = await resolveOne(l) } catch { map[l] = null }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  for (const n of items) if (isGoogle(n.link)) n.link = map[n.link] || null
  return items.filter((n) => n.link)
}

export async function saveMap(path, map) {
  const fs = await import('node:fs')
  const entries = Object.entries(map).filter(([, v]) => v).slice(-15000)
  fs.writeFileSync(path, JSON.stringify(Object.fromEntries(entries)))
}
