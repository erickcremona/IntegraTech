# Verificar a fábrica e suas execuções

## Verificação reproduzível e CI

`npm run verify` executa baseline (somente no modelo), suíte do toolkit, consistência, sete avaliações locais, padrões de segredos, build/ciclo da solução e geração/build/ciclo de Worker/API/Console (somente no modelo). Requer Git, Node e .NET instalados. É o comando usado em .github/workflows/validate.yml.

O CI usa ações oficiais fixadas por SHA, conteúdo read-only, checkout sem persistir credenciais e nenhum secret de modelo. Não faz deploy nem chama modelos reais. Uma execução local não comprova que o workflow remoto passou; confira GitHub Actions.

`npm run toolkit -- secret-scan` verifica padrões conhecidos nos arquivos rastreados do working tree e sinaliza artefatos sensíveis. Não revela o trecho encontrado. Arquivos binários são contabilizados como não examinados; não é um scanner completo de todos os tipos de segredo ou de histórico Git.

## Política e autorizações

```powershell
npm run toolkit -- policy-check --action review --agent code-reviewer --phase toolkit
npm run toolkit -- policy-check --action implement --agent application-engineer --phase business
```

A política versionada em fabrica/policy.json é consultada pelo dispatcher e pela adoção. Revisor não implementa, adoção exige CTO/modelo e implementação exige os gates de negócio. Git push, deploy e escrita em banco não possuem executor nessa política; exigem mecanismos próprios e autorização da sessão nativa.

`allowed` significa que as verificações locais de escopo passaram, não que houve autenticação ou autorização externa. A política e os registros locais podem ser editados por quem tem acesso aos arquivos; não são um broker de segurança nem impedem comandos executados fora desses utilitários. As permissões reais de Codex/Claude continuam aplicáveis. Contexto de negócio é dado, não fonte de autorização.

## Avaliações

```powershell
npm run toolkit -- eval --mode local
npm run toolkit -- eval --mode protocol --provider codex
npm run toolkit -- doctor
```

O modo local mede funções e estado real de onboarding/gates com cenários sintéticos. Não executa IA. O modo protocol sem --live retorna not_executed. A execução opcional `eval --mode protocol --provider codex --live --trials 1` (ou claude) usa somente cenários sintéticos embutidos, sem anexar código/contexto do projeto, e pode consumir o saldo do provedor. Deve ser solicitada explicitamente. Requer instalação e autenticação próprias.

Protocolo avalia decisões JSON, preservação do problema e perguntas necessárias; não comprova adoção ou desenvolvimento autônomo pelo modelo. Resultados com runner simulado ficam identificados como simulated_provider. Tentativas podem ser repetidas até três vezes por cenário, dentro do limite total de tempo; não há retry silencioso de ações. Ausência/erro do provedor não se transforma em aprovação.

doctor verifica executável, flags e versão detectável. Autenticação, modelo e isolamento efetivo permanecem não verificados até testes específicos no ambiente autorizado. Não imprime credenciais.

## Execução durável e rastreabilidade

Revisões despachadas registram state.json e events.jsonl em qa-artifacts/runs, com identificador próprio, tarefa/papel/fase/provedor, eventos, duração, resultado e fingerprint do contexto, código selecionado, políticas e commit quando disponível. Não registra prompt, saída bruta, segredo, conteúdo de negócio ou raciocínio interno. Tokens e custo desconhecidos permanecem null.

```powershell
npm run toolkit -- run-state --id RUN_ID
npm run toolkit -- close-interrupted-run --id RUN_ID
```

run-state confere o snapshot atual e nunca reexecuta uma ação. Mudanças nos inputs invalidam a continuidade presumida. O lock impede duas revisões simultâneas da mesma tarefa. Se o processo original morreu, close-interrupted-run pode marcar a tentativa como falha e liberar seu lock, sem replay; processo ativo ou impossibilidade de confirmar sua morte bloqueia a operação. Verifique o estado antes de iniciar outra tentativa.

Cada despacho tem uma tentativa e um orçamento total de tempo configurável, por padrão 120 segundos. O limite inclui diagnóstico do provedor e processo; encerramento do processo pode acrescentar latência. Os dados não estabelecem limite financeiro: quando a CLI não informa consumo, não se inventa custo nem se promete teto de cobrança.

Esses registros cobrem o dispatcher de revisão. Eles não são uma máquina de execução automática de todas as ações da sessão nativa. Mantenha handoff/planos para implementação e confirmação humana para efeitos externos. Guarde os registros localmente, com acesso restrito, pelo período necessário ao projeto; revisão/remoção de registros é manutenção explícita, sem limpeza destrutiva automática.
