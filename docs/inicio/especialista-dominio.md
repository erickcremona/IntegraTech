# Preparar contexto pesquisado e especialista de domínio

Nome e contexto iniciam a descoberta, sem criar o projeto. A fábrica pergunta somente o que falta: problema concreto, situação atual, públicos, resultados, critérios observáveis e escopo. Também investiga regras, dados, integrações, restrições e exclusões. Ausência legítima deve ser justificada; questões essenciais abertas bloqueiam. A CLI verifica estrutura e insuficiências conhecidas; o agente avalia se as respostas realmente permitem compreender o domínio.

## Pesquisa antes da criação

Use ferramentas de pesquisa da sessão para encontrar fontes primárias adequadas ao domínio: documentação oficial, normas/reguladores quando aplicáveis e entidades reconhecidas. Compare referências conflitantes, justifique autoridade, relevância e cobertura dos temas. Não envie contexto privado nas buscas. Preserve os fatos do usuário; separe achados, recomendações e hipóteses. Informação pública não define regras privadas da empresa.

Prepare em `.scratch/` o contexto conforme `business-context` e o levantamento conforme `domain-preparation`. O template em `fabrica/templates/domain-preparation.json` é propositalmente incompleto. O levantamento contém:

- `context_sha256`: hash normalizado exibido por `technology-check`.
- `assessment`: domínio, fluxo principal, perguntas críticas e dimensões `rules`, `data`, `integrations`, `constraints`, `out_of_scope`, cada uma com conclusão, origem e dúvidas.
- `sources`: id, URL HTTPS, título, entidade, autoridade, relevância, achados e indicação `required`.
- `synthesis`: tópicos/achados com `source_ids` e natureza `external_finding`, `recommendation` ou `hypothesis`.
- `coverage`: temas, justificativas e fontes; todas as fontes obrigatórias precisam de cobertura.
- Riscos, hipóteses e `action_plan`: fases ordenadas com dependências anteriores, objetivos, entregáveis, critérios de aceite, validações e riscos. A última fase tem id `coherence` e cobre otimização global.

```powershell
npm run toolkit -- onboarding --name MeuProjeto --context-file .scratch/contexto.json
npm run toolkit -- technology-check --context-file .scratch/contexto.json
npm run toolkit -- research-collect --context-file .scratch/contexto.json --preparation-file .scratch/levantamento.json --output .scratch/pesquisa.json
npm run toolkit -- specialist-check --context-file .scratch/contexto.json --preparation-file .scratch/pesquisa.json
```

`research-collect` consulta efetivamente as URLs, sem sobrescrever o arquivo de entrada, e acrescenta comprovantes com URL final, data e SHA-256 do conteúdo recebido. Revise a síntese contra o conteúdo consultado: o download não comprova interpretação correta. Limites: 12 fontes, 2 MiB por resposta, 15 segundos por requisição e até três redirecionamentos. Requer `curl`; conexão direta requer `getent` para verificar DNS público em Linux, enquanto ambientes com proxy HTTPS usam a política de destinos do proxy. TLS permanece habilitado. Não há acesso a endereços privados nem fallback offline.

Falha em fonte obrigatória ou usada na síntese/cobertura bloqueia. Fonte opcional não utilizada pode ficar sem evidência. Se uma referência necessária estiver indisponível, retome após restaurar acesso ou selecione outra fonte adequada e revise o levantamento. Não preencha comprovantes manualmente nem cite memória como consulta. A CLI reconsulta as fontes ao materializar: conteúdo ou destino alterado exige nova análise e coleta. A evidência local é auditável, mas não constitui assinatura de terceiro nem prova de autoria humana.

## Criação e adoção

Inclua também na preparação, como fontes obrigatórias com cobertura e comprovantes, todas as URLs técnicas usadas pela opção selecionada. Declarar `consulted` apenas na decisão não libera criação. Prepare também a decisão tecnológica aprovada conforme [decisao-tecnologica.md](decisao-tecnologica.md). Ela deve usar o mesmo contexto consolidado. Se a pesquisa revelar lacunas essenciais, volte às perguntas antes de gerar.

```powershell
npm run toolkit -- create-project --name MeuProjeto --target DESTINO --context-file .scratch/contexto.json --preparation-file .scratch/pesquisa.json --technology-file .scratch/tecnologia.json --provider all --dry-run
npm run toolkit -- create-project --name MeuProjeto --target DESTINO --context-file .scratch/contexto.json --preparation-file .scratch/pesquisa.json --technology-file .scratch/tecnologia.json --provider all
```

Na cópia própria do usuário, `adopt-project` aceita os mesmos documentos e protege o modelo canônico e alterações locais. `--presentation` é uma conferência opcional da decisão, nunca uma dispensa de contexto, pesquisa ou aprovação. Não há parâmetro de bypass, inclusive no dry-run. Falha de acesso impede materialização.

A geração cria a skill `<slug>-especialista-dominio` no núcleo da fábrica e nos provedores selecionados, além de `references/domain-preparation.json` e `references/domain-specialist.json`. O estado é `workflow_status: materialized`: ainda falta a revisão global. Não há herança do especialista ou contexto de outro projeto.

## Consulta antes de cada desenho

Em projeto real, execute `specialist-status`, leia a skill indicada e seus documentos. `precheck --phase design` exige contexto estruturado, escopo definido e especialista íntegro. Para cada funcionalidade/desenho, registre `domain-consultation` com `feature_id`, os hashes atuais `context_sha256`, `preparation_sha256`, `skill_sha256`, achados relevantes e impactos no domínio.

```powershell
npm run toolkit -- specialist-status
npm run toolkit -- precheck --phase design
npm run toolkit -- consultation-record --file .scratch/consulta.json
npm run toolkit -- consultation-check --file references/domain-consultations/registro-v1.json
```

O registro não pode sobrescrever outro; use um novo id para uma nova versão do desenho. O plano `business-plan` inclui `consultation_paths`. Cada fase funcional deve ter um registro cujo `feature_id` corresponda ao id da fase. `precheck business` verifica esses vínculos e preserva os gates de plano e aprovação. Hashes comprovam consistência, não leitura ou qualidade do raciocínio. O agente deve efetivamente consultar a skill.

Qualquer mudança no contexto normalizado exige rever pesquisa, atualizar hashes/decisão e regenerar a skill antes do novo desenho. Enquanto o contexto for o mesmo, consultas de desenho usam a pesquisa persistida e íntegra, sem exigir conexão a cada leitura.

## Projeto existente e atualização

Sem especialista, discovery/toolkit continuam disponíveis; design/business ficam bloqueados. Prepare o contexto completo no caminho indicado pelo estado, realize pesquisa atual e execute:

```powershell
npm run toolkit -- specialist-prepare --preparation-file .scratch/pesquisa.json
```

O comando reconsulta as fontes, preserva identidade e recusa sobrescrever skills/adaptadores alterados localmente. Resolve-se o conflito como manutenção explícita, sem apagar o trabalho do usuário. A operação registra backups e journal em `.scratch/adoptions/domain-*` e tenta restauração segura em caso de falha. Em interrupção abrupta, use `restore-adoption --journal .scratch/adoptions/domain-ID/journal.json` após revisar a situação. A recuperação recusa descartar edições concorrentes; resolva o conflito preservando o trabalho local antes de retomar. Não execute preparações simultâneas.

## Otimização final do projeto inteiro

Consulte o especialista e revise estrutura, código, testes, dependências, configuração, documentação, skills e coerência com contexto/decisões aprovados. Corrija referências antigas e contradições, simplifique componentes sem justificativa e execute as validações. Não faça refatorações artificiais, não invente ganhos de desempenho e preserve arquivos locais. Mudanças funcionais e operações destrutivas mantêm seus gates de aprovação.

Prepare um relatório `domain-coherence` em `.scratch/`, com hashes do especialista e `snapshot_sha256`, avaliações das oito áreas (`structure`, `code`, `tests`, `dependencies`, `configuration`, `documentation`, `skills`, `context`), ajustes com caminho/justificativa e pendências com `blocking`. Use os contratos como referência; nenhuma pendência bloqueadora ou avaliação reprovada libera conclusão.

```powershell
npm run toolkit -- coherence-snapshot
npm run toolkit -- coherence-run
npm run toolkit -- coherence-check --report-file .scratch/coerencia.json
npm run toolkit -- coherence-status
```

`coherence-run` executa `npm test`, `npm run check`, build .NET e teste de ciclo de vida da apresentação e registra códigos de saída e hashes das saídas em `references/domain-validation.json`. Em caso de falha, rode o comando informado individualmente para diagnóstico. `coherence-check` exige relatório atual e comandos aprovados sobre o mesmo inventário e só então registra `workflow_status: completed`. Uma alteração em arquivo ou adição de arquivo invalida a avaliação anterior. Não depender apenas do campo de estado; use `coherence-status` para conferir a conclusão atual.

O inventário inclui arquivos do projeto e adaptadores; exclui Git, `.scratch`, dependências instaladas, caches/builds, evidências geradas, credenciais e os próprios relatórios de validação/coerência. Links simbólicos e inventários acima de 128 MiB/10 mil arquivos bloqueiam. A leitura dos arquivos pode revelar novos ajustes necessários: materialização física não significa fluxo concluído. Se uma etapa falhar, mantenha o projeto e retome da pendência, sem readotar nem sobrescrever alterações locais.
