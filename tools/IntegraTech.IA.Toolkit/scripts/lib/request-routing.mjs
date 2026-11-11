import {route} from './governance.mjs';

// Bounded, inspectable triage. The native CTO must still interpret the full request.
export function routeRequest({request,lastAsset}={}){
 if(typeof request!=='string'||!request.trim()||Buffer.byteLength(request)>8192)throw new Error('pedido textual obrigatório, até 8 KiB');
 if(lastAsset!==undefined&&!['image','animation','diagram'].includes(lastAsset))throw new Error('contexto visual inválido');
 let text=request.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const base={method:'bounded_text_rules',native_context_check_required:true,authorizes_external_effects:false};
 const no=reason=>({...base,status:'not_visual',reason,next_action:'continue_cto_classification'});
 const ask=question=>({...base,status:'needs_clarification',question,next_action:'clarify_requested_output'});
 // Scope exclusions before selecting an output; negative clauses are not commands.
 text=text.replace(/\bnao\s+animad[oa]s?\b/g,' ').replace(/\bsem\s+(?:uma?\s+)?(?:animacao|animacoes|movimento|motion|gif|video|imagem|imagens|logo|logotipo)\b/g,' ')
  .split(/[;.!?,]|\bmas\b/).map(clause=>clause.trim())
  .filter(clause=>! /\bnao\s+(?:quero|preciso|gere|gerar|crie|criar|faca|fazer|produza|produzir|anime|animar|desenhe|desenhar|refaca|redesenhe)\b/.test(clause)).join('; ');
 const explicitArtifact=/\b(?:crie|criar|gere|gerar|desenhe|desenhar|faca|fazer|quero|preciso|melhore|melhorar|refaca|redesenhe|produza|produzir)\s+(?:(?:uma?|nova?|outra|versao|mais|de|um|o|a)\s+){0,4}(?:imagem|ilustracao|infografico|mapa mental|logotipo|logomarca|banner|poster|cartaz|animacao|gif|video|diagrama|grafico)\b/.test(text)||/\b(?:um|novo|outro)\s+logo\b/.test(text);
 const software=/\b(?:upload|endpoint|armazenamento|armazenar|banco de dados|api|decodificador|codec|permissoes)\b/.test(text)&&/\b(?:implemente|implementar|corrija|corrigir|configure|configurar|adicione|adicionar|integre|integrar|crie|criar)\b/.test(text);
 if(software&&!explicitArtifact)return no('Pedido descreve funcionalidade de software, não produção de arte.');
 const motion=/\b(?:animacao|animacoes|animado|animada|animar|anime|motion|gif|video)\b/.test(text);
 const image=/\b(?:imagem|imagens|ilustracao|ilustracoes|infografico|infograficos|mapa mental|mapas mentais|logotipo|logomarca|banner|poster|cartaz|diagrama|grafico)\b/.test(text)||/\b(?:um|novo|outro)\s+logo\b/.test(text);
 const creative=/\b(?:crie|criar|gere|gerar|desenhe|desenhar|faca|fazer|quero|preciso|melhore|melhorar|refaca|redesenhe|produza|produzir|anime|animar)\b/.test(text)||/\bso\s+(?:uma?|a|o)\s+(?:imagem|animacao|ilustracao|gif)\b/.test(text);
 const revision=/\b(?:outra versao|nova versao|mais suave|mais moderno|mais moderna|mais atraente|mais bonito|mais bonita|mude as cores|ajuste as cores|refaca)\b/.test(text)||/^(?:melhore|ajuste|refaca|redesenhe)\s+(?:(?:este|esse|esta|essa|o|a)\s+)?(?:mapa|imagem|animacao|material|isso|isto)\b/.test(text.trim());
 if(!creative&&!revision&&/^(?:qual|quais|como|o que|por que)\b/.test(text.trim()))return no('Pergunta factual sem solicitação de criação.');
 if(!creative&&!revision)return image||motion?ask('Você quer criar ou alterar uma peça visual, ou está perguntando sobre um arquivo do sistema?'):no('Sem intenção visual identificada.');
 if(!image&&!motion&&!revision)return no('Pedido sem saída visual identificada.');
 if(revision&&!image&&!motion&&!lastAsset)return ask('De qual imagem, mapa ou animação você quer uma nova versão?');
 if(!image&&!motion&&!lastAsset)return no('Sem contexto de peça visual.');
 const category=motion||lastAsset==='animation'&&!image?'motion-design':'graphic-design';
 const publication=/\b(?:publique|publicar|deploy|producao|envie ao remoto)\b/.test(text);
 const ui=/\b(?:botao|tela|interface|componente|frontend|ux|ui)\b/.test(text);
 return {...base,status:'routed',category,agent:route(category),requested_outputs:[...(image?['image']:[]),...(motion?['animation']:[]),...(!image&&!motion&&lastAsset?[lastAsset]:[])],supporting_agents:ui?['ui-engineer']:[],additional_intents:[...(publication?['publication']:[]),...(software?['software_change']:[])],capability_check_required:true,next_action:'load_skill_and_delegate_native'};
}
