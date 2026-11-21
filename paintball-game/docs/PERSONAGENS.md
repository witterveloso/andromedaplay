# Personagens — estado real da implementação

**O que está pronto e funcionando** (testado no Chromium, desktop e celular emulado):

| Item | Estado |
|---|---|
| 8 personagens selecionáveis (Bravo, Luna, Nex, Zara, Falcon, Kira, Rok, Yuri) | ✅ menu *Personagem* na tela inicial → 8 cards com miniatura 3D, prévia 3D giratória (arraste para girar) |
| Animações no menu e no jogo: parado, andando, correndo, agachado, eliminado (mãos para cima), mira/tiro | ✅ (esqueleto Mixamo + poses procedurais) |
| Identidade visual própria de cada um | ✅ textura de uniforme (preto + cor, padrão próprio), proporções (altura/ombros), cabelo/cabeça, lente da máscara na cor do personagem, kit de proteção (placa peitoral, ombreiras, bolsas, rádio, pulseiras, cinto, gola) |
| Máscara integral, marcador, luvas, joelheiras, cotoveleiras, colete com pods | ✅ (herdados do equipamento já existente) |
| Equipe independente do personagem | ✅ braçadeiras, tira da máscara, pods e marcador na cor da equipe + seta na cor da equipe sobre aliados |
| Persistência | ✅ `localStorage` (`splat_settings.character`) |
| Bots e partidas | ✅ bots recebem personagens variados; hitboxes/câmera/tiro/tinta/pontuação preservados |
| Online | ✅ o personagem de cada amigo vai na sala e é igual em todos os aparelhos (testado com 2 navegadores) |

**O que NÃO existe (limitações reais)**
- **Não são 8 malhas GLB independentes.** Todos compartilham o mesmo esqueleto e a mesma malha-base humana (Mixamo "Vanguard", `web/assets/soldier.glb`); a diferenciação vem de escala, textura, acessórios modelados por código e equipamentos. Anatomia/rostos reais distintos (como na arte de referência) exigem 8 modelos próprios.
- Não há clipes de animação próprios de *disparo*, *acerto* e *eliminação* (usa-se poses procedurais sobre idle/walk/run).
- Texturas PBR são procedurais (sem mapas fotográficos), sem compressão (KTX2/Basis).
- LOD: reaproveita o LOD por distância existente (sem malhas simplificadas).
- Medição em dispositivos reais **não foi feita** (apenas Chromium com renderização por software / emulação).

**Dependências para chegar ao nível da arte de referência:** 8 personagens rigados em GLB (Blender/Mixamo/Photo-to-3D com rig), com clipes idle/walk/run/crouch/aim/fire/hit/elimination; o pipeline de integração já existe (`buildCharacter(team, world, id)`; basta carregar o GLB do personagem em vez de clonar `soldier.glb`). A geração por Higgsfield não foi possível: a conta está sem créditos.

**Licenças/origens:** Three.js (MIT); PeerJS (MIT); modelo-base "Vanguard" do Mixamo/Adobe (exemplos do Three.js) — *provisório*, trocar antes de uso comercial; texturas e acessórios gerados por código neste repositório.
