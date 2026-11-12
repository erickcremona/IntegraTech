import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const skill = readFileSync(new URL('../fabrica/skills/integratech-design-grafico/SKILL.md', import.meta.url), 'utf8');
const guide = readFileSync(new URL('../../../docs/inicio/design-grafico.md', import.meta.url), 'utf8');

test('graphic workflow turns non-negotiable visual constraints into a pass/fail review and correction loop', () => {
  for (const text of [skill, guide]) {
    assert.match(text, /restrições obrigatórias|requisitos obrigatórios/i);
    assert.match(text, /margem segura|margens seguras|margem de segurança/i);
    assert.match(text, /passa.*falha|aprovado.*reprovado/i);
    assert.match(text, /edição direcionada|correção direcionada/i);
    assert.match(text, /não declare.*atendido|nunca diga.*atendido/i);
  }
});

test('graphic workflow preserves generation capability and provenance limits', () => {
  assert.match(skill, /mesmo gerador|mesma ferramenta/i);
  assert.match(skill, /quando a sessão expuser essas opções/i);
  assert.match(guide, /a skill melhora.*não instala nem concede capacidade/i);
});
