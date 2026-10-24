import {
  BarChart3, BookOpen, Calculator, CalendarDays, Compass, FlaskConical, Gauge, Grid3x3, History, LifeBuoy,
  MessagesSquare, Newspaper, Radar, Cpu, Search, LayoutGrid, Bitcoin, Coins, Fuel, Building2, ScrollText, Sparkles, LineChart, Shield, Boxes, PlayCircle,
  Briefcase, type LucideIcon,
} from 'lucide-react'

export type NavItem = { to: string; label: string; icon: LucideIcon; kbd?: string; desc: string; classic?: string; adminOnly?: boolean }

export const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: 'Inteligência',
    items: [
      { to: '/mercado', label: 'Analisar ativo', icon: Search, kbd: '1', desc: 'Busque qualquer ativo e veja o índice Treend por tempo gráfico' },
      { to: '/meus-ativos', label: 'Meus ativos', icon: Briefcase, desc: 'Sua lista de ativos com preço e índice Treend' },
      { to: '/', label: 'Visão geral', icon: Gauge, kbd: '2', desc: 'Cotações, índices e contexto do dia' },
      { to: '/concierge', label: 'Concierge', icon: Sparkles, kbd: '3', desc: 'Análise guiada da sua operação' },
      { to: '/projecoes', label: 'Projeções', icon: LineChart, kbd: '4', desc: 'Zonas de preço por perfil' },
      { to: '/mapa', label: 'Mapa de calor', icon: Grid3x3, kbd: '5', desc: 'Índice de todas as moedas e janelas' },
      { to: '/radar', label: 'Radar', icon: Radar, kbd: '6', desc: 'Alertas automáticos de cenário' },
      { to: '/mcp', label: 'MCP', icon: Cpu, desc: 'A inteligência Treend dentro da sua IA' },
    ],
  },
  {
    group: 'Ferramentas',
    items: [
      { to: '/calculadora', label: 'Calculadora', icon: Calculator, kbd: '6', desc: 'Economia, spread e saúde da operação' },
      { to: '/cmp', label: 'CMP', icon: BarChart3, desc: 'Custo médio ponderado por janela' },
      { to: '/simulador', label: 'Simulador', icon: FlaskConical, kbd: '7', desc: 'Quanto você perde sem inteligência' },
      { to: '/historico', label: 'Histórico', icon: History, kbd: '8', desc: 'Suas decisões e economia acumulada' },
    ],
  },
  {
    group: 'Mercado',
    items: [
      { to: '/mercados', label: 'Mercados', icon: LayoutGrid, desc: 'Ações B3, Stocks, Cripto e Câmbio' },
      { to: '/noticias', label: 'Notícias', icon: Newspaper, kbd: '9', desc: 'Feed de câmbio em tempo real' },
      { to: '/reports', label: 'Reports', icon: ScrollText, desc: 'Análises semanais da Treend' },
      { to: '/agenda', label: 'Agenda', icon: CalendarDays, desc: 'Eventos, reports e mentorias' },
      { to: '/stocks-invest', label: 'Stocks Invest', icon: Boxes, desc: 'Zonas de compra de ações' },
      { to: '/acoes-b3', label: 'Ações B3', icon: Boxes, desc: 'Índice Treend para a bolsa brasileira' },
      { to: '/cripto', label: 'Cripto', icon: Bitcoin, desc: 'Índice Treend para criptomoedas' },
      { to: '/fiis', label: 'FIIs', icon: Building2, desc: 'Fundos imobiliários com índice Treend e P/VP' },
      { to: '/commodities', label: 'Commodities', icon: Fuel, desc: 'Índice Treend para energia, metais e agrícolas' },
      { to: '/cambio', label: 'Câmbio', icon: Coins, desc: 'Índice Treend para moedas contra o real' },
    ],
  },
  {
    group: 'Aprender',
    items: [
      { to: '/academy', label: 'Academy', icon: BookOpen, desc: 'Aulas e trilhas' },
      { to: '/tutoriais', label: 'Tutoriais', icon: PlayCircle, desc: 'Como usar cada tela' },
      { to: '/suporte', label: 'Suporte', icon: LifeBuoy, desc: 'Fale com o time Treend' },
    ],
  },
  {
    group: 'Conta',
    items: [
      { to: '/chat', label: 'Chat', icon: MessagesSquare, desc: 'Conversas com outros usuários' },
      { to: '/admin', label: 'Admin', icon: Shield, desc: 'Usuários, chamados, alertas e acessos', adminOnly: true },
    ],
  },
]

/** Links to the classic app (every screen is rebuilt; this is just the escape hatch). */
export const CLASSIC: NavItem[] = [
  { to: '/explorar', label: 'Abrir app clássico', icon: Compass, desc: 'Abrir app clássico', classic: '/dashboard' },
]

export const ALL = NAV.flatMap((g) => g.items)
