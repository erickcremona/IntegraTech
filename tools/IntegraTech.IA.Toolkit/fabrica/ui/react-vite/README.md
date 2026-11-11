# __PROJECT_NAME__ — referência React/Vite

Esta é uma referência técnica neutra, gerada por seleção explícita de React/Vite. Não é o design aprovado do produto, não contém regras/dados de negócio e não integra backend. Substitua a referência somente conforme contexto, pesquisa e design aprovados. Os estados vazio, carregando, erro e sucesso são demonstrações manuais locais, sem serviços externos.

Requer Node.js >=22.12.0. Versões exatas consultadas no registro npm em 2026-11-11: React/React DOM 19.3.1; Vite 8.3.7; TypeScript 7.0.2; @types/react e @types/react-dom 19.3.0; @playwright/test 1.65.0; @axe-core/playwright 4.14.0. O lockfile fixa também dependências transitivas. Reavalie versões e requisitos ao atualizar.

```sh
npm ci
npm run build
npm run dev
```

Validação de browser é uma ação explícita e requer Chromium e bibliotecas de sistema compatíveis. Dependências não são instaladas automaticamente pela preparação do toolkit.

```sh
npx playwright install chromium
npm run build
npm run test:browser
```

Para um Chromium de sistema já disponível, use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/caminho/do/chromium npm run test:browser` em vez de baixar outro browser.

O teste inicia/encerra um preview local em porta disponível; verifica componentes, estados, teclado, temas, larguras 375/1280, overflow e axe; salva `test-results/reference.png`. A screenshot e o teste são diagnósticos locais. Não comprovam conformidade WCAG, revisão humana, isolamento de entrega, aprovação de negócio ou validação do produto. Browser indisponível bloqueia esta evidência; não substitua por build bem-sucedido. Complete revisão manual com leitor de tela, zoom, teclado e conteúdo real, além do processo isolado de entrega.

A interface usa landmarks semânticos, controles nativos com labels, mensagens de estado, link de salto, foco visível, variáveis de tema, layout responsivo, fontes de sistema e preferência de movimento reduzido. Ajustes de produto exigem revisão UX/acessibilidade independente.
