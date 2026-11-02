# IntegraTech.IA.Toolkit

Núcleo comum para Codex e Claude Code. Requer Node.js >=22 e, para o produto, SDK .NET 8. A implementação ocorre na sessão nativa; o dispatcher automatiza exclusivamente revisões independentes, como na arquitetura de referência.

## Uso a partir da raiz

Adoção na cópia atual: `onboarding` identifica somente os dados ausentes; `adopt-project --name Nome --context-file PATH --dry-run` simula e o mesmo comando sem --dry-run aplica a identidade e o contexto, preservando a pasta raiz e o Git. Consulte [adoção guiada](../../docs/inicio/adotar-projeto.md). A operação exige baseline sem conflitos e bloqueia remotos canônicos. `restore-adoption --journal PATH` ou o recover.mjs do backup permite recuperação protegida por hashes.

Ao manter o modelo, qualquer mudança em arquivo controlado exige revisar a mudança e atualizar o baseline antes de publicar: `node tools/IntegraTech.IA.Toolkit/scripts/update-template-baseline.mjs --write`. Sem --write, o comando apenas verifica. Nunca execute essa atualização no onboarding para contornar conflitos. O baseline detecta customizações acidentais; não é uma assinatura criptográfica de autoria. Projetos reais não podem ser adotados novamente por inferência.

Para iniciar outro produto, use `create-project --name MeuProjeto --target DESTINO --presentation worker|api|console --provider codex|claude|both`. O destino deve ser vazio e externo ao modelo. `--dry-run` mostra o plano sem escrever. O gerador usa o manifesto versionado, renomeia a identidade e inicia o contexto em branco. Não cria Git nem herda remotos, aprovações ou evidências.

O instalador abaixo continua destinado à instalação/manutenção da fábrica; não equivale ao gerador da solução completa. Para o negócio, siga [o guia de início](../../docs/inicio/primeiro-projeto.md).

```powershell
npm test
npm run check
npm run toolkit -- precheck --phase toolkit
npm run toolkit -- precheck --phase business
npm run toolkit -- providers
npm run toolkit -- route --category worker
npm run toolkit -- install --provider both --dry-run
```

Fases: toolkit (manutenção técnica), discovery (contexto incompleto permitido), design (contexto válido) e business (contexto/plano/aceite vinculados por hashes). O precheck retorna código 2 enquanto os requisitos da fase estiverem pendentes. `ready` permite a fase; não autoriza ações externas. A validação não autentica o aprovador. Os arquivos .yaml usam sintaxe JSON, subconjunto válido de YAML, para não exigir parser adicional.

## Instalação e manutenção

```powershell
node tools/IntegraTech.IA.Toolkit/scripts/toolkit.mjs install --provider both
# Em outro destino, o núcleo também é copiado:
node tools/IntegraTech.IA.Toolkit/scripts/toolkit.mjs install --provider claude --target C:\MeuDestino --dry-run
```

O instalador gera agentes e skills a partir do núcleo. Codex: AGENTS.md, .agents/skills e .codex/agents. Claude Code: CLAUDE.md, .claude/skills e .claude/agents. Não cria repositório Git e não instala nem autentica os provedores. Não instala a solução de produto em outro destino.

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

`providers` verifica executável e flags, não autenticação nem disponibilidade de modelo. Provedor ausente/incompatível, erro, timeout e JSON inválido bloqueiam a rodada; não há fallback silencioso. Testes com processo simulado não comprovam acesso real ao provedor.

## Contratos e retomada

Contratos delegation/return/review são adaptados da referência. Handoff registra provedor, objetivo, fase, arquivos, validações, evidências, pendências, gate e próximo passo. Para implementação nativa, o CTO preenche esse mesmo contrato manualmente ao trocar de provedor. `resume` valida e exibe; não executa ações.

O validador implementa somente as keywords usadas nos contratos versionados e rejeita keywords novas não suportadas. Não é um motor completo de JSON Schema. Retornos completed exigem testes/evidências e ausência de pendências.
