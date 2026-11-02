import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { contained } from './paths.mjs';
export function scanText(text) {
  const rules = {
    github_token: /\b(?:gh[pousr]_[a-zA-Z0-9]{30,}|github_pat_[a-zA-Z0-9_]{40,})\b/,
    aws_access_key: /\bAKIA[A-Z0-9]{16}\b/,
    private_key: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    bearer_token: /\bBearer\s+[a-zA-Z0-9._~-]{24,}/,
    credential_url: /[a-z][a-z0-9+.-]*:\/\/[^\s/@:]+:[^\s/@]+@/i
  };
  return Object.entries(rules).filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}
export function scanRepository(repo) {
  const files = execFileSync('git', ['-C', repo, 'ls-files', '--cached', '-z'], { encoding: 'utf8', windowsHide: true }).split('\0').filter(Boolean);
  const findings = [];
  let scanned = 0, binary_skipped = 0;
  for (const path of files) {
    if (/(^|\/)(?:\.scratch|qa-artifacts|runtime-publish|bin|obj|secrets)(\/|$)|\.(?:pem|pfx|key|log|trx)$/i.test(path)
      || /(^|\/)\.env(?:\.|$)/i.test(path) && !path.endsWith('.env.example')) findings.push({ path, rule: 'local_or_sensitive_file' });
    const data = readFileSync(contained(repo, path));
    let text;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(data); if (text.includes('\0')) throw new Error('binary'); }
    catch { binary_skipped++; continue; }
    if (data.length > 2 * 1024 * 1024) { findings.push({ path, rule: 'text_exceeds_scan_limit' }); continue; }
    scanned++;
    findings.push(...scanText(text).map(rule => ({ path, rule })));
  }
  return { status: findings.length ? 'blocked' : 'passed', scanned, binary_skipped, findings, scope: 'tracked_worktree_patterns_only' };
}
