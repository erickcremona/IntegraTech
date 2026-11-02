# Arquitetura da base

## Camadas e referências

| Camada | Referencia |
|---|---|
| Apresentação.Worker | Aplicação, Infra.CrossCutting.IoC |
| Aplicação | Domínio |
| Domínio | Nenhum projeto |
| Infra.Data | Domínio |
| Infra.Service | Aplicação, Domínio |
| Infra.CrossCutting.IoC | Aplicação, Domínio, Infra.Data, Infra.Service |

O modelo atual usa apresentação Worker. Nos projetos gerados, ela pode ser Worker, Api ou Console, sempre referenciando Aplicação e IoC. Bibliotecas sem conteúdo permanecem vazias até o domínio ser informado; não há classes de negócio fictícias.

O Worker usa Generic Host e BackgroundService; IoC centraliza a composição futura. O método AddIntegraTech não registra conectores nesta base. A inicialização só registra o Worker inativo, que aguarda cancelamento. Configuração e logging usam mecanismos nativos do Host, sem connection string ou segredo predefinidos.

O alvo inicial é net8.0. O SDK é 8.0.425 com rollForward latestFeature. Antes de implantação, revisar plataforma e dependências conforme ambiente e cronograma. Não há referência automática a EF Core, MySQL, JWT, MediatR ou AutoMapper; adicionar apenas quando os casos de uso justificarem.

## Fábrica

O núcleo em tools/IntegraTech.IA.Toolkit/fabrica contém governança, catálogo, roteamento, skills e contratos. O instalador materializa agentes e skills no formato de cada provedor. Alterações nessas superfícies devem nascer no núcleo e passar por regeneração/validação.

Implementação utiliza os recursos nativos da sessão escolhida, sob os gates do CTO. O dispatcher cobre revisores read-only; ele não anuncia um runtime universal de implementação.

O gerador create-project copia somente arquivos explicitamente permitidos pelo manifesto e materializa o host escolhido. project.json identifica nome, apresentação e provedores. references/business-context.json começa em branco; contexto, plano e aceite são próprios de cada projeto.

Os pareceres automatizados avaliam um pacote textual explícito; não executam os testes e não descobrem arquivos privados. Revisão sobre pacote insuficiente deve ficar bloqueada. Segurança de arquivos, ferramentas e configuração depende também das permissões efetivas do provedor.
