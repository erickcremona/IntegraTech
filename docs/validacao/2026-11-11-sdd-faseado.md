# SDD faseado — validação da manutenção

Escopo: especificação funcional, desenho técnico e plano v2 com decomposição aprovada, dependências, execução vinculada e checkpoints. README, mapa Mermaid e guias de uso foram atualizados. Templates e contratos acompanham projetos criados/adotados; planos antigos continuam identificados como legados.

## Evidências e revisão

- Contratos verificam hashes exatos, DAG de fases, cobertura de requisitos/cenários, ownership e testes previstos.
- Testes de workflow exercitam gates e transições reais com validação isolada/revisores simulados explicitamente identificados. Não comprovam serviço de modelo nem isolamento disponível no host.
- Revisão independente identificou colisão ao reaprovar plano, checkpoint histórico indevidamente aceito e atestação de testes ignorados/vazios. Correções separam épocas por plano+aceite, vinculam inventários ao run verificado, conferem DAG conectado de versões e exigem testes solicitados individualmente.
- Datas declaradas dos checkpoints não determinam a versão atual. Históricos desconectados, bifurcados sem convergência ou cíclicos bloqueiam conservadoramente.
- Registros locais e aceites não são autenticados contra quem controla o workspace. O checkpoint não certifica correspondência semântica entre requisito e teste.

A verificação global inicial encontrou uma expectativa de teste incompatível com autoria preservada nos descendentes: a renomeação do produto alterava a marca esperada no teste, enquanto AUTHORS.md mantinha corretamente a origem. O teste agora compara bytes com o registro de autoria de origem e usa sua menção no README, inclusive nos netos. O caso foi reproduzido em projeto gerado e a regressão focada passou.

## Resultado final

`npm run verify` terminou com exit 0: 24 verificações passaram. Inclui suíte do toolkit, oito avaliações locais, padrões de segredos, consistência dos adaptadores, build/ciclo de vida da solução, geração Worker/API/Console com suas suítes/builds/ciclos e adoção API/Console com consistência/build/ciclo. `validate --provider all` passou, com onze papéis. `git diff --check` não apontou erros.

A revisão final não encontrou novos problemas importantes no escopo revisto. A execução SDD de duas tarefas sobre o mesmo arquivo foi exercitada com transições reais e subprocessos/revisores simulados; o status chegou a completed com checkpoints separados. Falhas de binding, hashes divergentes, versões cíclicas/desconectadas, testes ignorados e arquivos sem testes foram cobertos por regressões.

## Limites observados

O host desta sessão não disponibiliza o namespace Bubblewrap necessário para execução isolada real. O executor bloqueia sem fallback. Testes do protocolo usam subprocessos simulados; nenhuma avaliação com modelo externo foi executada. UI continua exigindo seu executor específico e revisão visual.

`precheck --phase toolkit` está liberado. `coherence-run` de domínio bloqueia por ausência de especialista/contexto de produto neste repositório modelo; não se criou contexto ou aprovação fictícios para liberar esse gate. O grafo do modelo permanece vazio com warning explícito, sem alegação de cobertura. A verificação global aplicável usa testes, adaptadores, avaliação local e geração/adoção de produtos sintéticos.

Nenhum push, deploy ou publicação do ambiente foi feito nesta entrega.
