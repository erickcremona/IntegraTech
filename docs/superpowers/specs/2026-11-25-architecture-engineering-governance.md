# Architecture Engineering & Governance — design

## Objetivo

Ampliar a governança arquitetural já existente para classificar o impacto de cada tarefa SDD v2, exigir evidência e revisão proporcionais ao risco e impedir que mudanças estratégicas contornem a decisão de evolução aprovada.

## Estado encontrado

- `architecture-assess` e `architecture-check` avaliam decisões por contexto, requisitos, hashes, alternativas, pesquisa, módulos sem ciclos e aceite humano.
- `system-design-assess` é condicional; `technical-design.json` e o plano SDD v2 já vinculam o desenho por hash.
- A evolução arquitetural já exige decisão aprovada, baseline, fases, compatibilidade, rollback e plano SDD.
- O loop já executa revisão independente de código e segurança, com UX condicional.
- Não há classificação arquitetural N0–N4, revisão arquitetural condicional, nem projeção dessa classificação para a tarefa executada.
- O perfil de validação de código é explícito e limitado aos validadores existentes; o toolkit não deve afirmar verificação estrutural de produto sem um validador compatível com sua stack.

## Abordagem escolhida

Estender o fluxo SDD e o loop já existentes. Não criar novo agente permanente, dependência externa ou executor universal. A decisão arquitetural aprovada continua sendo o registro versionado de decisão (equivalente operacional a ADR para este fluxo); o plano SDD é sua trilha de evolução. Fitness Functions específicas de código continuam escolhidas por produto e stack, usando os testes e validadores aprovados.

Cada tarefa de produto com arquitetura gerenciada terá `architecture_impact`: classificação N0–N4, justificativa, sinais de impacto e componentes afetados. O validador calcula um piso de risco pelos sinais, confere consistência com requisitos e caminhos de escrita e rejeita classificação inferior ao piso. N4 exige decisão `evolution` aprovada e planos de migração já verificados pelo fluxo existente. N2+ exige revisão arquitetural independente; mudanças em persistência exigem revisão de dados. Revisões produzem achados rastreáveis e correções voltam pelo loop normal.

## Limites

- Classificação é assistência fiscalizada, não descoberta semântica perfeita; o CTO/revisor confronta sinais com requisitos e arquivos reais.
- O toolkit base não escolhe ferramenta de análise estática para linguagens de produto que ainda não foram selecionadas.
- Não executar comandos de fitness function recebidos do plano como shell arbitrário.
- Não migrar contratos v1 nem exigir arquitetura gerenciada de projetos legados sem opt-in.
- Não declarar arquitetura de código validada só porque a decisão ou o grafo de módulos foi aceito.

## Critérios de aceitação

- Piso N0–N4 deriva de sinais explícitos e nenhum sinal desconhecido é aceito como baixo risco.
- Em produto com arquitetura gerenciada, toda tarefa SDD v2 contém classificação e evidências vinculadas aos requisitos e módulos.
- N4 exige migração arquitetural aprovada, revisável e faseada.
- N2+ exige revisão independente de arquitetura; persistência exige revisão de dados.
- Achados arquiteturais têm ID único, componente/módulo, decisão relacionada, impacto, causa, alternativa, aceite, dono, testes e estado.
- Regressões legadas, UX, segurança, testes de negócio, integridade de dados e segurança continuam sob os gates existentes.
- Nenhuma dependência externa/global é introduzida.
