# SPLAT ARENA — protótipo jogável (navegador)

Paintball tático 5x5 contra bots, com **1ª e 3ª pessoa**, para **PC e celular**. Sem build: HTML + Three.js (incluído em `web/js/vendor`).

## Rodar

```sh
cd paintball-game/web
python3 -m http.server 8080     # ou: npx serve .
# abra http://localhost:8080
```
(precisa de servidor HTTP por causa dos módulos ES; funciona em qualquer hospedagem estática.)

## Controles
| | PC | Celular |
|---|---|---|
| Mover | WASD (Shift corre, C agacha) | joystick à esquerda |
| Mirar | mouse | arrastar à direita |
| Atirar | clique | botão FOGO |
| Recarregar | R | ⟳ |
| Trocar câmera 1ª/3ª | V | CAM |
| Pausa | Esc | II |

## O que já tem
- Arena de speedball com bunkers infláveis, rede de proteção e cenário.
- Marcador com hopper de 200 bolinhas, pods, recarga, ~10 bolinhas/s, queda de projétil e dispersão por movimento/rajada.
- Respingos de tinta nas paredes, no chão e nos jogadores; partículas.
- Acertado = **marcado** (mãos para cima). Tiro na cara/máscara **cobre a tela de tinta**, com gotas escorrendo; a câmera vai para 3ª pessoa para você ver o personagem marcado.
- Bots com IA (fácil/normal/difícil): cobertura, rajadas, reação.
- Partida melhor de 5 rodadas, eliminação, 2 min por rodada.
- Sons sintetizados (sem arquivos de áudio).

## Próximos passos
Multiplayer online (servidor autoritativo + salas/squads), Centerflag e outros modos, mais mapas (fábrica, morro, porto), mais marcadores, modelos/animações realistas, skins e cores de tinta.

Design completo em [`GDD.md`](GDD.md). Reel de divulgação (gravado do próprio jogo): [`reel/splat-arena-reel.mp4`](reel/splat-arena-reel.mp4).
