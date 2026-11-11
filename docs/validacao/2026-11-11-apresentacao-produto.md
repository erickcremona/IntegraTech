# Apresentação do produto após criação/adoção

A geração e a adoção agora compartilham entradas orientadas ao produto: README com problema, público, resultados, escopo, critérios, decisões e próximo passo; SOLUTION_CONTEXT e retomada com fatos próprios; README da fábrica com missão dedicada e manual técnico em posição secundária. A fotografia inicial é identificada como materialização; project-state.json continua sendo a fonte para a fase atual. Não há alegação de funcionalidades concluídas.

Entradas Codex/Claude/Cursor em produto real deixam de apresentar o ramo de onboarding do modelo como fluxo ativo. providerFiles e a validação/instalação locais usam a mesma identidade, preservando consistência. O modelo canônico mantém sua entrada de template e proteção contra adoção.

A referência técnica genérica é transportada em fabrica/toolkit-manual.md, sem copiar o README contextual do produto de origem. A regressão altera esse README no pai com um marcador privado e confirma que o filho não o herda. Contexto e documentação de entrada do filho são produzidos com seus próprios dados. Não houve readopção ou atualização destrutiva de projetos existentes: personalizações continuam protegidas pelos mecanismos atuais.

153 testes passaram. As verificações de geração cobrem três apresentações e provedores e a criação de descendentes; adoção verifica personalização dos documentos e entradas, preservação de Git/arquivos pessoais, conflitos e recuperação. Revisão independente não identificou achados importantes. A rodada integral npm run verify terminou com código 0: baseline, suíte, adaptadores, oito evals locais, varredura de padrões, build/ciclo da solução e dos três modelos gerados e consistência/build/ciclo das duas adoções passaram. A varredura pós-staging incluiu 279 arquivos textuais, um binário ignorado e nenhuma ocorrência.

Manuais gerais continuam disponíveis como apoio. A documentação deve acompanhar evoluções posteriores do produto; não foi implementada sincronização automática de prosa a cada evento de negócio. Nenhum contexto, aprovação, remoto ou funcionalidade foi inventado para personalizar o modelo canônico.
