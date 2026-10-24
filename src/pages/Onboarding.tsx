import LangPicker from '../components/LangPicker'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BarChart3, Bell, Calculator, CalendarDays, FlaskConical, Grid3x3, Moon, Radar, ScrollText, Sparkles, Sun, MessageCircle, type LucideIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { TreendLogo, Toaster, toast } from '../components/ui'

/* Same order and copy as the classic onboarding (11 steps), ending with theme + WhatsApp (profiles.whatsapp_phone). */
type Step = { icon: LucideIcon; title: string; body: string; kind?: 'theme' | 'whatsapp' }
const STEPS: Step[] = [
  { icon: Sparkles, title: 'Bem-vindo à Treend!', body: 'Somos seu consultor de timing cambial. Trazemos estatísticas de cenários de câmbio para apoiar as suas decisões.\n\nImportante: não fazemos nenhuma espécie de recomendação financeira.' },
  { icon: Grid3x3, title: 'Entenda o Mapa de Calor', body: 'O Mapa de Calor traz cenários atualizados de Dólar, Euro e Libra. Escolha o seu perfil (Importador, Exportador, Agente de Turismo ou Renda Global), a moeda e a janela em que você decide.\n\nVerde indica boas probabilidades. Vermelho indica que talvez não seja um bom momento. A decisão final é sempre sua.' },
  { icon: BarChart3, title: 'Entenda o CMP', body: 'O CMP mostra como o câmbio influencia o custo dos produtos da sua operação. Informe o custo de compra, a quantidade e os custos adicionais.\n\nA Treend combina esses dados com os cenários de cada moeda e janela para projetar o impacto no custo e a economia cambial.' },
  { icon: ScrollText, title: 'Reports e Cotações', body: 'Toda semana você recebe um Report Semanal com a análise completa do cenário: o que aconteceu, o que esperar e o impacto no seu perfil. No fim de cada mês, um Report Mensal consolida os principais movimentos.\n\nAlém disso, você acompanha cotações atualizadas direto no app.' },
  { icon: Bell, title: 'Alerta de Preços', body: 'Receba alertas de preço do dólar e do euro na palma da mão. Configure se quer ser avisado quando a moeda estiver mais cara ou mais barata e pare de ter dúvidas sobre a cotação.' },
  { icon: Radar, title: 'Radar Inteligente', body: 'Um radar 24 horas por dia que avisa quando o dólar ou o euro estão caros ou baratos para o seu objetivo — com notificações por e-mail 100% personalizadas.' },
  { icon: CalendarDays, title: 'Agenda de Eventos', body: 'Um calendário completo com os eventos macroeconômicos que movem o câmbio: reuniões de bancos centrais, indicadores, vencimentos e muito mais. Planeje-se com antecedência.' },
  { icon: Calculator, title: 'Use a Calculadora', body: 'Simule quanto você pode economizar operando no timing certo. Registre suas decisões e acompanhe a economia acumulada — para precificar melhor, negociar com fornecedores e perder menos com spread.' },
  { icon: FlaskConical, title: 'Simulador em Tempo Real', body: 'Simule suas operações por volatilidade, spread ou centavos e tenha uma projeção imediata de ganhos e perdas. Tudo fica registrado no seu histórico.' },
  { icon: Sun, title: 'Escolha seu tema', body: 'Como você prefere usar a Treend? Você pode alterar isso a qualquer momento.', kind: 'theme' },
  { icon: MessageCircle, title: 'Receba alertas no WhatsApp', body: 'Cadastre seu número para receber cotações diárias e reports semanais direto no WhatsApp.', kind: 'whatsapp' },
]

const mask = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d ? `(${d}` : ''
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export const ONBOARDED_KEY = 'treend-v2-onboarded'

export default function Onboarding() {
  const { session, loading } = useAuth()
  const nav = useNavigate()
  const [i, setI] = useState(0)
  const [theme, setTheme] = useState(() => localStorage.getItem('treend-v2-theme') || 'light')
  const [ddi, setDdi] = useState('55')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)

  if (loading) return null
  const preview = import.meta.env.DEV && localStorage.getItem('treend-v2-preview-admin') === '1'
  if (!session && !preview) return <Navigate to="/login" replace />

  const step = STEPS[i]
  const last = i === STEPS.length - 1
  const finish = () => {
    try { localStorage.setItem(ONBOARDED_KEY, '1') } catch { /* ignore */ }
    nav('/', { replace: true })
  }
  const pickTheme = (t: string) => {
    setTheme(t)
    document.documentElement.dataset.theme = t
    try { localStorage.setItem('treend-v2-theme', t) } catch { /* ignore */ }
  }
  const saveWhatsapp = async () => {
    const n = phone.replace(/\D/g, '')
    const c = ddi.replace(/\D/g, '')
    if (n.length < 10 || n.length > 11) return toast('Informe DDD + número com 10 ou 11 dígitos.')
    if (!c) return toast('Informe o código do país (ex.: 55 para Brasil).')
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ whatsapp_phone: `${c}${n}` }).eq('user_id', session!.user.id)
    setSaving(false)
    if (error) return toast(error.message)
    toast('WhatsApp cadastrado')
    finish()
  }

  return (
    <div className="auth onb2" style={{ position: 'relative' }}>
      <div className="auth-lang"><LangPicker /></div>
      <section className="auth-art">
        <TreendLogo size={36} light />
        <svg className="orbit hide-m" viewBox="0 0 560 560" fill="none" aria-hidden>
          {[260, 200, 140, 80].map((r, n) => (
            <circle key={r} cx="280" cy="280" r={r} stroke="rgba(255,255,255,0.07)" strokeDasharray={n % 2 ? '2 6' : undefined} />
          ))}
          <circle cx="280" cy="280" r="6" fill="#8aa2ff" />
          {[0, 1, 2].map((n) => (
            <g key={n} style={{ transformOrigin: '280px 280px', animation: `spin ${24 + n * 14}s linear infinite` }}>
              <circle cx={280 + [260, 200, 140][n]} cy="280" r="4" fill={['#8aa2ff', '#ffffff', '#c9d5ff'][n]} />
            </g>
          ))}
          <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
        </svg>
        <div style={{ maxWidth: 520 }}>
          <h2>Mais contexto, <span className="serif">desde o primeiro passo.</span></h2>
          <p style={{ color: '#c3cfe6', fontSize: 16, maxWidth: 420, marginTop: 20 }}>Conheça as ferramentas que apoiam suas decisões de câmbio — em menos de dois minutos.</p>
        </div>
        <div className="tiny" style={{ color: '#8fa3c7' }}>A Treend não faz recomendação cambial ou financeira.</div>
      </section>

      <section className="onb-side">
        <div className="onb-side-top">
          <span className="small muted mono">{String(i + 1).padStart(2, '0')} / {STEPS.length}</span>
          <button className="btn ghost sm" onClick={finish}>Pular por agora</button>
        </div>
        <div className="onb-progress" aria-label={`Passo ${i + 1} de ${STEPS.length}`}>
          {STEPS.map((_, n) => <i key={n} className={n <= i ? 'on' : ''} />)}
        </div>

        <div className="onb-copy" key={i}>
          <div className="onb-step-icon"><step.icon size={26} strokeWidth={1.8} /></div>
          <div className="onb-kicker">{i === 0 ? 'Seus primeiros passos' : 'Conheça a Treend'}</div>
          <h1>{step.title}</h1>
          {step.body.split('\n\n').map((p, n) => <p key={n}>{p}</p>)}

          {step.kind === 'theme' && (
            <div className="onb-themes">
              {[{ v: 'light', l: 'Modo claro', I: Sun }, { v: 'dark', l: 'Modo escuro', I: Moon }].map((t) => (
                <button key={t.v} className={`onb-theme ${theme === t.v ? 'on' : ''} ${t.v}`} onClick={() => pickTheme(t.v)}>
                  <span className="onb-theme-prev"><i /><i /><i /></span>
                  <span className="row gap-8"><t.I size={16} />{t.l}</span>
                </button>
              ))}
            </div>
          )}

          {step.kind === 'whatsapp' && (
            <div className="stack gap-12" style={{ maxWidth: 420, marginTop: 8 }}>
              <label className="small muted">WhatsApp com DDI + DDD</label>
              <div className="row gap-8">
                <div className="input-affix" style={{ width: 96, flex: 'none' }}><span>+</span><input className="input" style={{ paddingLeft: 28 }} inputMode="numeric" value={ddi} onChange={(e) => setDdi(e.target.value.replace(/\D/g, '').slice(0, 4))} /></div>
                <input className="input" inputMode="tel" placeholder="(11) 91234-5678" value={phone} onChange={(e) => setPhone(mask(e.target.value))} />
              </div>
              <span className="tiny faint">Brasil = +55. Para outros países, informe o DDI correspondente.</span>
            </div>
          )}
        </div>

        <div className="onb-actions">
          {i > 0 && <button className="btn" onClick={() => setI(i - 1)}><ArrowLeft /> Voltar</button>}
          {last ? (
            <>
              <button className="btn ghost" onClick={finish}>Pular por agora</button>
              <button className="btn primary lg" disabled={saving} onClick={saveWhatsapp}>{saving ? 'Salvando…' : 'Concluir'} <ArrowRight /></button>
            </>
          ) : (
            <button className="btn primary lg" onClick={() => setI(i + 1)}>{i === 0 ? 'Começar' : 'Próximo'} <ArrowRight /></button>
          )}
        </div>
      </section>
      <Toaster />
    </div>
  )
}
