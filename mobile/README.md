# Treend — app iOS e Android (Capacitor)

O app abre `https://novo.treend.com.br/login` dentro de um WebView nativo.
Bundle ID: `br.com.treend.app` (troque em `capacitor.config.json` antes do primeiro envio, se quiser outro).

## Preparar
```bash
cd mobile
npm install
npx cap sync
```

## iOS (precisa de um Mac com Xcode e conta Apple Developer)
1. `npx cap open ios`
2. No Xcode: target **App** → *Signing & Capabilities* → escolha seu Team.
3. Ícone: *Assets.xcassets → AppIcon* (1024×1024 PNG, sem transparência).
4. Ajuste *Version* e *Build*.
5. Destino **Any iOS Device** → *Product → Archive* → *Distribute App → App Store Connect*.
6. No App Store Connect: crie o app, preencha textos, screenshots, política de privacidade e conta de teste para o revisor, e envie para revisão.

## Android (conta Google Play Console)
1. `npx cap open android` (Android Studio)
2. Ícone: botão direito em `res` → *New → Image Asset*.
3. *Build → Generate Signed Bundle / APK → Android App Bundle* (crie e guarde a keystore em local seguro).
4. Envie o `.aab` no Play Console (teste interno → produção).

## Checklist das lojas
- Política de privacidade pública (URL)
- Conta demo para o revisor (login + senha)
- Aviso "conteúdo informativo, não é recomendação de investimento"
- Compras de planos: a Apple exige compra in-app para assinaturas digitais
  vendidas dentro do app. Esconda o checkout no app iOS ou integre o StoreKit.
- Para reduzir o risco de rejeição pela regra 4.2 da Apple, adicione recursos nativos
  (push para alertas, Face ID).
