# Interfaces conforme a tecnologia escolhida

O toolkit prepara o agente `ui-engineer` e uma skill especializada quando a alternativa tecnológica aprovada declara uma interface. Frontend e backend são decisões independentes: uma API .NET pode atender uma interface React, Next, Vue ou outra tecnologia justificada. API, Worker e Console não recebem frontend por inferência ou por menção textual de uma biblioteca.

## Use pela conversa

> Meu projeto precisa de uma interface para estes usuários e dispositivos: … Pesquise tecnologias e produtos comparáveis, recomende uma direção de experiência e prepare o especialista correspondente. Desenhe as jornadas prioritárias, prototipe, inspecione o resultado renderizado e refine a hierarquia, identidade, conteúdo e interação. Considere acessibilidade, mobile e desempenho. Apresente o desenho para aprovação e respeite o plano de negócio aprovado.

O CTO reúne as informações que faltam, consulta fontes oficiais, registra a escolha e pede o aceite técnico aplicável. O especialista de domínio continua sendo consultado antes do desenho funcional. O objetivo é uma experiência moderna e competitiva para este público, com tarefas claras e uma direção visual coerente com o produto. Escolher uma biblioteca ou gerar uma tela não demonstra essa qualidade.

## Desenho orientado às jornadas

Antes de implementar a experiência, o agente registra público, tarefas prioritárias, jornadas, conteúdo e condições de uso. Pesquisa referências reais comparáveis e informa URLs, datas de acesso, o que observou, por que funciona e quais limites impedem aplicar o mesmo padrão aqui. Referências informam decisões; não autorizam copiar identidade ou repetir uma estética universal de dashboard, cards ou gradientes.

O desenho define hierarquia, tipografia, grid, espaçamento, cores/tokens, componentes, conteúdo e microcopy. Motion precisa ajudar a entender uma ação ou mudança, com alternativa reduced motion. A composição deve cobrir estados aplicáveis — vazio, carregamento, erro, sucesso, validação, indisponibilidade e recuperação — e permitir concluir as tarefas mobile, incluindo toque, teclado virtual e conteúdo realista.

O registro fica em `references/interface-design.json`, ligado por hashes ao contexto, decisão técnica e perfil de interface atuais. Criação/adoção com UI já prepara o rascunho; em projeto existente, use:

```powershell
npm run toolkit -- ui-design-init
# Preencher o rascunho com pesquisa, desenho, evidências e aceite efetivo:
npm run toolkit -- ui-design-check
```

`ui-design-init` inicia um rascunho; não cria pesquisa, protótipo ou aprovação. O registro inclui `audience`, `primary_tasks`, `experience_goals`, referências com `url`, `accessed_at`, `analysis` e `application`, `visual_direction`, `journeys`, `responsive_rules`, `content_guidelines` e `validation_plan`. Os `prototypes` identificam arquivo, hash e descrição; `approval_reference` aponta para o registro local do aceite humano efetivo. Campos preenchidos e hashes válidos não comprovam por si só a qualidade das decisões.

O agente produz o protótipo na stack escolhida, abre o resultado em browser/ferramenta nativa disponível e autorizada, observa jornadas e captura estados e tamanhos representativos. Faz crítica visual, registra problemas de uso, refina a solução e inspeciona novamente os pontos afetados. Uma inspeção por especialista não pode ser apresentada como pesquisa com usuários reais.

O aceite humano do desenho é distinto dos aceites técnico e de negócio. `ui-design-check` verifica o registro aprovado e sua consistência com os insumos atuais antes de registrar candidato de UI; a checagem estrutural não autentica o aprovador ou comprova a qualidade visual. Mudanças nos insumos exigem reavaliação do desenho e das evidências. O [guia de qualidade da experiência](../../tools/IntegraTech.IA.Toolkit/fabrica/ui/experience-quality.md) detalha o ciclo e os critérios de revisão.

## O que está disponível

| Perfil | Orientação especializada | Gerador de frontend |
|---|---|---|
| `react-vite` | React, composição, estado mínimo e CSS responsivo | Referência React 19.3.1/Vite 8.3.7, renderização client, sem biblioteca adicional, CSS |
| `react-next` | Fronteiras servidor/cliente, renderização, caching e hidratação | Não disponível |
| `vue` | Componentes, reatividade, arquitetura e carregamento | Não disponível |
| `angular` | Componentes, Material/CDK quando adequados, foco e acessibilidade | Não disponível |
| `blazor` | SSR estático, Server, WebAssembly ou Auto | Não disponível |
| `maui` | Controles e acessibilidade por plataforma nativa | Não disponível |

Orientação não comprova execução em todas as versões: o perfil deve ser conferido contra a documentação da versão escolhida. Outras tecnologias podem ser recomendadas, mas exigem preparar um perfil próprio. O toolkit não troca a seleção por React para contornar um gerador ausente. React/Vite não é default da escolha.

O gerador React fornece uma referência técnica neutra, com estados e tema demonstráveis, layout responsivo, controles semânticos e testes. Não é o design aprovado do produto nem implementa suas regras. É um ponto de partida técnico: desenho e refinamento contextual continuam necessários em qualquer frontend escolhido. Não instala dependências nem integra o backend. Uma biblioteca/estratégia diferente da capacidade testada desabilita esse gerador; a implementação específica continua sendo trabalho explícito. O fluxo de desenho não acrescenta renderizadores ou ferramentas nativas aos perfis.

Versões do exemplo, consultadas em 2026-11-11 e fixadas por lockfile: React/DOM 19.3.1, Vite 8.3.7, TypeScript 7.0.2, Playwright 1.65.0 e axe/Playwright 4.14.0. O frontend requer Node >=22.12.0. Atualizações precisam de nova verificação de compatibilidade; não se assume suporte apenas por nome de framework.

## Como a decisão é registrada

A propriedade opcional `interface` fica dentro da alternativa de `references/technology-decision.json`. Exemplo de seleção; os demais campos da alternativa, pesquisa e aceite continuam obrigatórios:

```json
{
  "platform": "web",
  "framework": "react-vite",
  "version": "19.3.1",
  "rendering": "client",
  "source_roots": ["frontend"],
  "component_library": "none",
  "style_strategy": "css",
  "design_system": "Identidade visual definida e revisada para o projeto",
  "targets": ["Desktop e mobile"],
  "accessibility": ["WCAG 2.2 AA e avaliação manual"],
  "validation": ["Tipos, build, estados, teclado, responsividade e avaliação visual"],
  "source_urls": ["https://react.dev/learn/thinking-in-react"]
}
```

As URLs precisam integrar as fontes da alternativa e estar consultadas; criação/adoção e preparação também exigem evidência correspondente na preparação de domínio. A URL do exemplo não é prova de consulta para um novo projeto. Para ausência explícita de UI, use `{"platform":"none","framework":"none"}`; omitir o campo preserva a compatibilidade dos projetos anteriores e também não infere UI.

## Preparação e implementação

Na criação/adoção, a interface declarada e aprovada prepara automaticamente `references/interface-profile.json`, o plano de validação e a skill do projeto, com adaptadores dos provedores selecionados. Não gera arquivos em `frontend/` nessa etapa. Projetos descendentes recebem somente sua seleção atual, sem herdar UI ou conhecimento privado do anterior.

Em projeto real existente, após atualizar pesquisa e decisão, o agente pode operar diretamente:

```powershell
npm run toolkit -- ui-capabilities
npm run toolkit -- ui-prepare --dry-run
npm run toolkit -- ui-prepare
npm run toolkit -- ui-status
```

A preparação verifica contexto, especialista, fontes, aceite técnico e hashes. `ui-status` ready significa especialização consistente, não aprovação funcional ou ferramentas testadas. Arquivos personalizados bloqueiam substituição; nenhum adaptador é sobrescrito para resolver conflito. Trocar para none após preparação anterior exige reconciliação explícita, preservando arquivos.

Após plano e aceite de negócio válidos, para a referência React/Vite:

```powershell
npm run toolkit -- ui-generate --dry-run
npm run toolkit -- ui-generate
```

O destino é `frontend/`; o backend permanece preservado. Repetição idêntica não reescreve arquivos. Personalizações bloqueiam regeneração. A preparação/geração utiliza journal recuperável; `ui-recover` só reconcilia lock de escritor comprovadamente encerrado, sem reaplicar ações. Conflito de recuperação preserva o bloqueio ou exige o journal pelo procedimento de recuperação existente.

## Validação e revisão

Na referência gerada, instale dependências e prepare browser somente em ação autorizada. O frontend fornece `npm ci`, `npm run build` e `npm run test:browser`, descritos em seu README. Chromium de sistema pode ser selecionado por `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

A ferramenta distingue dois casos:

```powershell
# Não executa no host como alternativa ao isolamento:
npm run toolkit -- ui-validate
# Diagnóstico local explicitamente solicitado, após dependências instaladas:
npm run toolkit -- ui-validate --local
```

A primeira forma bloqueia porque não há executor isolado de UI fornecido neste incremento. A segunda executa scripts fixos de build/browser e grava relatório sanitizado em `qa-artifacts/interface/`, com snapshot, ambiente lógico, perfil e resultado. É diagnóstico local: `isolation=not_verified` e `delivery_valid=false` mesmo quando passa. Não instala dependências, não mede usuários reais e não comprova conformidade WCAG.

No loop, tarefa que afeta UI com perfil registrado exige desenho aprovado consistente e revisão independente `ux_accessibility`, além de código e segurança, fixadas antes do despacho. Também exige evidência isolada de build/browser/acessibilidade (ou ferramenta nativa aplicável). Perfis genéricos Node/.NET e diagnóstico local não bastam para promover essa entrega. **A entrega isolada de UI permanece bloqueada até existir executor capaz de produzir essas evidências**; não há fallback automático no host.

Para aprovar, a revisão UX inclui `ux_assessment` com os sete critérios `task_clarity`, `visual_hierarchy`, `visual_identity`, `interaction_states`, `responsive_behavior`, `accessibility` e `performance`. Cada entrada tem `criterion`, `score` inteiro de 1 a 5 e `evidence` como lista de strings verificáveis. Todos precisam atingir pelo menos 4; a média não esconde uma fraqueza. As notas orientam a decisão no escopo observado, sem certificar liderança de mercado ou conformidade WCAG.

Julgar aparência exige que o revisor realmente veja screenshots do resultado renderizado ou inspecione o protótipo. Caminhos de imagem e relatos textuais não dão visão ao dispatcher somente textual. Se o acesso visual ou a evidência de uso forem insuficientes, a revisão deve retornar `blocked`. O parecer registra problemas, correções esperadas e pontos a reobservar após o refinamento; build aprovado não substitui esse ciclo.

Playwright/axe e screenshots complementam testes de componentes e revisão humana. Validar manualmente leitor de tela, foco, teclado, zoom e uso real; estética, screenshot ou scanner isolado não provam usabilidade/conformidade. Dados reais de desempenho exigem método e amostragem apropriados.

## Rastreabilidade e manutenção

O grafo liga a decisão tecnológica ao perfil de interface e, quando gerados, aos componentes explicitamente registrados. Testes gerados não viram testes executados por inferência. Mudanças de contexto, seleção, perfil ou arquivos podem invalidar preparação e evidências; atualize com revisão, preservando aceites humanos e customizações.

Leia [decisão tecnológica](decisao-tecnologica.md), [loop assistido](loop-engenharia.md) e [guia do fluxo](fluxo-toolkit.md). A pesquisa de fundamento fica em docs/analises/2026-11-10-interfaces-contextuais.md no modelo; projetos reais precisam de pesquisa própria. Atualize guia, README, capacidades, exemplos e mapa mental junto com futuras mudanças.

As source_roots aprovadas delimitam o código de UI para o loop, inclusive templates Angular em .ts, React em .js e UI MAUI em .cs. Não se decide revisão somente por extensão. Alterar as raízes exige atualizar a decisão e a preparação; declare todos os diretórios de UI relevantes, sem omitir arquivos compartilhados que controlam sua apresentação. O gerador de referência usa exclusivamente frontend/.


O aceite de UX é um JSON separado, referenciado por approval_reference: schema_version=1, kind=ux_design, decision=approved, design_sha256, approved_by, approved_at UTC e source_reference para o registro humano sanitizado. Use ui-design-hash após preencher o briefing para calcular design_sha256; ele inclui direção, jornadas, referências e hashes dos protótipos, excluindo apenas status e approval_reference. Mudanças no conteúdo exigem novo aceite; aprovação do plano de negócio não substitui esse registro. O CLI verifica vínculo e presença, não autentica a pessoa nem avalia gosto visual.


## Propostas de interface e padrão aprovado

Ao escolher uma tecnologia de frontend, o toolkit deve sugerir ao usuário uma interface moderna adequada ao contexto, apresentando uma proposta visual concreta (protótipo renderizado, telas ou imagens) e explicando suas decisões de UX/UI. Não basta listar frameworks ou descrever uma estética em texto.

O usuário pode pedir novas sugestões e variações até gostar de uma delas, sem limite artificial de alternativas de design. Aproveite o feedback e os fatos existentes, registre versões e o que mudou, sem tratar exploração de design como tentativas de correção do loop de implementação. O usuário também pode fornecer sua própria referência: site, imagem, PDF, protótipo ou design system. Nesse caso, esclareça quais elementos devem ser preservados/adaptados e use essa referência como base da proposta. Referências próprias/autorizadas podem definir a identidade do produto; não imponha a estética do gerador.

Enquanto nenhuma proposta for aceita, o design permanece draft. Após aceite humano efetivo, registre a proposta escolhida e o protótipo correspondente em design_reference: proposal_id, origin (toolkit ou user), revision, prototype_path e usage_rules. O protótipo escolhido deve estar em prototypes com seu hash. references admite URL HTTPS ou referência local do usuário com origin=user, path e sha256, sempre com accessed_at, analysis e application. Arquivos locais não precisam ser publicados na internet.

A referência aprovada passa a ser o padrão de interface do produto: novas telas, componentes, navegação, tipografia, cores, espaçamento, estados e responsividade devem seguir a direção e as regras registradas. A revisão UX deve comparar a implementação com esse padrão e apontar desvios; o template técnico não o substitui. Ajustes dentro do padrão não exigem escolher outro design; mudanças materiais de direção exigem nova proposta e novo aceite vinculado ao conteúdo/protótipos.

Após aprovação, explore alternativas em rascunhos/protótipos separados e preserve a versão e os artefatos aprovados. Pedir uma sugestão nova não revoga nem sobrescreve o padrão ativo. Só promova a substituição após novo aceite explícito, preservando o histórico sanitizado de versões e decisões. Não reaproveite o aceite antigo para trocar a referência.


O system design é avaliado pelos riscos registrados na especificação; quando necessário, seu registro integrado cobre componentes, dados, integrações, falhas, segurança, observabilidade, validação e pontos de UX e fica coberto pelo aceite do plano. Consulte [system design](system-design.md).
