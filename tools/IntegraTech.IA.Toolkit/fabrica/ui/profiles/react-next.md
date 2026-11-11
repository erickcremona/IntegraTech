# React com Next.js

No App Router, preserve Server Components para páginas/layouts quando apropriado. Use fronteiras client somente para interação e APIs de browser; não marcar toda a aplicação use client. Não enviar segredos, credenciais ou lógica privilegiada ao cliente. Valide serialização entre fronteiras, caching e dados conforme a versão instalada; estratégias do framework evoluem.

Defina SSR/SSG/streaming e caminhos dinâmicos conforme contexto, SEO e frescor dos dados. Use mecanismos de imagem/fontes compatíveis, limites de bundle e estados loading/error/not-found. Teste hidratação, navegação e fluxos reais. Aplicar acessibilidade também nos estados transitórios.

Orientação disponível; gerador Next não fornecido neste incremento. Não trocar por Vite quando a arquitetura aprovada depende de Next. Referência: https://nextjs.org/docs/app/getting-started/server-and-client-components .
