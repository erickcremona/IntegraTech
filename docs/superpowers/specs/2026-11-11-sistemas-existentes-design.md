# Sistemas existentes com gestão separada

Implementação autorizada após recomendação: manter o caminho de criação e acrescentar vínculo externo para manutenção incremental. Uma instalação pode registrar vários sistemas; toda operação exige seleção explícita, sem projeto ativo global.

O toolkit mantém seu código e identidade. Cada sistema possui área de gestão em `.integratech/projects/ID`, ignorada pelo Git, com identidade, contexto, pesquisa/especialista, plano SDD, grafo e evidências separados. `project-link.json` registra localmente a raiz absoluta do fonte; nenhuma cópia ou arquivo de configuração é instalado no sistema. A alteração de código aprovada ocorre nessa raiz original, respeitando instruções e alterações locais.

`attach-project` pede caminho quando ausente, verifica separação/acesso e produz diagnóstico de manifests sem executar comandos. `--dry-run` não escreve. O diagnóstico distingue tecnologias detectadas de capacidades de validação; não exige gerador para tecnologia existente. Dúvidas de domínio permanecem pendentes até pesquisa e confirmação. Não modifica namespaces, dependências, remotos, Git ou documentação do legado no vínculo.

O núcleo usa duas raízes explícitas: gestão para registros e fonte para inventários, ownership, testes e pacotes de revisão. Vínculo entra nos hashes/snapshots e no plano aprovado; uma troca de destino invalida a execução. Grafo usa prefixo `source/` para arquivos do sistema. Agentes Codex/Claude/Cursor trabalham nas pastas autorizadas da sessão; indisponibilidade de acesso não é contornada. UI existente é analisada e preservada; scaffolding automático é bloqueado no legado. Gate de design e capacidades reais permanecem exigidos para sua evolução.

Alternativas: copiar toolkit para dentro do legado contradiz a separação; espelhar fonte para dentro do toolkit cria sincronização e divergência. Vínculo com duas raízes atende ao pedido diretamente. O local do sistema é configuração privada, não herda aceites e não é publicado junto ao toolkit.

Testes comprovam vínculo sem mutação, isolamento de dois sistemas, invalidação de destino/insumos e manutenção SDD ponta a ponta com fonte externo. Validação real continua sujeita aos perfis e isolamento existentes; não se afirma suporte universal a stacks ou ausência de testes.
