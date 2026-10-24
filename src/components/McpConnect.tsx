import { useState } from 'react'
import { Check, Copy, ExternalLink, Link2 } from 'lucide-react'
import { Hint, Seg, toast } from './ui'

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

const Steps = ({ items }: { items: React.ReactNode[] }) => (
  <ol className="mcp-steps">{items.map((s, i) => <li key={i}><span>{i + 1}</span><div>{s}</div></li>)}</ol>
)

export default function McpConnect() {
  const [tab, setTab] = useState<'gpt' | 'claude' | 'gemini' | 'agents'>('claude')
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

        <Seg value={tab} onChange={setTab} options={[{ value: 'gpt', label: 'ChatGPT' }, { value: 'claude', label: 'Claude' }, { value: 'gemini', label: 'Gemini' }, { value: 'agents', label: 'Agentes' }]} />

        {tab === 'gpt' && (
          <Steps items={[
            <>No ChatGPT, abra <b>Configurações → Apps e conectores → Avançado</b> e ative o <b>Modo desenvolvedor</b>.</>,
            <>Em <b>Apps e conectores</b>, clique em <b>Criar</b> (novo conector).</>,
            <>Nome: <b>Treend</b>. URL do servidor MCP:<Code>{url}</Code>Autenticação: <b>Sem autenticação</b> (o link já é pessoal).</>,
            <>Em uma conversa, ative o conector <b>Treend</b> e pergunte, por exemplo: “Quais as 5 maiores oportunidades em Ações B3 hoje?”.</>,
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
