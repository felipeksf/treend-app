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

## Publicação

Hospedagem: GitHub Pages (mesmo esquema do `links.treend.com.br`), domínio `novo.treend.com.br`.

1. Criar o repositório vazio `felipeksf/treend-app` no GitHub (público, sem README).
2. Publicar: `./deploy.sh` (gera o build e envia para o branch `gh-pages`); depois `git push -u origin main` para o código.
3. GitHub → Settings → Pages → Branch `gh-pages` / root. Custom domain `novo.treend.com.br`, Enforce HTTPS.
4. Umbler DNS: `CNAME novo → felipeksf.github.io`.
5. Supabase → Authentication → URL Configuration → Redirect URLs: adicionar `https://novo.treend.com.br/**`.

### Virada oficial (quando aprovar)
- Lovable → Settings → Domains: trocar `app.treend.com.br` por `legado.treend.com.br` (Umbler: `A legado → 185.158.133.1`).
- Umbler: `app` passa a ser `CNAME → felipeksf.github.io`; `public/CNAME` vira `app.treend.com.br`; build com `VITE_CLASSIC_URL=https://legado.treend.com.br ./deploy.sh`.
- Supabase Redirect URLs: incluir `https://legado.treend.com.br/**`.

## Leads Stripe (Admin → Comercial → Leads Stripe)

A página `/pricing` grava nome e e-mail em `stripe_leads` antes de abrir o checkout Stripe.
A tabela precisa existir no backend (Lovable Cloud). Prompt para o Lovable:

> Crie a tabela `public.stripe_leads` com as colunas: `id uuid primary key default gen_random_uuid()`, `name text`, `email text not null`, `plan text`, `coupon text`, `created_at timestamptz not null default now()`. Ative RLS. Crie uma policy que permita INSERT para os papéis `anon` e `authenticated` (with check true) e uma policy de SELECT apenas para usuários com papel `admin` na tabela `user_roles` (usando a função has_role já existente, se houver). Garanta GRANT INSERT para anon e authenticated e GRANT SELECT para authenticated. Não altere nenhuma outra tabela nem tela.

## Logo do checkout Stripe

Arquivos em `brand/`: `treend-icon-512.png` (ícone) e `treend-logo-horizontal.png` (logo).
Stripe Dashboard → Configurações → Marca (Branding) → enviar ícone e logo → Salvar.
