import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';

test('Windows helper has a short launcher, masked password field, valid UNC and scoped credential repair', async t => {
  const source = await readFile(new URL('../console.js', import.meta.url), 'utf8');
  const fn = source.slice(source.indexOf('  function windowsHelper'), source.indexOf('  function connectShare'));
  const command = vm.runInNewContext(fn + "windowsHelper('192.168.68.55','test-nexus','nx_nariod','Z')", { L: value => value, TextEncoder, btoa: value => Buffer.from(value, 'binary').toString('base64') });
  assert.ok(command.split('\r\n').find(line => line.startsWith('start ')).length < 8191);
  const script = Buffer.from(command.split('::NEXUS_PAYLOAD::\r\n')[1].trim(), 'base64').toString('utf16le');
  const config = JSON.parse(Buffer.from(/FromBase64String\('([^']+)'\)/.exec(script)[1], 'base64').toString('utf8'));
  assert.equal(config.path, '\\\\192.168.68.55\\test-nexus'); assert.equal(config.account, 'nx_nariod');
  assert.match(script, /UseSystemPasswordChar = \$true/);
  assert.match(script, /WNetAddConnection2/); assert.match(script, /WNetCancelConnection2\(\$target,0,\$false\)/);
  assert.match(script, /\$mapping.LocalPath/);
  assert.match(script, /RemotePath.StartsWith\(\$prefix/);
  assert.doesNotMatch(script, /net use \*.*delete|EnableInsecureGuestLogons|RequireSecuritySignature/);
  if (process.platform === 'win32') {
    const temp = await mkdtemp(path.join(os.tmpdir(), 'nexus-helper-')); t.after(() => rm(temp, { recursive: true, force: true }));
    const file = path.join(temp, 'helper.ps1'); await writeFile(file, script);
    execFileSync('powershell.exe', ['-NoProfile', '-Command', "$t=$null; $e=$null; [System.Management.Automation.Language.Parser]::ParseFile($env:NEXUS_TEST_SCRIPT,[ref]$t,[ref]$e) | Out-Null; if($e.Count){throw ($e.Message -join '; ')}; $s=[IO.File]::ReadAllText($env:NEXUS_TEST_SCRIPT); Invoke-Expression ($s.Substring(0,$s.IndexOf('$form.Add_Shown'))); if($form.Controls.Count -lt 8){throw 'Missing controls'}; $form.Dispose()"], { env: { ...process.env, NEXUS_TEST_SCRIPT: file }, encoding: 'utf8' });
  }
});
