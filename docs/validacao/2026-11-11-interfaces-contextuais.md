# Interfaces contextuais — validação de 2026-11-11

## Implementação entregue

Seleção estruturada de interface dentro da alternativa tecnológica, independente do backend, com source_roots aprovadas, fontes consultadas, versão, renderização, componentes/estilos, identidade, acessibilidade e critérios. Ausência/none não infere UI. A preparação valida contexto, especialista, evidências técnicas e aceite; geração/adoção preparam metadata e especialização do projeto nos adaptadores selecionados, sem frontend ou instalação implícita.

Novos papéis: ui-engineer e ux-accessibility-reviewer. Há skill comum e orientação específica para React/Vite, Next, Vue, Angular, Blazor e MAUI. Somente React/Vite possui gerador de referência. A capacidade do gerador verifica versão exata, CSS, nenhuma biblioteca adicional e destino frontend/; outros parâmetros não são descartados silenciosamente. Código personalizado bloqueia regeneração. Journals e ui-recover preservam conflitos e exigem escritor encerrado, sem replay.

O grafo reconhece o perfil e componentes explícitos. O loop fixa revisão UX adicional para arquivos nas raízes aprovadas de UI, inclusive Angular inline .ts e MAUI .cs, independentemente do executor. Exige evidência isolada específica de build/browser/acessibilidade ou validação nativa; Node/.NET genérico não promove entrega de UI.

## Evidência real do perfil React

Dependências consultadas no npm em 2026-11-11 e fixadas por lockfile: React/DOM 19.3.1, Vite 8.3.7, TypeScript 7.0.2, tipos React/DOM 19.3.0, Playwright 1.65.0, axe/Playwright 4.14.0. Requisito Node >=22.12.0.

Em destino descartável, instalação limpa npm ci, tipos/build de produção e Chromium real passaram. Testes de browser exercitaram quatro estados, dois temas, larguras 375/1280, navegação por teclado/link de salto, recuperação/reset e overflow. Foram executadas 16 varreduras axe (combinações estado/tema/largura). A screenshot foi inspecionada visualmente; é uma referência neutra, sem dados de negócio ou integração de backend.

Um segundo piloto exercitou os comandos reais do toolkit com projeto sintético pesquisado por fixture: ui-generate --dry-run retornou planned; ui-generate criou frontend e metadata; npm ci limpo passou; ui-validate padrão bloqueou com isolated_ui_executor_unavailable; ui-validate --local executou build e browser reais e retornou passed/stable=true em aproximadamente 9,6 segundos. Manteve isolation=not_verified e delivery_valid=false. Logs brutos e screenshot ficaram fora do Git, em diretório descartável.

A rede de pesquisa de domínio e os aceites do piloto eram fixtures sintéticas explicitamente identificadas. Instalação, compilação, browser, axe, screenshot e chamada CLI foram reais. Não houve chamadas a modelos externos, aceite de negócio real ou avaliação completa de leitores de tela.

## Verificações do núcleo

A rodada integral final npm run verify terminou com código de saída 0: baseline, suíte do toolkit, validação dos adaptadores, oito avaliações locais, secret scan, build/ciclo da solução, testes/build/ciclo dos três projetos gerados (Worker/API/Console) e consistência/build/ciclo das adoções API/Console passaram. Os 12 testes focados de interface também passaram. Validação dos três adaptadores: valid, 11 papéis; links locais dos cinco guias examinados: sem referências quebradas. Baseline: 229 arquivos controlados. A varredura adicional após staging incluiu todos os arquivos novos: 272 textuais, um binário ignorado e nenhuma ocorrência.

Revisão independente encontrou dois caminhos relacionados: validação genérica poderia liberar UI sem browser, e detecção por extensão omitia templates Angular/C# nativo. Regressões falharam antes da correção e passaram depois. O núcleo agora exige checks de UI isolados e usa source_roots aprovadas; as duas correções foram reavaliadas sem achados Critical/Important restantes.

Teste interno de instruções comparou a skill anterior de aplicação e a nova skill de UI: a nova orientação cobriu backend separado, Next server/client, estados/foco, gerador ausente, browser/sandbox indisponíveis e none. É interpretação de instruções em contextos separados, não teste dos aplicativos Codex/Claude/Cursor.

## Limites explícitos

Não há executor isolado de UI neste incremento. ui-validate padrão bloqueia; --local é um diagnóstico explicitamente solicitado e jamais libera o loop. O ambiente também possui a limitação de namespaces já documentada. Implementação automática continua desabilitada. Orientação para outras stacks não equivale a gerador, biblioteca instalada ou execução validada nessas stacks. Windows, aplicativos Claude/Cursor, UI nativa e provedores autenticados não foram demonstrados aqui.

Axe e screenshots não comprovam conformidade WCAG integral nem usabilidade. Revisão manual e validações específicas do produto continuam necessárias. Dados reais de LCP/INP/CLS e ganho de eficiência não foram medidos. Os registros locais não são autenticados contra quem escreve no workspace. O modelo canônico permaneceu sem UI de negócio.
