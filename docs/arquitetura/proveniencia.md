# Proveniência

A base do IntegraTech é mantida integralmente neste repositório. Compilação, instalação e operação do toolkit não exigem arquivos ou acesso a outro projeto local.

| Componente | Reutilização |
|---|---|
| Grafo dos seis projetos e nomes das camadas | Preservado, com API substituída por Worker |
| Contratos delegation, return e review | Copiados e adaptados para identidade IntegraTech |
| Entrada CTO, profundidade, ownership e gates | Adaptados da governança |
| Catálogo, agentes e roteamento | Definidos para Worker e integração entre sistemas |
| Scripts de validação, instalação e despacho | Implementação nova em Node.js, com wrappers PowerShell |
| Skills | Novas, específicas da base neutra e compartilhadas entre provedores |
| Código de domínio, banco, autenticação, QA e configurações | Não transferidos |

Contexto, evidências, aprovações e credenciais pertencem exclusivamente ao IntegraTech. Os utilitários resolvem seus caminhos a partir deste repositório.

Fontes oficiais consultadas para formatos e flags:

- [Codex: execução não interativa](https://developers.openai.com/codex/noninteractive)
- [Codex: skills](https://developers.openai.com/codex/skills)
- [Codex: agentes](https://developers.openai.com/codex/subagents)
- [Claude Code: CLI](https://code.claude.com/docs/en/cli-reference)
- [Claude Code: skills](https://code.claude.com/docs/en/skills)
- [Claude Code: agentes](https://code.claude.com/docs/en/sub-agents)

As capacidades do executável instalado são verificadas no preflight. Documentação não comprova instalação/autenticação local. Aviso da licença original em THIRD-PARTY-NOTICES.md.
