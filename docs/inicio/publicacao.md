# Da solução criada à distribuição

Após criar a solução, a fábrica deve iniciar a orientação com release-engineer (rota release/deployment e skill integratech-publicacao). Isso começa com perguntas e planejamento, não com publicação: formato da aplicação, público, ambientes, custos, disponibilidade, dados e responsáveis pela operação. O agente acompanha essas decisões durante o desenvolvimento e atualiza o plano de publicação e a documentação.

A proposta deve comparar destinos adequados à stack e às restrições do produto, com fontes oficiais consultadas, datas, custos e limites. Cloud, contêiner, orquestrador e loja não são escolhas automáticas. O agente pode preparar configurações/pipelines específicos quando houver contexto e autorização. Não existem adaptadores automáticos de cloud/lojas neste incremento; a automação existente distribui um artefato para um arquivo local aprovado. Não equivale a iniciar aplicação ou comprovar acesso público.

## Prontidão por versão e ambiente

Uma tarefa concluída não significa produto pronto. release-check combina gates do núcleo e registros operacionais:

| Critério | Base de avaliação |
|---|---|
| version_binding | Hashes atuais do fonte, contexto, identidade e vínculo externo |
| approved_scope | Plano SDD aprovado, suas tarefas concluídas e checkpoints consistentes |
| delivery | Entrega válida de uma tarefa desse plano para o código atual |
| artifact | Arquivo existente na gestão, não vazio, até 32 MiB, com hash correspondente |
| target | Ambiente, destino, justificativa e registros de pesquisa adequados |
| functional_acceptance | Aceite dos fluxos críticos e critérios do produto |
| build_provenance | Evidência de que o artefato foi produzido a partir da versão avaliada |
| configuration | Configuração por ambiente e tratamento de segredos |
| security_operations | Pendências de segurança e controles operacionais inspecionados |
| observability | Logs, métricas/alertas e verificações pós-publicação pertinentes |
| rollback | Recuperação, compatibilidade, migração/backup quando houver dados |
| distribution | Procedimento de instalação/publicação e documentação do operador |
| staging_validation | Homologação da versão/artefato, adicional para produção |

A métrica é critérios atendidos/obrigatórios; não há média que compense bloqueio. Estados: preparing, ready_for_staging e ready_for_production. A prontidão sempre se refere ao manifesto e ao ambiente indicado, não a qualquer destino. Pronto para homologação não aprova produção. Registros operacionais exigem referência textual sanitizada, hash, responsável, data e vínculo à versão; não autenticam o responsável nem comprovam automaticamente saúde, segurança ou funcionamento do ambiente. O núcleo verifica consistência e evidências do loop; o responsável precisa conferir a suficiência das evidências de produto/operação. Não tratar um arquivo preenchido como certificação.

Alterações de código/contexto/identidade/vínculo invalidam a avaliação. Alterações de artefato/destino/estágio exigem novas evidências operacionais e novo aceite de publicação. Ausência de perfil de teste, executor isolado ou executor UI compatível continua bloqueando entrega; release-check não contorna esses limites. Planos legados precisam de migração SDD para estes gates.

## Preparação pelo agente

Use em um produto real; o repositório modelo permanece protegido:

```powershell
npm run toolkit -- route --category release
npm run toolkit -- release-init --id v1
npm run toolkit -- release-check --id v1 --stage staging
```

Em sistema externo, acrescente --project ID; a gestão recebe o manifesto e as evidências, o fonte permanece na origem. O agente inicia um rascunho em qa-artifacts/releases/v1/plan.json, ignorado pelo Git. Essa área contém contexto operacional e caminhos locais: preserve backup apropriado e não publique seus registros indiscriminadamente. Inicialização não constrói o artefato nem fabrica evidências. Um rascunho iniciado cedo pode ficar obsoleto durante desenvolvimento; prepare nova versão/ID quando fechar o candidato, sem transferir aprovações silenciosamente.

No manifesto, o agente preenche:

- run_id: ID de uma tarefa SDD com entrega válida para o código atual; todas as tarefas do plano precisam ter checkpoints concluídos.
- artifact: caminho relativo na gestão sob qa-artifacts/ e sha256 do arquivo real.
- target: kind (manual ou local-artifact), environment (staging ou production), destination, rationale e research com url HTTPS, accessed_at (YYYY-MM-DD) e finding. São registros de consulta do agente, não consultas executadas pelo comando.
- criteria: os itens da tabela, com status passed somente após inspeção real da evidência.

Após definir os campos de versão/artefato/destino, release-check fornece evidence_binding_sha256. Cada item operacional deve ter a forma:

```json
{
  "status": "passed",
  "release_binding_sha256": "HASH_RETORNADO_POR_RELEASE_CHECK",
  "verified_by": "RESPONSAVEL_REAL",
  "verified_at": "DATA_UTC_DA_VERIFICACAO",
  "statement": "CONCLUSAO_FUNDAMENTADA_NA_EVIDENCIA",
  "evidence_path": "qa-artifacts/relatorio-inspecionado.md",
  "evidence_sha256": "HASH_DOS_BYTES_DO_RELATORIO"
}
```

Esses valores são exemplos de campos, não evidência pronta. O agente registra os fatos e hashes; não pede ao usuário para escrever JSON. Trocar metadados de versão/artefato/destino muda o vínculo e exige reavaliação dos itens. Como os registros são locais, o campo de hash não autentica quem o preencheu. Itens obrigatórios não aceitam not_applicable para liberar a versão; explique como o critério foi atendido no contexto (exemplo: recuperação por restauração do artefato anterior quando não há banco).

## Automação disponível e autorização

O executor local copia os bytes do artefato para um arquivo absoluto em pasta já existente, fora do fonte, da gestão e da instalação do toolkit. Não cria infraestrutura, descompacta/instala pacotes, executa shell, altera permissões, ativa serviços ou executa migrações. Para esses efeitos, o agente prepara orientação contextual e solicita autorização e capacidades específicas; não simula um deploy bem-sucedido.

Com target.kind=local-artifact e prontidão para o ambiente:

```powershell
npm run toolkit -- release-deploy --id v1 --stage staging --dry-run
```

A simulação mostra o destino e não escreve nele. Para a ação real, o responsável precisa aprovar efetivamente a versão, o destino e o estágio apresentados. O agente registra esse aceite com o modelo fabrica/templates/release-approval.json: kind=release_deploy, decision=approved, stage, manifest_sha256 retornado após finalizar os critérios, approved_by, approved_at UTC, source_reference e source_reference_sha256 do registro humano na gestão. Não criar esse registro como se o usuário tivesse aprovado. JSON de aceite não concede permissão do sistema operacional ou do provedor.

```powershell
npm run toolkit -- release-deploy --id v1 --stage staging --approval-file CAMINHO_DO_ACEITE
```

O comando reavalia prontidão e hashes, verifica o aceite, reserva lock e escreve recibo antes de copiar. O destino nunca é sobrescrito; repetir uma distribuição existente é recusado. Um recibo prepared após interrupção exige reconciliação com o destino antes de qualquer nova tentativa. Não apague locks/recibos para contornar essa revisão. O recibo guarda o manifesto e os critérios daquela versão, preservando o histórico mesmo quando o rascunho local for editado depois.

O resultado distributed significa apenas bytes distribuídos. application_health=not_observed informa que o aplicativo não foi verificado no destino. O agente deve orientar smoke tests, logs/métricas, funcionamento dos fluxos críticos e rollback; só declarar aplicação acessível após observação real. Produção exige stage production, target.environment correspondente, evidência staging_validation e aceite específico de produção; aprovação de homologação não é reutilizada.

README, runbook e próximos passos devem acompanhar a evolução. Push, deploy remoto, publicação em lojas, DNS, banco irreversível e criação de infraestrutura continuam sujeitos a autorização aplicável. Veja [fluxo](fluxo-toolkit.md), [SDD](sdd.md) e [confiabilidade](confiabilidade.md).
