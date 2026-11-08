# Escolher tecnologias pelo contexto

O nome identifica o projeto; o problema não determina sozinho a stack. Antes de materializar a cópia, a fábrica entende o contexto, pesquisa alternativas e apresenta uma decisão técnica. O worker do repositório é um exemplo executável, não um requisito de novos projetos.

## Descoberta e pesquisa na sessão

O CTO aproveita os fatos já informados e pergunta somente o que muda a escolha: usuários, interação (web/mobile/CLI), execução contínua ou pontual, dados, integrações, segurança, disponibilidade, escala, orçamento e ambiente de operação. Registre experiência da equipe e restrições tecnológicas em `constraints`, resultados em `desired_outcomes` e dúvidas em `open_questions` do contexto. Não transforme dados ausentes em requisitos presumidos.

Use as ferramentas externas disponíveis na sessão para consultar documentação oficial, ciclo de suporte, compatibilidade e limites das alternativas relevantes. Avalie custo de desenvolvimento/operação, manutenção e familiaridade da equipe; popularidade isolada não é critério suficiente. As consultas não devem enviar o contexto privado do negócio a buscadores. Prefira perguntas técnicas genéricas. Não instale ferramentas nem solicite credenciais só para preencher um registro.

Registre em cada fonte URL HTTPS, data UTC real (`YYYY-MM-DD`), `status: consulted|unavailable` e achados ou motivo da indisponibilidade. Uma URL citada de memória não é consulta realizada. Falta de acesso deve ficar explícita; a escolha não pode ser aplicada sem pelo menos uma fonte consultada vinculada à opção selecionada. Mesmo essa verificação é estrutural: não prova que um agente acessou ou interpretou corretamente a fonte.

## Decisão rastreável

Prepare os arquivos de trabalho em `.scratch/`, fora do Git. A cópia do modelo em `tools/IntegraTech.IA.Toolkit/fabrica/templates/technology-decision.json` é um esqueleto inválido até ser preenchido. Use o contrato `technology-decision`:

- `context_sha256`: hash do contexto normalizado, obtido com o comando abaixo. Não use `hash --file`: este calcula bytes, enquanto o vínculo tecnológico normaliza os campos do contexto.
- `drivers`: requisitos e restrições que orientam a escolha.
- `options`: alternativas com `id`, `stack`, `presentation`, `technologies`, `rationale`, `consequences` e `source_urls`. Registre alternativas plausíveis; quando só houver uma, justifique a restrição.
- `selected_option`: id escolhido; registre também por que componentes como worker, banco ou fila ficaram fora.
- `research`: fontes e resultados de consulta.
- `validation`: como demonstrar que a proposta funciona.
- `approval`: `status: proposed` e `source_reference: null` até haver aceite humano efetivo. Após o aceite, use `approved` e a referência de um arquivo local sanitizado com a evidência. Não fabrique aprovação.

```powershell
npm run toolkit -- technology-check --context-file .scratch/contexto-inicial.json
npm run toolkit -- technology-check --context-file .scratch/contexto-inicial.json --decision-file .scratch/decisao-tecnologica.json
```

O segundo comando verifica estrutura, hash, URLs/datas e referência de aceite. A saída distingue `proposed|approved` de `generator_supported`. A consulta é realizada pelo agente na sessão; o CLI não contém um buscador nem um seletor de stack por palavras-chave.

## Recomendação e geração têm capacidades diferentes

Recomendações podem abranger qualquer tecnologia justificada. Geradores testados nesta versão: `stack: dotnet`, com `presentation: api|console|worker`, usando .NET 8. O campo `technologies` explica a recomendação; não instala pacotes nem muda a versão fixa do modelo. Antes de aplicar, confirme que a recomendação cabe no modelo e no suporte do runtime; dependências adicionais exigem implementação e validação próprias.

Para outras stacks, use `presentation: none` quando não houver apresentação equivalente, e registre a recomendação normalmente. `generator_supported: false` significa que a materialização automática está indisponível. Não gere uma base .NET como aproximação de HTML estático, Python ou outra stack; apresente a recomendação e prepare um trabalho específico para o modelo necessário. Ausência de gerador não invalida uma recomendação apropriada.

Escolha `worker` quando houver processamento em segundo plano que justifique um serviço com esse ciclo de vida. Uma API ou aplicação web não precisa ganhar um worker separado automaticamente. Execuções pontuais podem usar console. UI, banco, autenticação, mensageria e implantação são decisões separadas, não dependências obrigatórias do toolkit.

## Materialização e limpeza

Na cópia do desenvolvedor:

```powershell
npm run toolkit -- adopt-project --name MeuProjeto --context-file .scratch/contexto-inicial.json --preparation-file .scratch/pesquisa.json --technology-file .scratch/decisao-tecnologica.json --dry-run
npm run toolkit -- adopt-project --name MeuProjeto --context-file .scratch/contexto-inicial.json --preparation-file .scratch/pesquisa.json --technology-file .scratch/decisao-tecnologica.json
```

A decisão aprovada e seu aceite são preservados em `references/technology-decision.json` e `references/technology-approval.md`; o estado aponta para a decisão. O contexto não pode mudar sem reavaliá-la. O precheck business verifica esse vínculo e a apresentação aplicada, além dos gates funcionais existentes.

A transação remove somente arquivos controlados do modelo, inclusive o host worker substituído, e atualiza solução, referências, código e teste de ciclo de vida para a apresentação escolhida. Qualquer arquivo controlado modificado bloqueia a operação antes de escrever. Arquivos pessoais, remotos e arquivos desconhecidos permanecem; o journal permite recuperação. Diretórios que ficaram vazios após a remoção dos arquivos controlados são retirados. Artefatos locais de builds anteriores e diretórios com arquivos desconhecidos permanecem, pois a operação não apaga recursivamente arquivos fora do manifesto. Não reaplique adoção a um projeto real; evolução posterior é uma tarefa explícita com preservação do trabalho existente.

Para gerar em outra pasta vazia, use `create-project --name MeuProjeto --target DESTINO --context-file .scratch/contexto-inicial.json --preparation-file .scratch/pesquisa.json --technology-file .scratch/decisao-tecnologica.json`; referências de aceite são resolvidas na raiz do modelo que executa o comando. Projetos descendentes não herdam contexto, decisão nem aceite do projeto anterior.

A opção `--presentation api|console|worker` apenas confere a apresentação da decisão aprovada. Não dispensa contexto completo, pesquisa externa verificada ou aprovação. Se a consulta estiver bloqueada, a criação e adoção ficam bloqueadas até conseguir acesso. Prepare o especialista e conclua a otimização global conforme [especialista-dominio.md](especialista-dominio.md).

## Referências do desenho

Consultadas em 2026-11-07 pelos repositórios públicos das fontes:

- [Google Engineering Practices — Complexity](https://github.com/google/eng-practices/blob/master/review/reviewer/looking-for.md#complexity): resolver a necessidade atual e evitar generalização especulativa.
- [Microsoft / Steve Smith — escolha de aplicações web](https://github.com/dotnet/docs/blob/main/docs/architecture/modern-web-apps-azure/choose-between-traditional-web-and-single-page-apps.md): requisitos, experiência da equipe e complexidade são critérios de escolha. É uma referência de critérios, não uma matriz atual de versões de frameworks.
- [Microsoft — Worker Services](https://github.com/dotnet/docs/blob/main/docs/core/extensions/workers.md): casos de processamento em segundo plano e alternativa sem Worker para execução curta.
- [Backstage — Software Templates](https://github.com/backstage/backstage/blob/master/docs/features/software-templates/index.md): modelos parametrizados com revisão antes de execução.
- [MADR — template](https://github.com/adr/madr/blob/develop/template/adr-template.md): contexto, critérios, alternativas, consequências e confirmação de decisões.

Essas fontes sustentam o fluxo da fábrica; cada projeto exige pesquisa própria das tecnologias candidatas. Não copie estas referências como evidência automática de uma nova decisão.
