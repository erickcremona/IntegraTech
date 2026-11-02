# Modelo reutilizável — plano de implementação

> **For agentic workers:** Executar com superpowers:executing-plans, tarefas sequenciais nesta sessão.

**Goal:** Gerar aplicações .NET independentes com fábrica Codex/Claude e descoberta do problema de negócio.
**Architecture:** núcleo compartilhado, manifesto de arquivos permitidos e gerador determinístico; contexto/plano/aceite referenciados por documentos e hashes; apresentações Worker/API/Console.
**Tech Stack:** .NET 8, C#, Node.js >=22, PowerShell operacional.
**Spec:** docs/superpowers/specs/2026-11-02-modelo-reutilizavel-design.md; aprovado pelo usuário em 2026-11-02.

## Global Constraints

- Domínio indefinido; não presumir integração, banco ou autenticação.
- Gerar em destino vazio e externo ao modelo, sem links; simulação sem escrita.
- Copiar somente arquivos do manifesto; sem Git, segredos, remotos, evidências ou aprovações herdadas.
- Preservar avisos legais e permissões locais; não instalar/autenticar provedores.
- Repositório GitHub permanece privado; não modificar colaboradores.

## Review Focus

1. Destino interno, links e colisões: rejeitar antes de escrever.
2. Documentos vazios/placeholders e aceite com hashes vencidos: bloquear implementação.
3. Provedor selecionado e nome novo: testes/validação funcionam no projeto gerado.
4. Arquivos pessoais e contexto preenchido no modelo: não herdar no novo projeto.
5. Tipos de apresentação: código compilável e ciclo de vida validado em cada opção.

### Task 1 — descoberta e gates

Files: scripts/lib/governance.mjs, fabrica/team/contracts/{business-context,business-plan,approval}.schema.json, references/*, tests/business.test.mjs.
Interface: precheck(repo, toolkit|discovery|design|business); validateContract para os três novos contratos.
- [x] Testes RED de descoberta sem contexto, documentos ausentes/vazios/placeholders, caminhos externos e hashes divergentes.
- [x] Implementar contratos e vínculo contexto → plano → aceite humano documentado.
- [x] GREEN e compatibilidade dos testes existentes ajustados à nova regra.

### Task 2 — criação de projetos

Files: scripts/lib/project-generator.mjs, fabrica/project-template.json, fabrica/project-assets/*, project.json, tests/generator.test.mjs, scripts/toolkit.mjs.
Interface: createProject({name,target,provider,presentation,dryRun}); comando create-project correspondente.
- [x] Testes RED de nomes/destinos inválidos, simulação, seleção de provedor, identidade, exclusões e reset de contexto.
- [x] Implementar manifesto controlado, renomeação textual explícita, hosts e testes C# por apresentação.
- [x] Gerar dois nomes e três apresentações, validar toolkit e compilar/executar os hosts gerados.

### Task 3 — fábrica genérica e documentação

Files: fabrica/skills/*, fabrica/team/catalog.yaml, scripts/lib/installer.mjs, docs/inicio/*, README.md, SOLUTION_CONTEXT.md, docs/arquitetura/*.
- [x] Generalizar papéis/skills e orientar descoberta do problema; manter revisão e limites reais dos provedores.
- [x] Documentar geração e início pelo problema de negócio, atualizar manifesto e regenerar adaptadores sem sobrescrever mudanças locais.
- [x] Suíte completa e revisão independente do conjunto, se autorizada/disponível; sem simular aprovação.

### Task 4 — entrega

- [x] Registrar evidências sanitizadas e limitações; preparar commit e push das alterações autorizadas.
- [x] Habilitar e verificar is_template=true no GitHub, mantendo private=true e acessos.

## Ledger

- Execução autorizada após aprovação do desenho. Diretório com main limpa além do documento de desenho desta demanda; implementação direta no checkout atual preserva esse documento e não altera worktrees externas.
- Contexto/plano/aceite serão JSON verificáveis. Documento de aceite referencia registro humano e hashes exatos; verificação estrutural não autentica a identidade de quem aprovou.
- O gerador não chama Git nem dotnet. Validação dos resultados usa processos locais separados.
- Gates RED→GREEN; 27 testes finais. Gerador usa manifesto de arquivos e os hosts ficam em presentation-templates.mjs (decisão de organização em módulo focado em vez de pasta de assets).
- Revisão independente: changes_required, um achado médio sobre colisões de nomes. Corrigido em uma passada com regressão RED→GREEN e builds/ciclos de Task, Host e Timeout. Parecer original preservado, sem simular reaprovação.
- GitHub is_template=true/private=true observado; somente o campo de template foi modificado.
