# Escolher tecnologias pelo contexto

O nome identifica o projeto; o problema não determina sozinho a stack. Antes de materializar a cópia, a fábrica entende o contexto, pesquisa alternativas e apresenta uma decisão técnica. O modelo não contém uma aplicação de produto que sirva de exemplo ou preferência.

## Descoberta e pesquisa na sessão

O CTO aproveita os fatos já informados e pergunta somente o que muda a escolha: usuários, interação (web/mobile/CLI), execução contínua ou pontual, dados, integrações, segurança, disponibilidade, escala, orçamento e ambiente de operação. Registre experiência da equipe e restrições tecnológicas em `constraints`, resultados em `desired_outcomes` e dúvidas em `open_questions` do contexto. Não transforme dados ausentes em requisitos presumidos.

Use as ferramentas externas disponíveis na sessão para consultar documentação oficial, ciclo de suporte, compatibilidade e limites das alternativas relevantes. Avalie custo de desenvolvimento/operação, manutenção e familiaridade da equipe; popularidade isolada não é critério suficiente. As consultas não devem enviar o contexto privado do negócio a buscadores. Prefira perguntas técnicas genéricas. Não instale ferramentas nem solicite credenciais só para preencher um registro.

Registre em cada fonte URL HTTPS, data UTC real (`YYYY-MM-DD`), `status: consulted|unavailable` e achados ou motivo da indisponibilidade. Uma URL citada de memória não é consulta realizada. Falta de acesso deve ficar explícita; a escolha não pode ser aplicada sem pelo menos uma fonte consultada vinculada à opção selecionada. Mesmo essa verificação é estrutural: não prova que um agente acessou ou interpretou corretamente a fonte.

## Decisão rastreável

Prepare os arquivos de trabalho em `.scratch/`, fora do Git. A cópia do modelo em `tools/IntegraTech.IA.Toolkit/fabrica/templates/technology-decision.json` é um esqueleto inválido até ser preenchido. Use o contrato `technology-decision`:

- `context_sha256`: hash do contexto normalizado, obtido com o comando abaixo. Não use `hash --file`: este calcula bytes, enquanto o vínculo tecnológico normaliza os campos do contexto.
- `drivers`: requisitos e restrições que orientam a escolha.
- `options`: alternativas com `id`, `stack`, apresentação contextual opcional, `technologies`, `rationale`, `consequences` e `source_urls`. Registre alternativas plausíveis; quando só houver uma, justifique a restrição.
- `selected_option`: id escolhido; registre também por que componentes como worker, banco ou fila ficaram fora.
- `research`: fontes e resultados de consulta.
- `validation`: como demonstrar que a proposta funciona.
- `approval`: `status: proposed` e `source_reference: null` até haver aceite humano efetivo. Após o aceite, use `approved` e a referência de um arquivo local sanitizado com a evidência. Não fabrique aprovação.

```powershell
npm run toolkit -- technology-check --context-file .scratch/contexto-inicial.json
npm run toolkit -- technology-check --context-file .scratch/contexto-inicial.json --decision-file .scratch/decisao-tecnologica.json
```

O segundo comando verifica estrutura, hash, URLs/datas e referência de aceite. A consulta é realizada pelo agente na sessão; o CLI não contém um buscador nem um seletor de stack por palavras-chave.

## Recomendação e geração têm capacidades diferentes

Recomendações podem abranger qualquer tecnologia justificada. O toolkit não gera código de produto nem exige runtime de produto para criar/adotar; ele preserva a tecnologia aprovada nos registros. O campo `technologies` explica a recomendação e não instala pacotes. Após a aprovação do plano, confirme no ambiente as ferramentas necessárias para implementar e validar a opção selecionada.

Apresentação é texto contextual opcional, não um catálogo de hosts. Ausência de apresentação não impede a decisão. Não substitua a stack aprovada por outra para satisfazer um gerador; a ausência de ferramenta específica deve ficar explícita no plano de implementação e validação. A decisão pode recomendar .NET quando pesquisa, contexto e aceite sustentarem essa escolha.

Escolha componentes e ciclos de execução apenas quando os requisitos os justificarem. UI, banco, autenticação, mensageria e implantação são decisões separadas, não dependências obrigatórias do toolkit.

## Interface independente do backend

Se o contexto exigir interface, registre a propriedade estruturada `interface` na alternativa aprovada: raízes de código da UI, plataforma, framework/versão exata, renderização, biblioteca de componentes, estilos/design system, dispositivos, acessibilidade, validações e URLs consultadas. As fontes também devem integrar source_urls da alternativa e a preparação pesquisada. O agente prepara os dados; não exigir JSON manual do usuário. Ausência ou none não infere UI a partir de API ou technologies. Criação/adoção preparam a especialização após aceite técnico, sem instalar frontend. Consulte [interfaces](interfaces.md) para perfis, gerador React/Vite, bloqueios e validação.

## Materialização e limpeza

Na cópia do desenvolvedor:

```powershell
npm run toolkit -- adopt-project --name MeuProjeto --context-file .scratch/contexto-inicial.json --preparation-file .scratch/pesquisa.json --technology-file .scratch/decisao-tecnologica.json --architecture-file .scratch/arquitetura.json --dry-run
npm run toolkit -- adopt-project --name MeuProjeto --context-file .scratch/contexto-inicial.json --preparation-file .scratch/pesquisa.json --technology-file .scratch/decisao-tecnologica.json --architecture-file .scratch/arquitetura.json
```

A decisão aprovada e seu aceite são preservados em `references/technology-decision.json` e `references/technology-approval.md`; o estado aponta para a decisão. O contexto não pode mudar sem reavaliá-la. O precheck business verifica esse vínculo, além dos gates funcionais existentes.

A transação remove/substitui somente arquivos controlados do modelo e atualiza a identidade e os registros do produto. Não gera solução, código ou testes de ciclo de vida específicos da stack. Qualquer arquivo controlado modificado bloqueia a operação antes de escrever. Arquivos pessoais, remotos e arquivos desconhecidos permanecem; o journal permite recuperação. Diretórios que ficaram vazios após a remoção dos arquivos controlados são retirados. Não reaplique adoção a um projeto real; evolução posterior é uma tarefa explícita com preservação do trabalho existente.

Para gerar em outra pasta vazia, use `create-project --name MeuProjeto --target DESTINO --context-file .scratch/contexto-inicial.json --preparation-file .scratch/pesquisa.json --technology-file .scratch/decisao-tecnologica.json --architecture-file .scratch/arquitetura.json`; referências de aceite são resolvidas na raiz do modelo que executa o comando. Projetos descendentes não herdam contexto, decisão nem aceite do projeto anterior.

Não há opção `--presentation`; eventual descrição de apresentação é contextual e livre. Isso não dispensa contexto completo, pesquisa externa verificada ou aprovação. Se a consulta estiver bloqueada, a criação e adoção ficam bloqueadas até conseguir acesso. Prepare o especialista e conclua a otimização global conforme [especialista-dominio.md](especialista-dominio.md).

## Referências do desenho

Consultadas em 2026-11-07 pelos repositórios públicos das fontes:

- [Google Engineering Practices — Complexity](https://github.com/google/eng-practices/blob/master/review/reviewer/looking-for.md#complexity): resolver a necessidade atual e evitar generalização especulativa.
- [Microsoft / Steve Smith — escolha de aplicações web](https://github.com/dotnet/docs/blob/main/docs/architecture/modern-web-apps-azure/choose-between-traditional-web-and-single-page-apps.md): requisitos, experiência da equipe e complexidade são critérios de escolha. É uma referência de critérios, não uma matriz atual de versões de frameworks.
- [Microsoft — Worker Services](https://github.com/dotnet/docs/blob/main/docs/core/extensions/workers.md): casos de processamento em segundo plano e alternativa sem Worker para execução curta.
- [Backstage — Software Templates](https://github.com/backstage/backstage/blob/master/docs/features/software-templates/index.md): modelos parametrizados com revisão antes de execução.
- [MADR — template](https://github.com/adr/madr/blob/develop/template/adr-template.md): contexto, critérios, alternativas, consequências e confirmação de decisões.

Essas fontes sustentam o fluxo da fábrica; cada projeto exige pesquisa própria das tecnologias candidatas. Não copie estas referências como evidência automática de uma nova decisão.


Consulte [arquitetura contextual](arquitetura-contextual.md) para escolher o menor perfil adequado, registrar decisão/aceite e reavaliar evolução. Criação/adoção exigem `--architecture-file PATH`; planos SDD de produtos com arquitetura gerenciada exigem `architecture_sha256`. Migrações dependem de aprovação, fases, compatibilidade, recuperação e entrega validada antes de distribuição.
