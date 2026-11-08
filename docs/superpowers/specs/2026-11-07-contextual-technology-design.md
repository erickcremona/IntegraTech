# Tecnologias orientadas pelo contexto

Implementação autorizada na conversa de 2026-11-07. Objetivo: receber nome/contexto, investigar necessidades e fontes externas, documentar alternativas e decidir antes de gerar componentes. Worker é um exemplo opcional, nunca uma escolha implícita.

## Abordagens
Manter .NET fixo limita recomendações; construir geradores universais antecipadamente cria complexidade sem validação. Escolha: separar decisão de geração, com recomendações abertas e geração inicialmente restrita aos modelos .NET worker/api/console existentes.

## Contrato
O agente pesquisa documentação oficial usando os recursos da sessão e registra URLs, data, resultado e limitações. Não presume resultados de rede nem usa palavras-chave para decidir stack. Contexto inclui restrições, experiência da equipe, custo e operação. Decisões têm alternativas, critérios, consequências, seleção e validação. São vinculadas ao contexto normalizado por SHA-256. Aprovação exige referência local não vazia; estrutura não autentica aprovador.

CLI valida a decisão e informa suporte de geração. Geração sem apresentação/decisão explícita é rejeitada antes de escrever. Opção manual --presentation permanece disponível como seleção explícita de modelo .NET; não equivale a pesquisa. Adoção aceita uma decisão ou seleção manual explícita, deixa de herdar o worker, e usa a transação existente para remover o exemplo e suas referências. Modelos não suportados são reportados sem gerar uma aproximação .NET.

Decisão aplicada é preservada no novo projeto. Ela e o contexto não são herdados por projetos posteriores. Mudanças de contexto invalidam a decisão. Arquivos pessoais/modificados e remotos são preservados. Nenhum push, publicação ou alteração das configurações cloud faz parte desta tarefa.

## Validação
Testes de decisão (fontes, aprovação, contexto divergente e stack não suportada); geração sem default e por decisão; adoção worker→api/console com recovery e conflitos; suite Node e verify completo com builds/ciclo de vida dos três modelos. Não alegar comportamento de modelos externos com testes locais.
