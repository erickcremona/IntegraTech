# Execução faseada orientada por especificação (SDD)

Novos produtos usam execution_workflow=sdd-v2. O CTO organiza: contexto pesquisado → especificação funcional → desenho técnico → plano por fases/tarefas → aceite humano → execução/validação → checkpoints e entrega. Não é necessário instalar Spec Kit ou OpenSpec; o núcleo aplica seus próprios contratos e gates.

## Antes do aceite

Use os modelos functional-spec.json, technical-design.json e business-plan-v2.json em fabrica/templates. A especificação tem requisitos identificados e cenários given/when/then; o desenho registra arquitetura, decisões e estratégia de validação. Ambos apontam por hash para o contexto; desenho e plano apontam para a especificação por hash exato dos arquivos. O plano contém design_path/design_sha256, specification_path/specification_sha256 e as consultas do especialista. Cada tarefa do plano classifica `experience_impact` (`direct`, `indirect`, `not_applicable` ou `unknown`) e justifica a decisão. Tarefa sem classificação recebe `unknown` na delegação SDD e não pode aceitar candidato; altere o plano e obtenha novo aceite antes de continuar.

Cada fase tem id, depends_on (IDs de fases), entregáveis, critérios de aceite, validações e tarefas. Cada tarefa tem id, requirement_ids, scenario_ids, owner, read_files, write_files, deliverables, validation_commands e test_paths. Declare testes reais previstos, não alegações de execução. Os IDs são únicos, todo requisito/cenário deve ser coberto e os vínculos precisam ser coerentes. As dependências devem formar DAG válido. Dentro de cada fase, tarefas executam na ordem declarada; fases independentes podem ser preparadas independentemente, respeitando ownership e permissões.

O agente prepara e explica esses documentos. O usuário aprova o plano já com a decomposição; o aceite contém o hash do plano que fixa os hashes da especificação/desenho. Não decompor silenciosamente em tarefas diferentes depois do aceite. Mudanças nesses documentos exigem reavaliação e novo aceite aplicável. Critérios devem favorecer pequenas entregas verificáveis, preferencialmente incrementos funcionais completos, sem usar tamanho artificial de commit como prova de qualidade.

## Após aprovação

```powershell
npm run toolkit -- precheck --phase business
npm run toolkit -- sdd-plan --dry-run
npm run toolkit -- sdd-plan
npm run toolkit -- sdd-status
npm run toolkit -- sdd-task --id ID_DA_TAREFA
```

sdd-plan materializa deterministicamente references/action-plans/HASH_DO_PLANO_E_ACEITE.json. Não altera o plano e não executa shell contido nele. sdd-task produz uma delegação vinculada à tarefa aprovada, com identidade de execução estável; o CTO a salva em .scratch/tarefa.json (área operacional fora do inventário) e usa loop-start --task .scratch/tarefa.json --phase business --provider codex (ou outro provedor compatível). Não ampliar arquivos autorizados nem mudar critérios/owner apenas na delegação: revisar o plano.

A tarefa só inicia quando dependências possuem checkpoints válidos. A primeira tarefa depende do final das fases predecessoras; cada tarefa seguinte depende da anterior. Assim nenhuma fase dependente inicia antes das tarefas requeridas. Especialistas não delegam; o CTO coordena. O plano não autoriza efeitos externos automaticamente.

## Validação e conclusão

Execute os comandos do loop assistido para candidato, validação e revisão. O runtime executa perfis fixos, não as strings de validation_commands. Para Node, os testes explicitamente previstos são executados individualmente em suíte candidata após as regressões congeladas, com isolamento e verificação do resumo do processo pai. O resultado registra caminhos e hashes realmente testados. Em .NET, somente os projetos de teste que o perfil realmente executa podem ser atestados; entradas não suportadas bloqueiam a conclusão e requerem perfil apropriado, sem falsa equivalência. Testes gerados, arquivos existentes e campos preenchidos não provam aceitação semântica dos cenários.

```powershell
npm run toolkit -- sdd-complete --id ID_DA_TAREFA --run-id ID_DO_LOOP
npm run toolkit -- sdd-status
```

sdd-complete exige delivery_valid do loop e atestação dos testes previstos para os bytes atuais. Registra checkpoint em qa-artifacts/sdd (ignorado pelo Git), com vínculo ao plano, aceite, execução e pareceres. Não aceita --passed ou declaração do chamador. Repetir conclusão idêntica não reexecuta trabalho. Alterar evidências ou a execução do checkpoint invalida suas dependências.

O checkpoint preserva a conclusão histórica do incremento. Fases seguintes podem modificar arquivos compartilhados no escopo aprovado; não se exige que o snapshot global da primeira fase seja igual ao código após a segunda. Cada novo incremento precisa de sua própria validação/revisão. A fase só é concluída quando todas suas tarefas têm checkpoints válidos. Não apagar checkpoints para reiniciar orçamento. Registros locais não são autenticados contra quem escreve no workspace.

UI continua exigindo o padrão de design aprovado, revisão UX e executor isolado de UI; SDD não contorna esses bloqueios. Indisponibilidade de sandbox, browser ou provedor bloqueia as etapas dependentes. A implementação continua na sessão nativa; não há execução autônoma de todo o projeto por sdd-plan.

## Planos antigos

Planos v1 permanecem legados e não ganham alegação de conformidade SDD. sdd-status informa migration_required. Projetos novos exigem v2; alterar o marcador para legacy não é procedimento de migração. Para migrar, prepare especificação/desenho, decomposição v2 e novo aceite, preserve histórico e depois marque execution_workflow=sdd-v2. Nenhum contexto, tarefa concluída ou aprovação é fabricado. Perfis legados mantêm seus gates existentes, identificados como tal.

Referências consultadas: [GitHub Spec Kit](https://github.com/github/spec-kit), [visão SDD](https://github.com/github/spec-kit/blob/main/spec-driven.md), [OpenSpec](https://github.com/Fission-AI/OpenSpec) e [Google: pequenas mudanças](https://github.com/google/eng-practices/blob/master/review/developer/small-cls.md). São referências de práticas, não um padrão único certificado. Guias: [loop](loop-engenharia.md), [retomada](../../references/README.md), [interfaces](interfaces.md).

Cada novo aceite cria uma identidade de execução própria, mesmo sem alterações no plano, preservando o histórico. Checkpoints registram a versão validada: alterações posteriores não são cobertas pelo registro antigo. A próxima tarefa deve começar nessa versão e só pode modificar seus arquivos aprovados; mudanças fora desse fluxo exigem retomada válida ou replanejamento.

A versão atual é conferida pelo encadeamento dos inventários das execuções, sem usar a data declarada do checkpoint como autoridade. Checkpoints divergentes ou ciclos de versões bloqueiam o avanço até reconciliação e nova validação. Para evitar conflitos, conclua um incremento antes de integrar outro, inclusive em fases independentes.


Código e segurança são revisados em paralelo sobre o mesmo candidato, aguardando ambos os resultados; UX continua depois da aprovação dos dois. Análises independentes somente de leitura podem ser delegadas pelo CTO na sessão nativa, até duas por produto, com entradas fixadas e consolidação. Não há executor automático dessas análises. Implementação permanece sequencial. Recomendações devem explicar fundamentos, alternativas, custos e limites, inclusive quando for melhor simplificar, adiar ou não implementar.


Consulte [arquitetura contextual](arquitetura-contextual.md) para escolher o menor perfil adequado, registrar decisão/aceite e reavaliar evolução. Criação/adoção exigem `--architecture-file PATH`; planos SDD de produtos com arquitetura gerenciada exigem `architecture_sha256`. Migrações dependem de aprovação, fases, compatibilidade, recuperação e entrega validada antes de distribuição.


O system design é avaliado pelos riscos registrados na especificação; quando necessário, seu registro integrado cobre componentes, dados, integrações, falhas, segurança, observabilidade, validação e pontos de UX e fica coberto pelo aceite do plano. Consulte [system design](system-design.md).
