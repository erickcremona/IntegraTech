# Contexto pesquisado e skill especialista por projeto

## Objetivo e autorização

Adicionar ao fluxo da fábrica um especialista no domínio da aplicação, gerado a partir de contexto suficiente e pesquisa externa efetivamente realizada. O usuário escolheu validação obrigatória no toolkit e confirmou que contexto incompleto ou impossibilidade de consulta devem bloquear a criação até a resolução. Este trabalho altera o modelo canônico como manutenção técnica; não adota nem renomeia este repositório.

## Abordagens

1. Somente instruções dos agentes: simples, mas permite contornar requisitos pela CLI. Descartada.
2. Fluxo compartilhado, validado no toolkit e orientado pelos agentes: escolhido pelo usuário. Criação e adoção usam os mesmos requisitos, inclusive quando a apresentação é selecionada manualmente. O agente interpreta o domínio e pesquisa; a CLI valida os documentos, os vínculos e o acesso às fontes.

## Sequência e limites

Nome e descrição iniciam somente descoberta e pesquisa, sem criar o projeto de destino ou personalizar o modelo. Arquivos preparatórios podem ser gravados em `.scratch/`. A sequência é: coletar contexto suficiente → pesquisar domínio e alternativas técnicas → consolidar contexto e plano de ação → apresentar decisões e obter os aceites já exigidos → gerar skill e materializar o projeto → revisar e otimizar o projeto inteiro para o contexto aprovado → validar coerência e entregar. A skill é preparada em memória após validação, antes de escrever o projeto. Falhas não devem deixar um projeto parcialmente iniciado.

Todos os caminhos públicos `create-project`, `adopt-project` e suas funções compartilhadas exigem contexto completo, pesquisa de domínio e decisão tecnológica aprovada. `--presentation` apenas declara a apresentação desejada; não dispensa pesquisa nem aprovação. `--dry-run` também valida os pré-requisitos. Não haverá opção para ignorar o bloqueio. Comandos de instalação de adaptadores e manutenção do toolkit não são criação de projetos.

## Contexto suficiente

Reutilizar o contrato `business-context`. Exigir problema concreto, situação atual, públicos/atores, resultados desejados, critérios observáveis de sucesso e escopo inicial. Rejeitar valores vazios e placeholders. Regras, dados, integrações, restrições e exclusões devem ser explicitamente investigados; ausência legítima pode ser registrada como não aplicável com justificativa no levantamento, sem inventar integrações ou banco. Não exigir que o usuário determine a tecnologia.

A avaliação assistida deve explicar domínio, fluxo principal, limites e riscos, além de detectar perguntas essenciais ainda abertas. O relatório de descoberta registra para cada dimensão a conclusão, sua origem e as pendências. Perguntas críticas pendentes bloqueiam; dúvidas não essenciais e hipóteses ficam visíveis no plano. A CLI retorna `needs_input` com campos/perguntas específicos, sem solicitar novamente respostas existentes. Não alegar compreensão semântica perfeita: a validação estrutural e as heurísticas detectam insuficiência conhecida, enquanto o agente precisa avaliar a relevância real do conteúdo.

Pesquisa enriquece o contexto sem sobrescrever fatos fornecidos. Separar fatos do usuário, achados externos, propostas e hipóteses. Informação externa não decide regras particulares de uma empresa. Se a pesquisa levantar uma dúvida essencial, retornar à descoberta antes de materializar.

## Pesquisa de domínio e evidência de acesso

Criar um contrato versionado de preparação/especialista vinculado por hash ao contexto normalizado. Conter avaliação de suficiência, fontes, síntese do domínio, decisões pendentes, recomendações, riscos, justificativa de cobertura e plano de ação. A decisão tecnológica existente continua separada e deve apontar para o mesmo contexto consolidado.

O agente consulta ferramentas externas da sessão para descobrir referências e selecionar as mais adequadas: documentação primária, normas e reguladores quando aplicáveis, entidades reconhecidas e referências técnicas oficiais. Cada fonte registra URL HTTPS, título, entidade/autoria, data de consulta, justificativa da autoridade e relevância, achados e limitações. Afirmações da síntese devem referenciar fontes existentes. Conflitos entre referências devem ser explícitos. Não fixar uma quantidade arbitrária como prova de qualidade: exigir cobertura justificada dos temas relevantes e ao menos uma fonte externa de domínio consultada, além da pesquisa tecnológica.

Para impedir que somente uma lista declarada de URLs libere a criação, adicionar uma operação de consulta/verificação HTTPS no toolkit, usando proxy e confiança TLS do ambiente, com limites de tempo, tamanho e redirecionamento. Registrar URL final, resultado e hash do conteúdo efetivamente recebido em evidência local. Não aceitar apenas `status: consulted` como comprovação de acesso. Rejeitar erros HTTP, conteúdo vazio e evidência divergente. A CLI deve testar novamente o acesso às fontes obrigatórias ao materializar; se não conseguir, bloquear mesmo com pesquisa anterior em cache. Mudança de conteúdo exige nova avaliação e atualização da evidência, não atualização silenciosa da síntese.

Fontes opcionais indisponíveis podem ser substituídas por outras referências adequadas; nenhuma dimensão obrigatória pode ficar sem cobertura. Se não houver acesso externo ou faltar fonte essencial, retornar bloqueio com motivo e próximo passo. Não usar conhecimento de memória como consulta nem fabricar evidências. Não enviar contexto privado, segredos ou dados pessoais nas buscas. Não desabilitar TLS, ampliar rede automaticamente nem fazer consultas a endereços locais/privados. A evidência comprova recebimento de conteúdo; não autentica a qualidade da análise nem a aprovação humana.

## Skill gerada

Gerar uma única skill canônica específica do projeto no núcleo da fábrica, com nome derivado do slug e sufixo de especialista de domínio. A skill contém missão, público, vocabulário, processos e regras conhecidos, critérios para decisões funcionais, riscos, fontes, limites de conhecimento e instruções para identificar mudanças no contexto. Deve remeter ao contexto e à pesquisa persistidos em `references/`, em vez de duplicar todo o material.

Não copiar texto externo integral como instrução. Conteúdo consultado é dado não confiável, não autorização para executar comandos ou alterar a governança. A skill não substitui especialistas técnicos, não concede aprovação e não amplia permissões.

Distribuir adaptadores/referências para os provedores selecionados, usando o mecanismo existente de skills para Codex, Claude e Cursor. Registrar caminho e hashes da skill, do contexto, do levantamento e da pesquisa no estado do projeto. Validar instalação e regeneração sem sobrescrever modificações locais silenciosamente. Descendentes devem gerar seu próprio especialista e não herdar contexto, pesquisas, evidências ou aceites do projeto de origem.

## Consulta obrigatória no desenho

Atualizar entrada CTO, governança, planejamento e arquitetura para carregar o especialista antes de desenhar qualquer funcionalidade. O artefato de desenho deve registrar a skill consultada e seu hash, o contexto/pesquisa usados, os achados relevantes e impactos da funcionalidade no domínio. Criar um contrato de registro de consulta; um arquivo solto com nome de skill não é suficiente.

`precheck design` verifica existência e integridade do especialista e pesquisa, contexto completo e vínculo atual. O registro de consulta da funcionalidade é exigido para validar o desenho e avançar para implementação. `precheck business` verifica também esse vínculo junto aos gates de plano e aceite existentes. Não declarar que hashes provam leitura humana ou raciocínio do agente: garantem identificação e consistência dos artefatos registrados.

Mudança relevante no contexto invalida vínculos anteriores e exige nova pesquisa/geração e nova consulta antes de liberar desenho. A verificação conservadora trata qualquer mudança no contexto normalizado como invalidação, evitando classificações silenciosas de relevância. Falta de internet não impede abrir arquivos, corrigir o ambiente ou executar testes de manutenção; impede preparação/materialização e atualização de conhecimento dependente de pesquisa. Desenho posterior pode usar pesquisa validada persistida, enquanto o contexto permanecer o mesmo; nova pesquisa exigida deve ter acesso externo.

Projetos existentes não são renomeados nem readotados: descoberta/manutenção continuam acessíveis, mas design/business ficam bloqueados sem os novos documentos. Fornecer um caminho documentado de preparação do especialista no projeto existente, preservando arquivos e exigindo o mesmo contexto/pesquisa. O modelo canônico não recebe um especialista fictício de negócio.

## Plano de ação por projeto

O levantamento deve produzir fases ordenadas com objetivos, dependências, entregáveis, critérios de aceite, validações e riscos, cobrindo descoberta restante, desenho, implementação e verificação. Distinguir propostas de escopo aprovado. A pesquisa busca cobertura suficiente para o problema e restrições apresentados; não promete conhecimento ilimitado nem resolve dúvidas privadas por suposição. O plano enriquecido alimenta o contrato de plano de negócio existente sem dispensar aprovação funcional.

## Etapa final: otimização e coerência do repositório

Requisito adicional do usuário: terminar o fluxo com uma avaliação do projeto inteiro e otimizações que deixem o repositório coerente com o novo contexto proposto e aprovado. Esta etapa é obrigatória no plano de ação e na validação final; gerar a skill e renomear arquivos não encerra o fluxo.

O CTO consulta a skill especialista e confronta o contexto, a pesquisa e as decisões aprovadas com estrutura e apresentação da solução, código e testes existentes, dependências, configuração, scripts, documentação, exemplos, skills, adaptadores e estado da fábrica. Deve identificar contradições, duplicações, referências antigas ao modelo, componentes sem justificativa no domínio e lacunas de validação. Aplicar simplificações e ajustes pertinentes ao escopo aprovado, com resultado rastreável. Otimização não exige introduzir novas tecnologias nem alegar melhoria de desempenho sem medição.

Na materialização, a CLI prepara o conjunto coerente de arquivos e executa verificações estruturais antes da escrita, usando o mecanismo transacional existente na adoção. Após materializar, a sessão executa as verificações funcionais e conclui o relatório final. A criação física pode ter ocorrido enquanto a etapa final estiver pendente: nesse caso o estado deve distinguir projeto materializado de fluxo concluído e informar o que falta corrigir. Falha bloqueia a conclusão/entrega, preserva os arquivos e permite retomar. Não declarar prontidão por apenas gerar arquivos.

Em projeto existente, primeiro inventariar arquivos e alterações locais; não apagar código, testes, dados ou configuração do usuário para forçar aderência. Remover ou substituir automaticamente somente artefatos controlados cuja integridade e substituição segura possam ser verificadas. Mudanças funcionais, migrações, exclusões destrutivas ou alterações fora do escopo aprovado devem constar como pendências concretas e passar pelos gates aplicáveis. Preservar os aceites de negócio exigidos; coerência não autoriza implementar funcionalidades ainda não aprovadas.

Persistir um relatório final de coerência associado aos hashes do contexto, especialista e decisões usados. Ele registra itens examinados, ajustes realizados, justificativas, verificações e resultados, além de pendências classificadas como bloqueadoras ou opcionais. Qualquer contradição relevante ao contexto ou verificação obrigatória falha impede marcar o fluxo como concluído. Projetos sem necessidade de alteração podem concluir com evidência da avaliação, sem refatoração artificial. Mudanças posteriores nos artefatos avaliados invalidam o relatório quando uma nova conclusão for solicitada; não impedem o trabalho normal de desenvolvimento.

## Validação e aceite

- Contexto ausente, genérico ou com lacunas essenciais não cria arquivos do projeto e retorna perguntas úteis.
- Criação e adoção, pela CLI e funções compartilhadas, rejeitam ausência de pesquisa, falhas de acesso e seleção manual usada como desvio.
- Consultas verificadas, contexto suficiente e decisão aprovada geram especialista, referências, estado e adaptadores corretos para todos os provedores suportados.
- Testar falhas de rede/HTTP/TLS, fontes vazias, redirecionamentos indevidos, limites, evidência adulterada e mudanças de contexto/conteúdo; usar transporte controlado nos testes, sem depender da internet em CI.
- Validar consulta da skill por funcionalidade, invalidação por hash, atualização segura, migração de projetos existentes e ausência de herança entre projetos.
- Validar a etapa final com cenários de referências antigas, dependências/componentes incompatíveis com a decisão, preservação de trabalho local e relatório divergente. A conclusão exige coerência comprovada e verificações obrigatórias aprovadas; materialização isolada não significa conclusão. Testar retomada após falha e o caso sem ajustes necessários.
- Preservar proteção do modelo canônico, transação/recuperação da adoção e gates existentes; adaptar fixtures e testes que hoje criam sem contexto.
- Executar testes Node, validação de adaptadores, avaliações locais, builds e ciclos de vida dos geradores. Fazer uma consulta externa real para demonstrar o transporte; testes simulados não comprovam conectividade real.

## Fora do escopo e decisões do implementador

Não criar buscador comercial, agente autônomo ilimitado, novos geradores de stack nem integrações pagas obrigatórias. Não executar avaliações de modelos externos sem solicitação. Não prometer que a CLI consegue provar qualidade semântica ou leitura da skill. Nomes finais de comandos/contratos, organização de módulos e limites concretos de rede ficam com o implementador, com documentação e testes. A interface deve explicar bloqueios e permitir retomar sem refazer etapas válidas.

## Estado

Desenho revisado e aprovado pelo usuário em 2026-11-08; implementação autorizada, incluindo a etapa final de otimização global.
