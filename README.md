# IntegraTech — modelo de arquitetura e fábrica de IA

Ponto de partida .NET 8 em camadas para desenvolvedores iniciarem seus próprios projetos com uma fábrica de desenvolvimento para **Codex e Claude Code**. O negócio começa em aberto: primeiro descreva o problema; depois a fábrica ajuda a descobrir requisitos, desenhar a solução, planejar e implementar fases aprovadas.

## Crie seu projeto

Para transformar **sua cópia atual** no projeto real, informe à fábrica o nome e o problema de negócio. Ela pergunta somente o que faltar, personaliza a cópia na mesma pasta e continua no contexto informado. O repositório-modelo canônico é protegido e permanece reutilizável. Consulte [adoção do modelo](docs/inicio/adotar-projeto.md). Abaixo está a alternativa de criar em outra pasta.

Requisitos: Node.js >=22 e SDK .NET 8. Autenticação de Codex/Claude Code é configurada separadamente pelo desenvolvedor.

```powershell
# Use um destino vazio fora da pasta do modelo.
npm run toolkit -- create-project --name MeuProjeto --target C:\Projetos\MeuProjeto --presentation api --provider both --dry-run
npm run toolkit -- create-project --name MeuProjeto --target C:\Projetos\MeuProjeto --presentation api --provider both
```

Apresentações: `worker` (aguarda cancelamento), `api` (host HTTP sem endpoints de negócio) ou `console` (inicia e encerra). Provedores: `codex`, `claude` ou `both`. O nome deve ser PascalCase alfanumérico, sem espaços ou nomes reservados. A criação não instala dependências nem executa Git, autenticação ou publicação.

O projeto recebe solução, namespaces, caminhos e skills com seu nome. Não recebe histórico Git, remotos, credenciais, artefatos locais, contexto preenchido, evidências ou aprovações do modelo. A lista permitida está no manifesto project-template.json do toolkit.

## Comece pelo problema

Abra a pasta gerada no Codex ou Claude Code e peça: “Quero descobrir o contexto do negócio antes de implementar. Meu problema é ...”. Use o [guia de início](docs/inicio/primeiro-projeto.md) e preencha references/business-context.json com apoio da fábrica.

Fluxo: **problema → descoberta → contexto validado → desenho/plano → aprovação → implementação → testes/revisão → entrega**.

Não é obrigatório integrar sistemas, usar banco, autenticação ou mensageria. Essas decisões dependem do problema. A fábrica possui CTO, analista de negócio, engenheiros e revisores, com contratos e gates compartilhados. A implementação ocorre na sessão nativa; o dispatcher automatiza apenas revisões sobre pacotes explícitos e não substitui testes.

## Valide a base

```powershell
dotnet build IntegraTech.sln --disable-build-servers -m:1
dotnet run --project tests/IntegraTech.Arquitetura.Tests --no-build
npm test
npm run check
npm run toolkit -- precheck --phase discovery
```

No projeto gerado, use o nome da sua solução e dos seus projetos. O teste .NET é um executável de ciclo de vida; `dotnet test` sozinho não o executa.

## Uso pelo GitHub

O modelo oficial é [erickcremona/IntegraTech](https://github.com/erickcremona/IntegraTech). Use **Use this template → Create a new repository** para criar seu próprio repositório ou **Code → Download ZIP** para baixar os arquivos.

Abra sua cópia no Codex ou Claude Code e informe: “Meu projeto se chamará MeuProjeto. O problema que quero resolver é ...”. A fábrica personaliza a cópia e inicia a descoberta do negócio conforme o [guia de adoção](docs/inicio/adotar-projeto.md). O GitHub não renomeia namespaces automaticamente. O repositório oficial permanece como modelo; cada desenvolvedor trabalha em sua própria cópia. Para criar em outra pasta, use a alternativa create-project descrita acima.

## Manutenção

Use `npm run verify` para a verificação reproduzível também usada no CI. Consulte [confiabilidade e avaliações](docs/inicio/confiabilidade.md) para políticas, avaliações locais/modelos, registros de revisão e limites reais da automação. Avaliações com modelos não são executadas automaticamente no CI.

[Operação do toolkit](tools/IntegraTech.IA.Toolkit/README.md) · [Arquitetura](docs/arquitetura/base.md) · [Retomada](references/README.md).

Documentos em docs/superpowers e docs/validacao registram a manutenção deste modelo e são excluídos da geração. Avisos legais são preservados em THIRD-PARTY-NOTICES.md. A base é .NET; o domínio e a apresentação são configuráveis.
