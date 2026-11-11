# Design gráfico e animações

Peça à fábrica uma imagem, ilustração, infográfico, mapa mental ou animação e informe finalidade e referências que já tiver. O CTO encaminha a graphic-designer pelas rotas graphic-design, visual-assets ou motion-design. O núcleo e a skill integratech-design-grafico acompanham Codex, Claude Code e Cursor; as ferramentas de geração/renderização disponíveis em cada sessão continuam distintas.

O agente deve organizar um brief com objetivo, público, mensagem, conteúdo conferido, direção visual, formato, dimensões/tamanho real de uso, referências, capacidades disponíveis e critérios de inspeção. Ele aproveita o contexto e pergunta somente o que muda materialmente a entrega. Para peças de UI, a referência UX aprovada do produto continua obrigatória; aprovar uma imagem isolada não aprova toda a interface.

## Imagens e mapas

O trabalho inclui hierarquia, tipografia, grid, respiro, paleta, ícones e relações semânticas. No mapa, conectores devem explicar pertencimento ou fluxo real, sem inventar capacidades. Texto essencial precisa continuar legível no tamanho de exibição; detalhes podem ficar em conteúdo textual acessível. Não basta gerar uma imagem e supor que ela ficou boa: o agente deve visualizar, conferir português, cortes e conexões, criticar a composição e refinar quando necessário.

O gerador de imagens disponível pode produzir peças raster; SVG/Mermaid são alternativas para diagramas exatos e editáveis. Não há instalação automática de um serviço de imagem nem garantia de que todo provedor tenha um gerador nativo. Perfis podem restringir ferramentas: o perfil Claude gerado não libera automaticamente um gerador MCP. Se a ferramenta estiver somente na sessão principal, o especialista prepara o brief/prompt e o CTO coordena a geração autorizada, sem ampliar permissões silenciosamente. PNG não é fonte vetorial. A entrega deve informar o formato real, preservar o original e incluir texto alternativo e conteúdo equivalente em texto. Recursos externos precisam de origem e uso compatível.

## Animações e motion

A animação deve ter função clara, cronograma com tempos de entrada/saída, duração, deslocamentos/easing, quadro final, loop e controles. Revelações devem manter a informação visível após terminar; reduced motion deve disponibilizar o quadro final imediatamente. Evitar flashes e movimento que prejudique leitura; movimento prolongado/repetido exige pausa/controle e alternativa estática.

SVG/CSS ou Web Animations podem ser implementados na sessão quando houver ferramentas adequadas e precisam ser abertos e inspecionados em navegador. Lottie depende de suporte e exportador. MP4, WebM e GIF só são entregáveis quando houver renderizador/exportador efetivamente utilizado; imagem estática, prompt e storyboard não são animação exportada. Se faltar capacidade, o agente deve entregar o que é possível (brief, fonte animado ou versão estática) e apontar o que não foi verificado.

README pode não executar HTML ou preservar animação SVG: use imagem estática como padrão e mantenha uma demonstração separada quando produzida. Não incorporar scripts/CDNs ou dependências sem necessidade e autorização aplicável.

## Exemplos de pedido

> Crie um infográfico para explicar nosso fluxo de atendimento. Use a identidade aprovada, mantenha os textos em português e verifique a leitura a 800 px. Preserve a versão textual acessível.

> Prepare uma animação de seis segundos mostrando as etapas do fluxo, sem loop automático, com quadro final persistente e opção de movimento reduzido. Informe quais formatos foram realmente renderizados e verificados.

O agente deve informar decisões de design, arquivos e formatos reais, dimensões, observações de inspeção, críticas/refinamentos e limitações. Referências de contraste e acessibilidade orientam a verificação, mas não são certificação sem medições/testes adequados. Não alegar qualidade estética universal ou ganho de conversão sem evidência.

Ao integrar arquivos ao produto, verifique também os limites de tamanho/inventário e os perfis de validação do loop; gerar uma imagem ou vídeo não comprova que esse ativo pode ser entregue pelo executor atual. Não excluir arquivos ou evidências do controle apenas para contornar um bloqueio.

Aprovação de arte não autoriza publicação, push ou substituição silenciosa da identidade do produto. Mantenha README/mapa/guias atualizados quando a arte representar o funcionamento da ferramenta.


## Reconhecimento do pedido

Pedidos visuais são reconhecidos pela linguagem da conversa: “crie uma imagem”, “melhore o mapa mental” ou “anime este fluxo” acionam a skill de design gráfico e a coordenação de graphic-designer, sem o usuário precisar conhecer nomes técnicos. Revisões curtas usam o material anterior quando ele está definido; ambiguidades reais exigem esclarecimento. A triagem auxiliar route --request TEXT [--last-asset image|animation|diagram] usa regras limitadas; o CTO interpreta o contexto e não confunde criação de arte com implementação de upload/armazenamento de imagens. A chamada ao responsável ocorre na sessão nativa, conforme capacidades/permissões, sem automatizar publicação ou fingir geração.
