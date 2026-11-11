# Contextual interface implementation plan

**Goal:** preparar agente/skills e orientação conforme UI aprovada, com primeiro gerador React/Vite completo e comprovação explícita de capacidades.
**Spec:** docs/superpowers/specs/2026-11-11-contextual-interface-design.md
**Execution:** desenho proposto aceito pelo usuário com “Implemente”; continuar sem repetir aprovação. Núcleo Node existente, perfis locais revisados, sem seleção por substring.

- [x] Contrato opcional interface em technology-decision, registro de capacidades e inspeção vinculada à pesquisa e aceite.
- [x] ui-engineer/skill comum/perfis e ux-accessibility-reviewer; roteamento, política, adaptação dos três provedores.
- [x] Preparação segura/idempotente, geração/adoção e retomada com detecção de deriva.
- [x] Gerador React/Vite de referência e testes/build/browser em destino descartável; outras stacks somente orientação, sem fallback.
- [x] CLI e gates de UI, inclusão de revisão UX no loop, grafo e coerência dos insumos.
- [x] Guias/README/mapa mental, baseline, suíte integral e revisão independente.

Ruling: o primeiro perfil materializável é React/Vite como referência técnica isolada do backend, não default de escolha. O projeto canônico continua sem UI de negócio. Browser/dependências não disponíveis e isolamento bloqueado permanecem capacidades não comprovadas; não fabricar validação. Perfis de orientação não equivalem a geradores/testes de todas as stacks.

Evidências: docs/validacao/2026-11-11-interfaces-contextuais.md. Revisão independente corrigiu ausência de gate UI específico e classificação incompleta por extensão: source_roots aprovadas cobrem Angular inline e MAUI C#. Perfis genéricos não liberam UI sem checks específicos isolados. Diagnóstico CLI real passou build/browser, mantendo delivery_valid=false. Isolamento UI é indisponível explicitamente, sem executor host automático.

Verificação final npm run verify exit_code=0, adaptadores11papéis válidos, baseline229arquivos e varredura pós-staging sem ocorrências. Piloto CLI real completou referência React/Vite, npm ci, build/Chromium e relatório diagnóstico, sem transformar a pesquisa sintética ou a validação local em aprovação de entrega.
