const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

const jsFiles = fs.readdirSync(path.join(ROOT, 'assets/js')).filter(file => file.endsWith('.js')).map(file => `assets/js/${file}`).concat(['sw.js','config.js']);
for (const file of jsFiles) new vm.Script(read(file), { filename: file });

const html = read('index.html');
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
assert.strictEqual(new Set(ids).size, ids.length, 'Duplicate HTML ids found');
const assets = [...html.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)].map(match => match[1]);
for (const asset of assets) assert(fs.existsSync(path.join(ROOT, asset)), `Missing asset ${asset}`);
const sw = read('sw.js');
for (const asset of assets) assert(sw.includes(`./${asset}`), `Service worker missing ${asset}`);
assert(sw.includes('repairlog-sync-v352') && sw.includes('REPAIRLOG_SYNC'), 'Background sync is not registered');
assert(sw.includes('caches.match("./index.html")'), 'Offline navigation fallback missing');

const operations = read('assets/js/operations.js');
const core = read('assets/js/core.js');
const dashboard = read('assets/js/dashboard.js');
const offline = read('assets/js/v352-offline-performance.js');
const approval = read('assets/js/v351-customer-store.js');
const password = read('assets/js/v348-password-reset.js');
const inventory = read('assets/js/inventory-core.js');
const attendance = read('assets/js/boot.js');

assert(operations.includes('shouldQueueOfflineV352') && operations.indexOf('shouldQueueOfflineV352') < operations.indexOf('uploadList(formMedia.before)'), 'Offline ticket hook must run before upload');
assert(offline.includes('indexedDB.open') && offline.includes('restoreSnapshot') && offline.includes('resolveConflict'), 'Offline queue primitives missing');
assert(core.includes('__repairlogDeferredModulesPromiseV352') && core.includes('requestIdleCallback'), 'Deferred module loading missing');
assert(operations.includes('loading="lazy"') && operations.includes('compressImage'), 'Lazy media or compression missing');
assert(core.includes('const per =') || dashboard.includes('const per = 9'), 'Report pagination missing');
assert(offline.includes('PerformanceObserver') && offline.includes('largest-contentful-paint'), 'Web Vitals monitoring missing');
assert(dashboard.includes('async function setStage'), 'Board stage flow missing');
assert(approval.includes('Menunggu persetujuan biaya pelanggan'), 'Approval guard missing');
assert(password.includes('verifyPasswordOtpV348') && password.includes('submitNewPasswordV348'), 'Password reset flow missing');
assert(inventory.includes('applyStockMovement') && inventory.includes('releaseReservedPartsForReport'), 'Stock movement safeguards missing');
assert(attendance.includes('attendCheckIn') && attendance.includes('attendCheckOut') && attendance.includes('autoCloseStaleAttendance'), 'Attendance workflow missing');
assert(/@media\(max-width:700px\)/.test(read('assets/css/v352-offline-performance.css')), '390px responsive rules missing');

console.log(JSON.stringify({ suite: 'static', jsFiles: jsFiles.length, htmlIds: ids.length, assets: assets.length, checks: 14 }, null, 2));
