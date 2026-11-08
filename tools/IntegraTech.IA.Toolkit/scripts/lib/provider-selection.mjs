// Installation targets are distinct from providers supported by automated review.
const selections = {
  codex: ['codex'], claude: ['claude'], cursor: ['cursor'],
  both: ['codex', 'claude'], all: ['codex', 'claude', 'cursor']
};
const labels = { codex: 'Codex', claude: 'Claude Code', cursor: 'Cursor', both: 'Codex e Claude Code', all: 'Codex, Claude Code e Cursor' };
export function selectedProviders(selection) {
  if (!Object.hasOwn(selections, selection)) throw new Error('provedor de instalação inválido');
  return [...selections[selection]];
}
export function providerLabel(selection) {
  selectedProviders(selection);
  return labels[selection];
}
