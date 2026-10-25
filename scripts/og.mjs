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
    const reader = r.body.getReader(); let html = ''
    const OG = /<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url|:url)?|twitter:image(?::src)?)["'][^>]*content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["']/i
    while (html.length < 450000) { const { done, value } = await reader.read(); if (done) break; html += new TextDecoder().decode(value); if (OG.test(html)) break }
    try { reader.cancel() } catch { /* ignore */ }
    const bad = (u) => /(^|\/)[^/]*(logo|favicon|sprite|avatar|icon|placeholder|blank|pixel|spacer)[^/]*$/i.test(u.split('?')[0]) || /\.svg(\?|$)|\.gif(\?|$)/i.test(u)
    const abs = (u) => { try { return new URL(decode(u), r.url || url).toString() } catch { return '' } }
    const cands = []
    const og = html.match(OG); if (og) cands.push(og[1] || og[2])
    const ld = html.match(/"image"\s*:\s*(?:\{[^}]*?"url"\s*:\s*)?\[?\s*"([^"]+\.(?:jpe?g|png|webp)[^"]*)"/i); if (ld) cands.push(ld[1])
    const rel = html.match(/<link[^>]+rel=["']image_src["'][^>]*href=["']([^"']+)["']/i); if (rel) cands.push(rel[1])
    // first sizeable photo of the article body
    for (const m of html.matchAll(/<img[^>]+(?:data-src|src)=["']([^"']+\.(?:jpe?g|png|webp)[^"']*)["'][^>]*>/gi)) {
      const tag = m[0]; const w = +(tag.match(/width=["']?(\d+)/i)?.[1] ?? 0)
      if (!w || w >= 300) { cands.push(m[1]); if (cands.length > 6) break }
    }
    for (const c of cands) { const img = abs(c); if (/^https:\/\//.test(img) && !bad(img)) return img }
    return ''
  } catch { return '' } finally { clearTimeout(timer) }
}

/** Adds `image` to every item (in place), fetching only links not cached yet. */
export async function addImages(items, map, concurrency = 12) {
  // misses are retried once on a later run ('#retry'), then cached as '' for good
  const todo = [...new Set(items.map((n) => n.link).filter((l) => l && (!(l in map) || map[l] === '#retry')))]
  let i = 0
  await Promise.all(Array.from({ length: concurrency }, async () => { while (i < todo.length) { const l = todo[i++]; const img = await ogOf(l); map[l] = img || (map[l] === '#retry' ? '' : '#retry') } }))
  for (const n of items) if (map[n.link] && map[n.link] !== '#retry') n.image = map[n.link]
  return todo.length
}
