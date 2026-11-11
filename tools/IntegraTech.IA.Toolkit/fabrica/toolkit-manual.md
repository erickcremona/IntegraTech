# IntegraTech.IA.Toolkit

Núcleo comum para Codex, Claude Code e Cursor. [Uso no Cursor](../../docs/inicio/cursor.md). Requer Node.js >=22 e, para o produto, SDK .NET 8. A implementação ocorre na sessão nativa; o dispatcher automatiza exclusivamente revisões independentes, como na arquitetura de referência.

[Orientação ao usuário e fluxo completo](../../docs/inicio/fluxo-toolkit.md). Este manual detalha a operação direta; o README principal apresenta o uso pela conversa. Mudanças de comportamento devem atualizar ambos, os guias afetados e o mapa mental quando o fluxo mudar.

## Uso a partir da raiz

Adoção na cópia atual: `onboarding` identifica somente os dados ausentes; `adopt-project --name Nome --context-file PATH --technology-file DECISAO --dry-run` simula e o mesmo comando sem --dry-run aplica a identidade e o contexto, preservando a pasta raiz e o Git. Consulte [adoção guiada](../../docs/inicio/adotar-projeto.md). A operação exige baseline sem conflitos e bloqueia remotos canônicos. `restore-adoption --journal PATH` ou o recover.mjs do backup permite recuperação protegida por hashes.

Ao manter o modelo, qualquer mudança em arquivo controlado exige revisar a mudança e atualizar o baseline antes de publicar: `node tools/IntegraTech.IA.Toolkit/scripts/update-template-baseline.mjs --write`. Sem --write, o comando apenas verifica. Nunca execute essa atualização no onboarding para contornar conflitos. O baseline detecta customizações acidentais; não é uma assinatura criptográfica de autoria. Projetos reais não podem ser adotados novamente por inferência.

Para iniciar outro produto, use `create-project --name MeuProjeto --target DESTINO --context-file CONTEXTO --preparation-file PESQUISA --technology-file DECISAO --provider all`. Contexto completo, consultas externas e decisão aprovada são obrigatórios, inclusive com --presentation e --dry-run. A geração produz especialista de domínio e adaptadores dos provedores selecionados, sem herdar dados de outro projeto. Siga [especialista de domínio](../../docs/inicio/especialista-dominio.md) para os contratos, pesquisa, consulta por funcionalidade, atualização e otimização global final. Sem acesso às fontes necessárias, bloqueie e retome depois; não há fallback offline.

O instalador abaixo continua destinado à instalação/manutenção da fábrica; não equivale ao gerador da solução completa. Para o negócio, siga [o guia de início](../../docs/inicio/primeiro-projeto.md).

```powershell
npm test
npm run check
npm run toolkit -- precheck --phase toolkit
npm run toolkit -- precheck --phase business
npm run toolkit -- providers
npm run toolkit -- route --category worker
npm run toolkit -- install --provider both --dry-run
node tools/IntegraTech.IA.Toolkit/scripts/toolkit.mjs loop-start --task delegation.json --phase toolkit --provider codex
node tools/IntegraTech.IA.Toolkit/scripts/toolkit.mjs loop-status --id TASK_RUN_ID
node tools/IntegraTech.IA.Toolkit/scripts/toolkit.mjs loop-advance --id TASK_RUN_ID --revision 1 --event gate_checked
```

Fases: toolkit (manutenção técnica), discovery (contexto incompleto permitido), design (contexto válido) e business (contexto/plano/aceite vinculados por hashes). Os comandos de instalação/validação aceitam cursor ou all; a adoção também aceita --provider para selecionar os adaptadores explicitamente. Sem seleção explícita, validate usa a última seleção do manifesto local ou project.provider. O precheck retorna código 2 enquanto os requisitos da fase estiverem pendentes. `ready` permite a fase; não autoriza ações externas. A validação não autentica o aprovador. Os arquivos .yaml usam sintaxe JSON, subconjunto válido de YAML, para não exigir parser adicional.

O loop assistido registra candidatos, validação isolada e pareceres vinculados ao mesmo digest. Use `loop-candidate`, `loop-validate`, `loop-review` e `loop-handoff` após os gates. `loop-status` recalcula delivery_valid; alterações invalidam evidências. Há limites persistidos de tentativas, correções e tempo. Isolamento indisponível e revisão interrompida sem término dos descendentes comprovado bloqueiam, sem fallback no host ou replay. Implementação automática permanece desabilitada. [Procedimento e limites](../../docs/inicio/loop-engenharia.md).

## Instalação e manutenção

```powershell
node tools/IntegraTech.IA.Toolkit/scripts/toolkit.mjs install --provider both
# Em outro destino, o núcleo também é copiado:
node tools/IntegraTech.IA.Toolkit/scripts/toolkit.mjs install --provider claude --target C:\MeuDestino --dry-run
```

O instalador gera agentes e skills a partir do núcleo. Codex: AGENTS.md, .agents/skills e .codex/agents. Claude Code: CLAUDE.md, .claude/skills e .claude/agents. Cursor: AGENTS.md, .cursor/rules, .cursor/skills e .cursor/agents. both permanece Codex+Claude; all inclui as três ferramentas. Não cria repositório Git e não instala nem autentica os provedores. Não instala a solução de produto em outro destino.

Arquivo existente diferente sem ownership comprovado causa conflito antes das escritas. Atualizações só substituem arquivos ainda iguais ao hash da instalação anterior. Alterações manuais são preservadas. Links/junctions no caminho são rejeitados. Edição do núcleo requer regenerar os adaptadores; `validate` detecta deriva. Não execute instaladores simultâneos no mesmo destino.

## Revisão independente

Preencha uma cópia de `fabrica/templates/delegation.json`. Crie um JSON array com os caminhos textuais necessários, incluindo código, aceite e evidências sanitizadas. Use arquivos selecionados, sem segredos ou configurações locais.

```powershell
node tools/IntegraTech.IA.Toolkit/scripts/toolkit.mjs dispatch --provider codex --task minha-delegacao.json --files meus-arquivos.json --phase toolkit
node tools/IntegraTech.IA.Toolkit/scripts/toolkit.mjs dispatch --provider claude --task minha-delegacao.json --files meus-arquivos.json --phase toolkit
node tools/IntegraTech.IA.Toolkit/scripts/toolkit.mjs resume --file CAMINHO_DO_HANDOFF
```

O pacote possui limite de 80 arquivos, 256 KiB por arquivo e 1 MiB total. Arquivos ocultos, binários, configuração sensível e padrões de segredo são bloqueados. A triagem automática é uma barreira adicional, não garantia de detectar todo dado sensível; o CTO seleciona e sanitiza os arquivos.

Codex recebe execução read-only, sem aprovação para ampliar permissões e com capacidades externas desativadas nos argumentos. Claude recebe pacote no prompt, ferramentas desativadas, modo bare e MCP desativado. Não se permite shell arbitrário configurado pelo usuário no dispatcher. Cada provedor precisa disponibilizar as flags verificadas no preflight. No Windows, use o executável nativo, não um shim .cmd.

Revisor não executa testes: avalia os arquivos e resultados fornecidos. Ausência de evidência deve produzir blocked. O dispatcher valida o contrato, identidade da tarefa e tipo do parecer antes de salvar review.json/handoff.json em qa-artifacts/agents. `status=completed` significa processo e contrato concluídos; o aceite depende de `verdict`, riscos e gates.

`providers` verifica executável e flags de Codex/Claude, não autenticação nem disponibilidade de modelo. Para Cursor informa suporte de editor e automação unsupported; não inicia CLI/SDK Cursor. Provedor ausente/incompatível, erro, timeout e JSON inválido bloqueiam a rodada; não há fallback silencioso. Testes com processo simulado não comprovam acesso real ao provedor.

## Contratos e retomada

Contratos delegation/return/review são adaptados da referência. Handoff registra provedor, objetivo, fase, arquivos, validações, evidências, pendências, gate e próximo passo. Para implementação nativa, o CTO preenche esse mesmo contrato manualmente ao trocar de provedor. `resume` valida e exibe; não executa ações.

O validador implementa somente as keywords usadas nos contratos versionados e rejeita keywords novas não suportadas. Não é um motor completo de JSON Schema. Retornos completed exigem testes/evidências e ausência de pendências.

## Grafo de rastreabilidade

Use `graph validate [--repo PATH] [--file RELATIVE]` e `graph impact --id ID [--repo PATH] [--file RELATIVE]`. O arquivo padrão é references/traceability-graph.json. [Formato e limites](../../docs/inicio/grafo-rastreabilidade.md). Consultas somente leitura; JSON Pointer e SHA-256 opcionais relacionam arquivos existentes sem duplicar seus conteúdos. Grafo inválido/vazio retorna código 2. Isso não substitui especialista, plano, aceites, task-loop, testes ou revisão global.

Preenchimento automático: `graph sync --dry-run` inspeciona e `graph sync` aplica inclusões explícitas; fontes alteradas retornam needs_review até reconhecimento com --accept-changes. O agente traceability-maintainer (rota traceability) preserva vínculos manuais e separa sugestões. Precheck/loop-start/loop-advance/specialist-status/coherence-run expõem a sincronização em traceability, sem mudar os gates existentes.


## Interfaces contextuais

Use ui-capabilities, ui-prepare --dry-run/ui-prepare e ui-status em projeto real com seleção estruturada aprovada. create/adopt preparam a especialização sem frontend quando a UI foi declarada. ui-generate --dry-run/ui-generate exige gates de negócio e preserva customizações. Somente React/Vite possui gerador neste incremento; Next/Vue/Angular/Blazor/MAUI têm orientação específica. ui-recover reconcilia preparação interrompida após comprovar escritor encerrado.

ui-validate bloqueia a execução isolada não disponível; ui-validate --local executa diagnóstico explícito de build/browser com dependências já preparadas. Esse relatório nunca promove delivery_valid. UI exige revisão UX adicional e evidências isoladas específicas no loop; Node/.NET genéricos não bastam. [Guia completo](../../docs/inicio/interfaces.md).


Execução SDD: em produtos novos, use especificação funcional e desenho técnico vinculados ao contexto, plano business v2 com tarefas/dependências antes do aceite e os comandos sdd-plan, sdd-task, sdd-complete e sdd-status após aprovação. Consulte [docs/inicio/sdd.md](../../docs/inicio/sdd.md). Planos v1 são legados e não equivalem a esse fluxo; não migrar ou aprovar automaticamente.
