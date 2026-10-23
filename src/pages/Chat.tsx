import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, Clock, MessagesSquare, Plus, Search, Send, UserPlus, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Empty, Modal, PageHeader, toast } from '../components/ui'
import Gate from '../components/Gate'

/* Same tables and RPCs as the classic Chat: chat_requests → create_chat_conversation,
   chat_participants, chat_messages (realtime), profiles_public and search_chat_users. */
type Person = { user_id: string; full_name: string | null; avatar_url: string | null }
type Conv = { id: string; other?: Person; last?: { body: string; created_at: string } }
type Msg = { id: string; sender_id: string; body: string; created_at: string }
type Req = { id: string; sender_id: string; receiver_id: string; status: string; person?: Person }

const nameOf = (p?: Person | null) => p?.full_name || 'Usuário'
const initial = (p?: Person | null) => nameOf(p).charAt(0).toUpperCase()
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const ddmm = (iso: string) => {
  const d = new Date(iso)
  return d.toDateString() === new Date().toDateString() ? hhmm(iso) : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function Avatar({ p, size = 40, tone }: { p?: Person | null; size?: number; tone?: string }) {
  return (
    <div className="chat-av" style={{ width: size, height: size, fontSize: size * 0.38, ['--c' as string]: tone ?? 'var(--brand)' }}>
      {p?.avatar_url ? <img src={p.avatar_url} alt="" /> : initial(p)}
    </div>
  )
}

const people = async (ids: string[]) => {
  if (!ids.length) return {} as Record<string, Person>
  const { data } = await supabase.from('profiles_public').select('user_id, full_name, avatar_url').in('user_id', ids)
  return Object.fromEntries((data ?? []).map((p) => [p.user_id, p as Person]))
}

export default function Chat() {
  return (
    <div className="page">
      <PageHeader eyebrow={<><MessagesSquare size={13} /> Chat</>} title="Conversas" accent="diretas." sub="Fale com outros usuários Treend. Os contatos começam com um convite aceito pelos dois lados." />
      <Gate what="as suas conversas">
        <ChatApp />
      </Gate>
    </div>
  )
}

function ChatApp() {
  const { session } = useAuth()
  const me = session!.user.id
  const [convs, setConvs] = useState<Conv[]>([])
  const [loading, setLoading] = useState(true)
  const [incoming, setIncoming] = useState<Req[]>([])
  const [outgoing, setOutgoing] = useState<Req[]>([])
  const [active, setActive] = useState<Conv | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [filter, setFilter] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const end = useRef<HTMLDivElement>(null)

  const loadRequests = useCallback(async () => {
    const [{ data: inc }, { data: out }] = await Promise.all([
      supabase.from('chat_requests').select('*').eq('receiver_id', me).eq('status', 'pending'),
      supabase.from('chat_requests').select('*').eq('sender_id', me).eq('status', 'pending'),
    ])
    const map = await people([...(inc ?? []).map((r) => r.sender_id), ...(out ?? []).map((r) => r.receiver_id)])
    setIncoming((inc ?? []).map((r) => ({ ...r, person: map[r.sender_id] })))
    setOutgoing((out ?? []).map((r) => ({ ...r, person: map[r.receiver_id] })))
  }, [me])

  const loadConvs = useCallback(async () => {
    const { data: mine } = await supabase.from('chat_participants').select('conversation_id').eq('user_id', me)
    const ids = (mine ?? []).map((r) => r.conversation_id as string)
    if (!ids.length) {
      setConvs([])
      setLoading(false)
      return
    }
    const { data: parts } = await supabase.from('chat_participants').select('conversation_id, user_id').in('conversation_id', ids)
    const map = await people([...new Set((parts ?? []).map((p) => p.user_id as string))])
    const list = await Promise.all(
      ids.map(async (id) => {
        const other = (parts ?? []).find((p) => p.conversation_id === id && p.user_id !== me)
        const { data: last } = await supabase.from('chat_messages').select('body, created_at').eq('conversation_id', id).order('created_at', { ascending: false }).limit(1)
        return { id, other: other ? map[other.user_id] ?? { user_id: other.user_id, full_name: null, avatar_url: null } : undefined, last: last?.[0] } as Conv
      }),
    )
    list.sort((a, b) => (b.last?.created_at ?? '').localeCompare(a.last?.created_at ?? ''))
    setConvs(list)
    setLoading(false)
  }, [me])

  useEffect(() => {
    loadConvs()
    loadRequests()
    const ch = supabase
      .channel('v2-chat-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_requests', filter: `receiver_id=eq.${me}` }, () => loadRequests())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_requests', filter: `sender_id=eq.${me}` }, () => { loadRequests(); loadConvs() })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [me, loadConvs, loadRequests])

  useEffect(() => {
    if (!active) return
    let alive = true
    supabase.from('chat_messages').select('id, sender_id, body, created_at').eq('conversation_id', active.id).order('created_at', { ascending: true })
      .then(({ data }) => alive && setMsgs((data ?? []) as Msg[]))
    const ch = supabase
      .channel(`v2-chat-${active.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${active.id}` }, (p) =>
        setMsgs((m) => (m.some((x) => x.id === (p.new as Msg).id) ? m : [...m, p.new as Msg])))
      .subscribe()
    return () => { alive = false; supabase.removeChannel(ch) }
  }, [active])

  useEffect(() => end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), [msgs])

  const send = async () => {
    const body = text.trim()
    if (!active || !body) return
    setText('')
    const { error } = await supabase.from('chat_messages').insert({ conversation_id: active.id, sender_id: me, body })
    if (error) {
      setText(body)
      return toast('Não foi possível enviar a mensagem')
    }
    setConvs((cs) => cs.map((c) => (c.id === active.id ? { ...c, last: { body, created_at: new Date().toISOString() } } : c)))
  }

  const accept = async (r: Req) => {
    const { error } = await supabase.from('chat_requests').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', r.id)
    if (error) return toast(error.message)
    const { data: id, error: e2 } = await supabase.rpc('create_chat_conversation', { _user_id: me, _other_user_id: r.sender_id })
    if (e2) return toast(e2.message)
    toast('Convite aceito')
    await Promise.all([loadRequests(), loadConvs()])
    setActive({ id: id as string, other: r.person })
  }

  const reject = async (r: Req) => {
    const { error } = await supabase.from('chat_requests').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', r.id)
    if (error) return toast(error.message)
    toast('Convite recusado')
    loadRequests()
  }

  const f = filter.trim().toLowerCase()
  const shown = useMemo(() => (f ? convs.filter((c) => nameOf(c.other).toLowerCase().includes(f) || c.last?.body.toLowerCase().includes(f)) : convs), [convs, f])
  const empty = !loading && !shown.length && !incoming.length && !outgoing.length

  return (
    <div className={`card chat ${active ? 'has-active' : ''}`}>
      <aside className="chat-list">
        <div className="chat-list-h">
          <div className="row between">
            <b style={{ fontSize: 15 }}>Mensagens</b>
            <button className="btn sm primary" onClick={() => setNewOpen(true)}><Plus /> Nova</button>
          </div>
          <div className="input-affix" style={{ marginTop: 12 }}>
            <span><Search size={14} style={{ verticalAlign: -2 }} /></span>
            <input className="input" style={{ height: 36, paddingLeft: 36 }} placeholder="Buscar conversa" value={filter} onChange={(e) => setFilter(e.target.value)} />
          </div>
        </div>
        <div className="chat-scroll">
          {loading && <div className="tiny faint" style={{ padding: 20 }}>Carregando…</div>}
          {empty && <Empty icon={<MessagesSquare size={20} />} title={f ? 'Nada encontrado' : 'Nenhuma conversa'}>{!f && 'Clique em “Nova” para convidar alguém.'}</Empty>}
          {incoming.map((r) => (
            <div key={r.id} className="chat-row req">
              <Avatar p={r.person} tone="var(--amber)" />
              <div className="chat-row-t">
                <b>{nameOf(r.person)}</b>
                <span className="tiny" style={{ color: 'var(--amber)' }}><UserPlus size={11} style={{ verticalAlign: -1 }} /> quer conversar com você</span>
              </div>
              <button className="icon-btn" title="Aceitar" style={{ color: 'var(--up)' }} onClick={() => accept(r)}><Check /></button>
              <button className="icon-btn" title="Recusar" style={{ color: 'var(--down)' }} onClick={() => reject(r)}><X /></button>
            </div>
          ))}
          {shown.map((c) => (
            <button key={c.id} className={`chat-row ${active?.id === c.id ? 'on' : ''}`} onClick={() => setActive(c)}>
              <Avatar p={c.other} />
              <div className="chat-row-t">
                <b>{nameOf(c.other)}</b>
                <span className="tiny faint">{c.last?.body ?? 'Sem mensagens ainda'}</span>
              </div>
              {c.last && <span className="tiny faint" style={{ flex: 'none' }}>{ddmm(c.last.created_at)}</span>}
            </button>
          ))}
          {outgoing.map((r) => (
            <div key={r.id} className="chat-row" style={{ opacity: 0.7 }}>
              <Avatar p={r.person} tone="var(--text-3)" />
              <div className="chat-row-t">
                <b>{nameOf(r.person)}</b>
                <span className="tiny faint"><Clock size={11} style={{ verticalAlign: -1 }} /> aguardando aceite</span>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <section className="chat-thread">
        {active ? (
          <>
            <header className="chat-thread-h">
              <button className="icon-btn chat-back" onClick={() => setActive(null)} aria-label="Voltar"><ArrowLeft /></button>
              <Avatar p={active.other} size={34} />
              <b>{nameOf(active.other)}</b>
            </header>
            <div className="chat-msgs">
              {!msgs.length && <div className="tiny faint" style={{ textAlign: 'center', padding: 40 }}>Envie a primeira mensagem.</div>}
              {msgs.map((m, i) => {
                const mine = m.sender_id === me
                const dayChange = i === 0 || new Date(msgs[i - 1].created_at).toDateString() !== new Date(m.created_at).toDateString()
                return (
                  <div key={m.id}>
                    {dayChange && <div className="chat-day">{new Date(m.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</div>}
                    <div className={`bubble ${mine ? 'me' : ''}`}>
                      <p>{m.body}</p>
                      <span>{hhmm(m.created_at)}</span>
                    </div>
                  </div>
                )
              })}
              <div ref={end} />
            </div>
            <div className="chat-compose">
              <textarea
                className="textarea"
                rows={1}
                maxLength={2000}
                placeholder="Escreva uma mensagem…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              />
              <button className="btn primary" disabled={!text.trim()} onClick={send} aria-label="Enviar"><Send /></button>
            </div>
          </>
        ) : (
          <div className="chat-idle">
            <Empty icon={<MessagesSquare size={20} />} title="Suas mensagens">Escolha uma conversa ao lado ou comece uma nova.</Empty>
          </div>
        )}
      </section>

      <NewChat
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onPick={async (uid) => {
          const existing = convs.find((c) => c.other?.user_id === uid)
          if (existing) {
            setActive(existing)
            setNewOpen(false)
            return toast('Esse contato já está nas suas conversas')
          }
          const { data: prev } = await supabase.from('chat_requests').select('id, status').or(`and(sender_id.eq.${me},receiver_id.eq.${uid}),and(sender_id.eq.${uid},receiver_id.eq.${me})`).limit(1)
          if (prev?.length) {
            toast(prev[0].status === 'pending' ? 'Convite já enviado' : 'Esse contato já está nas suas conversas')
            if (prev[0].status === 'accepted') loadConvs()
            setNewOpen(false)
            return
          }
          const { error } = await supabase.from('chat_requests').insert({ sender_id: me, receiver_id: uid })
          if (error) return toast(error.message)
          toast('Convite enviado')
          loadRequests()
          setNewOpen(false)
        }}
      />
    </div>
  )
}

function NewChat({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (uid: string) => void }) {
  const [q, setQ] = useState('')
  const [res, setRes] = useState<{ user_id: string; full_name: string | null; email: string }[] | null>(null)
  const [busy, setBusy] = useState(false)
  const search = async () => {
    if (q.trim().length < 3) return
    setBusy(true)
    const { data, error } = await supabase.rpc('search_chat_users', { _query: q.trim() })
    setRes(error ? [] : (data ?? []).map((d: { user_id: string; full_name: string | null; email?: string; whatsapp_phone?: string }) => ({ user_id: d.user_id, full_name: d.full_name, email: d.email || d.whatsapp_phone || '' })))
    setBusy(false)
  }
  return (
    <Modal open={open} onClose={onClose}>
      <h3>Nova conversa</h3>
      <p className="small muted" style={{ margin: '0 0 16px' }}>Busque por nome, e-mail ou WhatsApp. A pessoa recebe um convite para conversar.</p>
      <div className="row gap-8">
        <input className="input" autoFocus placeholder="Mínimo de 3 letras" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
        <button className="btn primary" disabled={busy || q.trim().length < 3} onClick={search}><Search /></button>
      </div>
      <div className="stack" style={{ marginTop: 12, maxHeight: 280, overflowY: 'auto' }}>
        {busy && <div className="tiny faint" style={{ padding: 12 }}>Buscando…</div>}
        {!busy && res?.length === 0 && <div className="tiny faint" style={{ padding: 12, textAlign: 'center' }}>Nenhum usuário encontrado.</div>}
        {res?.map((u) => (
          <button key={u.user_id} className="chat-row" onClick={() => onPick(u.user_id)}>
            <Avatar p={{ user_id: u.user_id, full_name: u.full_name, avatar_url: null }} size={34} />
            <div className="chat-row-t"><b>{u.full_name || 'Sem nome'}</b>{u.email && <span className="tiny faint">{u.email}</span>}</div>
            <UserPlus size={15} className="faint" />
          </button>
        ))}
      </div>
    </Modal>
  )
}
