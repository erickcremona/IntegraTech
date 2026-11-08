# Suporte nativo ao Cursor

Implementação da recomendação aprovada na conversa de 2026-11-07. O núcleo da fábrica continua comum. Gerar adaptadores nativos de Cursor (regra .mdc sempre aplicada, skills SKILL.md e perfis de agentes Markdown) a partir das mesmas fontes usadas para Codex e Claude.

## Abordagens e escolha
Só usar AGENTS.md deixaria descoberta e skills sem integração nativa. Publicar um plugin completo agora exigiria hooks/MCP/marketplace sem necessidade demonstrada. Escolha: adaptadores locais do repositório (.cursor/rules, .cursor/skills, .cursor/agents), sem publicação ou dependência de serviços externos. Formatos baseados nos repositórios oficiais cursor/plugin-template e cursor/cookbook consultados nesta sessão; nenhuma cópia de lógica externa.

## Contrato
Seleções codex, claude e both mantêm comportamento; both continua Codex+Claude. Adicionar cursor (isolado) e all (as três). Defaults antigos são preservados. AGENTS.md é entrada compartilhada Codex/Cursor; .agents e .codex apenas para Codex. Cursor usa regra sempre aplicada que aponta à governança e skills do núcleo e perfis com nome/descrição, sem inventar garantias de isolamento.

Instalação aditiva, repetível e com detecção prévia de conflitos preserva arquivos personalizados e remotos. Registrar a seleção no manifesto local de instalação permite validar a seleção instalada sem depender do provider do modelo copiado. Manifests antigos sem seleção continuam usando project.json. Projeto gerado registra sua própria seleção. Adoção aceita seleção opcional explícita e reaproveita transação/recuperação. Não copiar adaptadores de ferramentas não selecionadas nem arquivos pessoais .cursor. Handoff aceita cursor como origem, sem autorização adicional.

Cursor editor é suportado como conjunto de arquivos e fluxo nativo. Não adicionar execução de Cursor CLI/SDK ao dispatcher nesta etapa. Doctor/providers informam automação unsupported sem iniciar processo Cursor; dispatch/eval bloqueiam com motivo específico. Codex/Claude seguem inalterados. Nenhum --force, autenticação, hooks/MCP ou publicação automática.

## Validação
Testes de matriz de provedores, isolamento de arquivos, instalação idempotente/conflitos/junctions, geração e regeneração, adoção e rollback, handoff Cursor, bloqueio de automação sem chamadas de processos; CLI em processo real para geração/adoção/validação. Suite Node, check, verify com builds/ciclo de vida para modelos gerados e adotados. Não confundir validação de artefatos com execução real no editor Cursor, ausente no ambiente.
