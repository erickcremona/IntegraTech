# Adoção do modelo como projeto real

Estado: aprovado pelo usuário e implementado. Evidências e limites em docs/validacao/adocao-2026-11-02.md.

## Comportamento desejado

Quando o desenvolvedor abrir sua cópia do modelo e informar nome e problema de negócio, a fábrica deve personalizar essa cópia e continuar trabalhando no projeto real. Não basta descrever como executar o gerador.

Se faltar o nome, perguntar “Qual será o nome do projeto?”. Se faltar o problema, pedir sua descrição. Aproveitar os dados já informados, sem repeti-los como perguntas. Não inventar requisitos nem escolher silenciosamente uma apresentação diferente.

## Conversão proposta

Adicionar uma operação de adoção na própria pasta da cópia do desenvolvedor. A operação recebe nome e arquivo de contexto inicial, apresenta uma simulação das alterações e aplica a personalização autorizada:

- Atualizar solução, projetos, namespaces, IoC, caminhos do toolkit, agentes, skills e documentação da identidade anterior para a nova.
- Registrar `is_model: false` e o estado de projeto real em descoberta.
- Preservar a descrição original do problema e os fatos informados no contexto. Dúvidas permanecem explícitas; informações ausentes não são completadas por suposição.
- Atualizar SOLUTION_CONTEXT.md e a retomada para orientarem a fábrica ao negócio desse desenvolvedor. O projeto não volta a oferecer onboarding de modelo a cada sessão.
- Continuar na mesma pasta, sem exigir que o desenvolvedor edite nomes, JSONs ou comandos manualmente.

O contexto inicial pode ser incompleto. Tornar-se projeto real não aprova arquitetura, plano ou funcionalidades: discovery continua permitida, design/business obedecem aos gates existentes. Não há promessa de entendimento infalível da IA.

## Proteção dos projetos

O repositório canônico do modelo deve permanecer modelo para os demais desenvolvedores. A adoção ocorre em uma cópia ou repositório próprio. Se a sessão estiver no repositório canônico, a fábrica identifica isso e solicita/propõe uma cópia de trabalho antes de converter; não altera o modelo compartilhado com o nome de um negócio particular.

A adoção não reinicializa nem apaga .git e não altera origin, permissões, credenciais ou configurações pessoais. O destino de push continua exigindo autorização aplicável. Não transformar o repositório remoto canônico em projeto de um cliente.

Antes de escrever, validar identidade, manifesto, colisões, arquivos alterados e links. Usar uma lista explícita de arquivos controlados pelo modelo; preservar arquivos pessoais. Em caso de customização conflitante, bloquear e mostrar os conflitos em vez de sobrescrever.

Preparar os arquivos em área temporária e manter cópia local dos arquivos controlados que serão substituídos/removidos. Não copiar credenciais nem .git para o backup. Planejar recuperação em caso de interrupção e permitir restauração dos arquivos da operação. Não prometer atomicidade total do sistema de arquivos.

Uma segunda chamada não sobrescreve um negócio já iniciado nem renomeia novamente um projeto real por inferência. Alterações posteriores de identidade ou contexto são tarefas explícitas.

## Validação

1. Nome e problema fornecidos produzem identidade própria e preservam o problema, sem exigir preenchimento completo do contexto.
2. Falta de nome/problema tem orientação explícita nas entradas Codex/Claude; entradas já fornecidas não são solicitadas novamente.
3. Projeto convertido compila e valida seu toolkit; a retomada reconhece o projeto real.
4. .git, origin e arquivos pessoais permanecem preservados.
5. Simulação não escreve; colisões, links e arquivos modificados bloqueiam antes da aplicação.
6. Modelo canônico não é convertido; adoção repetida não sobrescreve projeto real.
7. Contexto incompleto não libera implementação nem fabrica aprovação.

## Diferença para o mecanismo existente

create-project continua disponível para criar em outra pasta vazia. A adoção acrescenta o fluxo guiado e a conversão da cópia atual. As duas operações compartilham a preparação da identidade para evitar divergências.
