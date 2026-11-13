const fail = message => { throw new Error(`Arquitetura: ${message}`); };
const name = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 120 && !/[\u0000-\u001f\u007f]/.test(value);

export function validateArchitectureModules(modules, profile) {
  if (!Array.isArray(modules)) fail('módulos inválidos');
  const graph = new Map();
  for (const module of modules) {
    if (!module || !name(module.name) || graph.has(module.name)) fail('módulo ausente ou duplicado');
    const dependencies = module.depends_on ?? [];
    if (!Array.isArray(dependencies) || dependencies.some(value => !name(value)) || new Set(dependencies).size !== dependencies.length) fail('dependências inválidas');
    graph.set(module.name, dependencies);
  }
  if (profile === 'modular-monolith' && !graph.size) fail('Declare os módulos do produto.');
  if (['simple-application', 'layered-monolith'].includes(profile) && graph.size) fail('Módulos exigem perfil modular.');
  const visited = new Set(), active = new Set();
  function visit(id) {
    if (!graph.has(id)) fail('dependência de módulo desconhecida');
    if (active.has(id)) fail('ciclo entre módulos');
    if (visited.has(id)) return;
    active.add(id);
    for (const dependency of graph.get(id)) visit(dependency);
    active.delete(id);
    visited.add(id);
  }
  for (const id of graph.keys()) visit(id);
  return graph;
}
