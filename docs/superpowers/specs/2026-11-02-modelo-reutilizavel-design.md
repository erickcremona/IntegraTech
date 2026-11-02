# Modelo reutilizável de arquitetura e fábrica de IA

Estado: aprovado pelo usuário e implementado em 2026-11-02. Evidências e limites em docs/validacao/modelo-2026-11-02.md.

## Objetivo

Transformar o repositório em um ponto de partida .NET para novos projetos de desenvolvedores, combinando arquitetura em camadas e uma fábrica de desenvolvimento assistida por agentes de IA. O negócio começa indefinido: o desenvolvedor descreve o problema, a fábrica organiza a descoberta e só depois propõe arquitetura funcional e implementação.

A base .NET é mantida por ser a tecnologia já estabelecida neste projeto. O termo aplicação genérica se refere a domínio e tipo de aplicação, sem prometer geração de projetos em qualquer linguagem.

## Revisão do estado atual

1. README, contexto, skills, catálogo e templates ainda pressupõem integração entre dois sistemas. Isso orienta a fábrica a um domínio técnico antes de conhecer o problema.
2. Solução, namespaces, caminhos do toolkit e nomes de skills estão vinculados à identidade IntegraTech. Copiar o repositório não personaliza esses elementos.
3. O instalador entrega a fábrica, mas não uma solução completa renomeada e pronta para um novo produto.
4. O precheck consulta scope_status e plan_gate, mas não exige os documentos de contexto e plano que sustentam esses estados.
5. A documentação de bootstrap registra uma rodada específica; novos projetos não devem herdar esses resultados como validação própria.
6. Codex e Claude Code possuem superfícies geradas e contratos compartilhados. Preservar esses mecanismos, sem alegar revisão independente ou execução de provedor que não ocorreu.

## Alternativas

- Apenas documentação e cópia manual: menor mudança, mas deixa renomeações e limpeza de histórico/contexto a cargo do desenvolvedor.
- Template exclusivo de dotnet new: usa o mecanismo nativo .NET; exige também tratar a personalização da fábrica e o onboarding do negócio.
- Gerador local da solução e da fábrica, com documentação e suporte a repositório-modelo no GitHub: aproveita os utilitários existentes e permite validar identidade, destino, contexto e arquivos gerados numa única operação. **Abordagem recomendada.**

## Desenho proposto

### Identidade e criação do projeto

Adicionar um comando local create-project com nome, destino, provedor (codex, claude ou both) e apresentação (worker, api ou console). O destino deve estar vazio, fora da árvore do modelo, e não atravessar links/junctions. A operação terá simulação e rejeitará colisões antes de escrever.

O gerador produzirá a solução completa, referências entre projetos, namespaces, toolkit, agentes e skills coerentes com o novo nome. Nomes de projeto serão validados; não usar substituição cega em binários, licenças ou arquivos pessoais.

Não copiar .git, autenticação, remotos, .scratch, .vs, bin/obj, publicações, evidências ou aprovações. Preservar os avisos legais necessários. Não executar Git, autenticar provedores ou publicar o projeto criado automaticamente.

A cópia usará uma lista controlada de arquivos do modelo, não uma cópia recursiva com exclusões apenas. Arquivos pessoais adicionados à pasta não podem entrar automaticamente no projeto gerado.

### Arquitetura técnica

Manter Aplicação, Domínio, Infra.Data, Infra.Service e Infra.CrossCutting.IoC como base. A apresentação será escolhida na criação:

- Worker: host inativo até existir caso de uso.
- API: host HTTP mínimo, sem autenticação, persistência ou endpoints de negócio inventados.
- Console: ponto de entrada mínimo com composição de dependências, sem caso de uso fictício.

O modelo não pressupõe que toda aplicação precisará de banco, mensageria ou sistemas externos. Dependências e adaptações futuras serão justificadas pelo problema de negócio. Não incluir uma interface Web/Blazor por inferência.

### Entrada do contexto de negócio

Adicionar um documento inicial editável e um guia de início para o desenvolvedor informar:

- problema e situação atual;
- usuários e interessados;
- resultado esperado e medida de sucesso;
- escopo e exclusões;
- regras conhecidas, dados e restrições;
- integrações, se existirem;
- dúvidas e decisões pendentes.

Não exigir respostas que o desenvolvedor ainda não conhece. A fábrica transforma essas lacunas em perguntas e hipóteses explícitas; não preenche o negócio por suposição.

### Fluxo da fábrica

Fluxo: início → descoberta → contexto validado → desenho e plano → aprovação → implementação → testes/revisão → entrega.

Generalizar o analista e as skills hoje orientados exclusivamente a integração/Worker. A descoberta pode acontecer com contexto incompleto; implementação de negócio permanece bloqueada até existirem contexto definido, plano e referência ao aceite humano. Os estados referenciam documentos existentes e válidos; alterar um booleano não equivale a aprovação.

A fábrica mantém CTO, ownership, contratos, revisão independente, evidências e gates. Implementação ocorre pelas capacidades nativas da sessão Codex/Claude Code; o dispatcher existente continua destinado a revisores. Sem prometer execução autônoma universal, revisão simulada ou autorização irrestrita.

Validar também documentos vazios, placeholders não preenchidos, referências inválidas e caminhos fora do projeto. Documentos precisam conter os campos mínimos definidos no contrato de contexto/plano. A verificação estrutural não substitui o aceite humano sobre a qualidade do negócio e do desenho.

### Documentação e GitHub

Reescrever a entrada do repositório como manual de uso do modelo. Separar documentação de manutenção do modelo dos arquivos que cada novo projeto receberá. Novos projetos começam sem contexto, evidências ou gates herdados.

Após validar a implementação, habilitar a opção Template repository no GitHub, preservando a visibilidade privada e os acessos existentes. Documentar o uso por desenvolvedores com acesso. A cópia pelo GitHub continua exigindo a etapa local documentada de personalização; não prometer que o GitHub renomeia namespaces automaticamente.

## Validação e aceite

1. Gerar projetos com dois nomes distintos em destinos temporários, sem identidade/remoto/histórico herdados.
2. Compilar e testar o ciclo mínimo das apresentações worker, api e console.
3. Executar testes do toolkit e validar agentes/skills para ambos os provedores nos projetos gerados.
4. Verificar colisões, nomes inválidos, destino interno, links, simulação sem escrita e exclusão de artefatos locais.
5. Comprovar que descoberta aceita contexto incompleto e implementação é bloqueada sem contexto/plano/aceite documentados.
6. Confirmar que nenhuma regra assume integração entre dois sistemas como requisito obrigatório.
7. Registrar resultados reais e limitações dos provedores separadamente; não herdar aprovação de revisão pendente.
8. Confirmar no GitHub a propriedade de repositório-modelo e a manutenção da visibilidade privada.

## Fora de escopo

Implementar um negócio concreto, migrar a versão do .NET, criar IDE própria, instalar ou autenticar Codex/Claude Code, criar repositórios para terceiros, modificar permissões de colaboradores ou fazer deploy de aplicações.
