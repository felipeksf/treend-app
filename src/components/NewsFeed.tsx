import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { LANG } from '../lib/i18n'
import { timeAgo } from '../lib/format'
import type { NewsItem } from '../pages/Dashboard'
import { Cover, type Fallback } from './AssetNews'
import { SummaryBody } from './SummarySheet'
import { Skel } from './ui'

/* Feed view: one story per card (newsletter style), cover image on top and the Treend AI briefing
   right below the headline. Briefings load only when the card scrolls into view and are cached. */

const clean = (t: string) => t.replace(/ - [^-]+$/, '')
const KEY = 'treend-v2-briefings'
const cache: Record<string, string> = (() => { try { return JSON.parse(sessionStorage.getItem(KEY) || '{}') } catch { return {} } })()
const remember = (k: string, v: string) => { cache[k] = v; try { sessionStorage.setItem(KEY, JSON.stringify(cache)) } catch { /* ignore */ } }

function Briefing({ n }: { n: NewsItem }) {
  const ref = useRef<HTMLDivElement>(null)
  const k = `${LANG}:${n.link}`
  const [text, setText] = useState<string | null>(cache[k] ?? null)
  const [want, setWant] = useState(!!cache[k])
  useEffect(() => {
    if (want || !ref.current) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setWant(true); io.disconnect() } }, { rootMargin: '200px' })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [want])
  useEffect(() => {
    if (!want || text) return
    let alive = true
    supabase.functions.invoke('summarize-news', { body: { title: n.title, link: n.link, locale: LANG } })
      .then(({ data }) => { const t = data?.summary || ''; if (alive) { setText(t || 'Briefing indisponível no momento.'); if (t) remember(k, t) } })
      .catch(() => alive && setText('Briefing indisponível no momento.'))
    return () => { alive = false }
  }, [want, text, n.title, n.link, k])
  return (
    <div className="nf-brief" ref={ref} data-no-tr>
      <div className="nf-brief-h">☕ briefing treend</div>
      {text ? <div className="tn-body"><SummaryBody text={text} /></div> : <div className="stack gap-8"><Skel h={14} /><Skel h={14} /><Skel h={14} w="70%" /></div>}
    </div>
  )
}

export default function NewsFeed({ items, tag, fallback }: { items: NewsItem[]; tag?: (n: NewsItem) => string; fallback?: Fallback }) {
  return (
    <div className="nf">
      {items.map((n, i) => (
        <article key={n.link + n.title} className="nf-card">
          <a href={n.link} target="_blank" rel="noreferrer"><Cover n={n} cls="nf-img" fallback={fallback} /></a>
          <div className="nf-body">
            <div className="tn-tag"><span className="nf-num">{i + 1}.</span> {tag ? `${tag(n)} · ` : ''}<span data-no-tr>{n.source}</span> · {timeAgo(n.pubDate)}</div>
            <a href={n.link} target="_blank" rel="noreferrer"><h2 data-no-tr>{clean(n.title)}</h2></a>
            <Briefing n={n} />
            <a className="tn-link" href={n.link} target="_blank" rel="noreferrer">Ler a matéria completa <ArrowUpRight size={13} style={{ verticalAlign: -2 }} /></a>
          </div>
        </article>
      ))}
    </div>
  )
}
