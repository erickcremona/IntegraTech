# Transformar a cópia em projeto real

Abra uma cópia própria do modelo no Codex, Claude Code ou Cursor e informe nome e problema. Exemplo:

> O projeto se chamará MensagensCliente. Quero automatizar mensagens do WhatsApp para os atendentes. Adote esta cópia como meu projeto e continue a descoberta do negócio.

A fábrica consulta project.json. Enquanto is_model=true, pergunta somente o dado ausente. Ao receber nome e problema, ela prepara o contexto e segue [a decisão tecnológica](decisao-tecnologica.md): pesquisa alternativas, apresenta a escolha para aceite e só então mostra a simulação e aplica a adoção autorizada na mesma pasta. Não é necessário editar JSON ou digitar comandos manualmente. A IA segue instruções; seu comportamento completo em conversa ainda depende da sessão e das permissões do provedor.

O processo renomeia solução, projetos, namespaces, IoC, toolkit e skills. A pasta raiz aberta na IDE não muda de nome. Os fatos do usuário são preservados e lacunas essenciais precisam ser respondidas antes da materialização. project.json passa a is_model=false, com adoption.status=adopted. Nas próximas sessões, a fábrica lê o contexto real e continua discovery, sem repetir o onboarding.

## Utilitários usados pela fábrica

O CTO pode preparar um arquivo temporário ignorado, como .scratch/contexto-inicial.json, contendo apenas os fatos fornecidos. A decisão em .scratch/decisao-tecnologica.json deve estar pesquisada, vinculada ao contexto e aprovada conforme o guia. O contexto deve estar completo e estruturado; texto parcial inicia apenas descoberta. Prepare também .scratch/pesquisa.json conforme [especialista-dominio.md](especialista-dominio.md). Pesquisa indisponível bloqueia a materialização. Não incluir segredos, tokens ou dados pessoais reais.

```powershell
npm run toolkit -- onboarding --name MensagensCliente --context-file .scratch/contexto-inicial.json
npm run toolkit -- adopt-project --name MensagensCliente --context-file .scratch/contexto-inicial.json --preparation-file .scratch/pesquisa.json --technology-file .scratch/decisao-tecnologica.json --dry-run
npm run toolkit -- adopt-project --name MensagensCliente --context-file .scratch/contexto-inicial.json --preparation-file .scratch/pesquisa.json --technology-file .scratch/decisao-tecnologica.json
```

Use --provider cursor para Cursor isolado ou --provider all para as três ferramentas; sem override, a seleção de project.json é preservada.

Após renomear o toolkit, continue usando npm run toolkit, que já terá o caminho novo. Feche/reabra a solução na IDE se necessário. Execute npm test, npm run check e build/teste de ciclo do projeto real antes de prosseguir.

## Proteções

O repositório-modelo canônico permanece modelo. Se um remoto da cópia apontar para ele, a adoção é bloqueada: use uma cópia sem Git ou um repositório próprio criado a partir do template. Não há remoção/troca automática de origin. .git, arquivos pessoais, credenciais e configurações locais não são alterados.

Arquivos do modelo precisam corresponder ao baseline versionado. Alterações próprias ou colisões bloqueiam antes de aplicar; o CTO resolve o escopo com o desenvolvedor em vez de sobrescrever. A simulação não escreve. A apresentação vem obrigatoriamente da decisão aprovada; o worker não é herdado automaticamente. Uma nova adoção não sobrescreve um projeto já real.

A adoção preserva os gates de escopo e plano funcional. A skill de domínio e sua pesquisa são geradas, mas a conclusão exige revisão e otimização global com coherence-run/coherence-check. Isso não concede autorização para implementar, push ou deploy.

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
