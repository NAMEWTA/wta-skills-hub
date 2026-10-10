// Test instrumentation, not shipped as a skill. A caught prohibited call still
// fails the process. These API guards are not an OS-level isolation claim.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import cp from 'node:child_process';
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import dgram from 'node:dgram';
import tls from 'node:tls';
import http2 from 'node:http2';
import { syncBuiltinESMExports } from 'node:module';
let attempted = false;
const deny = () => { attempted = true; throw new Error('prohibited runtime action'); };
for (const [api, names] of [
  [cp, ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']],
  [net, ['connect', 'createConnection', 'createServer']],
  [http, ['request', 'get', 'createServer']], [https, ['request', 'get', 'createServer']],
  [tls, ['connect', 'createServer']], [http2, ['connect', 'createServer', 'createSecureServer']],
  [dns, ['lookup', 'resolve', 'resolve4', 'resolve6', 'reverse']], [dgram, ['createSocket']],
]) for (const name of names) api[name] = deny;
for (const name of ['lookup', 'resolve', 'resolve4', 'resolve6', 'reverse']) dns.promises[name] = deny;
globalThis.fetch = deny;
net.Socket.prototype.connect = deny;
net.Server.prototype.listen = deny;
if (globalThis.WebSocket) globalThis.WebSocket = class { constructor() { deny(); } };
const credential = value => /(?:^|[/\\])(?:auth\.json|\.credentials\.json|\.claude\.json|[^/\\]+\.jsonl)$/.test(String(value));
for (const api of [fs, fsp]) {
  for (const name of ['writeFile', 'writeFileSync', 'appendFile', 'appendFileSync', 'mkdir', 'mkdirSync', 'rename', 'renameSync', 'unlink', 'unlinkSync', 'rm', 'rmSync', 'chmod', 'chmodSync']) {
    if (typeof api[name] === 'function') api[name] = deny;
  }
  for (const name of ['open', 'openSync', 'readFile', 'readFileSync', 'createReadStream']) {
    if (typeof api[name] !== 'function') continue;
    const original = api[name];
    api[name] = function(path, ...args) {
      if (credential(path)) return deny();
      if (name.startsWith('open')) {
        const flags = args[0];
        if (typeof flags === 'string' ? /[wa+]/.test(flags) : typeof flags === 'number' && (flags & (fs.constants.O_WRONLY | fs.constants.O_RDWR | fs.constants.O_CREAT))) return deny();
      }
      return original.call(this, path, ...args);
    };
  }
}
syncBuiltinESMExports();
process.on('exit', () => { if (attempted) process.exitCode = 93; });
