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
- Personagens 3D com esqueleto (soldado tático com capacete, colete e botas), **camuflagem de deserto (laranja) e urbana azulada (azul)** gerada por código, braçadeira da cor do time, animações de andar/correr, pose de mira com o marcador, agachar e mãos pra cima ao ser marcado. Na 1ª pessoa você vê os antebraços camuflados e luvas segurando o marcador.
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

## Créditos e licença dos assets
- Three.js (MIT) — `web/js/vendor`.
- `web/assets/soldier.glb`: modelo "Vanguard" do Mixamo/Adobe, distribuído nos exemplos do Three.js. **É um modelo provisório de protótipo**: antes de lançar comercialmente, troque por personagens próprios/licenciados (a camuflagem, a máscara e os acessórios já são separados do modelo e podem ser reaproveitados).
