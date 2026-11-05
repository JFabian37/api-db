const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
(async () => {
  const readme = fs.readFileSync('C:/laragon/www/api-db/README.md', 'utf8');
  const codigo = readme.match(/```mermaid\n([\s\S]*?)```/)[1];
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
  await p.setContent('<div id="d" style="background:#fff"></div>');
  await p.addScriptTag({ path: require.resolve('mermaid/dist/mermaid.min.js') });
  const r = await p.evaluate(async (c) => {
    mermaid.initialize({ startOnLoad: false });
    await mermaid.parse(c);
    const { svg } = await mermaid.render('er', c);
    document.getElementById('d').innerHTML = svg;
    return { entidades: document.querySelectorAll('g.node, .er.entityBox, [id^="entity-"]').length, tamano: svg.length };
  }, codigo);
  console.log('diagrama valido', JSON.stringify(r));
  await p.locator('#d').screenshot({ path: path.join(__dirname, 'er.png') });
  await b.close();
})().catch((e) => { console.error('ERROR', e.message.slice(0, 400)); process.exit(1); });
