---
name: integratech-design-grafico
description: Use when users ask to criar uma imagem, gerar ilustração, melhorar mapa mental, fazer infográfico, animar um fluxo, criar GIF/vídeo ou pedir nova versão de uma peça visual, mesmo sem mencionar design, skill ou agente.
---

# Design gráfico e motion

Transforme informação e intenção em peças legíveis e atraentes, com identidade coerente. Aparência moderna não substitui clareza. Leia o contexto, a governança, o destino e as referências existentes; o CTO encaminha a graphic-designer, rota graphic-design/visual-assets/motion-design. Não delegue. Se o ativo faz parte de uma interface, siga a referência UX aprovada e a skill de interface; uma imagem aprovada não aprova toda a experiência.

## Brief obrigatório antes de produzir

Registre os campos abaixo com fatos do usuário ou decisões explicitamente propostas pelo agente. Aproveite respostas anteriores e pergunte somente o que afetar materialmente o resultado.

| Campo | Definição verificável |
|---|---|
| Objetivo | Mensagem principal e ação/compreensão esperada |
| Público e uso | README, apresentação, tela, redes sociais ou impressão |
| Conteúdo | Texto conferido, hierarquia, relações e limites que precisam permanecer |
| Direção visual | Referência/identidade, paleta, tipografia, grid, ícones, densidade |
| Formato | Dimensões/aspecto, tamanho real de exibição, fundo/transparência, formatos de entrega |
| Movimento | Se necessário: função, duração, sequência, tempos, pausa/loop e alternativa estática/reduced motion |
| Ferramentas | Geração de imagem, SVG/CSS/Web Animations, editor ou renderizador efetivamente disponíveis |
| Verificação | Dimensões de inspeção, contraste, grafia, cortes, compreensão, reprodução e limitações |

## Imagens e infográficos

1. Organize a mensagem em título, grupos e níveis de leitura. Um mapa mental precisa de relações/conectores claros, não só cartões decorativos. Separe etapas do fluxo de capacidades transversais. Não invente fases, tecnologias ou automações para preencher o desenho.
2. Escolha uma direção visual contextual e justifique-a. Use grid, alinhamento, respiro, escala tipográfica e uma paleta pequena. Use ícones para reforçar significado, não para competir com texto. Evite efeitos excessivos, aparência genérica e excesso de conteúdo em miniatura.
3. Dimensione pelo tamanho de uso: para um mapa exibido a 800 px de largura, procure texto essencial equivalente a pelo menos 14–16 px nessa escala; encurte os cartões em vez de encolher o texto. Preserve detalhes em texto acessível separado. Contraste de referência: 4,5:1 para texto comum, 3:1 para texto grande e elementos gráficos essenciais. Medir quando houver ferramenta; inspeção a olho não comprova o índice.
4. Descubra as ferramentas da sessão. Use o gerador de imagem disponível para ilustrações, composições raster e edições de imagem; descreva conteúdo exato, hierarquia, formato e direção visual no prompt. Para diagramas exatos/editáveis, escolha SVG ou Mermaid quando adequados. Não afirmar que uma imagem PNG é vetor/editável nem converter extensão como se mudasse o formato. Se o gerador só estiver disponível na sessão principal (por exemplo, MCP fora da lista de ferramentas do perfil Claude), retorne brief/prompt ao CTO para uso da ferramenta autorizada; não ampliar permissões silenciosamente nem declarar geração pelo especialista.
5. Gere, veja o resultado e confronte com o brief. Inspecione em resolução completa e no tamanho de uso; confira números, português/acentos, nomes, conexões, cortes e consistência. Solicite/refaça a geração ou ajuste o vetor quando houver erro relevante. Só registrar como observado o que efetivamente foi inspecionado; sem visualizador, aparência fica não verificada.
6. Entregue a peça, um texto alternativo útil, versão textual do conteúdo e arquivo fonte quando ele realmente existir. Preserve a imagem gerada original e versões aprovadas. Reutilize a marca/referência aprovada e registre a origem/licença de recursos de terceiros quando usados.

## Animações

Anime para explicar relações, orientar a atenção ou comunicar estado; não usar movimento só por espetáculo. Escolha técnica compatível com o destino: SVG/CSS ou Web Animations para web, Lottie quando houver suporte e exportador, vídeo/GIF somente com ferramentas de render/export realmente disponíveis. Um prompt/storyboard não é vídeo produzido. Gerador de imagens estáticas não implica gerador de animação.

Antes de implementar, escreva a linha do tempo com início/fim de cada bloco, duração total, deslocamentos, easing e política de loop. Para revelações de informação, prefira opacity/transform com deslocamentos pequenos e finais estáveis. Não mover texto enquanto ele precisa ser lido. Evite flashes; ofereça pausa/controle para movimento prolongado ou repetido e alternativa estática. Implementar prefers-reduced-motion para movimento web não essencial, mantendo todo o conteúdo visível. Não depender de cor ou animação como única forma de transmitir significado.

Exemplo de linha do tempo para mapa de sete grupos em seis segundos: centro 0–0,4 s; grupos iniciam em 0,5 / 1,0 / 1,5 / 2,0 / 2,5 / 3,0 / 3,5 s, cada revelação dura 0,4 s; mapa completo permanece de 3,9–6,0 s e continua visível após o término; sem repetição automática. Se houver reprodução novamente, disponibilizar controle explícito. Reduced motion mostra o quadro final imediatamente. O cronograma é referência, não prova de uma animação renderizada.

Se produzir animação, abrir em browser/player e verificar início, transições, quadro final, pausa/repetição, desempenho e reduced motion. Se o exportador não estiver disponível, entregar o fonte animado e fallback estático, indicando que MP4/WebM/GIF não foram exportados. README pode sanitizar SVG animado ou não executar HTML: usar imagem estática por padrão e link separado para demonstração compatível. Não instalar bibliotecas ou usar CDNs sem necessidade/autorização aplicável.

## Contrato de entrega

Entregue: objetivo e direção escolhida; arquivos e formatos reais; dimensões e tamanho de uso; conteúdo/alt text; origem das referências; observações de inspeção e refinamento; para motion, fonte, cronograma, controles e fallback; limites não verificados. Não dizer “qualidade de mercado garantida”, “acessível” ou “animação pronta” apenas por ter gerado um arquivo. Aprovação de arte e publicação são decisões distintas. Atualize README/mapa/guias quando a peça representar o funcionamento da ferramenta; não publicar ou enviar ao remoto sem autorização aplicável.
