# React com Vite

Separe componentes por responsabilidade e mantenha estado mínimo, sem duplicar estado derivável. Comece pela estrutura estática e interações críticas; não use useEffect para sincronizar valores calculáveis durante render. Decida estado local/compartilhado conforme o fluxo, sem instalar gerenciador global por padrão.

Renderização client: confirme se SEO/primeiro conteúdo exigem outra arquitetura; Vite não é substituto automático de Next/SSR. CSS responsivo com tokens e semântica nativa; biblioteca de componentes somente conforme a seleção aprovada. Carregamento lazy e virtualização apenas quando tamanho/medição justificarem.

O gerador react-vite-v1 é uma referência neutra com versões fixas verificadas; não é uma aplicação de negócio completa. Após geração, instalar dependências apenas por ação autorizada, executar tipos/build e o comando explícito de browser, além de avaliação manual de acessibilidade. Não confundir isolamento entre testes de browser com confinamento do sistema operacional.

Referências: https://react.dev/learn/thinking-in-react e https://vite.dev/guide/ ; valide as versões exatas do projeto.
