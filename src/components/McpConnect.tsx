import { useState } from 'react'
import { Bot, Check, Copy, ExternalLink, Link2 } from 'lucide-react'
import { Hint, toast } from './ui'

/* Step-by-step connection of the Treend MCP server to ChatGPT, Claude, Gemini and custom agents. */

export const MCP_URL = (import.meta.env.VITE_MCP_URL as string | undefined) || 'https://mcp.treend.com.br'
const LINK_KEY = 'treend-v2-mcp-link'
const PLACEHOLDER = `${MCP_URL}/mcp/SEU_LINK_PESSOAL`

const copy = async (t: string) => { try { await navigator.clipboard.writeText(t); toast('Copiado') } catch { toast('Não foi possível copiar') } }

function Code({ children }: { children: string }) {
  return (
    <div className="mcp-code">
      <pre>{children}</pre>
      <button className="icon-btn" title="Copiar" onClick={() => copy(children)}><Copy /></button>
    </div>
  )
}

/** Brand logo of each AI assistant (agents use a generic bot icon). */
const AIS: { key: 'gpt' | 'claude' | 'gemini' | 'grok' | 'agents'; id: string; name: string; desc: string; bg: string }[] = [
  { key: 'gpt', id: 'chatgpt', name: 'ChatGPT', desc: 'Conector · modo dev', bg: 'linear-gradient(150deg, #0d0d0d 0%, #10a37f 140%)' },
  { key: 'claude', id: 'claude', name: 'Claude', desc: 'Conector remoto', bg: 'linear-gradient(150deg, #1f1410 0%, #d97757 140%)' },
  { key: 'gemini', id: 'gemini', name: 'Gemini', desc: 'Gemini CLI', bg: 'linear-gradient(150deg, #0b1230 0%, #4285f4 90%, #9b72cb 140%)' },
  { key: 'grok', id: 'grok', name: 'Grok', desc: 'API xAI · MCP', bg: 'linear-gradient(150deg, #000 0%, #3a3a3a 140%)' },
  { key: 'agents', id: 'agents', name: 'Agentes', desc: 'Streamable HTTP', bg: 'linear-gradient(150deg, #0b1640 0%, #2453e0 140%)' },
]

export function AiLogo({ id, size = 18 }: { id: string; size?: number }) {
  if (id === 'agents') return <Bot size={size} style={{ color: '#2453e0' }} />
  return <img className="ai-logo" src={`/ai/${id}.png`} alt="" width={size} height={size} />
}
export const AiLabel = ({ id, name }: { id: string; name: string }) => <span className="row gap-6" style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><AiLogo id={id} size={16} />{name}</span>

const Steps = ({ items }: { items: React.ReactNode[] }) => (
  <ol className="mcp-steps">{items.map((s, i) => <li key={i}><span>{i + 1}</span><div>{s}</div></li>)}</ol>
)

export default function McpConnect() {
  const [tab, setTab] = useState<'gpt' | 'claude' | 'gemini' | 'grok' | 'agents'>('claude')
  const [link, setLink] = useState(() => { try { return localStorage.getItem(LINK_KEY) || '' } catch { return '' } })
  const valid = /^https:\/\/\S+\/mcp\/tr_[A-Za-z0-9_-]{10,}$/.test(link.trim())
  const url = valid ? link.trim() : PLACEHOLDER
  const save = (v: string) => { setLink(v); try { localStorage.setItem(LINK_KEY, v.trim()) } catch { /* ignore */ } }

  return (
    <div className="card">
      <div className="card-h"><h3><Link2 /> Conecte na sua IA<Hint text="Seu link pessoal é enviado pelo time Treend por e-mail após a aprovação do acesso. Cole-o abaixo para gerar as instruções exatas." /></h3></div>
      <div className="card-b stack gap-16">
        <div className="field">
          <label>Seu link pessoal do Treend MCP</label>
          <div className="row gap-8">
            <input className="input" placeholder={PLACEHOLDER} value={link} onChange={(e) => save(e.target.value)} />
            {valid && <button className="btn" onClick={() => copy(url)}><Copy /> Copiar</button>}
          </div>
          <span className="tiny" style={{ color: link && !valid ? 'var(--down)' : 'var(--text-3)' }}>
            {link && !valid ? 'Link inválido — confira o link recebido por e-mail.' : valid ? <><Check size={12} style={{ verticalAlign: -2 }} /> Pronto: as instruções abaixo já usam o seu link.</> : 'Ainda não tem? Solicite acesso ao lado — o link chega por e-mail.'}
          </span>
        </div>

        <div className="ai-tiles" role="tablist">
          {AIS.map((x) => (
            <button key={x.key} role="tab" aria-selected={tab === x.key} className={`ai-tile ${tab === x.key ? 'on' : ''}`} style={{ background: x.bg }} onClick={() => setTab(x.key)}>
              <span className="ai-tile-logo"><AiLogo id={x.id} size={26} /></span>
              <span className="ai-tile-name">{x.name}</span>
              <span className="ai-tile-desc">{x.desc}</span>
              {tab === x.key && <span className="ai-tile-check"><Check size={13} /></span>}
            </button>
          ))}
        </div>

        {tab === 'gpt' && (
          <Steps items={[
            <>No ChatGPT, abra <b>Configurações → Apps e conectores → Avançado</b> e ative o <b>Modo desenvolvedor</b>.</>,
            <>Em <b>Apps e conectores</b>, clique em <b>Criar</b> (novo conector).</>,
            <>Nome: <b>Treend</b>. URL do servidor MCP:<Code>{url}</Code>Autenticação: <b>Sem autenticação</b> (o link já é pessoal).</>,
            <>Em uma conversa, ative o conector <b>Treend</b> e pergunte, por exemplo: “Quais as 5 maiores índices Treend em Ações B3 hoje?”.</>,
            <span className="small muted">Conectores personalizados exigem um plano do ChatGPT que permita o modo desenvolvedor.</span>,
          ]} />
        )}
        {tab === 'claude' && (
          <Steps items={[
            <>No Claude (web ou app), abra <b>Configurações → Conectores</b>.</>,
            <>Clique em <b>Adicionar conector personalizado</b>.</>,
            <>Nome: <b>Treend</b>. URL do servidor MCP remoto:<Code>{url}</Code></>,
            <>Salve, ative o conector <b>Treend</b> na conversa e pergunte: “Analise PETR4 em todos os tempos gráficos”.</>,
            <span className="small muted">Conectores personalizados estão disponíveis nos planos pagos do Claude.</span>,
          ]} />
        )}
        {tab === 'gemini' && (
          <Steps items={[
            <>Instale o <b>Gemini CLI</b> (ferramenta oficial do Google que aceita servidores MCP).</>,
            <>Abra o arquivo <code>~/.gemini/settings.json</code> e adicione:<Code>{JSON.stringify({ mcpServers: { treend: { httpUrl: url } } }, null, 2)}</Code></>,
            <>Inicie o Gemini CLI, digite <code>/mcp</code> para confirmar a conexão e pergunte: “Visão geral do mercado de cripto hoje”.</>,
          ]} />
        )}
        {tab === 'grok' && (
          <Steps items={[
            <>O Grok aceita servidores MCP remotos pela <b>API da xAI</b> (ferramenta <code>mcp</code> nas chamadas ao modelo).</>,
            <>Crie uma chave em <b>console.x.ai</b> e inclua a Treend como ferramenta remota:<Code>{JSON.stringify({ model: 'grok-4', tools: [{ type: 'mcp', server_label: 'treend', server_url: url }], input: 'Quais as 5 maiores índices Treend em Ações B3 hoje?' }, null, 2)}</Code></>,
            <>O Grok chama as ferramentas da Treend (<b>analisar_ativo</b>, <b>ranking_oportunidades</b>…) e responde com os índices na conversa.</>,
            <span className="small muted">Conexão via API: o app do Grok (grok.com) ainda não permite adicionar conectores MCP personalizados.</span>,
          ]} />
        )}
        {tab === 'agents' && (
          <Steps items={[
            <>Qualquer cliente compatível com MCP (Streamable HTTP) se conecta pelo mesmo link. Configuração padrão:<Code>{JSON.stringify({ mcpServers: { treend: { type: 'http', url } } }, null, 2)}</Code></>,
            <>Para testar direto no terminal:<Code>{`curl -s -X POST ${url} \\\n  -H 'content-type: application/json' \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"analisar_ativo","arguments":{"ativo":"VALE3"}}}'`}</Code></>,
            <>Ferramentas disponíveis: <b>listar_classes</b>, <b>buscar_ativo</b>, <b>analisar_ativo</b>, <b>ranking_oportunidades</b> e <b>visao_geral_mercado</b> — para Ações B3, Stocks, Cripto, Commodities, Câmbio e FIIs.</>,
          ]} />
        )}
        <a className="tiny faint row gap-4" href={`${MCP_URL}/health`} target="_blank" rel="noreferrer"><ExternalLink size={12} /> Status do servidor</a>
      </div>
    </div>
  )
}
