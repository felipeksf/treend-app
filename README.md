# Treend v2 — novo layout

Frontend reconstruído do zero (Vite + React + TypeScript), **separado** do app Lovable em produção.
O app em `app.treend.com.br` não foi alterado: nenhum arquivo, deploy, migração ou edge function dele foi tocado.

## Rodar

```bash
cd treend-app-v2
npm install
npm run dev     # http://localhost:5199
```

## Como se conecta

- Usa o mesmo Supabase (`mztkmlufajogxjltllhs`) com a chave publishable, como o app atual.
- Sessão salva em `treend-v2-auth`, separada da sessão do app clássico.
- Lê: cotações (`fetch-spot-rates`, AwesomeAPI, Binance, BCB PTAX), `live-heatmaps`, `fetch-news`, `summarize-news`,
  `rsi_projections`, `treend_rate`, `agenda_events`, `feed_posts`, `academy_lessons`, `tutorials`.
- Grava apenas registros do próprio usuário, com o mesmo formato do app atual: `user_decisions`, `radar_alerts`, `support_tickets`.
- **Modo visitante**: dá para navegar sem login, com dados públicos reais (cotações, mapa de calor, notícias).

## Telas

| Nova | Equivalente no clássico |
|---|---|
| Visão geral `/` | Dashboard |
| Concierge | Concierge |
| Projeções | Projeções |
| Mapa de calor | Mapa de Calor |
| Radar | Radar |
| Calculadora | Calculadora |
| Simulador | Simulador |
| Histórico | Histórico |
| Notícias | Notícias |
| Reports | Feed |
| Agenda | Agenda |
| Academy · Tutoriais · Suporte | idem |

CMP, Chat, Stocks e Admin continuam no app clássico, com link na barra lateral.

## Design

- Superfícies escuras em tom obsidiana e uma única cor de sinal (#00E5A0), com modo claro completo.
- Tipografia Geist com algarismos tabulares e Instrument Serif itálico nos títulos editoriais.
- Paleta de comandos ⌘K, atalhos ⌘1–⌘9 e ⌘. para recolher a barra lateral.
- Gauge de confiança, régua Pressão → Interessante, ticker ao vivo, gráficos de 7, 30 e 90 dias.
- Layout responsivo, com gaveta lateral no celular.

## Observações

- Login com Google em `localhost` só funciona se `http://localhost:5199` estiver nas Redirect URLs do Supabase Auth. Login com e-mail e senha funciona direto.
- O Concierge gera a análise no navegador, cruzando cotação, mapa de calor e spread de referência.
