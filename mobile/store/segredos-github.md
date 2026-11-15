# Segredos do GitHub (Settings → Secrets and variables → Actions)

| Segredo | De onde vem |
|---|---|
| ASC_KEY_ID, ASC_ISSUER_ID | App Store Connect → Usuários e acesso → Integrações → Chaves de API (função "App Manager") |
| ASC_KEY_P8_BASE64 | arquivo `.p8` baixado: `base64 -i AuthKey_XXX.p8` |
| APPLE_TEAM_ID | developer.apple.com → Membership |
| IOS_DIST_CERT_P12_BASE64, IOS_DIST_CERT_PASSWORD | certificado "Apple Distribution" exportado como .p12 (posso te guiar a gerar sem Mac via openssl) |
| ANDROID_KEYSTORE_BASE64 + senhas + alias | `keytool -genkey -v -keystore release.jks -alias treend -keyalg RSA -keysize 2048 -validity 10000` — guarde uma cópia segura, sem ela não dá para atualizar o app |
| PLAY_SERVICE_ACCOUNT_JSON_BASE64 | Play Console → Configuração → Acesso à API → conta de serviço (JSON) |

Para publicar: aba **Actions** → "Publicar app (iOS / Android)" → **Run workflow**.
Obs.: o primeiro envio do Android precisa ser feito manualmente no Play Console (exigência do Google); depois o workflow assume.
