# IntegraTech — base da fábrica e arquitetura

Estado: desenho aprovado pelo usuário em 2026-10-29 e base implementada localmente. Revisão independente por serviço externo pendente de autorização do pacote. Evidências em docs/validacao/bootstrap.md.

## Objetivo e limites

Manter uma fábrica autônoma para uma aplicação .NET Worker de integração entre dois sistemas, com arquitetura própria em camadas e negócio em aberto. Código, configuração e operação são autocontidos neste repositório.

## Arquitetura do IntegraTech

O código usa net8.0. A apresentação Worker referencia Aplicação e Infra.CrossCutting.IoC; Aplicação referencia Domínio; IoC referencia Aplicação, Domínio, Infra.Data e Infra.Service. O toolkit contém entrada CTO, catálogo, agentes, contratos JSON, roteamento, instalador, precheck, validações e dispatcher de revisores.

## Abordagem proposta

Separar o núcleo compartilhado da fábrica dos adaptadores específicos de Codex e Claude Code. Manter o Worker em camadas e adiar decisões de domínio, banco e conectores até o recebimento do escopo. Todos os mecanismos necessários à base pertencem ao IntegraTech.

## Estrutura de destino

```text
IntegraTech/
  AGENTS.md
  CLAUDE.md
  SOLUTION_CONTEXT.md
  README.md
  references/README.md
  references/escopo-pendente.md
  .codex/agents/
  .agents/skills/
  .claude/
  tools/IntegraTech.IA.Toolkit/
    fabrica/team/catalog.yaml
    fabrica/team/contracts/
    fabrica/team/routing-scenarios.yaml
    fabrica/providers/
    fabrica/handoffs/
    fabrica/observability/
    scripts/
    tests/
    docs/
  src/
    IntegraTech.Apresentacao/IntegraTech.Apresentacao.Worker/
    IntegraTech.Aplicacao/IntegraTech.Aplicacao/
    IntegraTech.Dominio/IntegraTech.Dominio/
    IntegraTech.Infra.Data/IntegraTech.Infra.Data/
    IntegraTech.Infra.Service/
    IntegraTech.Infra.CrossCutting.IoC/
  tests/
  IntegraTech.sln
```

Proposta técnica do executor: manter net8.0 para paridade inicial com a referência. Revisar a plataforma antes da implantação quando houver cronograma e ambiente definidos. Dependências serão selecionadas pela necessidade da base; referências de autenticação, Google, Blazor, MySQL e outras específicas não serão copiadas automaticamente.

O Worker usa Generic Host, injeção de dependência, logging e cancelamento. Seu estado inicial é inativo para integrações: inicializa e encerra sem acessar sistemas externos. Não haverá processamento fictício, contratos de negócio inventados, migrações nem conexão de banco predefinida.

## Fábrica

- CTO como entrada única; especialistas não delegam; profundidade CTO → especialista.
- Preservar contratos de delegação, retorno e revisão, adaptando somente referências específicas quando necessário.
- Papéis iniciais propostos: analista de integração, engenheiro de aplicação, QA, plataforma e revisores de segurança, dados e código. Papéis Web/UX ficam fora da base Worker.
- Skills próprias para orquestração, planejamento, Worker, arquitetura, QA e segurança; sem regras escolares.
- Precheck diferencia infraestrutura pronta de escopo funcional pendente. Sem escopo, permite manutenção do toolkit e impede implementação de integrações de negócio.
- Instalador com simulação, proteção de arquivos existentes e destinos explícitos; sem executar Git.
- Dispatcher só declara execução independente quando um runtime separado foi realmente executado e seu retorno validado. Ausência de runtime ou parecer válido mantém a revisão pendente/bloqueada.
- Segredos permanecem fora de arquivos versionados, logs e evidências. Sem importar configuração, credenciais, evidências ou aprovações da referência.
- Merge, push, deploy e ações destrutivas dependem de autorização aplicável. A criação local da base não autoriza esses efeitos.

## Operação com Codex e Claude

Requisito do usuário: a fábrica deve operar tanto com Codex quanto com Claude. A interpretação técnica proposta para Claude é Claude Code, executando no repositório local.

- O núcleo canônico da fábrica fica em `tools/IntegraTech.IA.Toolkit/fabrica/`: governança, catálogo, contratos, roteamento e conteúdo compartilhado de skills. Nenhuma regra central pode depender exclusivamente do formato de um provedor.
- `AGENTS.md` e `CLAUDE.md` serão pontos de entrada para as mesmas regras canônicas. Configurações e agentes específicos ficam nas superfícies próprias de cada ferramenta, após verificar os formatos suportados nas versões utilizadas.
- Adaptadores separados para Codex e Claude Code traduzem invocação, permissões e retorno ao contrato comum. Não presumir equivalência entre formatos de agentes, flags, mecanismos de skills ou permissões.
- O dispatcher permite selecionar explicitamente o provedor. Verifica disponibilidade do executável, configuração e capacidades necessárias antes da execução; não troca de provedor silenciosamente.
- Execução de implementação e revisão mantém as mesmas restrições de escopo, ownership, evidência e aprovação em ambos os provedores. Revisores exigem isolamento somente leitura efetivo; se o adaptador não puder garanti-lo, a revisão fica bloqueada.
- Um handoff persistido registra objetivo, fase, arquivos alterados, validações, pendências e gates, permitindo retomar com o outro provedor sem depender do histórico privado do chat.
- O instalador oferece Codex, Claude Code ou ambos e valida consistência dos arquivos derivados com o núcleo. Configurações locais de autenticação não são copiadas.
- Testes de contrato e adaptadores cobrem ambos os provedores, incluindo indisponibilidade, timeout, erro de processo e retorno inválido. Simulação de processo valida o adaptador, mas não comprova operação real com o provedor.
- A entrega informa separadamente, para cada provedor, configuração criada, testes locais executados e execução real verificada. Sem instalação ou autenticação disponível, registrar a validação real como pendente.

## Evolução após o escopo

Registrar sistemas envolvidos, direção da integração, protocolos, autenticação, contratos, volumes, frequência, consistência, duplicidade, retentativas, recuperação, observabilidade e implantação como decisões pendentes. Nenhuma resposta será presumida. Após recebê-las, atualizar o contexto, planejar uma fase e definir critérios de aceite e testes aplicáveis.

## Plano de entrega proposto

1. Inventariar os componentes reutilizáveis e registrar sua origem e adaptação.
2. Criar governança, contexto neutro, catálogo, agentes, skills, contratos e cenários.
3. Adaptar e testar precheck, instalador, validadores e dispatcher aplicáveis.
   Incluir adaptadores Codex/Claude Code, entradas equivalentes e handoff entre provedores.
4. Criar solução Worker e camadas vazias com composição de dependências.
5. Validar arquitetura, compilação, inicialização/cancelamento, contratos, roteamento, instalação em destino temporário e ausência de contexto de negócio herdado.
6. Consolidar evidências e limitações reais; manter escopo funcional pendente.

## Critérios de aceite

- Nenhum código, regra, dado ou configuração de negócio escolar na base.
- Arquivos operacionais e documentação não contêm caminhos ou referências a outro projeto local.
- Solução compila e Worker inicia/encerra sem rede ou banco de negócio.
- Dependências entre camadas correspondem ao padrão observado, substituindo API por Worker.
- Contratos, catálogo, roteamento, precheck e instalador possuem verificações executáveis.
- Revisão independente não é simulada nem confundida com validação local.
- Codex e Claude Code usam o mesmo núcleo de governança e contratos; diferenças de execução ficam nos adaptadores.
- Seleção de provedor, instalação para ambos e retomada por handoff possuem verificações executáveis. Evidência de execução real é registrada separadamente por provedor.
- Contexto e ponto de retomada indicam explicitamente que o escopo da integração ainda não foi fornecido.

## Situação inicial verificada

C:\IntegraTech estava vazio e não era um repositório Git na inspeção. SDKs locais encontrados: 8.0.425 e 10.0.401. Não criar commit, remoto ou publicação como parte desta proposta.
