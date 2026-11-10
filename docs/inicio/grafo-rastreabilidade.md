# Grafo de rastreabilidade

O grafo relaciona contexto, requisitos, decisões, componentes, tarefas, testes, evidências e aprovações. Ele é um índice de referências aos documentos existentes; não substitui o contexto, a pesquisa, a skill especialista, o plano, o task-loop ou os aceites. É um JSON versionável, sem banco ou dependência adicional.

## Consultas

Execute na raiz do projeto:

```powershell
npm run toolkit -- graph validate
npm run toolkit -- graph impact --id REQ-CATALOGO
```

Use `--repo CAMINHO` para outra raiz e `--file references/outro-grafo.json` para um arquivo alternativo relativo à raiz. Os dois comandos são somente leitura. `graph impact` valida o grafo antes de consultar; fontes ausentes ou hashes divergentes bloqueiam o resultado.

A saída é JSON: `valid` retorna código 0; `blocked` ou `empty` retorna código 2. O modelo permanece com `references/traceability-graph.json` vazio. Projetos materializados recebem um índice inicial derivado do contexto e dos documentos fornecidos, sem herdar relações do ancestral. `empty` não comprova prontidão e não bloqueia os comandos existentes do toolkit; o grafo é uma verificação adicional explícita.

## Formato

Exemplo mínimo para um projeto cujo contexto já contém `scope[0]`:

```json
{
  "schema_version": 1,
  "nodes": [
    {
      "id": "CTX",
      "kind": "context",
      "source": { "path": "references/business-context.json", "pointer": "" }
    },
    {
      "id": "REQ-CATALOGO",
      "kind": "requirement",
      "source": { "path": "references/business-context.json", "pointer": "/scope/0" }
    }
  ],
  "edges": [
    { "from": "CTX", "to": "REQ-CATALOGO", "relation": "informs" }
  ]
}
```

Esse exemplo terá aviso de requisito sem teste, até registrar um teste relacionado. Não preencha o contexto do modelo apenas para fazer o exemplo passar.

IDs são únicos, com 1–80 caracteres alfanuméricos, ponto, hífen ou underscore, começando por alfanumérico. Tipos de nós: `context`, `requirement`, `decision`, `component`, `task`, `test`, `evidence`, `approval`.

`source.path` aponta para arquivo textual local usando `/`. `source.pointer` é um JSON Pointer RFC 6901: vazio referencia o arquivo inteiro; `/scope/0` seleciona o primeiro item; `~1` representa `/` e `~0` representa `~` em nomes de campos. Pointers não vazios exigem fonte JSON válida. Não há seleção por linha ou execução de código.

Opcionalmente, inclua `source.sha256` com o hash SHA-256 dos bytes do arquivo, obtido por `npm run toolkit -- hash --file CAMINHO`. Qualquer mudança nesse arquivo invalida a referência fixada, mesmo que outra parte do JSON tenha mudado. Sem hash, a consulta verifica existência do arquivo/campo, mas não detecta alteração semântica do conteúdo. Após revisar uma mudança, atualize o vínculo conscientemente; não atualize hashes só para esconder divergência.

## Direção e impacto

Toda aresta `from → to` significa: uma mudança em `from` pode exigir reavaliar `to`. Rótulos disponíveis:

| Relação | Exemplo de direção |
|---|---|
| `informs` | contexto → requisito → decisão |
| `implemented_by` | requisito/decisão → componente ou tarefa |
| `verified_by` | requisito/componente/tarefa → teste |
| `evidenced_by` | teste/tarefa/decisão → evidência |
| `approved_by` | decisão/tarefa/plano representado por nó → aprovação |

Os rótulos descrevem as ligações; não comprovam que o conteúdo da fonte tem o significado indicado nem restringem os pares de tipos. Evite inverter a direção mesmo quando o nome de um documento sugerir uma dependência inversa. Referencie um plano como `task` ou `decision` conforme o escopo do nó.

`affected` lista os nós alcançáveis, sem repetir nós e sem incluir a origem, ordenados pela menor distância e por ID. `review_required` lista aprovações alcançadas. Esses aceites precisam ser avaliados pelo responsável; a consulta não os revoga, concede ou modifica. Ciclos são aceitos e tratados por controle de visitados: o grafo não é um DAG de execução.

## Encaixe no fluxo atual

Ao registrar requisitos ou decisões, adicione referências ao contexto pesquisado e à decisão tecnológica. Relacione componentes concretos (inclusive worker, quando necessário) à necessidade que os justifica. Antes de mudar um requisito/componente, consulte seu impacto; depois atualize referências e valide novamente.

Tarefas podem apontar para fases em `references/business-plan.json` ou para o estado do ciclo em `qa-artifacts/loops/<id>/state.json`. Evidências podem apontar para relatórios sanitizados em `qa-artifacts`. Esses arquivos locais precisam estar disponíveis para validar o grafo; a referência não transforma um arquivo ignorado em artefato versionado. Revise caminhos e confidencialidade antes de versionar o índice.

A fábrica deve manter o grafo junto das alterações e considerar os avisos antes de afirmar rastreabilidade. Os gates de especialista, consulta, plano, task-loop e coerência continuam sendo a autoridade sobre suas validações. A presença de um nó `test` não significa teste executado; um nó `approval` não autentica o aprovador. Arquivos de código não são analisados para inferir relações automaticamente.

## Consistência, avisos e limites

Erros bloqueadores: schema inválido, IDs/arestas duplicados, pontas inexistentes, autoaresta, fontes ausentes/inválidas, pointer inválido, hash divergente e caminhos inseguros. Warnings: `isolated_node`, `requirement_without_test`, `decision_without_justification` e `empty_graph`. Testes/justificativas são procurados por alcance transitivo das relações declaradas, não por análise semântica do código. Um grafo pode ser estruturalmente válido com lacunas.

Leitura limitada a 256 KiB para o grafo, 250 nós, 1000 arestas, 256 KiB por fonte e 8 MiB de fontes únicas. Caminhos absolutos, escapes, links/junctions, credenciais, arquivos sensíveis conhecidos, binários e conteúdo com padrões de segredo são rejeitados. A saída não reproduz o conteúdo dos documentos; erros usam códigos sanitizados. Isso não substitui revisão humana de confidencialidade.

Na geração e adoção, o índice inicial é reconstruído dos documentos novos. Relações do modelo/projeto anterior não são herdadas. A manutenção combina sincronização determinística e o agente de rastreabilidade; não há agendamento, execução paralela, banco de grafos ou descoberta automática de dependências no código.

## Agente e preenchimento automático

O catálogo inclui `traceability-maintainer` (rota `traceability`), com a skill de rastreabilidade e adaptadores para Codex/Claude/Cursor. Seu ownership é o índice e propostas sanitizadas; ele não implementa negócio, altera fontes, executa testes ou concede aceites. A política `maintain_traceability` é separada da escrita de negócio. Perfis Markdown continuam sendo instruções, não isolamento técnico.

```powershell
npm run toolkit -- graph sync --dry-run
npm run toolkit -- graph sync
npm run toolkit -- graph validate
npm run toolkit -- route --category traceability
```

`sync --dry-run` não escreve arquivos, diretórios ou locks. Mostra changes, changed_sources, review_required, sugestões e proposed_graph (referências, sem conteúdo das fontes). `sync` aplica apenas inclusões explícitas novas sem reconhecimento adicional; repetição sem mudanças retorna unchanged. Cada escrita usa lock exclusivo, comparação das entradas antes da publicação e substituição atômica de um arquivo. Falha/colisão não substitui o índice. Um lock restante exige verificar o processo responsável; o agente não o apaga para contornar a proteção. Não há garantia de transação multiarquivo contra editores externos que não participem do lock.

### O que é preenchido

- Contexto: arquivo indicado em project-state.context_path (ou references/business-context.json).
- Requisitos: itens de scope e success_criteria, com JSON Pointer para a posição real. IDs derivam do conteúdo normalizado e do campo; reordenação não troca identidade. Textos idênticos duplicados no mesmo campo são ambíguos e bloqueiam a sincronização.
- Decisão tecnológica: opção selecionada no documento indicado por technology_decision_path, vinculada pelo hash normalizado do contexto. Aceite referenciado gera nó de aprovação, sem conferir autenticidade ou autorização nova.
- Plano: documento plan_path e tarefas de phases, com IDs derivados de phase.id. A vinculação usa o hash dos bytes do contexto, conforme contrato do plano.
- Aceite do plano: documento approval_path, quando seus hashes de contexto/plano correspondem às fontes; seu registro source_reference é evidência referenciada, não uma aprovação concedida pelo agente.

Sem paths explícitos de decisão/plano/aceite no estado, o sincronizador procura os arquivos convencionais em references/. Um campo explicitamente null desativa a respectiva procura; um caminho declarado ausente ou inválido bloqueia. Não há varredura indiscriminada do repositório. Regras de segurança/limites de leitura e tamanho do grafo continuam aplicáveis.

A relação entre um requisito individual e uma tarefa/componente não é inferida a partir da proximidade de textos ou ordem dos arrays. A CLI retorna requirement_mapping_needed para os itens ainda sem esse vínculo. O agente pode propor relações em `.scratch/traceability-suggestions.json` com status proposed, referências e justificativa; apenas vínculos revisados entram manualmente no grafo. Testes/componentes são registrados quando houver referência explícita revisada, sem criar nós a partir de comandos prometidos no plano. Esta versão não importa estados mutáveis de loops ou resultados operacionais automaticamente.

### Atualizações e revisão

Nós/arestas gerenciados possuem fingerprints em `sync.version=1`. Não edite esses itens ou sua metadata manualmente: o sincronizador detecta modificações e bloqueia. Nós e relações manuais permanecem sob seu controle e são preservados. Colisão de ID não transfere ownership para o agente. Mudanças de texto podem criar IDs novos; o antigo só é removido após revisão, e nunca enquanto uma aresta manual ainda depender dele.

Quando fontes registradas mudam, o resultado é needs_review (código 2), sem renovar hashes silenciosamente. O relatório aponta fontes, IDs alterados/removidos e aprovações alcançadas pela topologia anteriormente registrada. Esse diagnóstico é útil mesmo se o contexto já mudou e graph impact bloquear por referências antigas; não valida o conteúdo desatualizado.

Após o responsável revisar efetivamente a mudança, o agente pode aplicar o reconhecimento explícito:

```powershell
npm run toolkit -- graph sync --accept-changes
```

Essa opção atualiza o índice, não os documentos de aprovação, gates ou pesquisa. Não corrige um plano/decisão/aceite que ainda vincule hashes de outro contexto: primeiro revise esses documentos pelo fluxo normal. `graph validate` também detecta corrupção da metadata gerenciada. O grafo pode continuar com avisos legítimos de ausência de cobertura.

### Integração com a fábrica

Criação/adoção geram o índice inicial pelo mapa de arquivos materializados, antes de publicar a árvore. Ao concluir mudanças em contexto/decisão/plano, o agente executa sync. `precheck`, `loop-start`, `loop-advance`, `specialist-status` e `coherence-run` tentam sincronizar antes da operação e anexam o campo `traceability` à resposta. Esses pontos podem escrever o índice; graph validate/impact e os demais status não fazem sincronização automática.

Um erro/needs_review em traceability é uma pendência visível, não uma autorização ou alteração do status de negócio. A operação principal conserva seus gates e status; o CTO deve tratar a pendência antes de afirmar rastreabilidade completa. Não existe daemon ou processo LLM permanente: a parte determinística é executada pelo toolkit e a interpretação ocorre na sessão nativa do agente.

### Registro da revisão e propostas

No retorno do agente, registre quais fontes e IDs foram reconhecidos, o responsável, a data e a referência à mensagem/registro humano correspondente. Não invente esses dados. O sinalizador --accept-changes não autentica o responsável; a evidência da revisão pertence à sessão nativa e ao registro sanitizado da tarefa.

Propostas usam formato livre nesta versão, com no mínimo id, status proposed, referências de origem, nós/arestas sugeridos e justificativa. Registre a revisão que autorizar a inclusão manual; a CLI não consome nem promove esse arquivo automaticamente. Não há contrato formal de proposta nem assinatura criptográfica de aceite do índice.

Para IDs removidos, preserve o relatório anterior de changes/review_required: eles não existem para consulta de impacto no grafo novo. Consulte graph impact para IDs ainda existentes e relate separadamente as remoções e suas aprovações afetadas conforme o diagnóstico anterior.
