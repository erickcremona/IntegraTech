# System design quando o produto precisa

System design detalha como componentes, dados e integrações cooperam para cumprir requisitos e lidar com falhas. No IntegraTech ele é condicional e faz parte de `references/technical-design.json`, dentro do SDD. O plano já vincula esse arquivo por `design_sha256`; a aprovação do plano cobre o desenho. Não é uma aprovação paralela nem um diagrama obrigatório para toda feature.

A system-design-analyst avalia o contexto e a especificação funcional. Evidências estruturadas em cada requisito usam `context_refs:[{pointer,quote}]` com ponteiro JSON Pointer e trecho exato do contexto, e `system_design_signals:[{kind,evidence}]`. Sinais aceitos:

- `multiple_components`
- `critical_external_integration`
- `payment_or_financial_flow`
- `regulated_data_boundary`
- `cross_system_consistency`
- `availability_requirement`
- `performance_requirement`
- `distributed_runtime`
- `complex_async_workflow`
- `resilience_requirement`

Os fluxos financeiros, dados regulados, consistência externa, disponibilidade explícita e runtime distribuído tornam o desenho necessário. Vários atributos combinados podem recomendar um desenho. O agente fundamenta sua classificação nos fatos citados; termos vagos, número de telas ou preferência tecnológica não elevam o nível. A avaliação também pode concluir que o desenho técnico habitual basta.

Para verificar os sinais antes do desenho, use:

```sh
node tools/IntegraTech.IA.Toolkit/scripts/toolkit.mjs system-design-assess \
  --context-file references/business-context.json \
  --specification-file references/functional-spec.json
```

O resultado é uma triagem baseada nos sinais estruturados, não uma decisão automática de arquitetura. Para `required`, `technical-design.system_design` precisa conter `applicability:"required"` e `decision:"included"`. Para `recommended`, o usuário pode incluir um desenho detalhado ou adiar com `applicability:"recommended"`, `decision:"deferred"` e `defer_reason` fundamentado. Para `not_required`, registre `applicability:"not_required"`, `decision:"not_applicable"` e rationale. O aceite do plano SDD confirma a escolha.

Um desenho incluído cobre componentes e responsabilidades, fluxos/sequências, limites dos dados, integrações, falhas e recuperação, atributos de qualidade, segurança, observabilidade, pontos de contato da UX e estratégia de validação. Indique o que ainda está incerto e pergunte somente o necessário. Não invente volumes, SLAs, provedores, diagramas implantáveis ou componentes ausentes dos requisitos.

Uma interface de checkout, por exemplo, pode exigir sequência entre navegador, API, pedidos e provedor de pagamento; consistência de preço/estoque; idempotência, timeout e compensação; exposição de estado de pagamento e erro na UX; observabilidade sem dados sensíveis; e testes de falha. O desenho não escolhe a direção visual: a referência UX/UI aprovada permanece sua autoridade.

System design orienta, mas não substitui análise da arquitetura contextual, especialista de domínio, requisitos de segurança, design UX, aceites, plano faseado nem validação observada. C4 ou outro estilo de diagrama pode ser anexado como apoio quando ajudar as pessoas a revisar componentes e limites; o registro legível continua sendo a fonte vinculada ao SDD.

Projetos já existentes continuam aceitando desenhos técnicos anteriores sem esse objeto. A gestão contextual automática ativa-se em projetos gerados agora, ou ao adicionar indicadores/a seção `system_design` a um desenho SDD existente. Ao adotar o processo em projeto real, preserve os arquivos e planos existentes, registre os indicadores e vincule o desenho no próximo plano aprovado.
