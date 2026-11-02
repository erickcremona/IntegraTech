# Confiabilidade da fábrica — plano autorizado

Base: docs/analises/2026-11-02-praticas-fabricas-ia.md. O usuário solicitou implementar o que for possível neste modelo, aprovando a evolução descrita no relatório.

## Escopo executável nesta entrega

1. Política declarativa por operação/papel/fase, validada nos pontos de execução do dispatcher e da adoção. Política local não substitui autorização da ferramenta nativa nem autentica aprovações documentais.
2. Registro durável e eventos sanitizados de revisões, com exclusão de prompts/credenciais, limites de tempo/tentativas e inspeção de estado/fingerprint. Retomada inspeciona; não repete ações automaticamente.
3. Catálogo de avaliações locais reproduzíveis e avaliações opcionais de protocolo com modelos reais. Execução de modelo exige --live; não enviar código do projeto. Sem --live, marcar a avaliação de provedor como não executada. Não chamar protocolo simples de teste completo de desenvolvimento autônomo.
4. Diagnóstico dos adaptadores com versões/capacidades locais, distinguindo autenticação e permissões não verificadas.
5. Verificador de segredos, verificação de artefatos/baseline e CI versionado para testes, builds e geração de projetos. Sem secrets em CI, sem deploy automático e com permissões read-only.
6. Testes de entradas adversariais, regras e transições; documentação, regeneração dos adaptadores/baseline, revisão independente e publicação.

## Não comprovado/fora do alcance automático

Autenticidade do aceite humano não é comprovada por JSON. Não há bloqueio universal de ferramentas executadas fora dos utilitários. Não há avaliação completa de escrita/codificação conduzida por modelos reais nesta entrega. Consumo/custo desconhecido permanece null, sem orçamento financeiro ficticiamente garantido. Não instalar provedores nem copiar credenciais.

## Verificação

Testes RED→GREEN para políticas, run ledger e avaliações; suíte completa do modelo; verificador local equivalente ao CI; projeto gerado compilado e executado; revisor nativo independente. CI remoto só será declarado aprovado se houver execução remota observada.
