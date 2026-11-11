# Interfaces conforme a tecnologia escolhida

O toolkit prepara o agente `ui-engineer` e uma skill especializada quando a alternativa tecnológica aprovada declara uma interface. Frontend e backend são decisões independentes: uma API .NET pode atender uma interface React, Next, Vue ou outra tecnologia justificada. API, Worker e Console não recebem frontend por inferência ou por menção textual de uma biblioteca.

## Use pela conversa

> Meu projeto precisa de uma interface para estes usuários e dispositivos: … Pesquise as alternativas, recomende a tecnologia, registre a decisão de interface e prepare o especialista correspondente. Considere identidade visual, acessibilidade e desempenho. Não implemente o negócio antes do plano aprovado.

O CTO reúne as informações que faltam, consulta fontes oficiais, registra a escolha e pede o aceite técnico aplicável. A orientação cobre composição de componentes, estado, renderização, navegação, identidade/tokens, responsividade, estados vazio/carregando/erro/sucesso, formulários, foco, teclado e avaliação de desempenho. O especialista de domínio continua sendo consultado antes do desenho funcional.

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

O gerador React fornece uma referência técnica neutra, com estados e tema demonstráveis, layout responsivo, controles semânticos e testes. Não é o design aprovado do produto nem implementa suas regras. Não instala dependências nem integra o backend. Uma biblioteca/estratégia diferente da capacidade testada desabilita esse gerador; a implementação específica continua sendo trabalho explícito.

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

No loop, tarefa que afeta UI com perfil registrado exige revisão independente `ux_accessibility`, além de código e segurança, fixadas antes do despacho. Também exige evidência isolada de build/browser/acessibilidade (ou ferramenta nativa aplicável). Perfis genéricos Node/.NET e diagnóstico local não bastam para promover essa entrega. **A entrega isolada de UI permanece bloqueada até existir executor capaz de produzir essas evidências**; não há fallback automático no host.

Playwright/axe e screenshots complementam testes de componentes e revisão humana. Validar manualmente leitor de tela, foco, teclado, zoom e uso real; estética, screenshot ou scanner isolado não provam usabilidade/conformidade. Dados reais de desempenho exigem método e amostragem apropriados.

## Rastreabilidade e manutenção

O grafo liga a decisão tecnológica ao perfil de interface e, quando gerados, aos componentes explicitamente registrados. Testes gerados não viram testes executados por inferência. Mudanças de contexto, seleção, perfil ou arquivos podem invalidar preparação e evidências; atualize com revisão, preservando aceites humanos e customizações.

Leia [decisão tecnológica](decisao-tecnologica.md), [loop assistido](loop-engenharia.md) e [guia do fluxo](fluxo-toolkit.md). A pesquisa de fundamento fica em docs/analises/2026-11-10-interfaces-contextuais.md no modelo; projetos reais precisam de pesquisa própria. Atualize guia, README, capacidades, exemplos e mapa mental junto com futuras mudanças.

As source_roots aprovadas delimitam o código de UI para o loop, inclusive templates Angular em .ts, React em .js e UI MAUI em .cs. Não se decide revisão somente por extensão. Alterar as raízes exige atualizar a decisão e a preparação; declare todos os diretórios de UI relevantes, sem omitir arquivos compartilhados que controlam sua apresentação. O gerador de referência usa exclusivamente frontend/.
