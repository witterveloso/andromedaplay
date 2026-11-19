# SPLAT ARENA — protótipo jogável (navegador)

**Jogar online:** https://witterveloso.github.io/splat-arena/ (GitHub Pages)


Paintball tático contra bots, com equipes de **8×8, 10×10 ou 15×15** (você escolhe no menu), com **1ª e 3ª pessoa**, para **PC e celular**, em **5 campos**. Sem build: HTML + Three.js (incluído em `web/js/vendor`).

## Rodar

```sh
cd paintball-game/web
python3 -m http.server 8080     # ou: npx serve .
# abra http://localhost:8080
```
(precisa de servidor HTTP por causa dos módulos ES; funciona em qualquer hospedagem estática.) Atalhos de URL: `?map=favela|galpao|ferro|cidade|arena`, `?cam=tpp`, `?quality=low`.


## Novidades
- **Jogar online com amigos:** no menu, *Jogar online com amigos*. Um jogador cria a **sala** (código de 5 letras + link `?sala=CÓDIGO`), os outros entram pelo código ou link. O anfitrião escolhe **Amigos × Bots** (todos no mesmo time contra os bots) ou **Amigos × Amigos** (cada um escolhe a equipe; dá para completar as equipes com bots), campo, modo (Eliminação/Centerflag), tamanho da equipe (8/10/15) e dificuldade. Até 10 jogadores. Conexão **direta entre os aparelhos (WebRTC, via PeerJS)**: sem servidor próprio; o anfitrião roda a simulação (bots, tiros, acertos, rodadas) e os convidados recebem o estado ~15×/s e mandam posição, mira e tiros. Se o anfitrião sair, a sala fecha; quem sai no meio some da partida.
  - *Observações:* usa o servidor público gratuito do PeerJS só para o "aperto de mão" e servidores STUN/TURN públicos; se algum deles estiver fora do ar ou a rede (ex.: alguns 4G/CGNAT) bloquear a conexão, a sala pode não conectar. Para usar o seu próprio broker: `?peerhost=SEU_HOST&peerport=9000&peerpath=/&peersecure=1`. Não há anti-trapaça (é jogo entre amigos).
- **3 tiros para sair:** os 2 primeiros tiros deixam uma marca de tinta no corpo — e a **tinta fica na sua tela** até o fim da rodada, acumulando a cada acerto — e o jogador segue na partida (o indicador *MARCAS* mostra as 3 gotas: verde, laranja, vermelho). O 3º tiro elimina. Bolinhas da mesma rajada em até 0,7 s contam como um só acerto. Vale para você e para os bots.
- **Vibração (celular):** toque curto ao acertar (duplo na cara) e pulso longo ao ser marcado; ligada por padrão, com botão de teste em Configurações → Celular. Só funciona onde o navegador permite (Chrome no Android; iPhone não suporta).
- **Torres e mira de sniper:** cada campo tem torres/plataformas com rampa e muretas; você e os bots sobem e atiram de cima. **Botão direito** (ou **ZOOM** no celular) liga a luneta 4× / 8× (roda do mouse troca): giro mais lento, balanço de respiração (agache ou segure Shift para firmar) e menos dispersão.
- **Tamanho da equipe:** escolha 8×8, 10×10 ou 15×15 no menu. Equipes grandes usam nível de detalhe por distância (sem acessórios e sombra nos distantes, sem desenhar quem está atrás da câmera).
- **Desempenho:** geometria estática do campo e acessórios dos jogadores fundidos (de ~1.300 para ~500 chamadas de desenho), marcadores dos bots mais leves e um **ajuste automático de qualidade** (resolução → sombras → resolução menor) quando o aparelho não sustenta ~30 fps.
- **Visual:** nuvens procedurais no céu, grama com falhas e trevo, copas de árvore volumosas, sombras de contato sob bunkers/obstáculos e vinheta de câmera.
- **De onde veio o tiro:** ao ser marcado, uma seta em arco aponta para o atirador (acompanha a câmera) e uma etiqueta mostra nome e distância sobre ele por ~3,5 s.
- **Pausa:** botão *Sair do jogo* (confirma com um segundo toque e volta à tela de abertura).
- **Abertura e tutorial:** tela de abertura animada com frases que se alternam e chamada adequada ao aparelho; o tutorial de 3 passos aparece só no primeiro acesso (refaça em Configurações → *Rever o tutorial*).
- **Centerflag:** uma bandeira no centro do campo; pegue e leve até a base inimiga para vencer a rodada (ou elimine o outro time). Quem carrega derruba a bandeira ao ser marcado. Os bots pegam, escoltam e perseguem o portador. Escolha o modo no menu.
- **Barracos com porta:** dá para entrar em barracos/escritórios (favela, ferro-velho, cidade e galpão), se esconder e atirar pela porta. As paredes bloqueiam tiros e visão; aparece **ESCONDIDO** quando nenhum inimigo te enxerga.
- **Mapa de localização (radar):** vista de cima com aliados, bandeira e inimigos. Modos em Configurações: *Avistados* (quem você ou um aliado enxerga), *Todos* e *Desligado*. **M** ou toque no mapa amplia.
- **Celular:** sem botões de fogo. **Arraste** na tela para virar a câmera; ao achar o alvo, **toque** (rajada curta) ou **segure** (rajada contínua). Também atira com um toque na metade esquerda (gira com um polegar, atira com o outro). Tiro automático e assistência de mira opcionais.
- **Áudio:** música, **som ambiente por campo** (vento, pássaros, pingos, percussão distante, cidade), passos e botão 🔊 no menu. No iPhone, tire o modo silencioso; o botão 🔇 pulsa enquanto o navegador estiver bloqueando o som.
- **Atualização automática:** a versão aparece no canto do menu (vAAAAMMDD-HHMMSS). Antes de cada commit rode `python3 tools/stamp.py` para o celular baixar os arquivos novos em vez de usar o cache.

## Campos
Todos os campos têm **60 × 90 m** (antes 40 × 60 m), com 70–190 obstáculos cada, largadas livres e layouts simétricos (justos para os dois times). Em celular as texturas são geradas em resolução menor.
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
| Mirar | mouse | arrastar na tela |
| Atirar | clique | toque na tela (segure para rajada) |
| Recarregar | R | ⟳ |
| Trocar câmera 1ª/3ª | V | CAM |
| Placar | Tab | tocar no placar |
| Pausa | Esc | II |

## Jogabilidade
- Marcador com hopper de 200 bolinhas, pods, recarga, ~10 bolinhas/s, queda de projétil e dispersão por movimento/rajada.
- Respingos de tinta nas paredes, no chão e nos jogadores; partículas no impacto.
- Acertado duas vezes = **marcas** de tinta; no 3º tiro = **eliminado** (mãos para cima). Tiro na cara/máscara **cobre a tela de tinta** com gotas escorrendo; a câmera passa para a 3ª pessoa.
- Bots com IA (fácil/normal/difícil): cobertura, rajadas, reação. Partida melhor de 5 rodadas, eliminação, 2 min por rodada.
- Personagens 3D com esqueleto: soldado com **camuflagem por equipe** (deserto × urbano azulado), máscara de paintball com lente espelhada, protetores de orelha, tira da cor do time, pods no colete e cilindro de ar nas costas; animações de andar/correr, mira, agachar e mãos para cima.

## Limitações conhecidas
- **Realismo:** cenários e personagens são procedurais/gratuitos; ficam em um nível "jogo indie estilizado-realista", não fotorrealista de CoD. Para chegar lá é preciso arte 3D profissional (modelos, texturas fotográficas e animações próprias).
- O soldado é um modelo provisório (veja abaixo).
- O online é **peer-to-peer entre amigos** (sem servidor dedicado, sem anti-trapaça, sem reconexão no meio da partida).
- Testado em Chromium (desktop e emulação de celular). Falta teste em aparelhos reais.

## Próximos passos
Multiplayer online (servidor autoritativo + salas/squads), Centerflag e outros modos, mais marcadores, modelos/animações próprios, skins e cores de tinta, mais mapas.

Design completo em [`GDD.md`](GDD.md). Reel de divulgação (gravado do próprio jogo): [`reel/splat-arena-reel.mp4`](reel/splat-arena-reel.mp4).

## Créditos e licença dos assets
- Three.js (MIT) e PeerJS 1.5.5 (MIT) — `web/js/vendor`.
- `web/assets/soldier.glb`: modelo "Vanguard" do Mixamo/Adobe, distribuído nos exemplos do Three.js. **Provisório**: antes de lançar comercialmente, troque por personagens próprios/licenciados (camuflagem, máscara e acessórios já são separados do modelo e podem ser reaproveitados).
- Miniaturas em `web/assets/maps` e o Reel foram gerados a partir do próprio jogo.

## Referências usadas no visual
- Marcador tático (.68): corpo com trilhos Picatinny, cano ventilado dentro de capa, empunhadura vertical, loader, cilindro HPA com regulador e coronha retrátil — baseado em marcadores táticos como o Tippmann Cronus ([Academy](https://www.academy.com/p/tippmann-cronus-68-caliber-tactical-paintball-marker), [Tippmann Parts](https://tippmannparts.com/collections/tippmann-cronus-paintball-gun-information-hub)) e na anatomia geral de marcadores ([Lone Wolf Paintball](https://lonewolfpaintball.com/blogs/news/markers-101-a-guide-to-paintball-guns-for-beginners), [Wikipedia](https://www.wikipedia.org/wiki/Paintball_gun)).
- Equipamento do jogador (máscara, jersey, harness com pods, joelheiras e cotoveleiras, camuflagem): guias de woodsball como [paintballer.co](https://paintballer.co/what-to-wear-to-play-paintball/) e [Mad Dog Sports](https://maddogsports.com/collections/paintball-harnesses-vests-pods).
