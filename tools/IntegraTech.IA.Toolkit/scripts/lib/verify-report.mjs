const knownCodes = new Set([
  'EPERM', 'EACCES', 'ENOENT', 'E2BIG', 'EMFILE', 'ENFILE', 'ETIMEDOUT',
  'SPAWN_FAILED'
]);

export function failureCode(result) {
  if (result.error !== undefined) {
    return typeof result.error === 'string' && knownCodes.has(result.error)
      ? result.error
      : 'UNKNOWN';
  }
  if (result.timedOut) return 'TIMEOUT';
  if (result.overflow) return 'OUTPUT_OVERFLOW';
  if (result.code !== 0) return 'EXIT_NONZERO';
  return 'UNKNOWN';
}
export function testSuiteOutcome({result,report='',symlinkStatus='available'}){
  if(symlinkStatus==='unavailable'||report.includes('symlink_unavailable'))return {status:'blocked',reason_code:'symlink_unavailable'};
  if(result.code===0&&!result.timedOut&&!result.overflow&&!result.error)return {status:'passed'};
  return {status:'failed',reason_code:failureCode(result)};
}
