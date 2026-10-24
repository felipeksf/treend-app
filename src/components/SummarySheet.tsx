import { useEffect, useState } from 'react'
import { ArrowUpRight, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { timeAgo } from '../lib/format'
import { Skel } from './ui'

type Story = { title: string; link: string; source: string; pubDate: string }
const clean = (t: string) => t.replace(/ - [^-]+$/, '')

/** Newsletter-style AI summary of one headline (shared by Notícias and every asset's news). */
export default function SummarySheet({ story, kicker, onClose }: { story: Story; kicker?: string; onClose: () => void }) {
  const [text, setText] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    setText(null)
    supabase.functions.invoke('summarize-news', { body: { title: story.title, link: story.link, locale: 'pt' } })
      .then(({ data }) => alive && setText(data?.summary || 'Resumo indisponível no momento.'))
      .catch(() => alive && setText('Resumo indisponível no momento.'))
    return () => { alive = false }
  }, [story.link, story.title])
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  return (
    <div className="overlay tn-overlay" onMouseDown={onClose}>
      <article className="tn-sheet" onMouseDown={(e) => e.stopPropagation()}>
        <button className="icon-btn tn-x" onClick={onClose} aria-label="Fechar"><X /></button>
        <div className="tn-kicker">☕ resumo treend{kicker ? ` · ${kicker}` : ''}</div>
        <h2 data-no-tr>{clean(story.title)}</h2>
        <div className="tn-meta"><span data-no-tr>{story.source}</span> · {timeAgo(story.pubDate)} · leitura de 1 min</div>
        <div className="tn-body">
          {text ? <SummaryBody text={text} /> : <div className="stack gap-8"><Skel h={18} /><Skel h={18} /><Skel h={18} w="80%" /><Skel h={18} w="60%" /></div>}
        </div>
        <div className="tn-sheet-foot">
          <span className="tiny faint">Resumo gerado por IA a partir da matéria original. Conteúdo informativo, não constitui recomendação de investimento.</span>
          <a className="tn-btn primary" href={story.link} target="_blank" rel="noreferrer">Ler matéria completa <ArrowUpRight size={14} /></a>
        </div>
      </article>
    </div>
  )
}

/** Renders the AI summary like a newsletter story: intro paragraph, then labelled blocks ("o que aconteceu", impacts…). */
export function SummaryBody({ text }: { text: string }) {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean).filter((l) => !/^aqui est[aá]/i.test(l))
  const inline = (t: string) => t.split(/(\*\*[^*]+\*\*)/g).map((x, i) => (x.startsWith('**') ? <b key={i}>{x.slice(2, -2)}</b> : x))
  let first = true
  return (
    <>
      {lines.map((raw, i) => {
        const l = raw.replace(/^([*•-]|\d+\.)\s+/, '')
        const m = l.match(/^\*\*([^*]+?):?\*\*:?\s*(.*)$/)
        if (m) return <div key={i} className="tn-block"><div className="tn-block-h">{m[1].replace(/:$/, '').toLowerCase()}</div><p>{inline(m[2])}</p></div>
        const cls = first ? 'lead' : ''
        first = false
        return <p key={i} className={cls}>{inline(l)}</p>
      })}
    </>
  )
}
