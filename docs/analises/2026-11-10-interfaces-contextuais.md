# Interfaces orientadas pelo contexto — pesquisa e proposta

Consultas realizadas em 2026-11-10 UTC. Este documento é pesquisa e proposta: não implementa capacidades de interface nem altera os geradores existentes.

## Situação do toolkit

A decisão tecnológica permite recomendar tecnologias, mas sua apresentação materializável é .NET Worker/API/Console. A lista textual technologies não é um contrato de interface. API não identifica uma UI. O application-engineer atual usa uma skill de aplicação .NET, sem perfil específico de frontend. O catálogo não tem especialista de interface ou revisor de UX/acessibilidade; o contrato review já admite ux_accessibility. O loop tem perfis Node/.NET, sem perfil de navegador, regressão visual ou desempenho web.

## Evidências consultadas

| Fonte oficial consultada | Achado e aplicação proposta |
|---|---|
| [React — Thinking in React](https://github.com/reactjs/react.dev/blob/main/src/content/learn/thinking-in-react.md) | Começar pelo modelo visual, decompor componentes, construir a versão estática e manter o estado mínimo. O perfil React deve orientar composição e estado, além de estilos. |
| [Next.js — Server and Client Components](https://github.com/vercel/next.js/blob/canary/docs/01-app/01-getting-started/05-server-and-client-components.mdx) | Páginas/layouts são Server Components por padrão no App Router; interatividade e APIs do navegador justificam fronteiras client. Minimizar JavaScript enviado ao cliente quando aplicável. Não transformar toda a árvore em client por padrão. |
| [Vue — Performance](https://github.com/vuejs/docs/blob/main/src/guide/best-practices/performance.md) | Escolher arquitetura apropriada, considerar SSR/SSG quando tempo de conteúdo importar, lazy loading, estabilidade de props e virtualização quando listas grandes justificarem. Não impor SPA a todo projeto. |
| [Angular — Accessibility](https://github.com/angular/angular/blob/main/adev/src/content/best-practices/a11y.md) | Reutilizar elementos HTML nativos, gerir foco/teclado e considerar Material/CDK conforme o projeto. Componentes acessíveis ajudam, mas a aplicação também precisa de validação. |
| [Blazor — render modes](https://github.com/dotnet/AspNetCore.Docs/blob/main/aspnetcore/blazor/components/render-modes.md) | SSR estático, interatividade server, WebAssembly e Auto têm características distintas. O perfil deve explicitar modo de renderização e compatibilidade com o runtime escolhido. |
| [Microsoft Fluent UI](https://github.com/microsoft/fluentui/blob/master/README.md) | Existem famílias de componentes e versões distintas. Escolher biblioteca compatível, tema e composição de forma explícita; não instalar uma biblioteca apenas por aparência. |
| [W3C — fonte WCAG 2.2](https://github.com/w3c/wcag/blob/main/guidelines/index.html) | Critérios independentes de tecnologia; avaliação combina automação e julgamento humano. Propor WCAG 2.2 AA como referência web, com teclado, contraste, foco e semântica verificáveis. Não declarar conformidade por um scanner isolado. |
| [WAI-ARIA — modal dialog](https://github.com/w3c/aria-practices/blob/main/content/patterns/dialog-modal/dialog-modal-pattern.html) | Diálogos exigem gestão de foco, Tab/Shift+Tab e Escape. Componentes precisam de comportamentos corretos, não apenas aparência de modal. |
| [Playwright — best practices](https://github.com/microsoft/playwright/blob/main/docs/src/best-practices-js.md) | Testar comportamento observado pelo usuário, isolar testes e usar locators por papéis/atributos de usuário. Contextos de browser não equivalem ao isolamento de sistema operacional do loop. |
| [Playwright — testes de acessibilidade](https://github.com/microsoft/playwright/blob/main/docs/src/accessibility-testing-js.md) | Documenta integração com axe e ressalta que testes automáticos detectam apenas parte dos problemas; combinar varreduras com avaliação manual e práticas inclusivas. |
| [Google — web-vitals](https://github.com/GoogleChrome/web-vitals/blob/main/README.md) | Medir LCP, INP e CLS em dados reais quando disponíveis. Os módulos [LCP](https://github.com/GoogleChrome/web-vitals/blob/main/src/onLCP.ts), [INP](https://github.com/GoogleChrome/web-vitals/blob/main/src/onINP.ts) e [CLS](https://github.com/GoogleChrome/web-vitals/blob/main/src/onCLS.ts) definem faixas boas de até 2500 ms, 200 ms e 0,1, respectivamente. Usar como referência web, com população/dispositivo e método definidos; testes de laboratório não comprovam INP real de produção. |
| [.NET MAUI — acessibilidade](https://github.com/dotnet/docs-maui/blob/main/docs/fundamentals/accessibility.md) | Propriedades semânticas e comportamento dos leitores variam entre sistemas. Perfil nativo deve usar ferramentas e verificações da plataforma; não transportar automaticamente regras de browser para UI nativa. |
| [Agent Skills — specification](https://github.com/agentskills/agentskills/blob/main/docs/specification.mdx) | Skills podem reunir SKILL.md, referências, assets e scripts. Sustenta empacotar conhecimento por stack e carregar somente o perfil necessário; não comprova compatibilidade de execução de todos os provedores. |

Os conteúdos foram obtidos diretamente dos repositórios oficiais por raw.githubusercontent.com (HTTP 200), não por resumos de buscador. Branches main/canary são referências vivas; uma implementação deve revalidar documentação e versões estáveis compatíveis com o projeto. Nenhuma afirmação de suporte futuro deriva apenas da presença de uma tecnologia nessa tabela.

Limitações da consulta: o endereço publicado www.w3.org/TR/WCAG22 foi bloqueado pelo proxy (403); sua fonte oficial no GitHub foi consultada. Caminhos tentados para Flutter e Design Tokens retornaram 404; não são usados como evidência de um perfil implementável. Isso é falha de acesso/caminho da consulta, não evidência contra essas tecnologias. Não houve benchmarks, instalação de frameworks ou implementação de uma UI.

## Recomendação de arquitetura

As fontes sustentam práticas de implementação e validação. A organização em agente/skills abaixo é uma proposta para o IntegraTech, não uma recomendação expressa dos autores das fontes.

Criar um especialista estável ui-engineer, uma skill comum integratech-interface e perfis versionados de stack carregados sob demanda. O CTO continua delegando diretamente ao especialista; o agente de UI não delega. QA e revisão permanecem independentes. Ferramentas determinísticas preparam/verificam o perfil e observam resultados; instruções em Markdown não substituem executor nem instalação compatível.

Alternativas consideradas: uma skill genérica única teria pouco conhecimento específico e tendência a receitas universais; gerar um agente inteiramente novo para cada projeto duplicaria conhecimento, aumentaria deriva e dificultaria revisão. Um agente estável com composição de perfis reutiliza a governança e permite especialização por contexto. Não baixar/executar skills ou plugins arbitrários automaticamente.

## Seleção e preparação

1. O contexto informa público, tarefas, dispositivos, navegadores/SOs, restrições de rede, SEO, uso offline, identidade visual, internacionalização, acessibilidade, densidade de dados e experiência da equipe. Perguntar apenas o que muda decisões.
2. A decisão técnica aprovada registra frontend independentemente de backend/apresentação: plataforma, framework e versão, modo de renderização, biblioteca de componentes, estratégia de estilos, design system e critérios de validação. Uma opção explícita sem UI evita dependências desnecessárias em worker/API/CLI.
3. Usar um contrato estruturado e versionado; não selecionar perfis por substring no campo technologies. Pode ser um documento interface-profile separado vinculado aos hashes de contexto e decisão, mantendo compatibilidade com o contrato tecnológico existente. Mudança material de stack exige novo aceite aplicável.
4. Um registro local de capacidades distingue recomendado, perfil disponível, gerador disponível e ferramentas realmente verificadas. Ausência de perfil compatível bloqueia sua preparação e gera trabalho específico; nunca substitui a tecnologia aprovada por outra silenciosamente.
5. Após o aceite técnico, a preparação materializa a especialização a partir dos perfis revisados: instruções da stack, referências consultadas, componentes/tema, scripts de validação e adaptadores Codex/Claude/Cursor. Respeitar arquivos manuais, hashes e recuperação existentes. Preparar a capacidade não autoriza implementar negócio antes do plano aprovado.

Exemplo: backend .NET API + frontend React/Next recebe perfil React/Next e preserva o backend. Blazor recebe perfil Blazor, seus componentes e modo de renderização. Worker sem interface não recebe React, biblioteca de componentes nem agente UI ativo. A primeira versão deve materializar somente stacks realmente implementadas/testadas; a matriz de pesquisa não implica suporte de todos os geradores.

## Conteúdo mínimo do perfil

- Identidade e usabilidade: referências visuais, hierarquia, tipografia, cores, espaçamento, densidade, navegação e comportamento responsivo; aproveitar design system existente. Moderno não significa impor a mesma estética a todo domínio.
- Componentes e arquitetura: biblioteca compatível quando justificada, variantes, composição, estado, dados, renderização e limites entre servidor/cliente adequados ao framework. Valores reutilizáveis de tema podem ser tokens sem impor formato externo não pesquisado.
- Fluxos completos: sucesso, carregamento, vazio, erro, validação de formulário, permissões, feedback e recuperação. Tema escuro/animações apenas se fizerem sentido; respeitar preferências de movimento quando aplicáveis.
- Acessibilidade: semântica nativa, teclado, foco, leitores de tela, contraste, zoom e alvos de interação. Para web, referência WCAG 2.2 AA; para nativo, critérios e ferramentas específicos da plataforma.
- Eficiência: orçamento de bundle/assets, carregamento e interatividade, medições e dispositivos representativos. Não aplicar memoização, virtualização ou bibliotecas pesadas sem necessidade medida.
- Evidências: build/lint/tipos, testes de componentes, jornadas E2E web quando aplicáveis, verificações automatizadas de acessibilidade, revisão manual por teclado/leitor, screenshots em tamanhos representativos e avaliação visual. Regressão visual deve fixar dados/fontes/browser e possuir baseline aprovado; screenshot igual não prova usabilidade.

## Integração no fluxo existente

Contexto → pesquisa/decisão técnica → perfil de UI preparado → especialista de domínio + desenho de interface → plano/aceite → implementação na sessão nativa → candidato → validação e revisão → grafo/coerência/entrega.

Adicionar rota interface para ui-engineer e revisor independente de UX/acessibilidade, aproveitando review_type=ux_accessibility já existente. Condicionar os tipos obrigatórios de revisão ao escopo real de UI e fixá-los antes da rodada; não remover revisões existentes para facilitar entrega.

O grafo deve ligar requisitos de interação/acessibilidade e decisões de UI aos componentes, tarefas e evidências explícitos, preservando o procedimento atual de propostas para vínculos ambíguos. Mudança de stack, tema ou perfil invalida os insumos afetados.

O loop precisará de perfil de validação UI separado: navegador/dev server e artefatos descartáveis no ambiente restrito, sem credenciais, com timeout e evidência vinculada ao candidato, versão do perfil e ambiente. Dependências/browsers devem ser preparados por canal autorizado; não liberar rede ou executar no host porque a validação isolada falhou. O ambiente atual já tem bloqueio de namespaces: escrever esse perfil não o torna comprovadamente executável aqui.

## Entregas recomendadas

Primeiro, contrato/registro de capacidades, agente/skill comuns, ligação com a decisão tecnológica, adaptadores, testes e documentação. Em seguida, um perfil de interface realmente completo, com gerador e validação de referência, escolhido para o projeto piloto; o primeiro perfil não se torna default para outros contextos. Expandir para as demais stacks após testes próprios e compatibilidade verificada.

Na implementação, atualizar README, guia do fluxo e mapa mental conforme a governança. Sem alteração operacional nesta pesquisa, não anunciar no README esses recursos como disponíveis.
