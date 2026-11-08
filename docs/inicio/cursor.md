# Usar o IntegraTech no Cursor

O Cursor utiliza o mesmo núcleo de governança, descoberta, decisão tecnológica, planejamento, testes e retomada de Codex e Claude Code. A integração local gera arquivos nativos do editor; não exige SDK, MCP, hooks, publicação ou credenciais adicionais do toolkit. Instalação e autenticação do próprio Cursor continuam sendo do desenvolvedor.

## Escolher as ferramentas

| Seleção | Adaptadores |
|---|---|
| `codex` | Codex |
| `claude` | Claude Code |
| `both` | Codex e Claude Code (significado legado preservado) |
| `cursor` | Cursor |
| `all` | Codex, Claude Code e Cursor |

Os defaults existentes permanecem `both`. Use `cursor` ou `all` explicitamente para incluir Cursor. A cópia distribuída deste modelo também contém os adaptadores Cursor; o registro `project.provider` continua sendo a seleção preservada nas adoções sem override. Ao adotar pelo Cursor, a fábrica deve passar `--provider cursor` ou `--provider all` conforme as ferramentas desejadas.

Para instalar a fábrica numa pasta existente, execute a partir da raiz do IntegraTech:

```powershell
npm run toolkit -- install --provider cursor --target CAMINHO --dry-run
npm run toolkit -- install --provider cursor --target CAMINHO
npm run toolkit -- validate --provider cursor --repo CAMINHO
```

Troque `cursor` por `all` para instalar os três. Instalação é aditiva: não remove adaptadores já existentes. Arquivos personalizados são preservados; um conflito nos arquivos controlados impede toda a instalação antes de escrever. Regras pessoais com outros nomes podem coexistir. A última seleção instalada fica em `.integratech-toolkit.json` (ignorado pelo Git) e é usada por `validate` quando não houver --provider. Manifests antigos sem esse campo continuam usando `project.provider`.

O instalador copia o núcleo e instruções, não cria uma aplicação completa nem modifica silenciosamente a seleção do projeto existente. Para nova aplicação em outra pasta vazia:

```powershell
npm run toolkit -- create-project --name MinhaLoja --target DESTINO --provider cursor --presentation api --dry-run
npm run toolkit -- create-project --name MinhaLoja --target DESTINO --provider cursor --presentation api
```

A apresentação explícita é a seleção manual de um modelo .NET. No fluxo assistido, o agente deve primeiro entender o contexto e pesquisar/apresentar [a decisão tecnológica](decisao-tecnologica.md), usando --context-file e --technology-file em vez de assumir uma apresentação. Para adotar a cópia do desenvolvedor na mesma pasta, adicione --provider cursor ou --provider all ao `adopt-project`; as proteções e recuperação da [adoção guiada](adotar-projeto.md) continuam aplicáveis. Nunca adote o repositório canônico.

## Arquivos nativos

- `AGENTS.md`: entrada compartilhada com Codex, apontando ao núcleo.
- `.cursor/rules/integratech.mdc`: regra com `alwaysApply: true` para entrada e governança.
- `.cursor/skills/<skill>/SKILL.md`: cópias das skills canônicas da fábrica, com o mesmo conteúdo.
- `.cursor/agents/<papel>.md`: perfis com nome, descrição e instruções dos papéis do catálogo.

Na geração, nomes e referências são personalizados: MinhaLoja recebe `.cursor/rules/minhaloja.mdc`, skills `minhaloja-*` e toolkit `tools/MinhaLoja.IA.Toolkit`. Arquivos Cursor pessoais fora do manifesto não são copiados para projetos descendentes. Cursor isolado não gera `.codex`, `.agents` nem `.claude`.

Abra a raiz do projeto no Cursor e use o Agent. Informe nome e problema se ainda for uma cópia do modelo. A regra encaminha a execução à governança; as skills especializadas apoiam a sessão conforme a tarefa. Se já for projeto real, o agente lê o contexto existente e continua sem reiniciar a adoção. Os comandos `npm test`, `npm run check` e os gates `precheck` continuam disponíveis no terminal.

## Retomada e automação

O contrato handoff aceita `provider: cursor`. Registre objetivo, arquivos, validações, evidências, pendências e gates antes de trocar de ferramenta. Handoff não transfere autorização de implementação, push ou deploy.

O suporte desta versão cobre arquivos de integração e fluxo nativo no editor. `doctor` e `providers` informam `native_editor: supported`, `automated_review: false` e `status: unsupported` para a capacidade de automação Cursor. Isso não significa que o editor seja incompatível: indica que o toolkit não executa o Cursor CLI/SDK.

`dispatch --provider cursor` e `eval --mode protocol --provider cursor` retornam blocked com motivo específico, sem iniciar processo ou tentar outro provedor. Perfis de revisão Markdown não estabelecem isolamento técnico. As automações de revisão existentes continuam restritas a Codex e Claude, com seus controles atuais. Uma integração CLI/SDK futura exige validação própria de autenticação, saída estruturada, limites e permissões efetivas.

Os testes verificam geração, instalação, conflitos, referências renomeadas, contratos, adoção, recuperação e bloqueios. Validação estrutural não comprova que uma versão do editor carregou ou executou as instruções. O aplicativo Cursor não está instalado neste ambiente; não houve teste interativo do editor nem uso de modelos externos.

## Referências consultadas

Consultadas em 2026-11-07 nos repositórios oficiais:

- [Cursor plugin template](https://github.com/cursor/plugin-template): exemplos nativos de regras MDC, skills e perfis Markdown de agentes.
- [Componentes de plugins](https://github.com/cursor/plugin-template/blob/main/docs/add-a-plugin.md): formatos e orientação para incluir somente componentes necessários. Nenhum plugin de Marketplace é publicado por este toolkit.
- [Cursor cookbook — skill reutilizável](https://github.com/cursor/cookbook/tree/main/.cursor/skills/dag-task-runner): skills locais e cópia gerada a partir de fonte comum.
- [Cursor SDK quickstart](https://github.com/cursor/cookbook/tree/main/sdk/quickstart) e [exemplo de CLI](https://github.com/cursor/cookbook/tree/main/sdk/coding-agent-cli): mostram caminhos de automação distintos da integração de arquivos do editor.
