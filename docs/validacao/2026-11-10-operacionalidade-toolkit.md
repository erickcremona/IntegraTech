# Auditoria de operacionalidade — 2026-11-10

## Resultado

Núcleo local validado, sem defeito de código pendente identificado na implementação do grafo. Operação integral com todos os provedores externos não foi comprovada. Esta avaliação não é execução de modelos reais nem aprovação de negócio.

## Estado do código

- Base local e main remota: 98904941382d4be90049572f77ffadc9e568acd1.
- Implementações de tecnologias/contexto e Cursor (dce7907) estão na história da main, junto das evoluções de especialista de domínio e task-loop.
- Grafo de rastreabilidade está implementado no working tree, ainda sem commit/push. Nenhum envio ou publicação foi feito nesta auditoria.

## Evidências executadas

- `npm run verify`: passed. Baseline, suíte do toolkit, consistência dos adaptadores, oito avaliações locais e padrões de segredos; build/ciclo da base, suítes/build/ciclos dos três modelos gerados e build/ciclos de API/Console adotados.
- A suíte do toolkit nesta implementação contém 97 testes; a execução fonte anterior explicitou 97/97, sem mudanças de lógica desde então. O verify desta auditoria repetiu a suíte e as suítes dos três projetos gerados com resultado passed.
- Ambiente: Node.js 24.22.1 e SDK .NET 8.0.425.
- Instalação all em simulação: changed 0, sem alteração necessária nos adaptadores instalados.
- Precheck toolkit/discovery: ready. Design/business: blocked, conforme contexto/aceites pendentes do modelo.
- HTTPS real e rotina de pesquisa: coleta, recibo e revalidação da documentação oficial Worker Services em raw.githubusercontent.com passaram, com contexto sintético e sem chamar modelos. Isso não equivale a pesquisa completa de um produto nem a geração de negócio aprovada.
- Microsoft Learn e W3C: CONNECT recusado com HTTP 403 pelo proxy; os domínios testados não estão na lista de saída. Fonte alternativa oficial no GitHub foi acessível. Nenhuma política de rede foi alterada.
- Revisão independente anterior do grafo: sem Critical/Important, com 7/7 testes específicos repetidos.

## Capacidades e limites atuais

| Área | Resultado |
|---|---|
| CLI, contratos, geração, adoção, recuperação, especialista e task-loop | Verificados pelas suítes locais |
| Grafo validate/impact e reset em descendentes | Verificados; vazio no modelo é intencional |
| Codex CLI | Available, versão 0.167.0-alpha.4; autenticação/modelo/isolamento não testados por subprocesso |
| Claude CLI | Unavailable neste ambiente |
| Cursor | Adaptadores suportados; aplicativo ausente e automação CLI/SDK explicitamente não implementada |
| Pesquisa HTTPS | Funciona com fonte oficial permitida; outras fontes dependem da política de saída |
| Windows/PowerShell e editores reais | Não executados neste host Linux |
| CI remoto do novo grafo | Não executado: novo código ainda não foi enviado |

## Ações remanescentes

1. Commit e envio do grafo para disponibilizá-lo no remoto; depois conferir GitHub Actions.
2. Registrar nós/relações reais nos projetos que usarão rastreabilidade. Não preencher o modelo com vínculos artificiais para eliminar empty.
3. Para usar Claude ou Cursor, preparar autenticação/instalação na máquina de uso e validar o fluxo nativo. Cursor CLI/SDK seria uma evolução separada, não um ajuste de configuração.
4. Autorizar os domínios das fontes necessárias ou escolher alternativas oficiais acessíveis e pertinentes. Nos testes, learn.microsoft.com e www.w3.org foram bloqueados.
5. Solicitar explicitamente avaliações com modelos se quiser evidência de comportamento real, ciente de consumo do provedor; nenhum --live foi executado nesta auditoria.

Correção documental realizada: atualizar a descrição do verify para incluir suítes dos projetos gerados e validação dos adotados, evitando contagem fixa desatualizada. Nenhuma lógica de negócio ou gate foi alterado.
