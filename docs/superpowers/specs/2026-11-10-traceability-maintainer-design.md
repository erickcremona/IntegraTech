# Agente e sincronização de rastreabilidade

Implementação autorizada da proposta: código determinístico controla sincronização e validação; agente traceability-maintainer interpreta ambiguidades e apresenta sugestões sem inventar evidências/aceites. Base: grafo validate/impact local existente; preservar todo o trabalho anterior.

## Decisões
Não usar apenas prompt nem executar LLM embutido. Adicionar graph sync --dry-run e graph sync; --accept-changes é reconhecimento explícito de alterações de fontes, não aprovação funcional. Gerar nós de contexto, scope/success_criteria, opção tecnológica selecionada, fases do plano e aceites referenciados. Relações entre requisito individual e tarefa/componente sem referência explícita permanecem sugestões. Não adivinhar arquivos de código/testes ou interpretar resultado de teste ausente.

IDs determinísticos por documento e identidade explícita (fase.id) ou conteúdo normalizado (itens de arrays). Reordenação não troca identidade de requisito. Grafo guarda sync.version=1 e fingerprints dos nós/arestas gerenciados. Vínculos manuais são preservados; colisões e edição de itens gerenciados bloqueiam escrita. A exclusão de um nó ainda usado por aresta manual bloqueia até resolução, mesmo com --accept-changes.

Novas fontes/vínculos explícitos podem ser aplicados sem confirmação adicional. Atualizações/remoções de itens gerenciados e hashes desatualizados exigem --accept-changes. Relatório mostra diff de IDs, fontes alteradas e aprovações alcançadas. Não alterar documentos de aprovação, status de negócio ou resultado de testes. Sugestões ficam no relatório e em arquivo de trabalho separado escrito pelo agente, nunca promovidas silenciosamente ao grafo.

Leitura segue limites/caminhos/segredos do grafo. Escrita em único arquivo JSON, com lock exclusivo, comparação do snapshot de entradas antes de escrever e substituição atômica. Dry-run não cria locks, diretórios ou relatórios. Proposta inválida não escreve. Falhas usam códigos sanitizados. Ownership/fingerprints são prevenção de edição acidental, não autenticação.

## Integração
prepareProject deriva o grafo do mapa de arquivos materializados, sem usar relações do ancestral. Modelo sem contexto permanece vazio. Antes dos pontos de retomada precheck, loop-start/loop-advance, specialist-status e coherence-run, a CLI sincroniza documentos disponíveis e anexa um relatório traceability ao resultado. Não usar estados mutáveis de execução como fontes automáticas nesta versão (evita feedback com snapshots de tarefa/coerência); tarefas vêm de fases do plano. Agente executa sync ao concluir mudanças em contexto/decisão/plano. O grafo não é novo gate de autorização nem scheduler.

Catálogo/rota traceability, skill e perfis para Codex/Claude/Cursor. Ownership do agente é o grafo e propostas; gates/implementação/aceites continuam com seus donos. Documentar limites e validar cenários de instruções, sem alegar execução real dos provedores. Sem push ou publicação nesta tarefa.
