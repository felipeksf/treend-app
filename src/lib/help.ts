/** Page-level help shown in the "?" next to each screen title. */
export const PAGE_HELP: Record<string, string> = {
  '/': 'Seu painel diário: cotações ao vivo, o índice de confiança Treend para o seu perfil e as manchetes que movem o câmbio. Troque o perfil no seletor à direita.',
  '/concierge': 'Descreva sua operação em linguagem natural (moeda, valor e prazo). O Concierge cruza cotação e índices Treend e devolve cenário, plano de ação e estimativa de retorno.',
  '/projecoes': 'Zonas de preço projetadas para cada perfil. Zonas mais altas são mais raras e mais vantajosas. Use-as como referência para criar alertas no Radar.',
  '/mapa': 'Índice de confiança de 0 a 100 por moeda e janela de operação. Verde é cenário favorável, vermelho é pressão. Clique em uma célula para ver detalhes e criar alerta.',
  '/radar': 'Crie alertas e receba e-mail e notificação quando o cenário escolhido aparecer. O monitoramento é 24/7.',
  '/calculadora': 'Compare o spread que você paga hoje com a referência Treend e veja quanto pode economizar por mês, em 12 e em 24 meses.',
  '/cmp': 'Custo médio ponderado: some suas compras de moeda e veja o custo médio real da operação.',
  '/simulador': 'Estimativa de quanto você perde operando sem inteligência cambial: spread acima da referência mais o custo de operar fora da melhor janela.',
  '/historico': 'Todas as simulações e decisões salvas, com a economia acumulada. Exporte em CSV ou envie qualquer registro por e-mail.',
  '/noticias': 'Manchetes de câmbio atualizadas continuamente, por moeda. Clique em Resumo para ler a notícia condensada.',
  '/reports': 'Análises semanais e mensais publicadas pelo time Treend.',
  '/agenda': 'Calendário de reports, eventos macroeconômicos e mentorias da comunidade.',
  '/stocks-invest': 'Índice de oportunidade de compra para ações americanas em cinco janelas. Clique em um bloco para criar um alerta.',
  '/acoes-b3': 'Índice de oportunidade de compra para todas as ações da B3, em cinco tempos gráficos. Dados com cerca de 15 minutos de atraso. Clique em um bloco para criar um alerta.',
  '/academy': 'Aulas em vídeo para dominar o câmbio na prática.',
  '/tutoriais': 'Vídeos curtos explicando como usar cada tela da Treend.',
  '/suporte': 'Abra um chamado — você recebe a confirmação e a resposta por e-mail.',
  '/chat': 'Converse com outros usuários e com o time Treend.',
  '/mcp': 'Conecte a inteligência Treend ao seu assistente de IA favorito via MCP.',
  '/admin': 'Painel administrativo: usuários, conteúdo, comercial e configurações da plataforma.',
}

/** Shared explanations for recurring concepts. */
export const HELP = {
  index: 'Índice de confiança Treend (0–100): resume o quão favorável está o momento para o seu perfil. Acima de 50 é interessante; abaixo de 20, crítico.',
  profile: 'Seu perfil define o lado da operação: quem compra moeda (importador, turismo) quer preço baixo; quem vende (exportador, renda global) quer preço alto.',
  frequency: 'Janela de operação: com que frequência você opera. Cada janela tem sua própria leitura de mercado.',
  volatility: 'Volatilidade: quanto o preço costuma oscilar nesta janela. Mais volatilidade = mais risco e mais oportunidade.',
  momentum: 'Momentum: força e direção recente do movimento. Positivo indica alta; negativo, queda.',
  meter: 'Régua de pressão: à esquerda o preço está pressionado contra você; à direita, o cenário é interessante.',
  ptax: 'PTAX: taxa oficial calculada pelo Banco Central, usada como referência em contratos.',
  zones: 'Zonas de preço: alvos projetados em ordem de raridade. A zona 1 é a mais próxima; a 6, a mais vantajosa e menos provável.',
  spread: 'Spread: diferença entre a cotação comercial e a taxa que o banco/corretora te cobra.',
  quotes: 'Cotações ao vivo atualizadas a cada 30 segundos. Clique em um card para ver o gráfico ou criar um alerta.',
}
