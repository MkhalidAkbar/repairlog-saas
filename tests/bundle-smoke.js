const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const ROOT = path.resolve(__dirname, '..');
const PORT = 8122;
const server = http.createServer((req,res)=>{
  const pathname=decodeURIComponent((req.url||'/').split('?')[0]);
  if(pathname==='/config.js'){res.writeHead(200,{'content-type':'text/javascript'});return res.end('window.APP_CONFIG={}')}
  const file=path.resolve(ROOT,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end()}
  res.writeHead(200,{'content-type':path.extname(file)==='.css'?'text/css':path.extname(file)==='.js'?'text/javascript':'text/html'});
  fs.createReadStream(file).pipe(res)
});
(async()=>{
  await new Promise(r=>server.listen(PORT,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/local/bin/chromium',args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Jakarta'});
  const page=await context.newPage(),errors=[],runtime=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.url().includes('/assets/'))runtime.push(new URL(r.url()).pathname)});
  await page.route('https://cdn.jsdelivr.net/**',route=>{
    const url=route.request().url();let body='';
    if(url.includes('supabase'))body='window.supabase={createClient(){return {}}}';
    else if(url.includes('chart.js'))body='window.Chart=function(){}';
    else if(url.includes('jspdf'))body='window.jspdf={jsPDF:function(){}}';
    else if(url.includes('html2canvas'))body='window.html2canvas=async()=>document.createElement("canvas")';
    route.fulfill({status:200,contentType:'text/javascript',body})
  });
  try{
    await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.RepairLogV354&&window.RepairLogV353&&window.RepairLogOfflineV352);
    const result=await page.evaluate(()=>({version:RepairLogV354.version,attendanceVersion:RepairLogV353.version,overflow:document.documentElement.scrollWidth>innerWidth,css:[...document.styleSheets].map(s=>s.href).filter(Boolean),scripts:[...document.scripts].map(s=>s.src).filter(src=>src.includes('/assets/')),bootMs:performance.now(),configWarn:getComputedStyle(document.getElementById('configWarn')).display}));
    assert.deepStrictEqual(errors,[],`Bundle runtime errors: ${errors.join(' | ')}`);
    assert.strictEqual(result.version,'v3.5.4');
    assert.strictEqual(result.attendanceVersion,'v3.5.3');
    assert(!result.overflow);
    assert.strictEqual(result.css.filter(x=>x.includes('/assets/')).length,1);
    assert.strictEqual(result.scripts.length,1);
    assert.strictEqual(new Set(runtime).size,2);
    console.log(JSON.stringify({suite:'bundle',...result,runtime:[...new Set(runtime)],errors},null,2))
  }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
