# Adoção do modelo — implementação

**Spec:** docs/superpowers/specs/2026-11-02-adocao-do-modelo-design.md, aprovado pelo usuário.
**Execução:** superpowers:executing-plans, sequencial neste checkout; nenhuma mudança alheia além do desenho desta demanda.

1. Extrair preparação compartilhada do gerador, mantendo create-project e seus testes.
2. Adicionar adopt-project: contexto inicial parcial, verificação do baseline e origem Git, simulação e preparação de todos os arquivos antes de alterar a cópia.
3. Criar journal/backup de arquivos controlados e recuperação independente; recusar sobrescrita de edições posteriores.
4. Instruir Codex/Claude a pedir apenas dados ausentes, adotar cópias, reconhecer projetos reais e continuar discovery sem inventar aprovações.
5. Testar conversão, repetição, modelo canônico, conflitos, links, preservação de Git/arquivos pessoais e recuperação. Compilar/executar projeto convertido, revisar independentemente e publicar alterações do modelo.

## Decisões

- A pasta raiz da cópia permanece no lugar. Renomear solução, subpastas e namespaces não renomeia a pasta aberta na IDE.
- Origem canônica é identificada pelos remotos Git; falha ao verificar Git bloqueia a adoção. ZIP/cópia sem Git pode ser adotado. .git, remotos e credenciais não são alterados.
- Um snapshot SHA-256 normalizado de arquivos explicitamente controlados detecta customizações antes de aplicar. Contexto inicial escolhido explicitamente é permitido como entrada, sem autorizar alterações em código.
- O backup/journal fica em .scratch/adoptions, ignorado. Recuperação verifica hashes antes de restaurar e não descarta trabalho posterior.
- Adoção define identidade e contexto; não define scope_status=defined nem aprova plano. A qualidade do contexto continua dependendo de descoberta humana/IA.

## Ledger

- Desenho aprovado; preparação e implementação locais autorizadas. Sem adoção do repositório-modelo atual com nome fictício.
- Preparação compartilhada extraída e create-project mantido. Adoção, baseline, perguntas e recovery independente implementados; 35 testes passaram.
- Revisão nativa changes_required: um achado médio sobre escrita parcial. Corrigido com temporários/substituição de arquivos e journal; regressão e suíte completa verdes. Parecer original preservado sem simular reaprovação.
- Cópia AtendimentoZap adotada pela CLI, contexto/Git/pessoal preservados, is_model=false, onboarding=project_real. Código de negócio não implementado.
