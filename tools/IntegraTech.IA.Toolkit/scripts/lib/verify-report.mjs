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
