# Verificação de pré-requisitos e continuidade do fluxo

## Intenção

Evitar que a ausência de um adaptador de agente/skill interrompa o usuário ao começar um produto ou tarefa. O toolkit deve detectar arquivos de integração ausentes, indicar a recuperação segura e permitir que o CTO continue diretamente quando um especialista não puder ser carregado.

## Escopo e limites

- Acrescentar ao `doctor` um modo rápido local que verifique Node.js >=22, `curl`, skills e agentes canônicos/adaptados para o provedor configurado.
- O diagnóstico é informativo (`ready`/`degraded`), não bloqueia discovery nem sugere instalar tudo indiscriminadamente.
- Recuperação de adaptadores indica `install --dry-run` e instalação após revisão de conflitos; não sobrescreve personalizações automaticamente.
- Se um agente/skill adaptado faltar mas a fonte canônica existir, o CTO usa essa fonte e pode executar a responsabilidade diretamente. Se a especialização também estiver ausente, continua apenas o trabalho seguro com capacidade disponível e explicita a limitação.
- Não instalar ferramentas globais, autenticar provedores, nem escolher dependências de produto.

## Checagem para criação e adoção

O comando complementar `dependencies --provider ...` verifica Node.js, npm, `curl` e Git quando há uma cópia Git antes de criar/adotar. Requisito central ausente ou impossível de verificar bloqueia a materialização e apresenta ação/fontes sem executar instalação. CLI Codex/Claude é capacidade opcional do dispatcher de revisão; sua ausência é reportada como limitação, sem invalidar a sessão nativa. A seleção de `--provider` usada para materializar deve ser a mesma usada no relatório. Plugins/MCPs continuam condicionados ao plano aprovado.

## Abordagens

1. Instalação automática em toda abertura: recupera arquivos sem intervenção, mas pode alterar personalizações e invocar ferramentas externas.
2. Diagnóstico rápido mais fallback explícito: identifica o problema, sugere o instalador protegido e deixa o CTO continuar com o conteúdo canônico existente. **Escolhida**, por cobrir a falha sem sobrescrever arquivos nem exigir um provedor externo.
3. Bloquear onboarding até o ambiente completo: simples, porém mantém justamente o bloqueio que queremos evitar.

## Projeto técnico

Estender `doctor` com `--quick` e `--repo`, inspecionando o catálogo e os arquivos do provedor selecionado sem chamar as CLIs de agentes. O `doctor` sem `--quick` preserva os diagnósticos de Codex/Claude e os agrega. Instruções de entrada orientam rodar o modo rápido e seguir fallback/recovery sem parar discovery por ausência de um especialista.

## Aceite

- Diagnóstico encontra runtime abaixo do mínimo, `curl` ausente, skill canônica/adaptada ausente e agente adaptado ausente.
- Inspeção interrompida/negada não deve ser classificada como dependência ausente; a seleção de provedor de criação/adoção deve aparecer no relatório.
- Diagnóstico de ambiente completo retorna ready e tarefas fora do que falta continuam permitidas.
- Resposta informa recuperação e fallback sem alegar instalação nem autenticação.
- Fluxo e manuais descrevem o comportamento.
