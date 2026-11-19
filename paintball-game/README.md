# SPLAT ARENA — protótipo jogável (navegador)

**Jogar online:** https://witterveloso.github.io/splat-arena/ (GitHub Pages)


Paintball tático 5x5 contra bots, com **1ª e 3ª pessoa**, para **PC e celular**, em **5 campos**. Sem build: HTML + Three.js (incluído em `web/js/vendor`).

## Rodar

```sh
cd paintball-game/web
python3 -m http.server 8080     # ou: npx serve .
# abra http://localhost:8080
```
(precisa de servidor HTTP por causa dos módulos ES; funciona em qualquer hospedagem estática.) Atalhos de URL: `?map=favela|galpao|ferro|cidade|arena`, `?cam=tpp`, `?quality=low`.


## Novidades
- **Centerflag:** uma bandeira no centro do campo; pegue e leve até a base inimiga para vencer a rodada (ou elimine o outro time). Quem carrega derruba a bandeira ao ser marcado. Os bots pegam, escoltam e perseguem o portador. Escolha o modo no menu.
- **Barracos com porta:** dá para entrar em barracos/escritórios (favela, ferro-velho, cidade e galpão), se esconder e atirar pela porta. As paredes bloqueiam tiros e visão; aparece **ESCONDIDO** quando nenhum inimigo te enxerga.
- **Mapa de localização (radar):** vista de cima com aliados, bandeira e inimigos. Modos em Configurações: *Avistados* (quem você ou um aliado enxerga), *Todos* e *Desligado*. **M** ou toque no mapa amplia.
- **Celular:** arraste no botão **FOGO** para girar a câmera enquanto atira; botão de fogo extra à esquerda; **tiro automático** ao cruzar um inimigo; assistência de mira.
- **Áudio:** música, **som ambiente por campo** (vento, pássaros, pingos, percussão distante, cidade), passos e botão 🔊 no menu. No iPhone, tire o modo silencioso; o botão 🔇 pulsa enquanto o navegador estiver bloqueando o som.
- **Atualização automática:** a versão aparece no canto do menu (vAAAAMMDD-HHMMSS). Antes de cada commit rode `python3 tools/stamp.py` para o celular baixar os arquivos novos em vez de usar o cache.

## Campos
| Campo | Estilo | O que tem |
|---|---|---|
| **Arena Speedball** | torneio | bunkers infláveis simétricos, rede, grama |
| **Galpão Abandonado** | interior | colunas, estantes, contêineres, empilhadeira, feixes de luz do telhado, poeira no ar |
| **Morro Vivo** (favela/comunidade) | urbano | casas de tijolo aparente e reboco colorido, lajes com caixa d'água, fios, bandeirinhas, grafites (PAZ, ARTE, SAMBA…), morro ao fundo ao pôr do sol |
| **Ferro-Velho** | industrial | carros empilhados, pneus, montes de sucata, contêineres, ônibus velho, guindaste |
| **Cidade Abandonada** | urbano | ruas com faixas, prédios em ruínas com janelas quebradas, carros queimados, ônibus, barricadas |

Cada campo tem luz, céu, névoa e materiais próprios. As texturas (tijolo, reboco, concreto, chapa enferrujada, asfalto, madeira, terra) são **geradas por código** (`js/textures.js`) com cor + relevo + rugosidade (PBR), então não há arquivos de textura pesados.

## UX / UI
- Tela de carregamento com dicas; **menu inicial com o campo 3D rodando ao fundo**, botão principal grande e cartões de campo com miniatura.
- **Cor da tinta** (Clássico laranja×azul, Neon rosa×lima, Solar amarelo×violeta), câmera 1ª/3ª pessoa, dificuldade dos bots.
- **Configurações** (jogabilidade, áudio, gráficos, acessibilidade, celular): sensibilidade, inverter Y, campo de visão, volume, qualidade, **reduzir efeitos** (menos tinta na tela e sem tremor), cor/estilo da mira, tamanho do HUD, tamanho dos botões, **modo canhoto**, vibração.
- HUD: placar com jogadores vivos, cartão do marcador com barra de tinta e pods, dica de recarga, feed de acertos, marcador de acerto, indicador de direção do tiro.
- Dicas de "Como jogar" no primeiro jogo; **placar** (Tab ou toque no placar); pausa; **tela de fim de partida** com MVP e tabela.
- Acessibilidade: navegação por teclado nos menus (setas), foco visível, rótulos ARIA, `prefers-reduced-motion`, áreas de toque grandes e seguras para o notch.

## Controles
| | PC | Celular |
|---|---|---|
| Mover | WASD (Shift corre, C agacha) | joystick à esquerda |
| Mirar | mouse | arrastar à direita |
| Atirar | clique | botão FOGO |
| Recarregar | R | ⟳ |
| Trocar câmera 1ª/3ª | V | CAM |
| Placar | Tab | tocar no placar |
| Pausa | Esc | II |

## Jogabilidade
- Marcador com hopper de 200 bolinhas, pods, recarga, ~10 bolinhas/s, queda de projétil e dispersão por movimento/rajada.
- Respingos de tinta nas paredes, no chão e nos jogadores; partículas no impacto.
- Acertado = **marcado** (mãos para cima). Tiro na cara/máscara **cobre a tela de tinta** com gotas escorrendo; a câmera passa para a 3ª pessoa.
- Bots com IA (fácil/normal/difícil): cobertura, rajadas, reação. Partida melhor de 5 rodadas, eliminação, 2 min por rodada.
- Personagens 3D com esqueleto: soldado com **camuflagem por equipe** (deserto × urbano azulado), máscara de paintball com lente espelhada, protetores de orelha, tira da cor do time, pods no colete e cilindro de ar nas costas; animações de andar/correr, mira, agachar e mãos para cima.

## Limitações conhecidas
- **Realismo:** cenários e personagens são procedurais/gratuitos; ficam em um nível "jogo indie estilizado-realista", não fotorrealista de CoD. Para chegar lá é preciso arte 3D profissional (modelos, texturas fotográficas e animações próprias).
- O soldado é um modelo provisório (veja abaixo).
- Ainda **não há multiplayer online**: hoje são 5x5 com bots.
- Testado em Chromium (desktop e emulação de celular). Falta teste em aparelhos reais.

## Próximos passos
Multiplayer online (servidor autoritativo + salas/squads), Centerflag e outros modos, mais marcadores, modelos/animações próprios, skins e cores de tinta, mais mapas.

Design completo em [`GDD.md`](GDD.md). Reel de divulgação (gravado do próprio jogo): [`reel/splat-arena-reel.mp4`](reel/splat-arena-reel.mp4).

## Créditos e licença dos assets
- Three.js (MIT) — `web/js/vendor`.
- `web/assets/soldier.glb`: modelo "Vanguard" do Mixamo/Adobe, distribuído nos exemplos do Three.js. **Provisório**: antes de lançar comercialmente, troque por personagens próprios/licenciados (camuflagem, máscara e acessórios já são separados do modelo e podem ser reaproveitados).
- Miniaturas em `web/assets/maps` e o Reel foram gerados a partir do próprio jogo.
