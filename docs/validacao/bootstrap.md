# Validação do bootstrap IntegraTech

Rodada local: 2026-10-29. Escopo: base técnica e toolkit; sem integração de negócio, banco, Git remoto ou deploy.

## Evidências locais observadas

- `npm test`: 20 testes passaram, incluindo contratos, grafo de camadas, gates, roteamento, geração dos dois adaptadores, instalação idempotente, conflitos, junctions existentes/inválidas, processos reais, UTF-8 entre chunks, timeout, limite de saída e descarte de resposta inválida.
- `dotnet build IntegraTech.sln --no-restore --disable-build-servers -m:1 -p:UseSharedCompilation=false`: sete projetos compilados, zero avisos e zero erros.
- `dotnet run --project tests/IntegraTech.Arquitetura.Tests --no-build`: host iniciou, Worker permaneceu inativo e encerrou por cancelamento.
- `npm run check`: núcleo e adaptadores locais consistentes, sete papéis.
- Disponibilidade de executáveis, verificada com permissão de iniciar processos: Codex compatível com as flags exigidas; Claude Code não localizado.

A suíte .NET é um executável de teste de integração, sem framework adicional: deve ser invocada pelo comando documentado; `dotnet test` isoladamente não executa esse teste.

## Limites

Testes de adaptadores com respostas simuladas comprovam o tratamento local, não acesso real a modelos. Claude Code permanece sem validação real enquanto o executável/autenticação não estiver disponível.

O pacote de revisão é explícito e textual; não executa testes e pode ser insuficiente. Não há promessa de integração funcional. Plataforma e dependências serão reavaliadas antes de implantação.

## Revisão independente

Uma tentativa de iniciar revisão real pelo Codex foi rejeitada pela revisão automática de permissões antes da criação do processo. A razão informada foi que o envio de 49 arquivos locais ao serviço externo exige autorização específica do pacote. Não houve contorno, transmissão pela chamada rejeitada ou parecer independente produzido.

O pacote preparado inclui código novo do Worker, camadas, scripts da fábrica, contratos, skills, parte dos testes e documentação sanitizada. Não inclui credenciais, arquivos ocultos de configuração pessoal, binários ou configuração de banco. Um teste com strings sintéticas de credenciais foi excluído pela triagem. O pacote contém propriedade intelectual do projeto e depende de autorização explícita antes de envio externo. Mudanças locais posteriores exigem regenerar o pacote e confirmar sua lista antes de execução autorizada.

Foi feita inspeção local pelo próprio implementador. Isso não substitui revisão independente nem constitui aprovação do revisor. Resultados reais por provedor: Codex pendente de autorização de envio; Claude Code pendente de disponibilidade e execução autorizada. Nenhum review.json de aprovação foi fabricado.
