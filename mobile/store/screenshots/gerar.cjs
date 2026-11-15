// Uso: coloque os prints em originais/ com os nomes de titulos.json e rode:
//   node mobile/store/screenshots/gerar.cjs
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const dir = __dirname;
const itens = JSON.parse(fs.readFileSync(path.join(dir, 'titulos.json'), 'utf8'));
const formatos = [
  { nome: 'ios-6.7', w: 1290, h: 2796 },
  { nome: 'android', w: 1080, h: 2340 },
];
const logo = fs.readFileSync(path.join(dir, '../../../lp/favicon.svg'), 'utf8');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const f of formatos) {
    fs.mkdirSync(path.join(dir, 'prontas', f.nome), { recursive: true });
    await page.setViewportSize({ width: f.w, height: f.h });
    for (const it of itens) {
      const src = path.join(dir, 'originais', it.arquivo);
      if (!fs.existsSync(src)) { console.log('falta', it.arquivo); continue; }
      const img = 'data:image/png;base64,' + fs.readFileSync(src).toString('base64');
      const u = f.w / 100; // unidade relativa
      await page.setContent(`<html><body style="margin:0;width:${f.w}px;height:${f.h}px;overflow:hidden;
        background:linear-gradient(170deg,#476af3 0%,#2c46c4 55%,#1a2a80 100%);font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif;color:#fff;text-align:center">
        <div style="padding:${7*u}px ${7*u}px 0">
          <div style="width:${9*u}px;height:${9*u}px;margin:0 auto ${3*u}px;background:#eff4ff;border-radius:${2.6*u}px;display:flex;align-items:center;justify-content:center">${logo.replace('<svg ', `<svg width="${7*u}" height="${7*u}" `)}</div>
          <div style="font-size:${6.6*u}px;font-weight:800;line-height:1.12;letter-spacing:-0.02em">${it.titulo}</div>
          <div style="font-size:${3.5*u}px;opacity:.85;margin-top:${2*u}px">${it.sub}</div>
        </div>
        <div style="position:absolute;left:50%;transform:translateX(-50%);top:${f.h*0.20}px;width:${76*u}px;
          border:${1.6*u}px solid #0b0f17;border-radius:${9*u}px;overflow:hidden;background:#0b0f17;box-shadow:0 ${3*u}px ${8*u}px rgba(0,0,0,.35)">
          <img src="${img}" style="display:block;width:100%;border-radius:${7.5*u}px">
        </div></body></html>`);
      const out = path.join(dir, 'prontas', f.nome, it.arquivo);
      await page.screenshot({ path: out });
      console.log('ok', path.relative(dir, out));
    }
  }
  await browser.close();
})();
