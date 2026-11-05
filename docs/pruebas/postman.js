const newman = require('/c/Users/ALUMNO~1/AppData/Local/Temp/claude/a1150569d0d778cd/6d38b2f8-056a-408a-ba37-e92a2321a6d4/scratchpad/newman/node_modules/newman'.replace('/c/', 'C:/'));
const base = 'C:/laragon/www/api-db/postman/';
newman.run({
  collection: base + 'inventario.postman_collection.json',
  environment: base + 'local.postman_environment.json',
  envVar: [{ key: 'baseUrl', value: process.env.BASE_URL || 'http://localhost:3106/api' }],
  reporters: 'cli',
}, (err, res) => {
  if (err) { console.error(err); process.exit(1); }
  const s = res.run.stats;
  console.log('peticiones', s.requests.total, 'fallidas', s.requests.failed, '| pruebas', s.assertions.total, 'fallidas', s.assertions.failed);
  process.exitCode = s.assertions.failed || s.requests.failed ? 1 : 0;
});
