# Transformar a cópia em projeto real

Abra uma cópia própria do modelo no Codex, Claude Code ou Cursor e informe nome e problema. Exemplo:

> O projeto se chamará MensagensCliente. Quero automatizar mensagens do WhatsApp para os atendentes. Adote esta cópia como meu projeto e continue a descoberta do negócio.

A fábrica consulta project.json. Enquanto is_model=true, pergunta somente o dado ausente. Ao receber nome e problema, ela prepara o contexto e segue [a decisão tecnológica](decisao-tecnologica.md): pesquisa alternativas, apresenta a escolha para aceite e só então mostra a simulação e aplica a adoção autorizada na mesma pasta. Antes da adoção, execute `npm run toolkit -- dependencies --provider <codex|claude|cursor|both|all>` e `npm run verify`; corrija falhas no modelo e repita até passar. Quando o diagnóstico identificar requisito global obrigatório ausente ou incompatível, apresente motivo, fonte oficial e comando sugerido, e aguarde autorização explícita antes da instalação. Depois, rode novamente a checagem. Se não for possível inspecionar um comando, `verification_required` bloqueia a adoção sem presumir que a ferramenta está ausente. Plugins/MCPs externos são avaliados durante discovery pelo contexto e pesquisa; instalação só ocorre após escopo aprovado e autorização. A adoção exige evidência aprovada vinculada ao conteúdo atual. Não é necessário editar JSON ou digitar comandos manualmente. A IA segue instruções; seu comportamento completo em conversa ainda depende da sessão e das permissões do provedor.

O processo atualiza a identidade do toolkit e skills, sem gerar solução ou projetos de produto. A pasta raiz aberta na IDE não muda de nome. Os fatos do usuário são preservados e lacunas essenciais precisam ser respondidas antes da materialização. project.json passa a is_model=false, com adoption.status=adopted. A adoção gera references/toolkit-readiness.md e references/capability-recommendations.md e devolve os dois relatórios no resultado; apresente ambos antes de qualquer trabalho do produto. O relatório de prontidão lista papéis, skills, rotas, comandos, contratos, testes disponíveis e limitações; a execução verificada é vinculada por hash ao estado do toolkit. O relatório contextual avalia plugins, skills, agents e ferramentas, registra motivos, alternativas, riscos e fontes, e permanece vinculado ao hash do contexto. Sugestões não instalam ou conectam componentes. Nas próximas sessões, a fábrica lê o contexto real e continua discovery, sem repetir o onboarding.

## Verificação do ambiente

`dependencies` verifica a versão do Node.js, npm, `curl`, Git quando a cópia contém `.git` e as CLIs/flags usadas pelo dispatcher de revisão independente. CLI ausente limita o dispatcher, mas não invalida a sessão nativa Codex/Claude; o relatório sugere a instalação como opcional. A autenticação não é verificada. Cursor usa a sessão nativa e não requer CLI/revisor automatizado. Plugins externos e servidores MCP não são requisitos universais; avalie-os apenas quando um plano aprovado exigir essas capacidades. O diagnóstico não instala ferramentas. A adoção bloqueia dependências centrais obrigatórias ausentes/incompatíveis e itens cuja inspeção não pôde ser concluída.

## Verificar plugins e ferramentas após a adoção

Avalie plugins, skills, agents e ferramentas no próprio levantamento de domínio antes de criar/adotar. Inclua candidatos pertinentes e também uma justificativa quando nenhuma opção for indicada. Recomendações externas de instalar/avaliar precisam de fonte oficial pesquisada e comprovada. Após o aceite, instale somente os itens justificados pelo escopo aprovado; confira suporte ao sistema operacional, permissões, rede e credenciais. Registre o motivo para instalar, adiar ou rejeitar. Se um bloqueio de ambiente impedir uma instalação autorizada, informe sem simular sucesso.

Quando o contexto indicar interface ou jornadas de usuário, avalie o plugin Product Design como candidato opcional e confirme disponibilidade na superfície realmente selecionada. Não trate compatibilidade de ChatGPT/Codex como suporte à CLI, Claude Code ou Cursor. Se indisponível, registre o limite e mantenha as responsabilidades e gates UX internos. Não conecte nem instale o plugin automaticamente; para produto sem interação humana, justifique não aplicabilidade.

## Utilitários usados pela fábrica

O CTO pode preparar um arquivo temporário ignorado, como .scratch/contexto-inicial.json, contendo apenas os fatos fornecidos. A decisão em .scratch/decisao-tecnologica.json deve estar pesquisada, vinculada ao contexto e aprovada conforme o guia. O contexto deve estar completo e estruturado; texto parcial inicia apenas descoberta. Prepare também .scratch/pesquisa.json conforme [especialista-dominio.md](especialista-dominio.md). Pesquisa indisponível bloqueia a materialização. Não incluir segredos, tokens ou dados pessoais reais.

```powershell
npm run toolkit -- onboarding --name MensagensCliente --context-file .scratch/contexto-inicial.json
npm run toolkit -- adopt-project --name MensagensCliente --context-file .scratch/contexto-inicial.json --preparation-file .scratch/pesquisa.json --technology-file .scratch/decisao-tecnologica.json --architecture-file .scratch/arquitetura.json --dry-run
npm run toolkit -- adopt-project --name MensagensCliente --context-file .scratch/contexto-inicial.json --preparation-file .scratch/pesquisa.json --technology-file .scratch/decisao-tecnologica.json --architecture-file .scratch/arquitetura.json
```

Use --provider cursor para Cursor isolado ou --provider all para as três ferramentas; sem override, a seleção de project.json é preservada.

Após renomear o toolkit, continue usando npm run toolkit, que já terá o caminho novo. Feche/reabra o workspace na IDE se necessário. Execute npm test e npm run check para o toolkit; valide o produto conforme a estratégia e as ferramentas definidas no plano aprovado.

## Proteções

O repositório-modelo canônico permanece modelo. Se um remoto da cópia apontar para ele, a adoção é bloqueada: use uma cópia sem Git ou um repositório próprio criado a partir do template. Não há remoção/troca automática de origin. .git, arquivos pessoais, credenciais e configurações locais não são alterados.

Arquivos do modelo precisam corresponder ao baseline versionado. Alterações próprias ou colisões bloqueiam antes de aplicar; o CTO resolve o escopo com o desenvolvedor em vez de sobrescrever. A simulação não escreve. A stack é preservada da decisão aprovada. Uma nova adoção não sobrescreve um projeto já real.

A adoção preserva os gates de escopo e plano funcional. A skill de domínio e sua pesquisa são geradas, mas a conclusão exige revisão e otimização global com coherence-run/coherence-check. Isso não concede autorização para implementar, push ou deploy.

O produto adotado recebe a skill `integratech-seguranca` e o agente existente `security-reviewer` conforme os providers selecionados. O CTO os aciona em decisões de segurança e revisões de código que alterem esses controles. A skill usa referências OWASP conforme tipo de produto e risco; Top 10 é lente de conscientização para web, e ASVS só é aplicado com requisitos/versão definidos. A presença dos arquivos não instala scanners nem comprova revisão, teste de segurança ou certificação do produto.

## Recuperação

Antes de substituir os arquivos, a operação guarda snapshots somente dos arquivos controlados, os novos arquivos e journal em .scratch/adoptions/adopt-.... Não copia .git ou credenciais. Essa pasta continua ignorada pelo Git e deve permanecer local, pois pode conter o contexto de negócio informado.

Falha durante aplicação tenta restaurar automaticamente; interrupção de processo pode exigir recuperação explícita. Use o recover.mjs independente indicado no resultado, que continua disponível mesmo se o caminho antigo do toolkit tiver sido removido:

```powershell
node .scratch/adoptions/adopt-ID/recover.mjs --dry-run
node .scratch/adoptions/adopt-ID/recover.mjs
```

Também existe restore-adoption --journal PATH no toolkit. A restauração verifica snapshots/hashes e recusa descartar arquivos modificados depois da adoção. Não promete atomicidade total do sistema de arquivos. Arquivos pessoais fora da operação são preservados. Não execute duas adoções/recuperações simultaneamente na mesma pasta.


## Apresentação após adoção

README.md, SOLUTION_CONTEXT.md, references/README.md e o README da fábrica passam a priorizar o produto, seus fatos e próximos passos. As entradas dos provedores continuam o produto em desenvolvimento, sem onboarding condicional como instrução principal. Manuais gerais continuam disponíveis como consulta secundária. O estado inicial é identificado como ponto de partida; atualize os resumos conforme a evolução e consulte project-state.json para a fase atual. A base técnica não é apresentada como funcionalidade de negócio concluída. Atualizações não sobrescrevem silenciosamente documentação personalizada de projetos já existentes.


Sistema legado externo: quando o usuário informar que o produto já existe, siga [sistemas existentes](sistemas-existentes.md). Solicite o local acessível se faltar, registre o vínculo externo e mantenha o fonte na origem e os registros na gestão separada. Não use adoção do modelo sobre esse sistema.


Consulte [arquitetura contextual](arquitetura-contextual.md) para escolher o menor perfil adequado, registrar decisão/aceite e reavaliar evolução. Criação/adoção exigem `--architecture-file PATH`; planos SDD de produtos com arquitetura gerenciada exigem `architecture_sha256`. Migrações dependem de aprovação, fases, compatibilidade, recuperação e entrega validada antes de distribuição.
