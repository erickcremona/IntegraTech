# Correções de coerência e UX no legado

O encerramento de coerência agora normaliza somente workflow_status/coherence_path no snapshot de controle do legado. Contexto, escopo, plano, aceite, vínculo e código continuam sujeitos aos gates. A regressão percorre duas tarefas SDD, conclui o relatório de coerência e verifica entrega válida e coerência ready; mudança de scope_status continua invalidando a entrega.

O diagnóstico registra candidatos de interface e classificação pendente. O candidato de manutenção sem perfil aprovado é bloqueado para arquivos/sinais de UI, inclusive quando o executor é application-engineer. O detector é conservador, não comprova arquitetura e não substitui análise e configuração do perfil. Testes cobrem TSX, CSS, frontend JS, DOM inline e Angular TS. A revisão identificou falsos positivos de genéricos C#/TS, nomes contendo react e exclusões backend; foram reproduzidos e corrigidos, com quatro regressões negativas.

Testes focados: 24 passaram. npm run verify final: exit 0, 24 verificações passaram, incluindo suíte completa, builds, ciclo de vida, geração Worker/API/Console e adoção API/Console. Adaptadores all válidos; baseline válido; varredura de padrões de segredos passou. Nenhuma avaliação com modelo externo ou certificação visual foi executada. A revisão independente avaliou as correções e originou as regressões adicionais de backend.

README e guias de fluxo/legado atualizados. O mapa foi revisto: os gates continuam nas etapas já representadas, sem mudança estrutural. Snapshots antigos não são reescritos para fabricar validade e podem exigir revalidação. Sem push ou publicação nesta entrega.
