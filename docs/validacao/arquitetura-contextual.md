# Validação da arquitetura contextual

Verificação em 2026-11-11, no ambiente de desenvolvimento. Nenhum push, publicação ou migração de produto real foi executado.

- `npm run verify`: 24 verificações aprovadas, incluindo testes do toolkit, adaptadores, avaliações locais, varredura de padrões, compilação/ciclo de vida do modelo, cópias geradas worker/API/console e adoção API/console.
- `npm run check` e `validate --provider all`: adaptadores válidos, 15 papéis no catálogo.
- Testes .NET adicionais: três perfis compilam e executam o ciclo do host; referências proibidas e exports públicos indevidos são rejeitados. O teste nativo reproduz falha com o oráculo estrutural antigo após troca de perfil e passa com a transição explicitamente aprovada.
- Regressão da adoção: backups `.scratch/adoptions` com projetos/targets antigos não são contados como fonte ativo. Targets/imports no fonte ativo continuam bloqueados.
- Decisão: hashes de contexto normalizado, tecnologias e aceite; referências contextuais exatas; rejeição de referências herdadas de JavaScript, requisitos desconhecidos e aprovações obsoletas.
- Integração: geração real simples/modular sem camadas órfãs, fonte legado separado e baseline do sistema preservado.
- Migração SDD: duas fases, bloqueio de baseline alterado, transição restrita de scaffold, preservação de regressões, rejeição de candidato que não atualiza seu oráculo, conclusão vinculada à entrega e invalidação por mudanças/recibos alterados. Um plano posterior inicia fases novas sem repetir a migração.

Os testes da máquina de estados SDD injetam observações **simuladas** de isolamento e revisores; não provam execução isolada ou revisão de modelo externa. Os builds e testes de ciclo de vida .NET foram executados nativamente no ambiente. Avaliações de modelos ao vivo, implantação distribuída, desempenho e operação em produção não foram executados nem certificados.

Revisão independente somente de leitura identificou e motivou correções em transição de oráculos, imports MSBuild, perguntas pendentes, continuidade pós-migração e vínculo dos recibos. As skills de aplicação e worker foram exercitadas antes/depois: o texto anterior impunha camadas ao perfil simples; o novo texto respeita os três perfis e preserva legado sem decisão. A skill de arquitetura existente não apresentou essa contradição no cenário e foi mantida.

README, mapa mental Mermaid, guia de arquitetura, fluxo, exemplos, documentação gerada, manifesto, adaptadores e baseline foram atualizados. Geração automática permanece limitada aos três perfis .NET; distribuição e arquiteturas customizadas exigem avaliação/executor específicos.
