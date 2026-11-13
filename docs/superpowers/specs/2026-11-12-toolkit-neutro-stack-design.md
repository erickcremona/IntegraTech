# Toolkit neutro quanto à tecnologia

## Intenção

Remover a solução .NET de exemplo do repositório IntegraTech e impedir que os fluxos de criação, adoção, arquitetura, validação e documentação direcionem novos produtos para uma tecnologia fixa. O toolkit de engenharia permanece implementado em JavaScript/Node.js; a tecnologia do produto deve decorrer do contexto pesquisado e da decisão aprovada.

## Objetivos

- Não manter uma solução de negócio de exemplo no modelo.
- Recomendar e registrar stacks conforme contexto, fontes consultadas e aceite humano.
- Criar/adotar uma cópia com o toolkit, contexto, decisão, governança e relatório de prontidão, sem scaffold de produto ou dependências presumidas.
- A cópia criada/adotada registra a stack e arquitetura aprovadas e continua para planejamento do produto; implementação específica começa na fase aprovada, com capacidades observadas.
- Não converter uma stack sem validador em outra stack.
- Descrever validações disponíveis por capacidade detectada e bloquear alegações de build/teste não executados.
- Manter as alterações locais existentes, inclusive a correção independente do coletor de pesquisa.

## Fora de escopo

- Implementar geradores de produto para várias stacks.
- Instalar SDKs, runtimes, dependências, credenciais ou ferramentas de produto.
- Escolher ou pré-selecionar uma tecnologia sem evidência contextual.
- Apagar os perfis de interface React/Vite ou afirmar que o toolkit valida stacks que ainda não possui verificadores.

## Abordagens consideradas

1. **Toolkit neutro sem scaffold de produto (escolhida):** remover a solução e os templates de aplicação .NET; criação/adoção materializa apenas toolkit e registros. Decisões podem recomendar qualquer stack; implementação e validação específica são planejadas para o produto após aprovação e verificadas somente com ferramentas disponíveis.
2. **Manter .NET como gerador opcional:** retiraria a solução de exemplo, mas manteria um caminho com suporte e templates exclusivos .NET. Isso continuaria privilegiando a stack que motivou a mudança.
3. **Adicionar imediatamente múltiplos geradores:** aumentaria alcance, dependências e custo de validação e exigiria escopos de suporte por tecnologia antes de haver projetos e capacidades selecionados.

## Decisões de desenho

- Remover do modelo a solução, projetos, fontes e teste de ciclo de vida .NET que funcionam como produto-exemplo.
- Separar o núcleo Node.js do produto: `npm run verify` deve validar o toolkit, seus testes, contratos, adaptadores e operações de criação/adoção; não deve exigir SDK de produto nem criar Worker/API/Console demonstrativos.
- Remover do contrato de materialização a exigência de `generator_supported` para criar/adotar. A decisão tecnológica aprovada continua obrigatória, com pesquisa, hash do contexto e referência de aceite.
- Criar/adotar não emitirá código de negócio, solução ou estrutura de camadas específica. O relatório de prontidão explicará que a implementação inicia a partir do contexto e da decisão escolhida.
- A cópia gerada não conterá arquivos, exemplos, comandos de build ou instruções que prescrevam uma stack. O toolkit pode pesquisar e recomendar .NET ou outra tecnologia quando o contexto justificar, mas não carregará uma implementação-exemplo correspondente.
- Arquitetura registra limites e atributos pertinentes sem presumir camadas .NET. Recomendações arquiteturais não são anunciadas como geradas ou validadas automaticamente.
- Validadores específicos já disponíveis podem continuar como capacidades opcionais para produtos cuja decisão e ambiente os justifiquem; não são requisito de criação/adoção nem influenciam o ranking de tecnologias. A validação do toolkit não exige tais SDKs.
- Documentação, guias gerados, workflows e testes devem refletir essa separação. .NET poderá aparecer como alternativa pesquisada para um contexto futuro, nunca como stack-base do modelo.
- O baseline do modelo deve ser atualizado somente após revisão das mudanças controladas.

## Aceite

- A raiz do modelo não contém solução, projeto ou fonte de exemplo .NET.
- Criar/adotar requer decisão pesquisada e aprovada, mas não exige `presentation` Worker/API/Console nem gera scaffold específico de tecnologia.
- A seleção aprovada de tecnologia é preservada nos arquivos do produto gerado/adotado.
- A criação de um produto com decisão não .NET gera somente os arquivos neutros do toolkit e seus registros; não insere instruções de uma stack distinta.
- Nenhum caminho escolhe silenciosamente .NET ou troca a stack selecionada.
- `npm run verify` passa sem .NET instalado como requisito do toolkit e cobre testes, contratos, baseline e criação/adoção neutra.
- Guias e relatórios descrevem limites de validação sem prometer verificações ausentes.

## Questões de implementação

O responsável pela implementação deve localizar e remover acoplamentos em contratos, CLI, arquitetura, criação/adoção, validação, baseline, workflows, testes, README, guias, agentes e relatórios gerados. Mudanças de schema devem preservar compatibilidade ou rejeitar versões antigas com mensagem explícita; não migrar projetos existentes silenciosamente. A verificação final deve registrar capacidades de plataforma efetivamente executadas e limites ambientais.
