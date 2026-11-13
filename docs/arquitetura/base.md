# Arquitetura da base

## Decisões arquiteturais

O toolkit não prescreve camadas, apresentação, linguagem, framework ou runtime para os produtos criados. Avalie limites de domínio, requisitos funcionais e operacionais, equipe, implantação e manutenção; registre alternativas pesquisadas e a decisão aprovada em cada projeto. Consulte [arquitetura contextual](../inicio/arquitetura-contextual.md).

Criação e adoção registram decisões, mas não materializam um scaffold de produto. A implementação e sua validação devem seguir o plano aprovado, a tecnologia escolhida e as ferramentas disponíveis no ambiente.

## Fábrica

O núcleo em tools/IntegraTech.IA.Toolkit/fabrica contém governança, catálogo, roteamento, skills e contratos. O instalador materializa agentes e skills no formato de cada provedor. Alterações nessas superfícies devem nascer no núcleo e passar por regeneração/validação.

Implementação utiliza os recursos nativos da sessão escolhida, sob os gates do CTO. O dispatcher cobre revisores read-only; ele não anuncia um runtime universal de implementação.

O fluxo de criação prepara a instalação do toolkit e os registros próprios do projeto. `project.json` identifica nome e provedores; o contexto, a apresentação, as decisões e o plano são definidos conforme cada projeto.

Os pareceres automatizados avaliam um pacote textual explícito; não executam os testes e não descobrem arquivos privados. Revisão sobre pacote insuficiente deve ficar bloqueada. Segurança de arquivos, ferramentas e configuração depende também das permissões efetivas do provedor.
