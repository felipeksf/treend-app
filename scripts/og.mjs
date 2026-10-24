// Finds the cover image of each article (og:image / twitter:image) so the news "portal" view can show it.
// Results are cached in og-map.json (published next to the feeds); misses are cached too.
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'
const SITE = 'https://novo.treend.com.br/og-map.json'

export async function loadOg(path) {
  const fs = await import('node:fs')
  try { if (path && fs.existsSync(path)) return JSON.parse(fs.readFileSync(path, 'utf8')) } catch { /* ignore */ }
  try { const r = await fetch(SITE); if (r.ok) return await r.json() } catch { /* ignore */ }
  return {}
}
export async function saveOg(path, map) {
  const fs = await import('node:fs')
  fs.writeFileSync(path, JSON.stringify(Object.fromEntries(Object.entries(map).slice(-20000))))
}

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
async function ogOf(url) {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 8000)
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html' }, redirect: 'follow', signal: ctl.signal })
    if (!r.ok || !(r.headers.get('content-type') || '').includes('html')) return ''
    // only the <head> matters
    const reader = r.body.getReader(); let html = ''
    while (html.length < 250000) { const { done, value } = await reader.read(); if (done) break; html += new TextDecoder().decode(value); if (/<\/head>/i.test(html)) break }
    try { reader.cancel() } catch { /* ignore */ }
    const m = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["']/i)
    if (!m) return ''
    const img = new URL(decode(m[1]), r.url || url).toString()
    return /^https:\/\//.test(img) && !/logo|favicon|default|placeholder/i.test(img) ? img : ''
  } catch { return '' } finally { clearTimeout(timer) }
}

/** Adds `image` to every item (in place), fetching only links not cached yet. */
export async function addImages(items, map, concurrency = 12) {
  const todo = [...new Set(items.map((n) => n.link).filter((l) => l && !(l in map)))]
  let i = 0
  await Promise.all(Array.from({ length: concurrency }, async () => { while (i < todo.length) { const l = todo[i++]; map[l] = await ogOf(l) } }))
  for (const n of items) if (map[n.link]) n.image = map[n.link]
  return todo.length
}
