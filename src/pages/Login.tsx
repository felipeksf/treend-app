import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { TreendLogo } from '../components/ui'
import { useQuotes } from '../lib/rates'
import { num } from '../lib/format'

export default function Login() {
  const { session } = useAuth()
  const { data: q } = useQuotes()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  if (session) return <Navigate to="/" replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setErr(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message)
    else nav('/')
  }

  const google = () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })

  return (
    <div className="auth">
      <section className="auth-art">
        <TreendLogo size={36} light />

        <svg className="orbit hide-m" viewBox="0 0 560 560" fill="none" aria-hidden>
          {[260, 200, 140, 80].map((r, i) => (
            <circle key={r} cx="280" cy="280" r={r} stroke="rgba(255,255,255,0.07)" strokeDasharray={i % 2 ? '2 6' : undefined} />
          ))}
          <circle cx="280" cy="280" r="6" fill="#8aa2ff">
            <animate attributeName="r" values="6;9;6" dur="3s" repeatCount="indefinite" />
          </circle>
          {[0, 1, 2].map((i) => (
            <g key={i} style={{ transformOrigin: '280px 280px', animation: `spin ${24 + i * 14}s linear infinite` }}>
              <circle cx={280 + [260, 200, 140][i]} cy="280" r="4" fill={['#8aa2ff', '#ffffff', '#c9d5ff'][i]} />
            </g>
          ))}
          <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
        </svg>

        <div style={{ maxWidth: 560 }}>
          <h2>
            Decida o câmbio com <span className="serif">contexto,</span> não com sorte.
          </h2>
          <p style={{ color: '#c3cfe6', fontSize: 16, maxWidth: 440, marginTop: 20 }}>
            Leituras em tempo real, projeções por perfil e alertas automáticos — o aliado que importadores, exportadores e viajantes usam para escolher o momento certo.
          </p>
        </div>

        <div className="row gap-24 wrap" style={{ fontSize: 13 }}>
          {['USD', 'EUR', 'GBP', 'BTC'].map((c) =>
            q?.[c] ? (
              <div key={c} className="stack gap-4">
                <span style={{ color: '#8fa3c7', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{q[c].short}</span>
                <span className="mono" style={{ fontSize: 17 }}>
                  {q[c].prefix} {num(q[c].bid, c === 'BTC' ? 0 : 4)}
                </span>
                <span className="mono" style={{ color: q[c].pctChange >= 0 ? '#7ff0c6' : '#ff8a96', fontSize: 12 }}>
                  {q[c].pctChange >= 0 ? '+' : ''}
                  {num(q[c].pctChange, 2)}%
                </span>
              </div>
            ) : null,
          )}
        </div>
      </section>

      <section className="auth-form">
        <div>
          <h1 style={{ fontSize: 30, letterSpacing: '-0.035em', margin: '0 0 6px', fontWeight: 600 }}>Bem-vindo de volta</h1>
          <p className="muted" style={{ margin: '0 0 28px' }}>Entre para acessar sua inteligência Treend.</p>

          <button className="btn lg" style={{ width: '100%' }} onClick={google}>
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
            </svg>
            Continuar com Google
          </button>

          <div className="row" style={{ margin: '22px 0', gap: 12 }}>
            <hr className="divider" style={{ flex: 1, margin: 0 }} />
            <span className="tiny faint">ou com e-mail</span>
            <hr className="divider" style={{ flex: 1, margin: 0 }} />
          </div>

          <form onSubmit={submit} className="stack gap-16">
            <div className="field">
              <label>E-mail</label>
              <div className="input-affix">
                <span><Mail size={15} /></span>
                <input className="input" style={{ fontFamily: 'var(--font)' }} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" />
              </div>
            </div>
            <div className="field">
              <div className="row between">
                <label>Senha</label>
                <a className="tiny" style={{ color: 'var(--brand)' }} href="https://app.treend.com.br/forgot-password" target="_blank" rel="noreferrer">Esqueceu?</a>
              </div>
              <div className="input-affix">
                <span><Lock size={15} /></span>
                <input className="input" style={{ fontFamily: 'var(--font)', paddingRight: 44 }} type={show ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                <button type="button" className="icon-btn" style={{ position: 'absolute', right: 4, top: 4 }} onClick={() => setShow(!show)} aria-label="Mostrar senha">
                  {show ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>
            {err && <div className="small down">{err}</div>}
            <button className="btn primary lg" disabled={busy} type="submit">
              {busy ? 'Entrando…' : 'Entrar na plataforma'} <ArrowRight />
            </button>
          </form>

          <p className="tiny faint" style={{ marginTop: 32, textAlign: 'center' }}>
            Ainda não tem acesso? <a href="https://treend.com.br" style={{ color: 'var(--text)' }}>Fale com a Treend ↗</a>
          </p>
        </div>
      </section>
    </div>
  )
}
