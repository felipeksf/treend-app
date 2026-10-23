import { useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Captions, Play, Search, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Empty, Seg, Skel } from './ui'

export type Video = {
  id: string; title: string; title_en?: string | null; title_es?: string | null; description?: string | null; category?: string | null
  thumbnail_url?: string | null; video_url?: string | null; youtube_url?: string | null; hidden?: boolean | null; sort_order?: number | null
  subtitle_pt_url?: string | null; subtitle_en_url?: string | null; subtitle_es_url?: string | null
}

export const ytId = (u?: string | null) => u?.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)?.[1]
export const thumbOf = (v: Video) => v.thumbnail_url || (ytId(v.youtube_url) ? `https://i.ytimg.com/vi/${ytId(v.youtube_url)}/hqdefault.jpg` : null)

/** Same tracks: classic tutorials order (sort_order) and only visible items. */
export const useVideos = (table: 'academy_lessons' | 'tutorials') => {
  const { session } = useAuth()
  return useQuery({
    queryKey: [table],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select('*').order('sort_order', { ascending: true, nullsFirst: false })
      if (error) throw error
      return ((data ?? []) as Video[]).filter((v) => !v.hidden)
    },
  })
}

/** Player with the classic subtitle options (PT / EN / ES), for both uploaded videos and YouTube. */
export function Player({ video, onClose }: { video: Video; onClose: () => void }) {
  const [lang, setLang] = useState<'off' | 'pt' | 'en' | 'es'>('off')
  const ref = useRef<HTMLVideoElement>(null)
  const yt = ytId(video.youtube_url) ?? (video.video_url ? undefined : ytId(video.video_url))
  const tracks = [
    { l: 'pt', label: 'Português', src: video.subtitle_pt_url },
    { l: 'en', label: 'English', src: video.subtitle_en_url },
    { l: 'es', label: 'Español', src: video.subtitle_es_url },
  ].filter((t) => t.src)
  const apply = (el: HTMLVideoElement | null, l: string) => {
    if (!el) return
    for (let i = 0; i < el.textTracks.length; i++) el.textTracks[i].mode = el.textTracks[i].language === l ? 'showing' : 'hidden'
  }
  const choose = (l: typeof lang) => { setLang(l); apply(ref.current, l) }
  const langs = video.video_url ? tracks.map((t) => t.l) : ['pt', 'en', 'es']

  return (
    <div className="overlay" onMouseDown={onClose} style={{ placeItems: 'center', paddingTop: 0 }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ width: 'min(1000px, calc(100vw - 32px))' }}>
        <div className="row between wrap" style={{ marginBottom: 12, color: '#fff', gap: 10 }}>
          <b style={{ fontSize: 16 }}>{video.title}</b>
          <span className="row gap-8">
            {langs.length > 0 && (
              <span className="row gap-4 player-cc">
                <Captions size={16} />
                {(['off', ...langs] as (typeof lang)[]).map((l) => (
                  <button key={l} className={lang === l ? 'on' : ''} onClick={() => choose(l)}>{l === 'off' ? 'Sem legenda' : l.toUpperCase()}</button>
                ))}
              </span>
            )}
            <button className="icon-btn" style={{ color: '#fff' }} onClick={onClose} aria-label="Fechar"><X /></button>
          </span>
        </div>
        <div style={{ aspectRatio: '16/9', borderRadius: 16, overflow: 'hidden', background: '#000' }}>
          {video.video_url ? (
            <video ref={ref} src={video.video_url} controls autoPlay crossOrigin="anonymous" style={{ width: '100%', height: '100%' }} onLoadedMetadata={(e) => apply(e.currentTarget, lang)}>
              {tracks.map((t) => <track key={t.l} kind="subtitles" src={t.src!} srcLang={t.l} label={t.label} />)}
            </video>
          ) : yt ? (
            <iframe key={lang} src={`https://www.youtube.com/embed/${yt}?autoplay=1&rel=0${lang !== 'off' ? `&cc_load_policy=1&cc_lang_pref=${lang}` : ''}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen style={{ width: '100%', height: '100%', border: 0 }} title={video.title} />
          ) : (
            <div className="empty" style={{ color: '#aaa' }}>Vídeo indisponível</div>
          )}
        </div>
        {video.description && <p style={{ color: '#d6dbe4', marginTop: 14, lineHeight: 1.6 }}>{video.description}</p>}
      </div>
    </div>
  )
}

/** Library grid grouped into the classic tracks (sections), in their original order. */
export default function VideoLibrary({ table, emptyText, sections }: { table: 'academy_lessons' | 'tutorials'; emptyText: string; sections?: { value: string; label: string }[] }) {
  const { data, isLoading } = useVideos(table)
  const [cat, setCat] = useState('all')
  const [q, setQ] = useState('')
  const [playing, setPlaying] = useState<Video | null>(null)

  const groups = useMemo(() => {
    const list = (data ?? []).filter((v) => !q || `${v.title} ${v.description ?? ''}`.toLowerCase().includes(q.toLowerCase()))
    const known = sections ?? [...new Set(list.map((v) => v.category).filter(Boolean))].map((c) => ({ value: c as string, label: c as string }))
    const out = known.map((s) => ({ ...s, items: list.filter((v) => v.category === s.value) }))
    const rest = list.filter((v) => !known.some((s) => s.value === v.category))
    if (rest.length) out.push({ value: '_other', label: 'Outros', items: rest })
    return out.filter((g) => g.items.length && (cat === 'all' || g.value === cat))
  }, [data, q, cat, sections])

  if (isLoading) return <div className="grid g-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skel key={i} h={240} />)}</div>
  if (!data?.length) return <div className="card"><Empty icon={<Play size={20} />} title="Nada por aqui ainda">{emptyText}</Empty></div>

  const allGroups = (sections ?? []).filter((s) => data.some((v) => v.category === s.value))

  return (
    <>
      <div className="row between wrap" style={{ marginBottom: 24, gap: 12 }}>
        {allGroups.length > 1 ? <Seg value={cat} onChange={setCat} options={[{ value: 'all', label: 'Todas as trilhas' }, ...allGroups.map((c) => ({ value: c.value, label: c.label }))]} /> : <span />}
        <div className="input-affix" style={{ width: 280, maxWidth: '100%' }}>
          <span><Search size={15} /></span>
          <input className="input" style={{ height: 40, fontFamily: 'var(--font)' }} placeholder="Buscar aula" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {groups.length === 0 && <div className="card"><Empty icon={<Search size={20} />} title="Nenhuma aula encontrada" /></div>}

      <div className="stack gap-24">
        {groups.map((g) => (
          <section key={g.value}>
            <div className="row between" style={{ marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>{g.label}</h3>
              <span className="small faint">{g.items.length} {g.items.length === 1 ? 'aula' : 'aulas'}</span>
            </div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
              {g.items.map((v, i) => {
                const thumb = thumbOf(v)
                return (
                  <button key={v.id} className="card interactive" style={{ textAlign: 'left', overflow: 'hidden', padding: 0 }} onClick={() => setPlaying(v)}>
                    <div style={{ aspectRatio: '16/9', background: thumb ? `center/cover url(${thumb})` : 'linear-gradient(145deg, #0b1a3a, #2453e0)', position: 'relative' }}>
                      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,.45))' }}>
                        <span style={{ width: 48, height: 48, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,.95)', color: '#2453e0', boxShadow: '0 10px 30px rgba(0,0,0,.35)' }}><Play size={18} fill="#2453e0" /></span>
                      </div>
                      <span className="pill mono" style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,.6)', color: '#fff' }}>Aula {String(i + 1).padStart(2, '0')}</span>
                      {(v.subtitle_en_url || v.subtitle_es_url) && <span className="pill" style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,.6)', color: '#fff' }}><Captions size={12} /> CC</span>}
                    </div>
                    <div style={{ padding: 16 }}>
                      <div style={{ fontWeight: 650, letterSpacing: '-0.01em' }}>{v.title}</div>
                      {v.description && <div className="small muted" style={{ marginTop: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{v.description}</div>}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {playing && <Player video={playing} onClose={() => setPlaying(null)} />}
    </>
  )
}
