import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Play, Search, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Empty, Seg, Skel } from './ui'

type Video = { id: string; title: string; description?: string | null; category?: string | null; thumbnail_url?: string | null; video_url?: string | null; youtube_url?: string | null; hidden?: boolean | null }

const ytId = (u?: string | null) => u?.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)?.[1]

/** Shared grid + player for Academy lessons and Tutorials. */
export default function VideoLibrary({ table, emptyText }: { table: 'academy_lessons' | 'tutorials'; emptyText: string }) {
  const { session } = useAuth()
  const [cat, setCat] = useState('all')
  const [q, setQ] = useState('')
  const [playing, setPlaying] = useState<Video | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: [table],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: true })
      if (error) throw error
      return ((data ?? []) as Video[]).filter((v) => !v.hidden)
    },
  })

  const cats = useMemo(() => [...new Set((data ?? []).map((v) => v.category).filter(Boolean))] as string[], [data])
  const list = (data ?? []).filter((v) => (cat === 'all' || v.category === cat) && (!q || v.title.toLowerCase().includes(q.toLowerCase())))

  if (isLoading) return <div className="grid g-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skel key={i} h={240} />)}</div>
  if (!data?.length) return <div className="card"><Empty icon={<Play size={20} />} title="Nada por aqui ainda">{emptyText}</Empty></div>

  const yt = ytId(playing?.youtube_url) ?? ytId(playing?.video_url)

  return (
    <>
      <div className="row between wrap" style={{ marginBottom: 20, gap: 12 }}>
        {cats.length > 1 ? <Seg value={cat} onChange={setCat} options={[{ value: 'all', label: 'Tudo' }, ...cats.map((c) => ({ value: c, label: c }))]} /> : <span />}
        <div className="input-affix" style={{ width: 280, maxWidth: '100%' }}>
          <span><Search size={15} /></span>
          <input className="input" style={{ height: 36, fontFamily: 'var(--font)' }} placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {list.map((v, i) => {
          const thumb = v.thumbnail_url || (ytId(v.youtube_url) ? `https://i.ytimg.com/vi/${ytId(v.youtube_url)}/hqdefault.jpg` : null)
          return (
            <button key={v.id} className="card interactive" style={{ textAlign: 'left', overflow: 'hidden', padding: 0 }} onClick={() => setPlaying(v)}>
              <div style={{ aspectRatio: '16/9', background: thumb ? `center/cover url(${thumb})` : 'radial-gradient(100% 100% at 0% 0%, var(--brand-soft), var(--surface-2))', position: 'relative', borderBottom: '1px solid var(--line)' }}>
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,.5))' }}>
                  <span style={{ width: 46, height: 46, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,.92)', color: '#000', boxShadow: '0 10px 30px rgba(0,0,0,.4)' }}><Play size={18} fill="#000" /></span>
                </div>
                <span className="pill mono" style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,.6)', color: '#fff', border: 0 }}>{String(i + 1).padStart(2, '0')}</span>
              </div>
              <div style={{ padding: 16 }}>
                {v.category && <div className="tiny" style={{ color: 'var(--brand)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{v.category}</div>}
                <div style={{ fontWeight: 600, letterSpacing: '-0.01em' }}>{v.title}</div>
                {v.description && <div className="small muted" style={{ marginTop: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{v.description}</div>}
              </div>
            </button>
          )
        })}
      </div>

      {playing && (
        <div className="overlay" onMouseDown={() => setPlaying(null)} style={{ placeItems: 'center', paddingTop: 0 }}>
          <div onMouseDown={(e) => e.stopPropagation()} style={{ width: 'min(1000px, calc(100vw - 32px))' }}>
            <div className="row between" style={{ marginBottom: 12, color: '#fff' }}>
              <b style={{ fontSize: 16 }}>{playing.title}</b>
              <button className="icon-btn" style={{ color: '#fff' }} onClick={() => setPlaying(null)}><X /></button>
            </div>
            <div style={{ aspectRatio: '16/9', borderRadius: 16, overflow: 'hidden', background: '#000' }}>
              {yt ? <iframe src={`https://www.youtube.com/embed/${yt}?autoplay=1&rel=0`} allow="autoplay; encrypted-media; fullscreen" style={{ width: '100%', height: '100%', border: 0 }} title={playing.title} />
                : playing.video_url ? <video src={playing.video_url} controls autoPlay style={{ width: '100%', height: '100%' }} />
                : <div className="empty" style={{ color: '#aaa' }}>Vídeo indisponível</div>}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
