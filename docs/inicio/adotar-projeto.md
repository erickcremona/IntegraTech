# Transformar a cópia em projeto real

Abra uma cópia própria do modelo no Codex ou Claude Code e informe nome e problema. Exemplo:

> O projeto se chamará MensagensCliente. Quero automatizar mensagens do WhatsApp para os atendentes. Adote esta cópia como meu projeto e continue a descoberta do negócio.

A fábrica consulta project.json. Enquanto is_model=true, pergunta somente o dado ausente. Ao receber nome e problema, ela prepara o contexto, mostra a simulação e aplica a adoção autorizada na mesma pasta. Não é necessário editar JSON ou digitar comandos manualmente. A IA segue instruções; seu comportamento completo em conversa ainda depende da sessão e das permissões do provedor.

O processo renomeia solução, projetos, namespaces, IoC, toolkit e skills. A pasta raiz aberta na IDE não muda de nome. O problema original é preservado e campos desconhecidos continuam vazios. project.json passa a is_model=false, com adoption.status=adopted. Nas próximas sessões, a fábrica lê o contexto real e continua discovery, sem repetir o onboarding.

## Utilitários usados pela fábrica

O CTO pode preparar um arquivo temporário ignorado, como .scratch/contexto-inicial.json, contendo apenas os fatos fornecidos. O arquivo aceita contexto parcial ou texto simples, mas exige um problema não vazio. Não incluir segredos, tokens ou dados pessoais reais.

```powershell
npm run toolkit -- onboarding --name MensagensCliente --context-file .scratch/contexto-inicial.json
npm run toolkit -- adopt-project --name MensagensCliente --context-file .scratch/contexto-inicial.json --dry-run
npm run toolkit -- adopt-project --name MensagensCliente --context-file .scratch/contexto-inicial.json
```

Após renomear o toolkit, continue usando npm run toolkit, que já terá o caminho novo. Feche/reabra a solução na IDE se necessário. Execute npm test, npm run check e build/teste de ciclo do projeto real antes de prosseguir.

## Proteções

O repositório-modelo canônico permanece modelo. Se um remoto da cópia apontar para ele, a adoção é bloqueada: use uma cópia sem Git ou um repositório próprio criado a partir do template. Não há remoção/troca automática de origin. .git, arquivos pessoais, credenciais e configurações locais não são alterados.

Arquivos do modelo precisam corresponder ao baseline versionado. Alterações próprias ou colisões bloqueiam antes de aplicar; o CTO resolve o escopo com o desenvolvedor em vez de sobrescrever. A simulação não escreve. A apresentação atual é preservada. Uma nova adoção não sobrescreve um projeto já real.

A adoção mantém contexto e plano pendentes. Contexto inicial não significa requisitos completos, aprovação funcional nem autorização para push/deploy.

## Recuperação

Antes de substituir os arquivos, a operação guarda snapshots somente dos arquivos controlados, os novos arquivos e journal em .scratch/adoptions/adopt-.... Não copia .git ou credenciais. Essa pasta continua ignorada pelo Git e deve permanecer local, pois pode conter o contexto de negócio informado.

Falha durante aplicação tenta restaurar automaticamente; interrupção de processo pode exigir recuperação explícita. Use o recover.mjs independente indicado no resultado, que continua disponível mesmo se o caminho antigo do toolkit tiver sido removido:

```powershell
node .scratch/adoptions/adopt-ID/recover.mjs --dry-run
node .scratch/adoptions/adopt-ID/recover.mjs
```

Também existe restore-adoption --journal PATH no toolkit. A restauração verifica snapshots/hashes e recusa descartar arquivos modificados depois da adoção. Não promete atomicidade total do sistema de arquivos. Arquivos pessoais fora da operação são preservados. Não execute duas adoções/recuperações simultaneamente na mesma pasta.
