# Especificação visual e técnica

## Direção de arte
Paintball esportivo realista, com cores fortes e splashes de tinta. Materiais PBR, geometria com escala humana, desgaste crível, sombras suaves, iluminação coerente, céu apropriado e otimização para WebGL/WebGPU conforme o motor já usado. Não usar imagens planas como substituto dos mapas ou dos personagens.

## Quatro arenas
- **Galpão:** estrutura metálica, telhado com claraboias, concreto, pallets, barris, contêineres, barricadas, rotas centrais e laterais.
- **Favela:** arquitetura urbana brasileira crível, tijolo aparente, fachadas coloridas, escadas, vielas, caixas d'água, fios, muros e coberturas de paintball. Evitar estereótipos.
- **Ferro-velho:** veículos sucateados, contêineres enferrujados, pneus, guindaste estático, galpões, vegetação rasteira e poças com custo controlado.
- **Cidade abandonada:** asfalto rachado, prédios e lojas deteriorados, veículos, vegetação, barreiras e rotas por cruzamentos e flancos.

Manter dimensões jogáveis, pontos de spawn, linhas de visão, cobertura e navegação dos bots; se mudanças forem necessárias, documentar e testar.

## Oito personagens
- Bravo: amarelo/preto; atleta robusto.
- Luna: roxo/preto; atleta ágil.
- Nex: verde-limão/preto; atleta urbano.
- Zara: laranja/preto; atleta aventureira.
- Falcon: azul/preto; atleta experiente.
- Kira: rosa/preto; atleta moderna.
- Rok: vermelho/preto; atleta robusto com proteção reforçada.
- Yuri: ciano/preto; atleta tecnológico.

Todos adultos, com diferenças reais de silhueta, rosto, cabelo e biotipo; máscara integral de paintball durante o jogo. Uniformes, luvas, joelheiras, coletes, calçados e marcadores esportivos. Identificação de equipe independente da cor cosmética.

## Pipeline de personagens
GLB/glTF, rig humanoide, clips idle/walk/run/crouch/aim/fire/hit/elimination; recarga somente se a mecânica existir. Retarget de animações quando apropriado. Alinhamento marcador/mãos, hitboxes compatíveis, sincronização em multiplayer e preview no menu. Evitar múltiplos materiais e esqueletos pesados desnecessários.

## Efeitos e interface
Seleção de oito personagens com visualização rotativa 3D; preservar menu e HUD existentes. Splashes de tinta no impacto, decals ou efeitos equivalentes otimizados, áudio e feedback sem bloquear visão. Qualidade baixa/média/alta com fallback móvel; manter controles touch e teclado.

## Estratégia
Fase 0 auditoria e baseline de desempenho; fase 1 Galpão + Bravo; fase 2 demais arenas; fase 3 demais personagens + seleção; fase 4 efeitos, otimização, regressão e publicação controlada. Não substituir código funcional por protótipo.
