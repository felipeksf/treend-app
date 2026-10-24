import { ART } from '../pages/Modos'
import type { ClassKey } from '../lib/classes'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, ArrowRight, BookOpen, Check, X } from 'lucide-react'
import { TreendLogo } from './ui'

/* "Playbook Treend": a chaptered popup explaining the Treend method — quantitative timing —
   and how it differs from (and complements) fundamental analysis. */

type Ch = { k: string; t: string; body: React.ReactNode }

const Zone = ({ c, r, l, d }: { c: string; r: string; l: string; d: string }) => (
  <div className="pb-zone"><span style={{ background: c }} /><b className="mono">{r}</b><div><b>{l}</b><div className="small muted">{d}</div></div></div>
)

const CHAPTERS: Ch[] = [
  {
    k: '01', t: 'O que é a Treend',
    body: (<>
      <h2>Timing <span className="serif">quantitativo.</span></h2>
      <p className="pb-lead">A Treend não tenta adivinhar o futuro nem dizer qual ativo é “bom”. Ela mede, com estatística, <b>quão esticado ou descontado o preço está agora</b> — e transforma isso em um índice simples de 0 a 100.</p>
      <div className="pb-stat"><b className="mono">+2.000h</b><span>Algoritmos treinados em <b>mais de 2.000 horas de análises</b> de mercado — o método por trás de cada índice Treend.</span></div>
      <div className="pb-grid">
        <div className="pb-card"><b>Mede</b><span>A distância do preço em relação ao seu próprio comportamento recente, em cada tempo gráfico.</span></div>
        <div className="pb-card"><b>Compara</b><span>Cinco janelas ao mesmo tempo — 1h, 4h, diário, semanal e mensal — para separar ruído de tendência.</span></div>
        <div className="pb-card"><b>Avisa</b><span>Radares monitoram 24/7 e avisam quando o ativo entra na zona que você definiu.</span></div>
      </div>
    </>),
  },
  {
    k: '02', t: 'Treend × fundamentalista',
    body: (<>
      <h2>O que comprar <span className="serif">× quando agir.</span></h2>
      <p className="pb-lead">São perguntas diferentes. Uma não substitui a outra — elas se completam.</p>
      <div className="pb-vs">
        <div className="pb-vs-col">
          <div className="pb-vs-h">Análise fundamentalista</div>
          <ul>
            <li><b>Pergunta:</b> o que comprar?</li>
            <li><b>Olha para:</b> balanços, lucro, múltiplos (P/L, P/VP), dividendos, dívida, valor justo</li>
            <li><b>Horizonte:</b> anos</li>
            <li><b>Ritmo:</b> trimestral, a cada balanço</li>
            <li><b>Resposta:</b> “esta empresa vale mais do que custa”</li>
          </ul>
        </div>
        <div className="pb-vs-col on">
          <div className="pb-vs-h">Treend · timing quantitativo</div>
          <ul>
            <li><b>Pergunta:</b> quando agir?</li>
            <li><b>Olha para:</b> o comportamento estatístico do preço em cada tempo gráfico</li>
            <li><b>Horizonte:</b> de horas a meses, você escolhe a janela</li>
            <li><b>Ritmo:</b> contínuo, atualizado em minutos</li>
            <li><b>Resposta:</b> “agora o preço está descontado (ou esticado) nesta janela”</li>
          </ul>
        </div>
      </div>
      <div className="pb-quote">O fundamento escolhe o ativo. <b>A Treend escolhe o momento.</b></div>
    </>),
  },
  {
    k: '03', t: 'Como ler o índice',
    body: (<>
      <h2>Um número, <span className="serif">cinco zonas.</span></h2>
      <p className="pb-lead">Quanto maior o índice, mais descontado o preço está naquela janela — e mais rara é a situação.</p>
      <div className="stack gap-8">
        <Zone c="var(--up)" r="90+" l="Oportunidade forte" d="Desconto estatisticamente raro. Melhor assimetria para comprar." />
        <Zone c="#5fbf8f" r="70–89" l="Oportunidade" d="Preço abaixo do comportamento usual. Bom ponto para começar a montar posição." />
        <Zone c="var(--amber)" r="45–69" l="Neutro" d="Sem vantagem clara. Paciência ou entrada escalonada." />
        <Zone c="var(--orange)" r="21–44" l="Atenção" d="Preço já subiu na janela. Comprar aqui exige mais convicção." />
        <Zone c="var(--down)" r="≤ 20" l="Esticado" d="Preço esticado. Momento de cautela para compra — e favorável para quem vende." />
      </div>
    </>),
  },
  {
    k: '04', t: 'Tempos gráficos',
    body: (<>
      <h2>Contexto <span className="serif">e gatilho.</span></h2>
      <p className="pb-lead">Cada janela responde a um horizonte diferente. A leitura mais forte é quando várias janelas concordam.</p>
      <div className="pb-grid">
        <div className="pb-card"><b>Mensal e semanal</b><span>O contexto. Dizem se o ativo está caro ou barato no ciclo maior.</span></div>
        <div className="pb-card"><b>Diário</b><span>A decisão. É a janela principal para quem monta posição.</span></div>
        <div className="pb-card"><b>4h e 1h</b><span>O gatilho. Ajudam a refinar o ponto de entrada no curto prazo.</span></div>
      </div>
      <div className="pb-quote">Semanal em oportunidade + diário em oportunidade + 1h virando = <b>alinhamento de janelas</b>.</div>
    </>),
  },
  {
    k: '05', t: 'Por classe de ativos',
    body: (<>
      <h2>O mesmo método, <span className="serif">nuances diferentes.</span></h2>
      <div className="pb-modes">
        {([
          ['b3', 'Ações B3 · Stocks', 'Use o fundamento para escolher a empresa e a Treend para o momento. Em Stocks, o resultado em reais também depende do dólar.', '🇧🇷 🇺🇸'],
          ['fx', 'Câmbio', 'Quem compra moeda (importador, viagem) busca índice alto; quem vende (exportador, renda global) aproveita a moeda esticada.', 'R$'],
          ['crypto', 'Cripto', 'Mercado 24/7 e volátil: as janelas curtas mudam rápido, as longas dão o contexto.', '₿'],
          ['fii', 'FIIs', 'Índice lido junto com o P/VP — aqui o timing encontra o fundamento: índice alto com P/VP abaixo de 1 é a assimetria mais interessante.', '🏢'],
          ['commod', 'Commodities', 'Contratos futuros contínuos, com leitura principal no diário. Úteis para quem compra insumos ou investe.', '🛢️'],
        ] as [ClassKey, string, string, string][]).map(([k, t, d, e]) => (
          <div key={k} className="pb-mode" style={{ background: k === 'b3' ? `linear-gradient(145deg, #0b3d2e 0%, #10a36e 55%, #2453e0 130%)` : ART[k] }}>
            <span className="pb-mode-emoji">{e}</span>
            <b>{t}</b>
            <span>{d}</span>
          </div>
        ))}
      </div>
    </>),
  },
  {
    k: '06', t: 'O playbook na prática',
    body: (<>
      <h2>Quatro passos <span className="serif">para cada decisão.</span></h2>
      <ol className="pb-steps">
        <li><span>1</span><div><b>Escolha o ativo</b><p>Pela sua tese, necessidade (pagar um fornecedor, receber do exterior) ou análise fundamentalista.</p></div></li>
        <li><span>2</span><div><b>Leia as janelas</b><p>Abra o ativo em Analisar ativo ou no mapa de calor e veja onde está o índice em cada tempo gráfico.</p></div></li>
        <li><span>3</span><div><b>Defina o gatilho</b><p>Se ainda não é o momento, crie um radar: a Treend monitora 24/7 e avisa quando a zona chegar.</p></div></li>
        <li><span>4</span><div><b>Execute em partes e registre</b><p>Escalone a entrada conforme a força do índice e salve no Histórico para acompanhar o resultado.</p></div></li>
      </ol>
      <p className="tiny faint" style={{ marginTop: 18 }}>A Treend não faz recomendação de investimento. As leituras são estatísticas e indicativas; a decisão final é sempre sua.</p>
    </>),
  },
]

const SEEN = 'treend-v2-playbook-seen'
export const playbookSeen = () => { try { return localStorage.getItem(SEEN) === '1' } catch { return true } }

export default function Playbook({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0)
  const close = () => { try { localStorage.setItem(SEEN, '1') } catch { /* ignore */ } onClose() }
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') setI((x) => Math.min(CHAPTERS.length - 1, x + 1)); if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1)) }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  })
  const last = i === CHAPTERS.length - 1
  return createPortal(
    <div className="overlay pb-overlay" onMouseDown={close}>
      <div className="pb" onMouseDown={(e) => e.stopPropagation()}>
        <aside className="pb-side">
          <TreendLogo size={28} light />
          <div className="pb-kicker"><BookOpen size={13} /> Playbook Treend</div>
          <nav>
            {CHAPTERS.map((c, n) => (
              <button key={c.k} className={n === i ? 'on' : n < i ? 'done' : ''} onClick={() => setI(n)}>
                <span className="mono">{n < i ? <Check size={12} /> : c.k}</span>{c.t}
              </button>
            ))}
          </nav>
        </aside>
        <section className="pb-main">
          <button className="icon-btn pb-x" onClick={close} aria-label="Fechar"><X /></button>
          <div className="pb-progress"><i style={{ width: `${((i + 1) / CHAPTERS.length) * 100}%` }} /></div>
          <div className="pb-ch mono">Capítulo {CHAPTERS[i].k} · {CHAPTERS[i].t}</div>
          <div className="pb-body" key={i}>{CHAPTERS[i].body}</div>
          <div className="pb-foot">
            <button className="btn ghost" disabled={i === 0} onClick={() => setI(i - 1)}><ArrowLeft /> Anterior</button>
            <span className="tiny faint mono">{i + 1} / {CHAPTERS.length}</span>
            {last ? <button className="btn primary" onClick={close}>Entendi <Check /></button> : <button className="btn primary" onClick={() => setI(i + 1)}>Próximo <ArrowRight /></button>}
          </div>
        </section>
      </div>
    </div>,
    document.body,
  )
}

/** Button that opens the playbook; auto-opens once on the first visit to a heatmap. */
export function PlaybookButton({ auto = false }: { auto?: boolean }) {
  const [open, setOpen] = useState(() => auto && !playbookSeen())
  return (<>
    <button className="btn sm pb-btn" onClick={() => setOpen(true)}><BookOpen /> Playbook Treend</button>
    {open && <Playbook onClose={() => setOpen(false)} />}
  </>)
}
