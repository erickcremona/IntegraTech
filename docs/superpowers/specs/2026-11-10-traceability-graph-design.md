# Grafo de rastreabilidade

Proposta aceita na conversa: JSON versionado e comandos graph validate/impact, sem banco ou execução de DAG. Base atualizada por fast-forward da main remota 9890494, incluindo especialista de domínio e task-loop. O commit anterior dce7907 está nessa história.

## Modelo e escolhas
Um grafo próprio indexa nós de context, requirement, decision, component, task, test, evidence e approval. Cada nó possui id e referência source.path/source.pointer (JSON Pointer RFC 6901, vazio para arquivo inteiro), e pode fixar source.sha256 dos bytes do arquivo. Nenhuma cópia do conteúdo do documento. Relações dirigidas from→to indicam propagação de impacto; rótulos informs/implemented_by/verified_by/evidenced_by/approved_by descrevem o vínculo. Ciclos são permitidos para rastreabilidade e não causam loop na consulta; não é um scheduler.

Alternativas: inferir tudo do código prometeria cobertura não comprovada; banco externo seria custo prematuro. Escolha: relações explícitas e consultas locais determinísticas, sem dependências externas. Sem modificar gates e aceites atuais.

## Operações
`graph validate [--repo PATH] [--file RELATIVE]` usa references/traceability-graph.json por padrão. Verifica schema, ids únicos, pontas existentes, relações duplicadas/self-links, fontes locais seguras, arquivos existentes, pointers e hashes opcionais. Reporta lacunas (requisito sem teste alcançável, decisão sem justificativa de contexto/requisito, nós isolados). Lacunas são warnings, não avaliação semântica. Grafo vazio é empty e exit 2, não comprova prontidão.

`graph impact --id ID [--repo PATH] [--file RELATIVE]` valida o grafo, percorre saídas transitivamente, retorna nós afetados ordenados por distância/id e review_required para aprovações alcançadas. Não altera documentos/aceites, não executa testes/tarefas, não varre o código para adivinhar relações. Origem não entra nos afetados, mesmo em ciclos. Nó desconhecido e grafo inválido: blocked e exit 2.

Leitura limitada e sem conteúdo dos arquivos na saída: grafo até 256 KiB, 250 nós/1000 arestas, cada fonte até 256 KiB e orçamento total 8 MiB. Somente caminhos relativos canônicos com /, sem links, escapes, diretórios de credenciais/arquivos sensíveis ou arquivos operacionais binários. Evidências textuais em qa-artifacts são permitidas. Erros são códigos sanitizados; nenhum segredo/conteúdo de fonte é impresso.

## Integração e limites
Distribuir schema, módulo, testes, guia e esqueleto vazio. Geração/adoção produzem grafo vazio e não herdam relações de outro projeto. Regeneração de adaptadores não é necessária: apontam ao núcleo comum. Governança orienta manter links junto às mudanças, consultar impacto antes de alterar e validar depois. Grafo não comprova cobertura real, execução de teste, pesquisa externa ou validade humana de aprovação. Sem push/publicação nesta implementação; pedido atual é conferir main e implementar.
