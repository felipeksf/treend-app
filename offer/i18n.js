/* Treend /offer — PT → EN/ES dictionary.
   Keys are the Portuguese strings exactly as they appear on the page, with
   whitespace collapsed. `rules` handle strings that carry a number or a ticker.
   Strings the page composes with " · " are translated side by side, so
   "Soja FOB Santos · Commodities" only needs each half to be listed here.

   To check coverage after editing: open /offer/ and run __i18nMissing('en') or
   __i18nMissing('es') in the console. Numbers, tickers and codes are expected
   to show up as "missing" — anything without a translation is left untouched. */

window.TREEND_I18N = {

  en: {
    rules: [
      [/^(.+) · Ações B3$/, '$1 · B3 stocks'],
      [/^Índice Treend (\d+) · agora$/, 'Treend Index $1 · now'],
      [/^Índice Treend (\d+) · (\d+)([hm])$/, 'Treend Index $1 · $2$3'],
      [/^Índice (\d+) · agora$/, 'Index $1 · now'],
      [/^Índice (\d+) · (\d+)([hm])$/, 'Index $1 · $2$3'],
      [/^Desconto raro · (\d+)$/, 'Rare discount · $1'],
      [/^Esticado · (\d+)$/, 'Stretched · $1'],
      [/^Enter para ver (.+)$/, 'Press Enter to see $1'],
      [/^(\d+)x a assinatura mensal$/, '$1x the monthly subscription'],
      [/^(.+) abaixo da média$/, '$1 below average'],
      [/^(.+) muito abaixo da média$/, '$1 well below average'],
      [/^(.+) com preço esticado$/, '$1 price stretched'],
      [/^Índice diário de ([\d,]+): preço muito abaixo do comportamento usual\. Desconto raro na janela diária\.$/,
        'Daily index of $1: price well below usual behavior. A rare discount in the daily window.'],
      [/^Índice diário de ([\d,]+): preço abaixo da média, sem atingir o nível mais raro\.$/,
        'Daily index of $1: price below average, without reaching the rarest level.'],
      [/^Índice diário de ([\d,]+): preço acima do comportamento usual\. Zona de atenção\.$/,
        'Daily index of $1: price above usual behavior. Caution zone.'],
      [/^Índice diário de ([\d,]+): preço abaixo do comportamento usual\. Em cripto, confirme no semanal antes de agir\.$/,
        'Daily index of $1: price below usual behavior. In crypto, confirm on the weekly before acting.'],
      [/^Índice diário de ([\d,]+): preço perto do comportamento usual\. Sem desconto nem excesso relevantes\.$/,
        'Daily index of $1: price close to usual behavior. No meaningful discount or excess.'],
    ],
    text: {
      "Simule o impacto": "Simulate the impact",
      "nos seus resultados.": "on your results.",
      "Moeda da simulação": "Simulation currency",
      "Frequência de operação": "Operation frequency",
      "Confiança": "Confidence",
      "Última hora": "Last hour",
      "Sem dados": "No data",
      "Conversão da assinatura pela cotação de referência.": "Subscription converted at the reference exchange rate.",
      "Cotação indisponível para comparar a assinatura nesta moeda.": "Exchange rate unavailable for comparing the subscription in this currency.",
      "Atualizando cotação para comparar a assinatura…": "Updating the exchange rate to compare the subscription…",

      "VALE3, AAPL, SOJA, BTC, USD…": "VALE3, AAPL, SOYBEANS, BTC, USD…",
      "MUITO ALTA": "VERY HIGH",
      "ALTA": "HIGH",
      "MODERADA-ALTA": "MODERATE-HIGH",
      "MODERADA": "MODERATE",
      "CAUTELA": "CAUTION",
      "CRÍTICA": "CRITICAL",
      "Prévia ilustrativa · Importador · 1x ao dia. Cenário Excepcional: confiança Muito Alta para quem compra moeda.": "Illustrative preview · Importer · Once a day. Exceptional Scenario: Very High confidence for currency buyers.",
      "Prévia ilustrativa · Importador · 1x ao dia. Cenário OK: confiança Moderada-Alta para quem compra moeda.": "Illustrative preview · Importer · Once a day. OK Scenario: Moderate-High confidence for currency buyers.",
      "Prévia ilustrativa · Importador · 1x ao dia. Cautela: confiança Atenção para quem compra moeda.": "Illustrative preview · Importer · Once a day. Caution: stay alert when buying currency.",

      '1x ao dia': 'Once a day',
      '1x na semana': 'Once a week',
      '2x ao mês': 'Twice a month',
      '1x ao mês': 'Once a month',
      /* ── nav ── */
      'Como funciona': 'How it works',
      'Plataforma': 'Platform',
      'Notícias': 'News',
      'IA': 'AI',
      'Por que a Treend': 'Why Treend',
      'Testar': 'Try it',
      'Plano': 'Plan',
      'Entrar': 'Log in',
      'Assinar': 'Subscribe',
      'Seções': 'Sections',
      'Treend — início': 'Treend — home',
      'Idioma · Language · Idioma': 'Idioma · Language · Idioma',

      /* ── hero ── */
      'Ações · FIIs · Stocks · Commodities · Câmbio · Cripto': 'B3 Stocks · REITs · US Stocks · Commodities · FX · Crypto',
      'Você sabe o que comprar.': 'You know what to buy.',
      'A Treend te diz quando.': 'Treend tells you when.',
      'Una suas análises ao Index Score Quantitativo da Treend. Identifique topos e fundos de movimento em segundos e pare de comprar ótimos ativos na hora errada.':
        'Pair your own analysis with Treend’s Quantitative Index Score. Spot the tops and bottoms of a move in seconds and stop buying great assets at the wrong time.',
      'Desbloquear por US$ 199/mês': 'Unlock for US$ 199/month',
      'Ver como funciona': 'See how it works',
      'Sem fidelidade, cancele quando quiser': 'No contract, cancel anytime',
      'Acesso imediato via Stripe': 'Instant access via Stripe',
      '7 dias de garantia': '7-day guarantee',
      'Prévia do painel Treend': 'Treend dashboard preview',

      /* ── dashboard mock ── */
      'Mercados': 'Markets',
      'Minha lista': 'My list',
      'Ações B3': 'B3 Stocks',
      'Ações': 'Stocks',
      'FIIs': 'REITs',
      'Câmbio': 'FX',
      'Cripto': 'Crypto',
      'Zonas': 'Zones',
      'Abaixo da média': 'Below average',
      'Muito abaixo da média': 'Well below average',
      'Esticado': 'Stretched',
      'Variação': 'Change',
      'Selecionado': 'Selected',

      /* ── zone labels ── */
      'MUITO ABAIXO DA MÉDIA': 'WELL BELOW AVERAGE',
      'ABAIXO DA MÉDIA': 'BELOW AVERAGE',
      'NEUTRO': 'NEUTRAL',
      'ATENÇÃO': 'CAUTION',
      'ESTICADO': 'STRETCHED',
      'ABAIXO+': 'BELOW+',
      'ABAIXO': 'BELOW',

      /* ── statement ── */
      'Você estuda balanços, confere a margem, o ROIC e a dívida. Escolhe um ótimo ativo. Compra. E assiste ele cair por meses, porque entrou exatamente no topo do ciclo. O maior erro do investidor não é escolher ativos ruins. É comprar os bons na hora errada.':
        'You study the balance sheet, you check margins, ROIC and debt. You pick a great asset. You buy. And you watch it fall for months, because you bought exactly at the top of the cycle. The investor’s biggest mistake is not picking bad assets. It is buying the good ones at the wrong time.',

      /* ── cycle ── */
      '● 90+ · MUITO ABAIXO DA MÉDIA': '● 90+ · WELL BELOW AVERAGE',
      'Desconto raro.': 'A rare discount.',
      'Oportunidade de aporte.': 'Time to add.',
      'O preço está muito abaixo do comportamento usual do ativo naquela janela, um desconto estatisticamente raro. É quando o investidor de valor quer estar comprando.':
        'The price sits well below the asset’s usual behavior in that window — a statistically rare discount. This is when the value investor wants to be buying.',
      '● 45 – 69 · NEUTRO': '● 45 – 69 · NEUTRAL',
      'Preço em equilíbrio.': 'Price in balance.',
      'Acúmulo normal.': 'Normal accumulation.',
      'O preço volta para perto do comportamento usual: sem desconto nem excesso relevantes. Aportes seguem a sua estratégia, sem pressa e sem euforia.':
        'The price returns close to its usual behavior: no meaningful discount or excess. Keep buying on your own schedule — no rush, no euphoria.',
      '● ≤ 20 · ESTICADO': '● ≤ 20 · STRETCHED',
      'Preço esticado.': 'Stretched price.',
      'Atenção e realização.': 'Caution and profit-taking.',
      'O preço está em excesso estatisticamente raro em relação ao padrão recente. Bom momento para cautela, e péssimo para começar uma posição.':
        'The price is stretched to a statistically rare excess against its recent pattern. A good moment for caution, and a terrible one to open a position.',
      'Petrobras · Diário': 'Petrobras · Daily',
      'Preço': 'Price',
      'Índice Treend': 'Treend Index',
      'Atenção': 'Caution',
      'Neutro': 'Neutral',
      'Abaixo': 'Below',
      'Muito abaixo': 'Well below',
      'S': 'W',
      'Algoritmos ultra treinados': 'Ultra-trained algorithms',
      '2.000 horas de testes': '2,000 hours of testing',
      '94% de precisão': '94% precision',
      'Maior assertividade na decisão': 'Sharper decisions',
      'Métricas quantitativas validadas': 'Validated quantitative metrics',
      'Algoritmos ultra treinados · 2.000 horas de testes · 94% de precisão · Maior assertividade na decisão · Métricas quantitativas validadas':
        'Ultra-trained algorithms · 2,000 hours of testing · 94% precision · Sharper decisions · Validated quantitative metrics',

      /* ── why ── */
      'Fundamentos dizem o quê.': 'Fundamentals tell you what.',
      'Ninguém te diz quando.': 'Nobody tells you when.',
      'A maioria das assinaturas entrega mais tabelas de múltiplos. A Treend entrega a variável que falta: o momento.':
        'Most subscriptions hand you more tables of multiples. Treend hands you the missing variable: timing.',
      'A análise fundamentalista avalia o negócio: lucro, margens, dívida, retorno sobre o capital, dividendos. É indispensável para separar bons ativos dos ruins.':
        'Fundamental analysis judges the business: earnings, margins, debt, return on capital, dividends. It is essential for telling good assets from bad ones.',
      'Mas': 'But',
      'preço e valor andam em ciclos diferentes': 'price and value move in different cycles',
      '. Um ativo excelente pode passar meses, às vezes anos, negociado acima do que vale. Os múltiplos dizem se ele é bom. Não dizem se o movimento do preço está no começo, no meio ou no fim.':
        '. An excellent asset can spend months, sometimes years, trading above what it is worth. Multiples tell you whether it is good. They do not tell you whether the price move is at its start, its middle or its end.',
      'A Treend não compete com a sua análise. Ela completa:': 'Treend does not compete with your analysis. It completes it:',
      'uma leitura quantitativa de momento': 'a quantitative reading of timing',
      ', em um número de 0 a 100.': ', in a single number from 0 to 100.',
      'Análise sólida': 'Solid analysis',
      'timing quantitativo': 'quantitative timing',
      'mais margem de segurança em cada aporte.': 'more margin of safety on every purchase.',
      'Plataformas de dados': 'Data platforms',
      'Casas de recomendação': 'Advisory houses',
      'Planilha própria': 'Your own spreadsheet',
      'Indicador de topo e fundo': 'Top-and-bottom indicator',
      'Timing quantitativo, sem opinião': 'Quantitative timing, no opinions',
      'depende do analista': 'depends on the analyst',
      '6 classes de ativos em um lugar': '6 asset classes in one place',
      'em geral um mercado': 'usually one market',
      'se você montar': 'if you build it',
      'Alertas quando o ativo chega à sua zona': 'Alerts when an asset reaches your zone',
      'A decisão continua sua': 'The decision stays yours',
      'Preço por mês': 'Price per month',
      'Suas horas': 'Your hours',
      'Faixas de preço de referência do mercado brasileiro de assinaturas de investimento, convertidas a R$ 5,40/US$, apenas para comparação.':
        'Reference price ranges from the Brazilian investment-subscription market, converted at R$ 5.40/US$, for comparison only.',

      /* ── bento ── */
      'Tudo o que importa.': 'Everything that matters.',
      'Nada do que distrai.': 'Nothing that distracts.',
      'Milhares de pontos de dados analisados diariamente, resumidos no que muda a sua decisão.':
        'Thousands of data points analyzed every day, boiled down to what changes your decision.',
      'Index Score de 0 a 100': 'Index Score from 0 to 100',
      'Um número por ativo e por tempo gráfico. Quanto maior, mais descontado o preço está naquela janela. Cinco zonas, de esticado a muito abaixo da média.':
        'One number per asset and per timeframe. The higher it is, the more discounted the price is in that window. Five zones, from stretched to well below average.',
      'Alertas de Movimento': 'Movement Alerts',
      'Aviso quando um ativo da sua lista chega à zona que você definiu: desconto raro para comprar, ou preço esticado para realizar.':
        'A heads-up when an asset on your list reaches the zone you set: a rare discount to buy, or a stretched price to take profit.',
      '6 mercados, 1 assinatura': '6 markets, 1 subscription',
      'Pare de pagar uma assinatura para cada classe de ativo.': 'Stop paying one subscription per asset class.',
      'Filtros e dashboard sem poluição': 'Filters and a dashboard without clutter',
      'Filtre por zona, mercado e setor. Sua lista inteira de relance, sem abrir um único gráfico.':
        'Filter by zone, market and sector. Your whole list at a glance, without opening a single chart.',
      'Logística': 'Logistics',
      '+ filtro': '+ filter',

      /* ── platform tour ── */
      'Por dentro da plataforma.': 'Inside the platform.',
      'Telas reais da Treend.': 'Real Treend screens.',
      'Tudo o que você acessa ao assinar: do índice de um único ativo ao mapa do mercado inteiro.':
        'Everything you get when you subscribe: from the index of a single asset to a map of the whole market.',
      'Analisar ativo': 'Analyse asset',
      'O Índice Treend de qualquer ativo em cinco tempos gráficos (1h, 4h, diário, semanal e mensal) lado a lado. Quando as janelas concordam, a leitura é mais forte. Na mesma tela: preço, dividendos e atalho para criar um radar.':
        'The Treend Index for any asset across five timeframes (1h, 4h, daily, weekly and monthly) side by side. When the windows agree, the reading is stronger. On the same screen: price, dividends and a shortcut to create a radar.',
      'Cenários · Bolhas': 'Scenarios · Bubbles',
      'Escolha "quero comprar" ou "quero vender" e veja os ativos com leitura extrema naquele lado. Cada bolha é um ativo: quanto maior, mais extremo o momento.':
        'Pick "I want to buy" or "I want to sell" and see the assets with an extreme reading on that side. Each bubble is an asset: the bigger it is, the more extreme the moment.',
      'Cenários · Calor por setor': 'Scenarios · Heat by sector',
      'O mesmo cenário em um mapa por setor: bancos, energia, varejo, saneamento. Você vê de relance onde estão os descontos e onde o preço já esticou.':
        'The same scenario on a sector map: banks, energy, retail, utilities. You see at a glance where the discounts are and where the price has already stretched.',
      'Mapa de calor': 'Heatmap',
      '375 ações da B3 em cinco tempos gráficos numa única grade, com painel do ativo ao lado: pressão de preço, volatilidade e momentum.':
        '375 B3 stocks across five timeframes in a single grid, with an asset panel beside it: price pressure, volatility and momentum.',
      'Radar': 'Radar',
      'Defina o gatilho (ativo, janela e zona alvo). O agente monitora 24/7 e avisa por e-mail e push quando o cenário aparece.':
        'Set the trigger (asset, window and target zone). The agent watches 24/7 and tells you by e-mail and push when the setup appears.',
      'Ações B3, Câmbio, Commodities, Cripto, FIIs e Stocks: seis classes de ativos com a mesma leitura e visão geral própria.':
        'B3 Stocks, FX, Commodities, Crypto, REITs and US Stocks: six asset classes with the same reading and an overview of their own.',
      'Dividendos': 'Dividends',
      'Todas as empresas da B3 que pagam proventos: dividend yield, proventos por ação, payout e último pagamento, com agenda de datas ex e de pagamento dos próximos dias.':
        'Every dividend-paying company on the B3: dividend yield, dividends per share, payout and last payment, with a calendar of upcoming ex and payment dates.',
      'Projeções': 'Projections',
      'Zonas de intensidade para quem compra e para quem vende: as faixas de preço projetadas em cada tempo gráfico, com a faixa de 52 semanas e atalho para criar radar.':
        'Intensity zones for buyers and for sellers: the projected price bands in each timeframe, with the 52-week range and a shortcut to create a radar.',
      'Concierge': 'Concierge',
      'Descreva sua operação em uma frase: o ativo, o valor, o prazo e o que pretende fazer. O Concierge devolve a leitura nos cinco tempos gráficos, uma simulação de entradas, os cenários e as notícias do ativo.':
        'Describe your trade in one sentence: the asset, the amount, the horizon and what you intend to do. The Concierge returns the reading across five timeframes, a simulation of entries, the scenarios and the asset’s news.',
      'As manchetes que movem ações, FIIs, stocks, câmbio, cripto e commodities, organizadas por classe e por ativo, com o Briefing Treend: o que aconteceu e qual o impacto.':
        'The headlines that move stocks, REITs, US stocks, FX, crypto and commodities, organised by class and by asset, with the Treend Briefing: what happened and what the impact is.',
      '5 tempos gráficos': '5 timeframes',
      'Dividendos e payout': 'Dividends and payout',
      'Salvar e criar radar': 'Save and create a radar',
      'Lado comprador ou vendedor': 'Buy side or sell side',
      'Leituras extremas': 'Extreme readings',
      'Por classe de ativo': 'By asset class',
      'Agrupado por setor': 'Grouped by sector',
      'Verde a vermelho': 'Green to red',
      '375 ações da B3': '375 B3 stocks',
      '375 ações B3': '375 B3 stocks',
      'Grade por janela': 'Grid by window',
      'Painel com detalhes': 'Detail panel',
      'Monitoramento 24/7': '24/7 monitoring',
      'Gatilho por zona': 'Trigger by zone',
      'Agenda de proventos': 'Dividend calendar',
      'Zonas de compra e venda': 'Buy and sell zones',
      'Faixa de 52 semanas': '52-week range',
      'Por tempo gráfico': 'By timeframe',
      'Pergunte em português': 'Ask in plain language',
      'Simulação de entradas': 'Entry simulation',
      'Cenários e notícias': 'Scenarios and news',
      'Revista, Edição e Feed': 'Magazine, Edition and Feed',
      'Briefing Treend': 'Treend Briefing',
      'Notícias por ativo': 'News by asset',
      'Notícias de câmbio': 'FX news',
      'Dólar, euro e demais moedas em modo Revista, com as manchetes que mexem na cotação.': 'Dollar, euro and other currencies in Magazine mode, with the headlines that move the rate.',
      'Notícias de câmbio em modo Revista': 'FX news in Magazine mode',
      '💱 Câmbio': '💱 FX',

      /* ── feature strip ── */
      'Visão geral do seu mercado': 'An overview of your market',
      'Um resumo do dia por classe e por perfil, com a melhor janela agora, notícias e o Concierge.':
        'A daily summary by class and by profile, with the best window right now, the news and the Concierge.',
      'Playbook Treend': 'Treend Playbook',
      'Um guia em seis capítulos que ensina a ler o índice, combinar tempos gráficos e aplicar por classe de ativo.':
        'A six-chapter guide that teaches you to read the index, combine timeframes and apply it per asset class.',
      'Alertas sem vigiar a tela': 'Alerts without watching the screen',
      'Configure uma vez. O Radar avisa quando o ativo entra na zona que você definiu.':
        'Set it once. The Radar tells you when the asset enters the zone you defined.',
      'Quanto rende a sua operação': 'What your trade actually returns',
      'Informe compra, venda e custos: a Calculadora mostra resultado bruto, IR estimado, resultado líquido e os dividendos do período.':
        'Enter the buy, the sell and the costs: the Calculator shows gross result, estimated tax, net result and the dividends for the period.',
      'Simule antes de entrar': 'Simulate before you enter',
      'Escolha ativo, valor e horizonte e veja os cenários pessimista, base e otimista, junto com a leitura de timing da Treend.':
        'Choose asset, amount and horizon and see the bear, base and bull scenarios alongside Treend’s timing reading.',
      'Câmbio sem pagar a mais': 'FX without overpaying',
      'Compare a taxa que você paga hoje com a referência Treend e veja o impacto em 12 e 24 meses, para remessas e investimentos no exterior.':
        'Compare the rate you pay today with the Treend reference and see the impact over 12 and 24 months, for remittances and investing abroad.',

      /* ── news ── */
      'As notícias que movem': 'The news that moves',
      'o seu ativo.': 'your asset.',
      'Manchetes de ações, FIIs, stocks, câmbio, cripto e commodities, com o contexto que a manchete não traz.':
        'Headlines on stocks, REITs, US stocks, FX, crypto and commodities, with the context the headline leaves out.',
      'Revista': 'Magazine',
      'As principais histórias do dia em capas e cards, filtradas por classe de ativo.':
        'The day’s main stories as covers and cards, filtered by asset class.',
      'Edição': 'Edition',
      'A edição do dia em lista numerada, para ler tudo em poucos minutos.':
        'The day’s edition as a numbered list, so you can read everything in a few minutes.',
      'Feed com Briefing Treend': 'Feed with the Treend Briefing',
      'Cada notícia resumida em "o que aconteceu" e no impacto para quem compra e para quem vende.':
        'Every story boiled down to "what happened" and the impact for buyers and for sellers.',
      'Na análise de um ativo, como ITUB4, as manchetes daquela empresa em cards com imagem, ao lado do índice e dos dividendos.':
        'Inside an asset’s analysis, such as ITUB4, that company’s headlines as image cards, next to the index and the dividends.',
      'Feed': 'Feed',
      'ao vivo': 'live',
      'Telas reais da plataforma em 28/10/2026, com o filtro Ações B3.':
        'Real platform screens on 28/10/2026, with the B3 Stocks filter.',

      /* ── crypto ── */
      'Cripto com método.': 'Crypto with a method.',
      'Não com hype.': 'Not with hype.',
      'Mais de 400 criptomoedas negociadas em USDT, com o mesmo Índice Treend de 0 a 100. Em um mercado que não fecha e muda rápido, o índice separa o desconto real do barulho.':
        'More than 400 cryptocurrencies traded in USDT, with the same Treend Index from 0 to 100. In a market that never closes and moves fast, the index separates a real discount from the noise.',
      'Mercado que nunca fecha': 'A market that never closes',
      'O índice é recalculado o tempo todo, inclusive à noite e no fim de semana.':
        'The index is recalculated all the time, including at night and on weekends.',
      'CONTEXTO': 'CONTEXT',
      'Semanal e mensal mandam': 'Weekly and monthly rule',
      'As janelas longas dizem se a moeda está cara ou barata no ciclo maior.':
        'The long windows tell you whether the coin is expensive or cheap in the bigger cycle.',
      'GATILHO': 'TRIGGER',
      '1h e 4h refinam a entrada': '1h and 4h refine the entry',
      'Em cripto, as janelas curtas mudam rápido: use para o ponto de entrada, não para a tese.':
        'In crypto the short windows change fast: use them for the entry point, not for the thesis.',
      'RADAR': 'RADAR',
      'Alerta quando o desconto aparece': 'An alert when the discount shows up',
      'Configure BTC, ETH ou qualquer altcoin e receba o aviso por e-mail e push.':
        'Set up BTC, ETH or any altcoin and get the alert by e-mail and push.',
      'criptomoedas monitoradas': 'cryptocurrencies tracked',
      'abaixo da média no diário': 'below average on the daily',
      'esticadas no diário': 'stretched on the daily',
      'Retrato da plataforma em 28/10/2026. Cripto é um mercado de alto risco; não é recomendação de investimento.':
        'Snapshot of the platform on 28/10/2026. Crypto is a high-risk market; this is not investment advice.',

      /* ── FX ── */
      'Câmbio na janela certa.': 'FX in the right window.',
      'Sem pagar spread a mais.': 'Without paying extra spread.',
      'Para quem importa, exporta, viaja ou investe lá fora: 11 moedas contra o real, com o Índice Treend calibrado para o seu perfil.':
        'For importers, exporters, travellers and anyone investing abroad: 11 currencies against the real, with the Treend Index calibrated to your profile.',
      'Você praticamente': 'You practically',
      'zera o spread': 'wipe out the spread',
      'que paga a mais.': 'you overpay.',
      'A calculadora compara a taxa que você paga hoje com a referência Treend e mostra quanto fica no banco a cada operação.':
        'The calculator compares the rate you pay today with the Treend reference and shows how much stays at the bank on every transaction.',
      'Dólar, euro, libra, yuan e mais': 'Dollar, euro, pound, yuan and more',
      'Cotação, variação e o Índice Treend de cada moeda em um clique.':
        'Quote, change and the Treend Index for each currency in one click.',
      'Leitura para o seu perfil': 'A reading for your profile',
      'Importador, exportador, agente de turismo ou renda global: o mesmo câmbio, a leitura certa para quem compra ou vende moeda.':
        'Importer, exporter, travel agent or global income: the same FX market, the right reading for whoever is buying or selling currency.',
      'Quanto custa o seu spread': 'What your spread costs you',
      'Pagando 1,50% com a referência em 0,50%, uma operação de US$ 50 mil/mês deixa R$ 2.695 por mês na mesa.':
        'Paying 1.50% against a 0.50% reference, a US$ 50k/month transaction leaves R$ 2,695 a month on the table.',
      'Alerta na janela ideal': 'An alert in the ideal window',
      'O Radar avisa quando a moeda entra na zona certa para o seu lado da operação.':
        'The Radar tells you when the currency enters the right zone for your side of the trade.',
      'Spread': 'Spread',
      'cotação ao vivo': 'live quote',
      'Economia estimada em 12 meses': 'Estimated saving over 12 months',
      'Simule o ciclo': 'Simulate the cycle',
      'de cada moeda.': 'of each currency.',
      'Para quem compra moeda, o índice alto mostra o câmbio descontado: a hora de fechar a operação. Quando o preço estica, a Treend sinaliza esperar.':
        'For currency buyers, a high index means a discounted rate: the moment to close the deal. When the price stretches, Treend signals you to wait.',
      'Dólar americano': 'US dollar',
      'Libra esterlina': 'Pound sterling',
      'Yuan chinês': 'Chinese yuan',
      'Dólar americano · Diário': 'US dollar · Daily',
      'Euro · Diário': 'Euro · Daily',
      'Libra esterlina · Diário': 'Pound sterling · Daily',
      'Yuan chinês · Diário': 'Chinese yuan · Daily',
      'Cotação': 'Quote',
      'Índice · quem compra': 'Index · buyers',
      'Desconto raro': 'Rare discount',
      'Telas reais da plataforma em 30/10/2026. Exemplo da calculadora: US$ 50 mil por mês, spread pago de 1,50% contra a referência Treend de 0,50%. Valores ilustrativos; a economia depende da sua operação e da negociação com a sua instituição. O simulador usa a faixa real de 30 dias de cada moeda em um ciclo ilustrativo.':
        'Real platform screens on 30/10/2026. Calculator example: US$ 50k per month, a paid spread of 1.50% against the Treend reference of 0.50%. Illustrative figures; the saving depends on your transaction and on what you negotiate with your institution. The simulator uses each currency’s real 30-day range in an illustrative cycle.',
      'Dólar: cotação e Índice Treend': 'Dollar: quote and Treend Index',
      'Euro: cotação e Índice Treend': 'Euro: quote and Treend Index',
      'Libra: cotação e Índice Treend': 'Pound: quote and Treend Index',
      'Yuan: cotação e Índice Treend': 'Yuan: quote and Treend Index',
      'Calculadora de spread da Treend': 'Treend spread calculator',
      'Calculadora de spread de câmbio': 'FX spread calculator',

      /* ── MCP ── */
      'A Treend dentro': 'Treend inside',
      'da sua IA.': 'your AI.',
      'Com o': 'With the',
      'Treend MCP': 'Treend MCP',
      ', ChatGPT, Claude, Gemini, Grok e agentes de IA consultam o Índice Treend de qualquer ativo, em qualquer tempo gráfico, direto na conversa. Você pergunta em português; a IA busca os dados na Treend e explica. Na sua conta, ela também gerencia seus ativos, radares, alertas e histórico.':
        ', ChatGPT, Claude, Gemini, Grok and AI agents query the Treend Index for any asset, in any timeframe, right inside the conversation. You ask in plain language; the AI fetches the data from Treend and explains it. On your account it also manages your assets, radars, alerts and history.',
      '+ agentes compatíveis com MCP': '+ MCP-compatible agents',
      'Solicite o acesso': 'Request access',
      'Na plataforma, em': 'In the platform, under',
      '. O acesso é liberado por conta.': '. Access is enabled per account.',
      'Conecte seu link pessoal': 'Connect your personal link',
      'Cole o endereço': 'Paste the address',
      'nas conexões da sua IA.': 'into your AI’s connections.',
      'Pergunte naturalmente': 'Just ask',
      'Scores, rankings e visão do mercado, em linguagem natural.':
        'Scores, rankings and a market overview, in natural language.',
      'Solicitar acesso ao MCP': 'Request MCP access',
      'Ranking': 'Ranking',
      'Pergunte sobre qualquer ativo…': 'Ask about any asset…',
      'Como está PETR4 em cada tempo gráfico?': 'How is PETR4 in each timeframe?',
      '(+0,17% hoje). As janelas curtas estão abaixo da média, as longas ainda pedem atenção:':
        '(+0.17% today). The short windows are below average, the long ones still call for caution:',
      'Tempo gráfico': 'Timeframe',
      'Índice': 'Index',
      'Zona': 'Zone',
      '1 hora': '1 hour',
      '4 horas': '4 hours',
      'Diário': 'Daily',
      'Semanal': 'Weekly',
      'Mensal': 'Monthly',
      'Leitura: desconto no curto prazo, mas': 'Reading: a short-term discount, but',
      'sem alinhamento de janelas': 'the windows are not aligned',
      '. O contexto semanal e mensal ainda não confirma.': '. The weekly and monthly context does not confirm it yet.',
      'Quais FIIs estão com mais desconto hoje?': 'Which REITs are most discounted today?',
      'ranking_oportunidades · fiis · diário': 'ranking_oportunidades · fiis · daily',
      'Os FIIs com índice diário mais alto agora, cruzados com o P/VP:':
        'The REITs with the highest daily index right now, cross-checked against price/book:',
      'FII': 'REIT',
      '· Tijolo': '· Brick & mortar',
      '· Misto': '· Mixed',
      '· CRI Infra': '· Infra CRI',
      '· Logística': '· Logistics',
      'JFLL11 e MMVE11 combinam índice alto com P/VP abaixo de 1: a Treend chama isso de':
        'JFLL11 and MMVE11 combine a high index with price/book below 1: Treend calls that',
      'assimetria de compra': 'buy-side asymmetry',
      '. VGII11 e PNDL11 estão em oportunidade, mas negociados com ágio.':
        '. VGII11 and PNDL11 are in opportunity territory, but trading at a premium.',
      'Quais mercados você consegue analisar pela Treend?': 'Which markets can you analyze through Treend?',
      'Pela Treend eu consigo consultar': 'Through Treend I can query',
      'seis classes de ativos': 'six asset classes',
      ', todas com o mesmo índice de 0 a 100 em cinco tempos gráficos:':
        ', all with the same 0-to-100 index across five timeframes:',
      'Classe': 'Class',
      'Exemplos': 'Examples',
      'com P/VP e DY': 'with price/book and yield',
      'petróleo, ouro, grãos': 'oil, gold, grains',
      'É só me dizer o ativo ou pedir um ranking.': 'Just tell me the asset or ask for a ranking.',
      'Sou importador e vou comprar US$ 50 mil. Compro dólar agora ou espero?':
        'I am an importer about to buy US$ 50k. Do I buy dollars now or wait?',
      'analisar_ativo · USD/BRL + projecoes_cambio · importador': 'analisar_ativo · USD/BRL + projecoes_cambio · importer',
      '(+0,90% hoje). Para quem compra dólar, o momento é de': '(+0.90% today). For dollar buyers, the moment is one of',
      'preço esticado': 'a stretched price',
      'no curto prazo:': 'in the short term:',
      'As zonas de compra do importador hoje vão de': 'The importer’s buy zones today run from',
      '(zona 1) a': '(zone 1) to',
      '(zona 6, a mais vantajosa). Fechar os US$ 50 mil na zona 6 em vez de agora custaria cerca de':
        '(zone 6, the most favourable). Closing the US$ 50k in zone 6 instead of now would cost about',
      'R$ 730 a menos': 'R$ 730 less',
      '. Leitura: escalonar e deixar um alerta no Radar para a zona 6.':
        '. Reading: scale in and leave a Radar alert for zone 6.',
      'Preço, variação e índice em 5 tempos gráficos. Em FIIs, P/VP e DY.':
        'Price, change and index across 5 timeframes. For REITs, price/book and yield.',
      'Os mais descontados ou mais esticados de uma classe.': 'The most discounted or most stretched in a class.',
      'O retrato do momento de cada mercado.': 'A snapshot of where each market stands.',
      'Encontra o ativo pelo nome ou código.': 'Finds an asset by name or ticker.',
      'Ações B3, Stocks, Cripto, Commodities, Câmbio e FIIs.': 'B3 Stocks, US Stocks, Crypto, Commodities, FX and REITs.',
      'Consulta sua lista;': 'Reads your list;',
      'a atualizam pela conversa.': 'update it from the conversation.',
      'Zonas de preço projetadas para comprar e vender em cada tempo gráfico. Em câmbio,':
        'Projected price zones to buy and sell in each timeframe. For FX,',
      'Descreva a operação (moeda, valor, prazo) e receba a leitura e a simulação.':
        'Describe the transaction (currency, amount, horizon) and get the reading and the simulation.',
      'As manchetes do mercado ou de um ativo, direto na conversa.':
        'Market or single-asset headlines, right in the conversation.',
      'Cria e ajusta radares (': 'Creates and adjusts radars (',
      ') para ser avisado na zona certa.': ') so you are alerted in the right zone.',
      'Alertas de preço e de zona;': 'Price and zone alerts;',
      'para gerenciar.': 'to manage them.',
      'Suas análises e operações salvas;': 'Your saved analyses and trades;',
      'para limpar.': 'to clear them.',
      'Respostas com dados reais consultados via Treend MCP em 28/10/2026 (câmbio em 30/10/2026), apenas para demonstração. A disponibilidade do MCP é liberada por conta. Não é recomendação de investimento.':
        'Answers using real data queried through the Treend MCP on 28/10/2026 (FX on 30/10/2026), for demonstration only. MCP availability is enabled per account. This is not investment advice.',

      /* ── simulator ── */
      'Prove antes de assinar.': 'Try it before you subscribe.',
      'Três ativos por mercado estão liberados. Pesquise qualquer outro: ele aparece aqui, bloqueado para assinantes.':
        'Three assets per market are unlocked. Search for any other one: it shows up here, locked for subscribers.',
      'Pesquisar ativo': 'Search asset',
      'VALE3, AAPL, SOJA, BTC…': 'VALE3, AAPL, SOYBEANS, BTC…',
      'Nenhum ativo encontrado': 'No asset found',
      'Ativo monitorado pela Treend': 'Asset tracked by Treend',
      'Dados ilustrativos. Não é recomendação de compra ou venda.':
        'Illustrative data. This is not a buy or sell recommendation.',
      'Score de': 'Score for',
      'bloqueado': 'locked',
      'Você testou a prévia. Desbloqueie o Índice Treend de +5.000 ativos com a Treend Pro.':
        'You have tried the preview. Unlock the Treend Index for over 5,000 assets with Treend Pro.',
      'Soja FOB Santos': 'Soybeans FOB Santos',
      'Ouro (micro futuro)': 'Gold (micro future)',
      'Petróleo Brent': 'Brent crude',
      'Petróleo WTI': 'WTI crude',
      'Trigo KC HRW': 'KC HRW wheat',
      'Café arábica': 'Arabica coffee',
      'Minério de ferro': 'Iron ore',
      'Milho': 'Corn',
      'Cobre': 'Copper',
      'Lítio': 'Lithium',
      'CSHG Logística': 'CSHG Logística',
      'BTG Logística': 'BTG Logística',
      'Preço em região de suporte histórico com exaustão de venda.':
        'Price at historical support with selling exhaustion.',
      'Preço em equilíbrio com a média histórica; momentum neutro.':
        'Price in balance with its historical average; neutral momentum.',
      'Distância extrema da média com divergência de força compradora.':
        'Extreme distance from the average with a divergence in buying strength.',
      'P/VP abaixo da média histórica com fluxo vendedor exaurido.':
        'Price/book below its historical average with selling flow exhausted.',
      'Cotação em equilíbrio com o valor patrimonial; ciclo neutro.':
        'Quote in balance with book value; neutral cycle.',
      'Cotação esticada acima da média com sinais de exaustão compradora.':
        'Quote stretched above its average with signs of buying exhaustion.',
      'Teste de suporte de longo prazo com volume vendedor decrescente.':
        'Long-term support test with declining selling volume.',
      'Consolidação lateral após correção; momentum neutro.':
        'Sideways consolidation after a correction; neutral momentum.',
      'Sobrecompra extrema em múltiplos tempos gráficos; risco de realização.':
        'Extreme overbought reading across multiple timeframes; risk of profit-taking.',

      /* ── calculator ── */
      'Um aporte no topo': 'One purchase at the top',
      'custa mais que a assinatura.': 'costs more than the subscription.',
      'Correções de 15% a 30% depois de um topo de ciclo são comuns, mesmo em ativos de excelente qualidade.':
        'Corrections of 15% to 30% after a cycle top are common, even in excellent assets.',
      'Valor do aporte': 'Amount invested',
      'Queda depois do topo': 'Drop after the top',
      'Simulação ilustrativa. Não representa retorno ou perda garantidos.':
        'Illustrative simulation. It does not represent guaranteed gains or losses.',
      'Você deixa na mesa': 'You leave on the table',
      'em um único aporte feito no momento errado.': 'on a single purchase made at the wrong moment.',
      'Treend Pro por 1 mês': 'Treend Pro for 1 month',
      'A perda equivale a': 'That loss equals',
      'parte de 1 mês': 'part of 1 month',
      'Você nunca mais comprará topo.': 'You will never buy the top again.',

      /* ── pricing ── */
      'Timing profissional.': 'Professional timing.',
      'Por menos que um erro de entrada.': 'For less than one bad entry.',
      'Acesso ilimitado aos 6 mercados': 'Unlimited access to all 6 markets',
      'Ações B3, FIIs, Stocks, Commodities, Câmbio e Cripto.': 'B3 Stocks, REITs, US Stocks, Commodities, FX and Crypto.',
      'Index Score Quantitativo': 'Quantitative Index Score',
      'Indicador de topo e fundo, atualizado diariamente.': 'A top-and-bottom indicator, updated daily.',
      'Filtros avançados': 'Advanced filters',
      'Ativos e oportunidades de ciclo.': 'Assets and cycle opportunities.',
      'Quando seus ativos chegarem à zona que você definiu.': 'When your assets reach the zone you defined.',
      'Dashboard ultra-rápida': 'An ultra-fast dashboard',
      'Minimalista, sem poluição visual.': 'Minimal, with no visual clutter.',
      'Oferta ativa': 'Offer live',
      '/ mês': '/ month',
      'cobrança mensal · cancele quando quiser': 'billed monthly · cancel anytime',
      'Garantir meu acesso Pro': 'Get my Pro access',
      'Pagamento seguro via Stripe, ativação imediata': 'Secure payment via Stripe, instant activation',
      'Garantia incondicional de 7 dias': 'Unconditional 7-day guarantee',
      'Cancele a renovação quando quiser': 'Cancel the renewal whenever you want',

      /* ── proof ── */
      'Eu sabia escolher boas empresas, mas vivia errando o timing de entrada. O Index Score da Treend me impediu de comprar no topo de um ciclo e me mostrou exatamente o fundo de ações consolidadas. Só isso já pagou anos de assinatura.':
        'I knew how to pick good companies, but I kept getting the entry timing wrong. Treend’s Index Score stopped me from buying at the top of a cycle and showed me exactly the bottom on established stocks. That alone has paid for years of the subscription.',
      'Assinante Treend': 'Treend subscriber',
      'Lucas M., assinante Treend': 'Lucas M., Treend subscriber',
      'Case · META · setembro de 2026': 'Case · META · September 2026',
      'Valorização em META associada à metodologia Treend.': 'A gain in META associated with the Treend methodology.',
      'Resultado informado pela Treend. Período exato, preços de entrada e saída e comprovação ainda não fornecidos; o dado não representa retorno verificado nem garante resultados futuros.':
        'Result reported by Treend. The exact period, entry and exit prices and supporting evidence have not yet been provided; the figure is not a verified return and does not guarantee future results.',
      'dias': 'days',
      'Você não precisa ter certeza agora.': 'You do not have to be sure right now.',
      'Garantia incondicional. Teste o Index Score nos seus ativos; se não agregar ao seu processo, devolvemos 100% do valor.':
        'Unconditional guarantee. Try the Index Score on your own assets; if it does not add to your process, we refund 100%.',

      /* ── FAQ ── */
      'Perguntas': 'Frequently asked',
      'frequentes': 'questions',
      'A Treend faz recomendação de compra ou venda?': 'Does Treend make buy or sell recommendations?',
      'Não. A Treend é uma plataforma de dados e inteligência quantitativa. Entregamos indicadores claros (Index Score) para que você tome decisões autônomas e embasadas.':
        'No. Treend is a data and quantitative-intelligence platform. We deliver clear indicators (the Index Score) so that you make your own informed decisions.',
      'A Treend substitui ferramentas de dados fundamentalistas?': 'Does Treend replace fundamental-data tools?',
      'Ela funciona como o módulo de timing que falta na rotina do investidor. Com o Index Score e a cobertura de Ações, FIIs, Stocks e Commodities, sua central de análise fica mais ágil e completa.':
        'It works as the timing module missing from an investor’s routine. With the Index Score and coverage of stocks, REITs, US stocks and commodities, your analysis hub becomes faster and more complete.',
      'Como funciona o pagamento?': 'How does payment work?',
      'Pagamento seguro via Stripe. A cobrança é mensal, de US$ 199, renovada automaticamente a cada 30 dias. Você pode cancelar a renovação quando quiser.':
        'Secure payment via Stripe. Billing is monthly, US$ 199, renewed automatically every 30 days. You can cancel the renewal whenever you want.',
      'Tenho garantia?': 'Is there a guarantee?',
      'Sim, garantia incondicional de 7 dias. Se os indicadores não agregarem ao seu processo de investimento, devolvemos 100% do seu dinheiro.':
        'Yes, an unconditional 7-day guarantee. If the indicators do not add to your investment process, we refund 100% of your money.',
      'Existe garantia de valorização?': 'Is any gain guaranteed?',
      'Não. Investimentos envolvem riscos. O Index Score apoia a leitura de momento, mas não garante retorno. Resultados passados não garantem resultados futuros.':
        'No. Investing involves risk. The Index Score supports your reading of timing, but it does not guarantee a return. Past results do not guarantee future results.',

      /* ── final + footer + modal ── */
      'Pare de comprar no escuro.': 'Stop buying in the dark.',
      'Veja o momento certo.': 'See the right moment.',
      'O Index Score está pronto. Os 6 mercados estão prontos. O próximo passo é seu.':
        'The Index Score is ready. All 6 markets are ready. The next step is yours.',
      'Privacidade': 'Privacy',
      'Treend. A Treend não faz recomendação de investimento. Os indicadores são informativos e não garantem rentabilidade futura.':
        'Treend. Treend does not make investment recommendations. The indicators are informational and do not guarantee future returns.',
      'Fechar': 'Close',
      'Falta pouco para liberar seu acesso': 'You are one step from your access',
      'Preencha seus dados e siga para o pagamento seguro no Stripe. US$ 199/mês.':
        'Fill in your details and continue to secure payment on Stripe. US$ 199/month.',
      'e': 'and',
      'Nome': 'Name',
      'E-mail': 'E-mail',
      'Seu nome completo': 'Your full name',
      'voce@email.com': 'you@email.com',
      'Ir para o pagamento': 'Go to payment',
      'Abrindo pagamento…': 'Opening payment…',
      'Informe seu nome.': 'Please enter your name.',
      'Informe um e-mail válido.': 'Please enter a valid e-mail.',
      'Informe um WhatsApp com DDD.': 'Please enter a WhatsApp number with area code.',
      'Informe um WhatsApp com código do país (ex.: +1 212 555 0123).': 'Enter a WhatsApp number with country code (e.g., +1 212 555 0123).',
      '+55 11 99999-9999': '+1 212 555 0123',
      'Seus dados estão seguros · Garantia de 7 dias': 'Your data is safe · 7-day guarantee',
      '· US$ 199/mês': '· US$ 199/month',

      /* ── image alt text ── */
      'Tela Analisar ativo da plataforma Treend': 'Analyse asset screen of the Treend platform',
      'Tela Cenários · Bolhas da plataforma Treend': 'Scenarios · Bubbles screen of the Treend platform',
      'Tela Cenários · Calor por setor da plataforma Treend': 'Scenarios · Heat by sector screen of the Treend platform',
      'Tela Mapa de calor da plataforma Treend': 'Heatmap screen of the Treend platform',
      'Tela Radar da plataforma Treend': 'Radar screen of the Treend platform',
      'Tela Mercados da plataforma Treend': 'Markets screen of the Treend platform',
      'Tela Dividendos da plataforma Treend': 'Dividends screen of the Treend platform',
      'Tela Projeções da plataforma Treend': 'Projections screen of the Treend platform',
      'Tela Concierge da plataforma Treend': 'Concierge screen of the Treend platform',
      'Tela Notícias da plataforma Treend': 'News screen of the Treend platform',
      'Visão geral da Treend': 'Treend overview',
      'Radar Treend': 'Treend Radar',
      'Calculadora de operação em Ações B3': 'Trade calculator for B3 stocks',
      'Simulador de cenários em Ações B3': 'Scenario simulator for B3 stocks',
      'Notícias em modo Revista': 'News in Magazine mode',
      'Notícias em modo Edição': 'News in Edition mode',
      'Notícias em modo Feed com Briefing Treend': 'News in Feed mode with the Treend Briefing',
      'Notícias sobre ITUB4 em cards na análise do ativo': 'ITUB4 news as cards inside the asset analysis',
      'Mapa do Índice Treend para criptomoedas': 'Treend Index map for cryptocurrencies',

      /* ── head ── */
      'Treend Pro — Saiba o momento de comprar': 'Treend Pro — Know when to buy',
      'Index Score Quantitativo da Treend: topo e fundo de mais de 5.000 ativos em Ações, FIIs, Stocks, Commodities, Câmbio e Cripto. US$ 199/mês.':
        'Treend’s Quantitative Index Score: tops and bottoms for over 5,000 assets across stocks, REITs, US stocks, commodities, FX and crypto. US$ 199/month.',
    },
  },

  es: {
    rules: [
      [/^(.+) · Ações B3$/, '$1 · Acciones B3'],
      [/^Índice Treend (\d+) · agora$/, 'Índice Treend $1 · ahora'],
      [/^Índice Treend (\d+) · (\d+)([hm])$/, 'Índice Treend $1 · $2$3'],
      [/^Índice (\d+) · agora$/, 'Índice $1 · ahora'],
      [/^Índice (\d+) · (\d+)([hm])$/, 'Índice $1 · $2$3'],
      [/^Desconto raro · (\d+)$/, 'Descuento raro · $1'],
      [/^Esticado · (\d+)$/, 'Estirado · $1'],
      [/^Enter para ver (.+)$/, 'Enter para ver $1'],
      [/^(\d+)x a assinatura mensal$/, '$1x la suscripción mensual'],
      [/^(.+) abaixo da média$/, '$1 por debajo del promedio'],
      [/^(.+) muito abaixo da média$/, '$1 muy por debajo del promedio'],
      [/^(.+) com preço esticado$/, '$1 con precio estirado'],
      [/^Índice diário de ([\d,]+): preço muito abaixo do comportamento usual\. Desconto raro na janela diária\.$/,
        'Índice diario de $1: precio muy por debajo del comportamiento habitual. Descuento raro en la ventana diaria.'],
      [/^Índice diário de ([\d,]+): preço abaixo da média, sem atingir o nível mais raro\.$/,
        'Índice diario de $1: precio por debajo del promedio, sin alcanzar el nivel más raro.'],
      [/^Índice diário de ([\d,]+): preço acima do comportamento usual\. Zona de atenção\.$/,
        'Índice diario de $1: precio por encima del comportamiento habitual. Zona de atención.'],
      [/^Índice diário de ([\d,]+): preço abaixo do comportamento usual\. Em cripto, confirme no semanal antes de agir\.$/,
        'Índice diario de $1: precio por debajo del comportamiento habitual. En cripto, confirme en el semanal antes de actuar.'],
      [/^Índice diário de ([\d,]+): preço perto do comportamento usual\. Sem desconto nem excesso relevantes\.$/,
        'Índice diario de $1: precio cerca del comportamiento habitual. Sin descuento ni exceso relevantes.'],
    ],
    text: {
      "Simule o impacto": "Simule el impacto",
      "nos seus resultados.": "en sus resultados.",
      "Moeda da simulação": "Moneda de la simulación",
      "Frequência de operação": "Frecuencia de operación",
      "Confiança": "Confianza",
      "Última hora": "Última hora",
      "Sem dados": "Sin datos",
      "Conversão da assinatura pela cotação de referência.": "Suscripción convertida al tipo de cambio de referencia.",
      "Cotação indisponível para comparar a assinatura nesta moeda.": "Tipo de cambio no disponible para comparar la suscripción en esta moneda.",
      "Atualizando cotação para comparar a assinatura…": "Actualizando el tipo de cambio para comparar la suscripción…",

      "VALE3, AAPL, SOJA, BTC, USD…": "VALE3, AAPL, SOJA, BTC, USD…",
      "MUITO ALTA": "MUY ALTA",
      "ALTA": "ALTA",
      "MODERADA-ALTA": "MODERADA-ALTA",
      "MODERADA": "MODERADA",
      "CAUTELA": "CAUTELA",
      "CRÍTICA": "CRÍTICA",
      "Prévia ilustrativa · Importador · 1x ao dia. Cenário Excepcional: confiança Muito Alta para quem compra moeda.": "Vista previa ilustrativa · Importador · Una vez al día. Escenario Excepcional: confianza Muy Alta para quienes compran divisas.",
      "Prévia ilustrativa · Importador · 1x ao dia. Cenário OK: confiança Moderada-Alta para quem compra moeda.": "Vista previa ilustrativa · Importador · Una vez al día. Escenario OK: confianza Moderada-Alta para quienes compran divisas.",
      "Prévia ilustrativa · Importador · 1x ao dia. Cautela: confiança Atenção para quem compra moeda.": "Vista previa ilustrativa · Importador · Una vez al día. Cautela: atención al comprar divisas.",

      '1x ao dia': 'Una vez al día',
      '1x na semana': 'Una vez a la semana',
      '2x ao mês': 'Dos veces al mes',
      '1x ao mês': 'Una vez al mes',
      /* ── nav ── */
      'Como funciona': 'Cómo funciona',
      'Plataforma': 'Plataforma',
      'Notícias': 'Noticias',
      'IA': 'IA',
      'Por que a Treend': 'Por qué Treend',
      'Testar': 'Probar',
      'Plano': 'Plan',
      'Entrar': 'Iniciar sesión',
      'Assinar': 'Suscribirse',
      'Seções': 'Secciones',
      'Treend — início': 'Treend — inicio',

      /* ── hero ── */
      'Ações · FIIs · Stocks · Commodities · Câmbio · Cripto': 'Acciones · FIIs · Stocks · Commodities · Divisas · Cripto',
      'Você sabe o que comprar.': 'Usted sabe qué comprar.',
      'A Treend te diz quando.': 'Treend le dice cuándo.',
      'Una suas análises ao Index Score Quantitativo da Treend. Identifique topos e fundos de movimento em segundos e pare de comprar ótimos ativos na hora errada.':
        'Una su análisis al Index Score Cuantitativo de Treend. Identifique techos y suelos de movimiento en segundos y deje de comprar excelentes activos en el momento equivocado.',
      'Desbloquear por US$ 199/mês': 'Desbloquear por US$ 199/mes',
      'Ver como funciona': 'Ver cómo funciona',
      'Sem fidelidade, cancele quando quiser': 'Sin contrato, cancele cuando quiera',
      'Acesso imediato via Stripe': 'Acceso inmediato vía Stripe',
      '7 dias de garantia': '7 días de garantía',
      'Prévia do painel Treend': 'Vista previa del panel Treend',

      /* ── dashboard mock ── */
      'Mercados': 'Mercados',
      'Minha lista': 'Mi lista',
      'Ações B3': 'Acciones B3',
      'Ações': 'Acciones',
      'Câmbio': 'Divisas',
      'Zonas': 'Zonas',
      'Abaixo da média': 'Por debajo del promedio',
      'Muito abaixo da média': 'Muy por debajo del promedio',
      'Esticado': 'Estirado',
      'Variação': 'Variación',
      'Selecionado': 'Seleccionado',

      /* ── zone labels ── */
      'MUITO ABAIXO DA MÉDIA': 'MUY POR DEBAJO DEL PROMEDIO',
      'ABAIXO DA MÉDIA': 'POR DEBAJO DEL PROMEDIO',
      'NEUTRO': 'NEUTRO',
      'ATENÇÃO': 'ATENCIÓN',
      'ESTICADO': 'ESTIRADO',
      'ABAIXO+': 'DEBAJO+',
      'ABAIXO': 'DEBAJO',

      /* ── statement ── */
      'Você estuda balanços, confere a margem, o ROIC e a dívida. Escolhe um ótimo ativo. Compra. E assiste ele cair por meses, porque entrou exatamente no topo do ciclo. O maior erro do investidor não é escolher ativos ruins. É comprar os bons na hora errada.':
        'Usted estudia los balances, revisa el margen, el ROIC y la deuda. Elige un gran activo. Compra. Y lo ve caer durante meses, porque entró exactamente en el techo del ciclo. El mayor error del inversor no es elegir activos malos. Es comprar los buenos en el momento equivocado.',

      /* ── cycle ── */
      '● 90+ · MUITO ABAIXO DA MÉDIA': '● 90+ · MUY POR DEBAJO DEL PROMEDIO',
      'Desconto raro.': 'Descuento raro.',
      'Oportunidade de aporte.': 'Oportunidad de aportar.',
      'O preço está muito abaixo do comportamento usual do ativo naquela janela, um desconto estatisticamente raro. É quando o investidor de valor quer estar comprando.':
        'El precio está muy por debajo del comportamiento habitual del activo en esa ventana, un descuento estadísticamente raro. Es cuando el inversor de valor quiere estar comprando.',
      '● 45 – 69 · NEUTRO': '● 45 – 69 · NEUTRO',
      'Preço em equilíbrio.': 'Precio en equilibrio.',
      'Acúmulo normal.': 'Acumulación normal.',
      'O preço volta para perto do comportamento usual: sem desconto nem excesso relevantes. Aportes seguem a sua estratégia, sem pressa e sem euforia.':
        'El precio vuelve cerca del comportamiento habitual: sin descuento ni exceso relevantes. Los aportes siguen su estrategia, sin prisa y sin euforia.',
      '● ≤ 20 · ESTICADO': '● ≤ 20 · ESTIRADO',
      'Preço esticado.': 'Precio estirado.',
      'Atenção e realização.': 'Atención y realización.',
      'O preço está em excesso estatisticamente raro em relação ao padrão recente. Bom momento para cautela, e péssimo para começar uma posição.':
        'El precio está en un exceso estadísticamente raro frente a su patrón reciente. Buen momento para la cautela, y pésimo para abrir una posición.',
      'Petrobras · Diário': 'Petrobras · Diario',
      'Preço': 'Precio',
      'Índice Treend': 'Índice Treend',
      'Atenção': 'Atención',
      'Neutro': 'Neutro',
      'Abaixo': 'Debajo',
      'Muito abaixo': 'Muy debajo',
      'Algoritmos ultra treinados': 'Algoritmos ultraentrenados',
      '2.000 horas de testes': '2.000 horas de pruebas',
      '94% de precisão': '94% de precisión',
      'Maior assertividade na decisão': 'Mayor acierto en la decisión',
      'Métricas quantitativas validadas': 'Métricas cuantitativas validadas',
      'Algoritmos ultra treinados · 2.000 horas de testes · 94% de precisão · Maior assertividade na decisão · Métricas quantitativas validadas':
        'Algoritmos ultraentrenados · 2.000 horas de pruebas · 94% de precisión · Mayor acierto en la decisión · Métricas cuantitativas validadas',

      /* ── why ── */
      'Fundamentos dizem o quê.': 'Los fundamentos dicen qué.',
      'Ninguém te diz quando.': 'Nadie le dice cuándo.',
      'A maioria das assinaturas entrega mais tabelas de múltiplos. A Treend entrega a variável que falta: o momento.':
        'La mayoría de las suscripciones entrega más tablas de múltiplos. Treend entrega la variable que falta: el momento.',
      'A análise fundamentalista avalia o negócio: lucro, margens, dívida, retorno sobre o capital, dividendos. É indispensável para separar bons ativos dos ruins.':
        'El análisis fundamental evalúa el negocio: beneficio, márgenes, deuda, retorno sobre el capital, dividendos. Es indispensable para separar los buenos activos de los malos.',
      'Mas': 'Pero',
      'preço e valor andam em ciclos diferentes': 'precio y valor se mueven en ciclos distintos',
      '. Um ativo excelente pode passar meses, às vezes anos, negociado acima do que vale. Os múltiplos dizem se ele é bom. Não dizem se o movimento do preço está no começo, no meio ou no fim.':
        '. Un activo excelente puede pasar meses, a veces años, cotizando por encima de lo que vale. Los múltiplos dicen si es bueno. No dicen si el movimiento del precio está en el comienzo, en el medio o en el final.',
      'A Treend não compete com a sua análise. Ela completa:': 'Treend no compite con su análisis. Lo completa:',
      'uma leitura quantitativa de momento': 'una lectura cuantitativa del momento',
      ', em um número de 0 a 100.': ', en un número del 0 al 100.',
      'Análise sólida': 'Análisis sólido',
      'timing quantitativo': 'timing cuantitativo',
      'mais margem de segurança em cada aporte.': 'más margen de seguridad en cada aporte.',
      'Plataformas de dados': 'Plataformas de datos',
      'Casas de recomendação': 'Casas de recomendación',
      'Planilha própria': 'Hoja de cálculo propia',
      'Indicador de topo e fundo': 'Indicador de techo y suelo',
      'Timing quantitativo, sem opinião': 'Timing cuantitativo, sin opinión',
      'depende do analista': 'depende del analista',
      '6 classes de ativos em um lugar': '6 clases de activos en un solo lugar',
      'em geral um mercado': 'en general un mercado',
      'se você montar': 'si usted la construye',
      'Alertas quando o ativo chega à sua zona': 'Alertas cuando el activo llega a su zona',
      'A decisão continua sua': 'La decisión sigue siendo suya',
      'Preço por mês': 'Precio por mes',
      'Suas horas': 'Sus horas',
      'Faixas de preço de referência do mercado brasileiro de assinaturas de investimento, convertidas a R$ 5,40/US$, apenas para comparação.':
        'Rangos de precio de referencia del mercado brasileño de suscripciones de inversión, convertidos a R$ 5,40/US$, solo para comparación.',

      /* ── bento ── */
      'Tudo o que importa.': 'Todo lo que importa.',
      'Nada do que distrai.': 'Nada que distraiga.',
      'Milhares de pontos de dados analisados diariamente, resumidos no que muda a sua decisão.':
        'Miles de puntos de datos analizados a diario, resumidos en lo que cambia su decisión.',
      'Index Score de 0 a 100': 'Index Score del 0 al 100',
      'Um número por ativo e por tempo gráfico. Quanto maior, mais descontado o preço está naquela janela. Cinco zonas, de esticado a muito abaixo da média.':
        'Un número por activo y por temporalidad. Cuanto más alto, más descontado está el precio en esa ventana. Cinco zonas, de estirado a muy por debajo del promedio.',
      'Alertas de Movimento': 'Alertas de Movimiento',
      'Aviso quando um ativo da sua lista chega à zona que você definiu: desconto raro para comprar, ou preço esticado para realizar.':
        'Un aviso cuando un activo de su lista llega a la zona que usted definió: descuento raro para comprar, o precio estirado para realizar.',
      '6 mercados, 1 assinatura': '6 mercados, 1 suscripción',
      'Pare de pagar uma assinatura para cada classe de ativo.': 'Deje de pagar una suscripción por cada clase de activo.',
      'Filtros e dashboard sem poluição': 'Filtros y panel sin ruido',
      'Filtre por zona, mercado e setor. Sua lista inteira de relance, sem abrir um único gráfico.':
        'Filtre por zona, mercado y sector. Toda su lista de un vistazo, sin abrir un solo gráfico.',
      'Logística': 'Logística',
      '+ filtro': '+ filtro',

      /* ── platform tour ── */
      'Por dentro da plataforma.': 'Por dentro de la plataforma.',
      'Telas reais da Treend.': 'Pantallas reales de Treend.',
      'Tudo o que você acessa ao assinar: do índice de um único ativo ao mapa do mercado inteiro.':
        'Todo lo que recibe al suscribirse: desde el índice de un solo activo hasta el mapa de todo el mercado.',
      'Analisar ativo': 'Analizar activo',
      'O Índice Treend de qualquer ativo em cinco tempos gráficos (1h, 4h, diário, semanal e mensal) lado a lado. Quando as janelas concordam, a leitura é mais forte. Na mesma tela: preço, dividendos e atalho para criar um radar.':
        'El Índice Treend de cualquier activo en cinco temporalidades (1h, 4h, diario, semanal y mensual) lado a lado. Cuando las ventanas coinciden, la lectura es más fuerte. En la misma pantalla: precio, dividendos y atajo para crear un radar.',
      'Cenários · Bolhas': 'Escenarios · Burbujas',
      'Escolha "quero comprar" ou "quero vender" e veja os ativos com leitura extrema naquele lado. Cada bolha é um ativo: quanto maior, mais extremo o momento.':
        'Elija "quiero comprar" o "quiero vender" y vea los activos con lectura extrema en ese lado. Cada burbuja es un activo: cuanto más grande, más extremo el momento.',
      'Cenários · Calor por setor': 'Escenarios · Calor por sector',
      'O mesmo cenário em um mapa por setor: bancos, energia, varejo, saneamento. Você vê de relance onde estão os descontos e onde o preço já esticou.':
        'El mismo escenario en un mapa por sector: bancos, energía, comercio, saneamiento. Ve de un vistazo dónde están los descuentos y dónde el precio ya se estiró.',
      'Mapa de calor': 'Mapa de calor',
      '375 ações da B3 em cinco tempos gráficos numa única grade, com painel do ativo ao lado: pressão de preço, volatilidade e momentum.':
        '375 acciones de la B3 en cinco temporalidades en una sola cuadrícula, con panel del activo al lado: presión de precio, volatilidad y momentum.',
      'Radar': 'Radar',
      'Defina o gatilho (ativo, janela e zona alvo). O agente monitora 24/7 e avisa por e-mail e push quando o cenário aparece.':
        'Defina el disparador (activo, ventana y zona objetivo). El agente monitorea 24/7 y avisa por correo y push cuando aparece el escenario.',
      'Ações B3, Câmbio, Commodities, Cripto, FIIs e Stocks: seis classes de ativos com a mesma leitura e visão geral própria.':
        'Acciones B3, Divisas, Commodities, Cripto, FIIs y Stocks: seis clases de activos con la misma lectura y su propia visión general.',
      'Dividendos': 'Dividendos',
      'Todas as empresas da B3 que pagam proventos: dividend yield, proventos por ação, payout e último pagamento, com agenda de datas ex e de pagamento dos próximos dias.':
        'Todas las empresas de la B3 que pagan dividendos: dividend yield, dividendos por acción, payout y último pago, con agenda de fechas ex y de pago de los próximos días.',
      'Projeções': 'Proyecciones',
      'Zonas de intensidade para quem compra e para quem vende: as faixas de preço projetadas em cada tempo gráfico, com a faixa de 52 semanas e atalho para criar radar.':
        'Zonas de intensidad para quien compra y para quien vende: los rangos de precio proyectados en cada temporalidad, con el rango de 52 semanas y atajo para crear un radar.',
      'Concierge': 'Concierge',
      'Descreva sua operação em uma frase: o ativo, o valor, o prazo e o que pretende fazer. O Concierge devolve a leitura nos cinco tempos gráficos, uma simulação de entradas, os cenários e as notícias do ativo.':
        'Describa su operación en una frase: el activo, el monto, el plazo y qué pretende hacer. El Concierge devuelve la lectura en las cinco temporalidades, una simulación de entradas, los escenarios y las noticias del activo.',
      'As manchetes que movem ações, FIIs, stocks, câmbio, cripto e commodities, organizadas por classe e por ativo, com o Briefing Treend: o que aconteceu e qual o impacto.':
        'Los titulares que mueven acciones, FIIs, stocks, divisas, cripto y commodities, organizados por clase y por activo, con el Briefing Treend: qué pasó y cuál es el impacto.',
      '5 tempos gráficos': '5 temporalidades',
      'Dividendos e payout': 'Dividendos y payout',
      'Salvar e criar radar': 'Guardar y crear radar',
      'Lado comprador ou vendedor': 'Lado comprador o vendedor',
      'Leituras extremas': 'Lecturas extremas',
      'Por classe de ativo': 'Por clase de activo',
      'Agrupado por setor': 'Agrupado por sector',
      'Verde a vermelho': 'De verde a rojo',
      '375 ações da B3': '375 acciones de la B3',
      '375 ações B3': '375 acciones B3',
      'Grade por janela': 'Cuadrícula por ventana',
      'Painel com detalhes': 'Panel con detalles',
      'Monitoramento 24/7': 'Monitoreo 24/7',
      'Gatilho por zona': 'Disparador por zona',
      'Agenda de proventos': 'Agenda de dividendos',
      'Zonas de compra e venda': 'Zonas de compra y venta',
      'Faixa de 52 semanas': 'Rango de 52 semanas',
      'Por tempo gráfico': 'Por temporalidad',
      'Pergunte em português': 'Pregunte en lenguaje natural',
      'Simulação de entradas': 'Simulación de entradas',
      'Cenários e notícias': 'Escenarios y noticias',
      'Revista, Edição e Feed': 'Revista, Edición y Feed',
      'Briefing Treend': 'Briefing Treend',
      'Notícias por ativo': 'Noticias por activo',
      'Notícias de câmbio': 'Noticias de cambio',
      'Dólar, euro e demais moedas em modo Revista, com as manchetes que mexem na cotação.': 'Dólar, euro y demás monedas en modo Revista, con los titulares que mueven la cotización.',
      'Notícias de câmbio em modo Revista': 'Noticias de cambio en modo Revista',
      '💱 Câmbio': '💱 Cambio',

      /* ── feature strip ── */
      'Visão geral do seu mercado': 'Visión general de su mercado',
      'Um resumo do dia por classe e por perfil, com a melhor janela agora, notícias e o Concierge.':
        'Un resumen del día por clase y por perfil, con la mejor ventana ahora, noticias y el Concierge.',
      'Playbook Treend': 'Playbook Treend',
      'Um guia em seis capítulos que ensina a ler o índice, combinar tempos gráficos e aplicar por classe de ativo.':
        'Una guía en seis capítulos que enseña a leer el índice, combinar temporalidades y aplicarlo por clase de activo.',
      'Alertas sem vigiar a tela': 'Alertas sin vigilar la pantalla',
      'Configure uma vez. O Radar avisa quando o ativo entra na zona que você definiu.':
        'Configúrelo una vez. El Radar avisa cuando el activo entra en la zona que usted definió.',
      'Quanto rende a sua operação': 'Cuánto rinde su operación',
      'Informe compra, venda e custos: a Calculadora mostra resultado bruto, IR estimado, resultado líquido e os dividendos do período.':
        'Indique compra, venta y costos: la Calculadora muestra resultado bruto, impuesto estimado, resultado neto y los dividendos del período.',
      'Simule antes de entrar': 'Simule antes de entrar',
      'Escolha ativo, valor e horizonte e veja os cenários pessimista, base e otimista, junto com a leitura de timing da Treend.':
        'Elija activo, monto y horizonte y vea los escenarios pesimista, base y optimista, junto con la lectura de timing de Treend.',
      'Câmbio sem pagar a mais': 'Divisas sin pagar de más',
      'Compare a taxa que você paga hoje com a referência Treend e veja o impacto em 12 e 24 meses, para remessas e investimentos no exterior.':
        'Compare la tasa que paga hoy con la referencia Treend y vea el impacto en 12 y 24 meses, para remesas e inversiones en el exterior.',

      /* ── news ── */
      'As notícias que movem': 'Las noticias que mueven',
      'o seu ativo.': 'su activo.',
      'Manchetes de ações, FIIs, stocks, câmbio, cripto e commodities, com o contexto que a manchete não traz.':
        'Titulares de acciones, FIIs, stocks, divisas, cripto y commodities, con el contexto que el titular no trae.',
      'Revista': 'Revista',
      'As principais histórias do dia em capas e cards, filtradas por classe de ativo.':
        'Las principales historias del día en portadas y tarjetas, filtradas por clase de activo.',
      'Edição': 'Edición',
      'A edição do dia em lista numerada, para ler tudo em poucos minutos.':
        'La edición del día en lista numerada, para leerlo todo en pocos minutos.',
      'Feed com Briefing Treend': 'Feed con Briefing Treend',
      'Cada notícia resumida em "o que aconteceu" e no impacto para quem compra e para quem vende.':
        'Cada noticia resumida en "qué pasó" y en el impacto para quien compra y para quien vende.',
      'Na análise de um ativo, como ITUB4, as manchetes daquela empresa em cards com imagem, ao lado do índice e dos dividendos.':
        'En el análisis de un activo, como ITUB4, los titulares de esa empresa en tarjetas con imagen, al lado del índice y de los dividendos.',
      'ao vivo': 'en vivo',
      'Telas reais da plataforma em 28/10/2026, com o filtro Ações B3.':
        'Pantallas reales de la plataforma el 28/10/2026, con el filtro Acciones B3.',

      /* ── crypto ── */
      'Cripto com método.': 'Cripto con método.',
      'Não com hype.': 'No con hype.',
      'Mais de 400 criptomoedas negociadas em USDT, com o mesmo Índice Treend de 0 a 100. Em um mercado que não fecha e muda rápido, o índice separa o desconto real do barulho.':
        'Más de 400 criptomonedas negociadas en USDT, con el mismo Índice Treend del 0 al 100. En un mercado que no cierra y cambia rápido, el índice separa el descuento real del ruido.',
      'Mercado que nunca fecha': 'Un mercado que nunca cierra',
      'O índice é recalculado o tempo todo, inclusive à noite e no fim de semana.':
        'El índice se recalcula todo el tiempo, incluso de noche y el fin de semana.',
      'CONTEXTO': 'CONTEXTO',
      'Semanal e mensal mandam': 'El semanal y el mensual mandan',
      'As janelas longas dizem se a moeda está cara ou barata no ciclo maior.':
        'Las ventanas largas dicen si la moneda está cara o barata en el ciclo mayor.',
      'GATILHO': 'DISPARADOR',
      '1h e 4h refinam a entrada': '1h y 4h refinan la entrada',
      'Em cripto, as janelas curtas mudam rápido: use para o ponto de entrada, não para a tese.':
        'En cripto, las ventanas cortas cambian rápido: úselas para el punto de entrada, no para la tesis.',
      'RADAR': 'RADAR',
      'Alerta quando o desconto aparece': 'Alerta cuando aparece el descuento',
      'Configure BTC, ETH ou qualquer altcoin e receba o aviso por e-mail e push.':
        'Configure BTC, ETH o cualquier altcoin y reciba el aviso por correo y push.',
      'criptomoedas monitoradas': 'criptomonedas monitoreadas',
      'abaixo da média no diário': 'por debajo del promedio en el diario',
      'esticadas no diário': 'estiradas en el diario',
      'Retrato da plataforma em 28/10/2026. Cripto é um mercado de alto risco; não é recomendação de investimento.':
        'Retrato de la plataforma el 28/10/2026. Cripto es un mercado de alto riesgo; no es recomendación de inversión.',

      /* ── FX ── */
      'Câmbio na janela certa.': 'Divisas en la ventana correcta.',
      'Sem pagar spread a mais.': 'Sin pagar spread de más.',
      'Para quem importa, exporta, viaja ou investe lá fora: 11 moedas contra o real, com o Índice Treend calibrado para o seu perfil.':
        'Para quien importa, exporta, viaja o invierte afuera: 11 monedas contra el real, con el Índice Treend calibrado para su perfil.',
      'Você praticamente': 'Usted prácticamente',
      'zera o spread': 'elimina el spread',
      'que paga a mais.': 'que paga de más.',
      'A calculadora compara a taxa que você paga hoje com a referência Treend e mostra quanto fica no banco a cada operação.':
        'La calculadora compara la tasa que paga hoy con la referencia Treend y muestra cuánto se queda el banco en cada operación.',
      'Dólar, euro, libra, yuan e mais': 'Dólar, euro, libra, yuan y más',
      'Cotação, variação e o Índice Treend de cada moeda em um clique.':
        'Cotización, variación y el Índice Treend de cada moneda en un clic.',
      'Leitura para o seu perfil': 'Lectura para su perfil',
      'Importador, exportador, agente de turismo ou renda global: o mesmo câmbio, a leitura certa para quem compra ou vende moeda.':
        'Importador, exportador, agente de turismo o renta global: el mismo mercado de divisas, la lectura correcta para quien compra o vende moneda.',
      'Quanto custa o seu spread': 'Cuánto le cuesta su spread',
      'Pagando 1,50% com a referência em 0,50%, uma operação de US$ 50 mil/mês deixa R$ 2.695 por mês na mesa.':
        'Pagando 1,50% con la referencia en 0,50%, una operación de US$ 50 mil/mes deja R$ 2.695 por mes sobre la mesa.',
      'Alerta na janela ideal': 'Alerta en la ventana ideal',
      'O Radar avisa quando a moeda entra na zona certa para o seu lado da operação.':
        'El Radar avisa cuando la moneda entra en la zona correcta para su lado de la operación.',
      'cotação ao vivo': 'cotización en vivo',
      'Economia estimada em 12 meses': 'Ahorro estimado en 12 meses',
      'Simule o ciclo': 'Simule el ciclo',
      'de cada moeda.': 'de cada moneda.',
      'Para quem compra moeda, o índice alto mostra o câmbio descontado: a hora de fechar a operação. Quando o preço estica, a Treend sinaliza esperar.':
        'Para quien compra moneda, un índice alto muestra el cambio descontado: el momento de cerrar la operación. Cuando el precio se estira, Treend indica esperar.',
      'Dólar americano': 'Dólar estadounidense',
      'Libra esterlina': 'Libra esterlina',
      'Yuan chinês': 'Yuan chino',
      'Dólar americano · Diário': 'Dólar estadounidense · Diario',
      'Euro · Diário': 'Euro · Diario',
      'Libra esterlina · Diário': 'Libra esterlina · Diario',
      'Yuan chinês · Diário': 'Yuan chino · Diario',
      'Cotação': 'Cotización',
      'Índice · quem compra': 'Índice · quien compra',
      'Desconto raro': 'Descuento raro',
      'Telas reais da plataforma em 30/10/2026. Exemplo da calculadora: US$ 50 mil por mês, spread pago de 1,50% contra a referência Treend de 0,50%. Valores ilustrativos; a economia depende da sua operação e da negociação com a sua instituição. O simulador usa a faixa real de 30 dias de cada moeda em um ciclo ilustrativo.':
        'Pantallas reales de la plataforma el 30/10/2026. Ejemplo de la calculadora: US$ 50 mil por mes, spread pagado de 1,50% contra la referencia Treend de 0,50%. Valores ilustrativos; el ahorro depende de su operación y de la negociación con su institución. El simulador usa el rango real de 30 días de cada moneda en un ciclo ilustrativo.',
      'Dólar: cotação e Índice Treend': 'Dólar: cotización e Índice Treend',
      'Euro: cotação e Índice Treend': 'Euro: cotización e Índice Treend',
      'Libra: cotação e Índice Treend': 'Libra: cotización e Índice Treend',
      'Yuan: cotação e Índice Treend': 'Yuan: cotización e Índice Treend',
      'Calculadora de spread da Treend': 'Calculadora de spread de Treend',
      'Calculadora de spread de câmbio': 'Calculadora de spread de divisas',

      /* ── MCP ── */
      'A Treend dentro': 'Treend dentro',
      'da sua IA.': 'de su IA.',
      'Com o': 'Con el',
      'Treend MCP': 'Treend MCP',
      ', ChatGPT, Claude, Gemini, Grok e agentes de IA consultam o Índice Treend de qualquer ativo, em qualquer tempo gráfico, direto na conversa. Você pergunta em português; a IA busca os dados na Treend e explica. Na sua conta, ela também gerencia seus ativos, radares, alertas e histórico.':
        ', ChatGPT, Claude, Gemini, Grok y agentes de IA consultan el Índice Treend de cualquier activo, en cualquier temporalidad, directo en la conversación. Usted pregunta en su idioma; la IA busca los datos en Treend y los explica. En su cuenta también gestiona sus activos, radares, alertas e historial.',
      '+ agentes compatíveis com MCP': '+ agentes compatibles con MCP',
      'Solicite o acesso': 'Solicite el acceso',
      'Na plataforma, em': 'En la plataforma, en',
      '. O acesso é liberado por conta.': '. El acceso se habilita por cuenta.',
      'Conecte seu link pessoal': 'Conecte su enlace personal',
      'Cole o endereço': 'Pegue la dirección',
      'nas conexões da sua IA.': 'en las conexiones de su IA.',
      'Pergunte naturalmente': 'Pregunte con naturalidad',
      'Scores, rankings e visão do mercado, em linguagem natural.':
        'Scores, rankings y visión del mercado, en lenguaje natural.',
      'Solicitar acesso ao MCP': 'Solicitar acceso al MCP',
      'Ranking': 'Ranking',
      'Pergunte sobre qualquer ativo…': 'Pregunte sobre cualquier activo…',
      'Como está PETR4 em cada tempo gráfico?': '¿Cómo está PETR4 en cada temporalidad?',
      '(+0,17% hoje). As janelas curtas estão abaixo da média, as longas ainda pedem atenção:':
        '(+0,17% hoy). Las ventanas cortas están por debajo del promedio, las largas aún piden atención:',
      'Tempo gráfico': 'Temporalidad',
      'Índice': 'Índice',
      'Zona': 'Zona',
      '1 hora': '1 hora',
      '4 horas': '4 horas',
      'Diário': 'Diario',
      'Semanal': 'Semanal',
      'Mensal': 'Mensual',
      'Leitura: desconto no curto prazo, mas': 'Lectura: descuento en el corto plazo, pero',
      'sem alinhamento de janelas': 'sin alineación de ventanas',
      '. O contexto semanal e mensal ainda não confirma.': '. El contexto semanal y mensual aún no lo confirma.',
      'Quais FIIs estão com mais desconto hoje?': '¿Qué FIIs están con más descuento hoy?',
      'ranking_oportunidades · fiis · diário': 'ranking_oportunidades · fiis · diario',
      'Os FIIs com índice diário mais alto agora, cruzados com o P/VP:':
        'Los FIIs con el índice diario más alto ahora, cruzados con el P/VP:',
      'FII': 'FII',
      '· Tijolo': '· Ladrillo',
      '· Misto': '· Mixto',
      '· CRI Infra': '· CRI Infra',
      '· Logística': '· Logística',
      'JFLL11 e MMVE11 combinam índice alto com P/VP abaixo de 1: a Treend chama isso de':
        'JFLL11 y MMVE11 combinan índice alto con P/VP por debajo de 1: Treend lo llama',
      'assimetria de compra': 'asimetría de compra',
      '. VGII11 e PNDL11 estão em oportunidade, mas negociados com ágio.':
        '. VGII11 y PNDL11 están en oportunidad, pero cotizan con prima.',
      'Quais mercados você consegue analisar pela Treend?': '¿Qué mercados puede analizar con Treend?',
      'Pela Treend eu consigo consultar': 'Con Treend puedo consultar',
      'seis classes de ativos': 'seis clases de activos',
      ', todas com o mesmo índice de 0 a 100 em cinco tempos gráficos:':
        ', todas con el mismo índice del 0 al 100 en cinco temporalidades:',
      'Classe': 'Clase',
      'Exemplos': 'Ejemplos',
      'com P/VP e DY': 'con P/VP y DY',
      'petróleo, ouro, grãos': 'petróleo, oro, granos',
      'É só me dizer o ativo ou pedir um ranking.': 'Solo dígame el activo o pida un ranking.',
      'Sou importador e vou comprar US$ 50 mil. Compro dólar agora ou espero?':
        'Soy importador y voy a comprar US$ 50 mil. ¿Compro dólares ahora o espero?',
      'analisar_ativo · USD/BRL + projecoes_cambio · importador': 'analisar_ativo · USD/BRL + projecoes_cambio · importador',
      '(+0,90% hoje). Para quem compra dólar, o momento é de': '(+0,90% hoy). Para quien compra dólares, el momento es de',
      'preço esticado': 'precio estirado',
      'no curto prazo:': 'en el corto plazo:',
      'As zonas de compra do importador hoje vão de': 'Las zonas de compra del importador hoy van de',
      '(zona 1) a': '(zona 1) a',
      '(zona 6, a mais vantajosa). Fechar os US$ 50 mil na zona 6 em vez de agora custaria cerca de':
        '(zona 6, la más ventajosa). Cerrar los US$ 50 mil en la zona 6 en lugar de ahora costaría cerca de',
      'R$ 730 a menos': 'R$ 730 menos',
      '. Leitura: escalonar e deixar um alerta no Radar para a zona 6.':
        '. Lectura: escalonar y dejar una alerta en el Radar para la zona 6.',
      'Preço, variação e índice em 5 tempos gráficos. Em FIIs, P/VP e DY.':
        'Precio, variación e índice en 5 temporalidades. En FIIs, P/VP y DY.',
      'Os mais descontados ou mais esticados de uma classe.': 'Los más descontados o más estirados de una clase.',
      'O retrato do momento de cada mercado.': 'El retrato del momento de cada mercado.',
      'Encontra o ativo pelo nome ou código.': 'Encuentra el activo por nombre o código.',
      'Ações B3, Stocks, Cripto, Commodities, Câmbio e FIIs.': 'Acciones B3, Stocks, Cripto, Commodities, Divisas y FIIs.',
      'Consulta sua lista;': 'Consulta su lista;',
      'a atualizam pela conversa.': 'la actualizan por la conversación.',
      'Zonas de preço projetadas para comprar e vender em cada tempo gráfico. Em câmbio,':
        'Zonas de precio proyectadas para comprar y vender en cada temporalidad. En divisas,',
      'Descreva a operação (moeda, valor, prazo) e receba a leitura e a simulação.':
        'Describa la operación (moneda, monto, plazo) y reciba la lectura y la simulación.',
      'As manchetes do mercado ou de um ativo, direto na conversa.':
        'Los titulares del mercado o de un activo, directo en la conversación.',
      'Cria e ajusta radares (': 'Crea y ajusta radares (',
      ') para ser avisado na zona certa.': ') para ser avisado en la zona correcta.',
      'Alertas de preço e de zona;': 'Alertas de precio y de zona;',
      'para gerenciar.': 'para gestionarlas.',
      'Suas análises e operações salvas;': 'Sus análisis y operaciones guardadas;',
      'para limpar.': 'para borrarlos.',
      'Respostas com dados reais consultados via Treend MCP em 28/10/2026 (câmbio em 30/10/2026), apenas para demonstração. A disponibilidade do MCP é liberada por conta. Não é recomendação de investimento.':
        'Respuestas con datos reales consultados vía Treend MCP el 28/10/2026 (divisas el 30/10/2026), solo para demostración. La disponibilidad del MCP se habilita por cuenta. No es recomendación de inversión.',

      /* ── simulator ── */
      'Prove antes de assinar.': 'Pruébelo antes de suscribirse.',
      'Três ativos por mercado estão liberados. Pesquise qualquer outro: ele aparece aqui, bloqueado para assinantes.':
        'Tres activos por mercado están liberados. Busque cualquier otro: aparece aquí, bloqueado para suscriptores.',
      'Pesquisar ativo': 'Buscar activo',
      'VALE3, AAPL, SOJA, BTC…': 'VALE3, AAPL, SOJA, BTC…',
      'Nenhum ativo encontrado': 'Ningún activo encontrado',
      'Ativo monitorado pela Treend': 'Activo monitoreado por Treend',
      'Dados ilustrativos. Não é recomendação de compra ou venda.':
        'Datos ilustrativos. No es recomendación de compra o venta.',
      'Score de': 'Score de',
      'bloqueado': 'bloqueado',
      'Você testou a prévia. Desbloqueie o Índice Treend de +5.000 ativos com a Treend Pro.':
        'Usted probó la vista previa. Desbloquee el Índice Treend de más de 5.000 activos con Treend Pro.',
      'Soja FOB Santos': 'Soja FOB Santos',
      'Ouro (micro futuro)': 'Oro (micro futuro)',
      'Petróleo Brent': 'Petróleo Brent',
      'Petróleo WTI': 'Petróleo WTI',
      'Trigo KC HRW': 'Trigo KC HRW',
      'Café arábica': 'Café arábica',
      'Minério de ferro': 'Mineral de hierro',
      'Milho': 'Maíz',
      'Cobre': 'Cobre',
      'Lítio': 'Litio',
      'Preço em região de suporte histórico com exaustão de venda.':
        'Precio en región de soporte histórico con agotamiento de la venta.',
      'Preço em equilíbrio com a média histórica; momentum neutro.':
        'Precio en equilibrio con el promedio histórico; momentum neutro.',
      'Distância extrema da média com divergência de força compradora.':
        'Distancia extrema del promedio con divergencia de fuerza compradora.',
      'P/VP abaixo da média histórica com fluxo vendedor exaurido.':
        'P/VP por debajo del promedio histórico con flujo vendedor agotado.',
      'Cotação em equilíbrio com o valor patrimonial; ciclo neutro.':
        'Cotización en equilibrio con el valor patrimonial; ciclo neutro.',
      'Cotação esticada acima da média com sinais de exaustão compradora.':
        'Cotización estirada por encima del promedio con señales de agotamiento comprador.',
      'Teste de suporte de longo prazo com volume vendedor decrescente.':
        'Prueba de soporte de largo plazo con volumen vendedor decreciente.',
      'Consolidação lateral após correção; momentum neutro.':
        'Consolidación lateral tras la corrección; momentum neutro.',
      'Sobrecompra extrema em múltiplos tempos gráficos; risco de realização.':
        'Sobrecompra extrema en múltiples temporalidades; riesgo de realización.',

      /* ── calculator ── */
      'Um aporte no topo': 'Un aporte en el techo',
      'custa mais que a assinatura.': 'cuesta más que la suscripción.',
      'Correções de 15% a 30% depois de um topo de ciclo são comuns, mesmo em ativos de excelente qualidade.':
        'Correcciones del 15% al 30% después de un techo de ciclo son comunes, incluso en activos de excelente calidad.',
      'Valor do aporte': 'Monto del aporte',
      'Queda depois do topo': 'Caída después del techo',
      'Simulação ilustrativa. Não representa retorno ou perda garantidos.':
        'Simulación ilustrativa. No representa retorno ni pérdida garantizados.',
      'Você deixa na mesa': 'Usted deja sobre la mesa',
      'em um único aporte feito no momento errado.': 'en un solo aporte hecho en el momento equivocado.',
      'Treend Pro por 1 mês': 'Treend Pro por 1 mes',
      'A perda equivale a': 'La pérdida equivale a',
      'parte de 1 mês': 'parte de 1 mes',
      'Você nunca mais comprará topo.': 'Usted no volverá a comprar en el techo.',

      /* ── pricing ── */
      'Timing profissional.': 'Timing profesional.',
      'Por menos que um erro de entrada.': 'Por menos que un error de entrada.',
      'Acesso ilimitado aos 6 mercados': 'Acceso ilimitado a los 6 mercados',
      'Ações B3, FIIs, Stocks, Commodities, Câmbio e Cripto.': 'Acciones B3, FIIs, Stocks, Commodities, Divisas y Cripto.',
      'Index Score Quantitativo': 'Index Score Cuantitativo',
      'Indicador de topo e fundo, atualizado diariamente.': 'Indicador de techo y suelo, actualizado a diario.',
      'Filtros avançados': 'Filtros avanzados',
      'Ativos e oportunidades de ciclo.': 'Activos y oportunidades de ciclo.',
      'Quando seus ativos chegarem à zona que você definiu.': 'Cuando sus activos lleguen a la zona que usted definió.',
      'Dashboard ultra-rápida': 'Panel ultrarrápido',
      'Minimalista, sem poluição visual.': 'Minimalista, sin ruido visual.',
      'Oferta ativa': 'Oferta activa',
      '/ mês': '/ mes',
      'cobrança mensal · cancele quando quiser': 'cobro mensual · cancele cuando quiera',
      'Garantir meu acesso Pro': 'Quiero mi acceso Pro',
      'Pagamento seguro via Stripe, ativação imediata': 'Pago seguro vía Stripe, activación inmediata',
      'Garantia incondicional de 7 dias': 'Garantía incondicional de 7 días',
      'Cancele a renovação quando quiser': 'Cancele la renovación cuando quiera',

      /* ── proof ── */
      'Eu sabia escolher boas empresas, mas vivia errando o timing de entrada. O Index Score da Treend me impediu de comprar no topo de um ciclo e me mostrou exatamente o fundo de ações consolidadas. Só isso já pagou anos de assinatura.':
        'Yo sabía elegir buenas empresas, pero me equivocaba todo el tiempo con el timing de entrada. El Index Score de Treend me impidió comprar en el techo de un ciclo y me mostró exactamente el suelo de acciones consolidadas. Solo eso ya pagó años de suscripción.',
      'Assinante Treend': 'Suscriptor de Treend',
      'Lucas M., assinante Treend': 'Lucas M., suscriptor de Treend',
      'Case · META · setembro de 2026': 'Caso · META · septiembre de 2026',
      'Valorização em META associada à metodologia Treend.': 'Revalorización en META asociada a la metodología Treend.',
      'Resultado informado pela Treend. Período exato, preços de entrada e saída e comprovação ainda não fornecidos; o dado não representa retorno verificado nem garante resultados futuros.':
        'Resultado informado por Treend. El período exacto, los precios de entrada y salida y la comprobación aún no se han facilitado; el dato no representa un retorno verificado ni garantiza resultados futuros.',
      'dias': 'días',
      'Você não precisa ter certeza agora.': 'Usted no necesita estar seguro ahora.',
      'Garantia incondicional. Teste o Index Score nos seus ativos; se não agregar ao seu processo, devolvemos 100% do valor.':
        'Garantía incondicional. Pruebe el Index Score en sus activos; si no aporta a su proceso, le devolvemos el 100%.',

      /* ── FAQ ── */
      'Perguntas': 'Preguntas',
      'frequentes': 'frecuentes',
      'A Treend faz recomendação de compra ou venda?': '¿Treend hace recomendaciones de compra o venta?',
      'Não. A Treend é uma plataforma de dados e inteligência quantitativa. Entregamos indicadores claros (Index Score) para que você tome decisões autônomas e embasadas.':
        'No. Treend es una plataforma de datos e inteligencia cuantitativa. Entregamos indicadores claros (Index Score) para que usted tome decisiones autónomas y fundamentadas.',
      'A Treend substitui ferramentas de dados fundamentalistas?': '¿Treend sustituye a las herramientas de datos fundamentales?',
      'Ela funciona como o módulo de timing que falta na rotina do investidor. Com o Index Score e a cobertura de Ações, FIIs, Stocks e Commodities, sua central de análise fica mais ágil e completa.':
        'Funciona como el módulo de timing que falta en la rutina del inversor. Con el Index Score y la cobertura de Acciones, FIIs, Stocks y Commodities, su central de análisis se vuelve más ágil y completa.',
      'Como funciona o pagamento?': '¿Cómo funciona el pago?',
      'Pagamento seguro via Stripe. A cobrança é mensal, de US$ 199, renovada automaticamente a cada 30 dias. Você pode cancelar a renovação quando quiser.':
        'Pago seguro vía Stripe. El cobro es mensual, de US$ 199, renovado automáticamente cada 30 días. Puede cancelar la renovación cuando quiera.',
      'Tenho garantia?': '¿Tengo garantía?',
      'Sim, garantia incondicional de 7 dias. Se os indicadores não agregarem ao seu processo de investimento, devolvemos 100% do seu dinheiro.':
        'Sí, garantía incondicional de 7 días. Si los indicadores no aportan a su proceso de inversión, le devolvemos el 100% de su dinero.',
      'Existe garantia de valorização?': '¿Existe garantía de revalorización?',
      'Não. Investimentos envolvem riscos. O Index Score apoia a leitura de momento, mas não garante retorno. Resultados passados não garantem resultados futuros.':
        'No. Invertir implica riesgos. El Index Score apoya la lectura del momento, pero no garantiza retorno. Los resultados pasados no garantizan resultados futuros.',

      /* ── final + footer + modal ── */
      'Pare de comprar no escuro.': 'Deje de comprar a ciegas.',
      'Veja o momento certo.': 'Vea el momento correcto.',
      'O Index Score está pronto. Os 6 mercados estão prontos. O próximo passo é seu.':
        'El Index Score está listo. Los 6 mercados están listos. El próximo paso es suyo.',
      'Privacidade': 'Privacidad',
      'Treend. A Treend não faz recomendação de investimento. Os indicadores são informativos e não garantem rentabilidade futura.':
        'Treend. Treend no hace recomendaciones de inversión. Los indicadores son informativos y no garantizan rentabilidad futura.',
      'Fechar': 'Cerrar',
      'Falta pouco para liberar seu acesso': 'Falta poco para liberar su acceso',
      'Preencha seus dados e siga para o pagamento seguro no Stripe. US$ 199/mês.':
        'Complete sus datos y siga al pago seguro en Stripe. US$ 199/mes.',
      'e': 'y',
      'Nome': 'Nombre',
      'E-mail': 'Correo',
      'Seu nome completo': 'Su nombre completo',
      'voce@email.com': 'usted@email.com',
      'Ir para o pagamento': 'Ir al pago',
      'Abrindo pagamento…': 'Abriendo el pago…',
      'Informe seu nome.': 'Indique su nombre.',
      'Informe um e-mail válido.': 'Indique un correo válido.',
      'Informe um WhatsApp com DDD.': 'Indique un WhatsApp con código de área.',
      'Informe um WhatsApp com código do país (ex.: +1 212 555 0123).': 'Indique un WhatsApp con código de país (ej.: +34 612 345 678).',
      '+55 11 99999-9999': '+34 612 345 678',
      'Seus dados estão seguros · Garantia de 7 dias': 'Sus datos están seguros · Garantía de 7 días',
      '· US$ 199/mês': '· US$ 199/mes',

      /* ── image alt text ── */
      'Tela Analisar ativo da plataforma Treend': 'Pantalla Analizar activo de la plataforma Treend',
      'Tela Cenários · Bolhas da plataforma Treend': 'Pantalla Escenarios · Burbujas de la plataforma Treend',
      'Tela Cenários · Calor por setor da plataforma Treend': 'Pantalla Escenarios · Calor por sector de la plataforma Treend',
      'Tela Mapa de calor da plataforma Treend': 'Pantalla Mapa de calor de la plataforma Treend',
      'Tela Radar da plataforma Treend': 'Pantalla Radar de la plataforma Treend',
      'Tela Mercados da plataforma Treend': 'Pantalla Mercados de la plataforma Treend',
      'Tela Dividendos da plataforma Treend': 'Pantalla Dividendos de la plataforma Treend',
      'Tela Projeções da plataforma Treend': 'Pantalla Proyecciones de la plataforma Treend',
      'Tela Concierge da plataforma Treend': 'Pantalla Concierge de la plataforma Treend',
      'Tela Notícias da plataforma Treend': 'Pantalla Noticias de la plataforma Treend',
      'Visão geral da Treend': 'Visión general de Treend',
      'Radar Treend': 'Radar Treend',
      'Calculadora de operação em Ações B3': 'Calculadora de operación en Acciones B3',
      'Simulador de cenários em Ações B3': 'Simulador de escenarios en Acciones B3',
      'Notícias em modo Revista': 'Noticias en modo Revista',
      'Notícias em modo Edição': 'Noticias en modo Edición',
      'Notícias em modo Feed com Briefing Treend': 'Noticias en modo Feed con Briefing Treend',
      'Notícias sobre ITUB4 em cards na análise do ativo': 'Noticias sobre ITUB4 en tarjetas en el análisis del activo',
      'Mapa do Índice Treend para criptomoedas': 'Mapa del Índice Treend para criptomonedas',

      /* ── head ── */
      'Treend Pro — Saiba o momento de comprar': 'Treend Pro — Sepa cuándo comprar',
      'Index Score Quantitativo da Treend: topo e fundo de mais de 5.000 ativos em Ações, FIIs, Stocks, Commodities, Câmbio e Cripto. US$ 199/mês.':
        'Index Score Cuantitativo de Treend: techo y suelo de más de 5.000 activos en Acciones, FIIs, Stocks, Commodities, Divisas y Cripto. US$ 199/mes.',
    },
  },
};
