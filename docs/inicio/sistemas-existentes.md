# Manter e evoluir um sistema existente

Abra a instalação do toolkit no Codex, Claude Code ou Cursor e informe que o produto já existe. A fábrica deve solicitar o caminho acessível do sistema e o objetivo da manutenção, aproveitando os dados já informados. Exemplo:

> Quero manter o sistema Atendimento que está em D:\Sistemas\Atendimento. Mantenha o fonte nessa pasta e o toolkit separado. Analise a arquitetura e os testes existentes e prepare um plano para corrigir o problema de cadastro duplicado antes de alterar o código.

O caminho deve existir no ambiente da sessão. Um caminho Windows informado a uma sessão Linux não fornece acesso à máquina do usuário. Abra a sessão onde as pastas estejam acessíveis e autorize os diretórios necessários nas permissões do provedor.

## O que o vínculo faz

`attach-project` cadastra um ID local e cria uma área de gestão em `.integratech/projects/ID`, na instalação do toolkit. Essa pasta é ignorada pelo Git: contém caminhos locais, contexto, pesquisa, especialista, planos, grafo, tarefas e evidências daquele sistema. Não copie a pasta para outro produto nem publique seu conteúdo inadvertidamente. Ela é o histórico local: preserve-a em backup apropriado; excluir o vínculo perde a retomada local e não desfaz alterações de código já feitas.

O fonte permanece onde estava. Anexar não escreve no sistema, não importa seu Git, não altera remotos, não renomeia namespaces, não muda dependências e não instala AGENTS.md, CLAUDE.md ou arquivos Cursor nele. A identidade do toolkit também é preservada. Não use adopt-project nem create-project sobre um legado.

Cada sistema possui registros separados; não existe seleção global implícita. Não cadastre o mesmo diretório com IDs diferentes. A inspeção inicial é limitada a nomes de manifests, sem executar comandos ou ler credenciais. Ela informa tecnologias prováveis; não comprova arquitetura, framework, execução de testes ou compatibilidade de um executor. Links simbólicos são ignorados no diagnóstico e não são seguidos para ampliar o escopo; inventários de execução rejeitam links.

## Registro e seleção

O agente prepara os comandos; o usuário não precisa editar JSON. Para uso direto, a partir da instalação:

```powershell
npm run toolkit -- attach-project --id atendimento --source "D:\Sistemas\Atendimento" --name Atendimento --provider all --dry-run
npm run toolkit -- attach-project --id atendimento --source "D:\Sistemas\Atendimento" --name Atendimento --provider all
npm run toolkit -- attached-projects
npm run toolkit -- project-status --project atendimento
npm run toolkit -- precheck --project atendimento --phase discovery
```

Sem --source, attach-project retorna a pergunta pelo local e não tenta adivinhar. Sem contexto, registra a pendência e permite descoberta; vincular não libera desenho nem implementação. A simulação não grava. Repetir o mesmo vínculo preserva os registros; trocar o caminho ou o ID não migra histórico automaticamente.

`--repo`, quando usado, aponta para a instalação do toolkit. `--project ID` seleciona a gestão daquele sistema nos comandos SDD, loop, especialista, coerência, grafo, interface, precheck, policy-check e dispatch. O retorno de project-status mostra a pasta de gestão para ler ou preparar documentos. Opções que instalam/geram/adotam modelos não aceitam seleção de legado.

A área de gestão oferece um arquivo project.code-workspace para abrir gestão, fonte e toolkit no Cursor/VS Code. Codex e Claude também precisam de acesso autorizado às duas pastas; o vínculo não concede permissões. Leia as instruções existentes do fonte, inclusive as aplicáveis às subpastas, antes de trabalhar. Os adaptadores e o especialista da gestão não substituem as instruções do sistema.

## Diagnóstico e plano incremental

1. Leia o contexto informado, os manifests, a documentação e as instruções do sistema. Confirme arquitetura, versões, dependências, integrações, fluxos críticos e testes efetivamente disponíveis. Não transforme inferências em fatos.
2. Complete o contexto e a pesquisa de domínio na gestão. Prepare o especialista com `specialist-prepare --project ID --preparation-file PATH`, consulte-o e registre a consulta. Registre decisões técnicas quando aplicáveis; a ausência de gerador não impede manutenção, mas capacidades de validação devem ser verificadas para o ambiente disponível.
3. Prepare uma especificação da mudança, desenho técnico e plano SDD v2. Não é necessário especificar todo o legado de uma vez. Inclua riscos de regressão, testes de caracterização quando necessários, arquivos autorizados, dependências e aceite. O plano anexado precisa de source_binding_sha256 igual ao vínculo retornado por project-status; o agente preenche esse campo antes do aceite.
4. Após o aceite humano efetivo, use sdd-plan, sdd-task e o loop com --project ID. Caminhos de ownership e test_paths são relativos ao fonte. Documentos e evidências são relativos à gestão. O vínculo entra nos snapshots e no plano aprovado; alterar o destino invalida a continuidade.
5. Implemente na pasta original e valide o candidato. Faça revisão de código/segurança, e UX quando aplicável. Registre sdd-complete para concluir a tarefa e libere suas dependências. Não inclua segredos ou efeitos externos só porque a pasta está acessível.

Exemplo após preparar contexto, pesquisa, especificação, desenho, plano e aceite na gestão:

```powershell
npm run toolkit -- precheck --project atendimento --phase business
npm run toolkit -- sdd-plan --project atendimento --dry-run
npm run toolkit -- sdd-plan --project atendimento
npm run toolkit -- sdd-task --project atendimento --id corrigir-cadastro
npm run toolkit -- sdd-status --project atendimento
```

Salve a delegação produzida em arquivo operacional e siga [o loop](loop-engenharia.md), acrescentando --project atendimento a cada comando. `--task` e outros argumentos de arquivos de entrada são caminhos acessíveis à sessão; não são redirecionados implicitamente. Alterações locais existentes são a linha de base e devem ser preservadas; mudanças fora do ownership após iniciar a tarefa bloqueiam o candidato. O toolkit não cria commits ou pushes no sistema automaticamente.

## Grafo e coerência

No grafo da gestão, documentos locais usam caminhos como references/functional-spec.json; arquivos do sistema usam source/src/Cadastro.cs. O prefixo source/ é um namespace do grafo, não uma pasta criada no sistema. Use graph sync --dry-run e graph validate com --project ID; relações ambíguas continuam exigindo revisão.

`coherence-run --project ID` não executa os comandos npm/.NET do modelo no legado. Confere checkpoints SDD concluídos e a entrega observada válida para o código atual e registra o resultado na gestão. `coherence-check` continua exigindo relatório das áreas e evidências correspondentes. Isso verifica a mudança registrada, não certifica todo o sistema legado; problemas fora do escopo continuam como pendências explícitas.

## Capacidades e limites

A descoberta pode reconhecer manifests de Node, .NET, Python, Java, Go, Rust e PHP. O conjunto de validadores isolados continua sendo Node e o perfil .NET offline existente, com os limites documentados em [confiabilidade](confiabilidade.md). Reconhecer Python não habilita um executor Python. Frameworks, dependências, ausência de testes ou projetos .NET fora do perfil podem exigir preparação adicional; sem perfil compatível, a validação e a conclusão ficam bloqueadas. Sem regressões existentes, prepare e revise uma baseline de testes de caracterização antes de depender da conclusão do loop.

UI existente deve ser analisada e preservada. Uma modernização pode ser proposta conforme a referência UX aprovada, mas ui-generate não aplica o scaffold neutro ao legado. O diagnóstico React do modelo também não é reutilizado como prova para outra interface; o executor de entrega UI permanece indisponível neste incremento. Não alegue entrega validada a partir de um build local ou screenshot.

Push, merge, migração destrutiva e deploy continuam dependendo de autorização aplicável. Consulte [SDD](sdd.md), [interfaces](interfaces.md) e [fluxo geral](fluxo-toolkit.md).

No modo legado, a área dedicada não instala exemplos de produto. O código e a tecnologia pertencentes ao legado são preservados na origem. Não se apagam arquivos de outro sistema ou modelos compartilhados ao registrar um vínculo.


O diagnóstico registra candidatos de interface e mantém sua classificação pendente. O loop também verifica os arquivos atuais: alterações com sinais de UI sem perfil de interface aprovado são bloqueadas, inclusive quando o executor é application-engineer. Registre a decisão técnica e prepare o perfil e o desenho UX antes de tentar o candidato; a detecção é conservadora e não substitui a análise da arquitetura.

Concluir o relatório de coerência não invalida a entrega por atualizar somente workflow_status/coherence_path. Contexto, plano, aceite, vínculo, código e demais insumos continuam sujeitos às verificações de mudança. Execuções registradas antes da normalização de snapshots podem exigir nova validação; evidências antigas não são reescritas automaticamente.


Publicação: após criar a solução, planeje distribuição com release-engineer e acompanhe os critérios de prontidão por ambiente. Entrega técnica não aprova produção. Consulte [publicação e prontidão](publicacao.md); somente o destino local de artefato tem automação neste incremento, com aceite específico.
