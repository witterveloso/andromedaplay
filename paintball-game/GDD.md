# SPLAT ARENA (nome provisório) — Game Design Document v0.1

Jogo de tiro online, multiplataforma e free-to-play, no estilo Free Fire / Call of Duty, mas **100% paintball**: marcadores, bolinhas de tinta, campos temáticos e regras reais do esporte. Feito para ser divertido de jogar em grupo e fácil de virar clipe nas redes sociais.

> Legenda de confiança: **[F]** = confirmado em pesquisa web (fontes no fim). **[C]** = conhecimento geral do esporte, vale confirmar. **[D]** = decisão de design nossa.

---

## 1. Pilares

1. **Paintball de verdade, não "guerra".** Sem sangue, sem morte: acertou, estourou tinta, você está *marcado* (hands up, sai do campo). Isso dá identidade e deixa o jogo palatável para todas as idades e plataformas.
2. **Splat é o espetáculo.** A tinta é o feedback principal: cada tiro deixa marca no cenário, no inimigo, no HUD. O mapa vira uma obra de arte ao longo da partida (ótimo para replay/clipe).
3. **Squad primeiro.** Entrar com amigos em 2 cliques, em qualquer plataforma.
4. **Partidas curtas** (4–10 min) e sessões de "mais uma rodada".
5. **Cosmético, nunca pay-to-win.**

## 2. Regras reais do paintball adaptadas ao jogo

| Regra do esporte | Como vira mecânica |
|---|---|
| Limite de velocidade ~**280–300 fps** (campos pequenos/indoor ~250) **[F]** | Todas as armas têm velocidade de saída parecida; diferença vem de cadência, precisão e munição. Mata o "arma OP". |
| Atingido = sai do campo com o marcador para cima **[F]** | Estado **Marcado**: personagem levanta o marcador e caminha até a *zona de reentrada* (ou espera o respawn). Sem killcam violenta. |
| Em alguns formatos o jogador pode reentrar após um tempo **[F]** | Modos "Reentrada" (respawn por tempo) e "Eliminação" (sem respawn). |
| Marcador precisa quebrar a bolinha para valer **[C]** | Hit só conta se a bolinha estourar; **tinta gelada/chuva/calor** alteram chance de quebrar **[F: gelatina varia com clima]**. |
| Máscara obrigatória **[C]** | Máscara é parte do personagem; tiro na máscara é headshot "limpo". Máscara embaçada com chuva/suor = mecânica visual leve. |
| Barreiras/bunkers para se esconder **[F]** | Cobertura é o núcleo do mapa. Tinta atinge parede e deixa marca; "paint wall" cobre a visão. |

## 2.1 Câmeras: primeira e terceira pessoa **[D]**

O jogador alterna a qualquer momento (botão **V** no PC, ícone no celular, **R3** no controle). A escolha é salva no perfil.

| | **1ª pessoa (FPP)** | **3ª pessoa (TPP)** |
|---|---|---|
| Ponto de vista | Olhos do jogador, por dentro da máscara | Câmera sobre o ombro, estilo Free Fire |
| Visível | Marcador, mãos, borda da máscara, hopper | Personagem inteiro, marcador, tanque, skins |
| Mira | Mira precisa, zoom (ADS) | Mira no centro, dispara do ombro |
| Cobertura | Sem ver o que está ao redor | Espiar por cima/lateral sem se expor (tiro "cego" permitido) |
| Pontos fortes | Imersão, precisão | Consciência de cenário, mostra skins (bom para vídeos) |

**Equilíbrio:** em 3ª pessoa a câmera não "enxerga através" de paredes (colisão da câmera) e o tiro sai sempre do cano real, não do centro da tela, então espiar da cobertura expõe o marcador. Modos competitivos podem **travar a câmera** (só FPP, só TPP ou livre) e o matchmaking separa as filas se necessário.

**Splat na máscara (impacto no rosto)**
- **Tiro no rosto/máscara:** a tinta cobre a viseira. Em **1ª pessoa**, a tela é coberta por uma mancha na cor do time atirador, com gotas escorrendo, e a visão fica bloqueada. Em **3ª pessoa**, o rosto do personagem fica pintado e a tela recebe um efeito leve de respingo.
- **Marcado:** como no esporte, o acerto também conta como eliminação, e o jogador levanta o marcador e sai. O splat na máscara é o **feedback principal** da eliminação (sem sangue).
- **Splats que não eliminam** (em modos com "mais de uma vida" ou treino): tinta parcial na viseira, com tamanho e opacidade variáveis. Limpa com o botão **Limpar máscara** (animação do jogador passando a mão, 1–2 s), ou aos poucos com o tempo.
- **Tinta no resto do corpo:** respingos no colete, braços e marcador aparecem nos dois pontos de vista. Cor e formato seguem o tipo de bolinha.
- **Clima:** chuva ajuda a lavar, neblina e calor embaçam a máscara.
- **Técnica:** decals na viseira (render texture + shader de gotas escorrendo), pool de splats, intensidade reduzida em mobile e opção de acessibilidade para diminuir o efeito (fotossensibilidade).

## 3. Armas (marcadores)

Capacidade real e referências **[F/C]**: bolinha calibre **.68**; hopper clássico de **200 bolinhas** por gravidade **[F]**; hoppers elétricos alimentam 30+ bolinhas/s **[F]**; marcadores semiautomáticos cadenciam ~10–15 bolinhas/s em torneio, modos auto chegam a ~1.400/min **[F]**; *pods* de reabastecimento típicos de **140 bolinhas** **[C]**; classe *Stock* usa **bomba (pump) + cartucho de CO₂ de 12 g** para limitar cadência e capacidade **[F]**. Marcas de referência reais: Tippmann (Stormer Elite, Cronus, A-5), Planet Eclipse, Dye, Empire, Valken.

No jogo usamos **marcas fictícias** (evita licença) inspiradas nesses perfis **[D]**:

| Classe | Inspirada em | Capacidade (hopper) | Cadência | Papel |
|---|---|---|---|---|
| **Pump Stock** | Classe Stock (pump + CO₂ 12g) | 12 (tubo) | Baixa, bomba manual | Precisão, ritmo "clássico" |
| **Rookie Gravity** | Tippmann gravity, hopper 200 | 200 | Média-baixa (semi) | Arma inicial, fácil |
| **Tactical Mag** | Tippmann/Cronus estilo militar | 30 (carregador) + reservas | Média (semi/rajada 3) | Estilo CoD, mid-range |
| **Tourney Elite** | Planet Eclipse / Dye (eletrônico) | 200 (hopper elétrico) | Alta (semi, ~12–15 bps) | Pressão de speedball |
| **Full Auto Blaster** | Tippmann full auto | 200 | Muito alta, espalha | Supressão, gasta tinta rápido |
| **Sniper Long** | Marcador longo, cano estendido | 20 | Muito baixa | Longo alcance, marcado a distância |
| **Close Quarter** | Marcador compacto | 100 | Alta, curto alcance | Fábrica, favela, corredores |

**Recursos por arma:** tinta (hopper + pods reservas), **ar HPA/CO₂** (acaba e precisa trocar tanque, balanceando spam), calibre fixo .68. Atributos: precisão, recarga, peso/mobilidade, ruído. **Acessórios:** hopper, cano, tanque, mira, camuflagem de arma.

**Equipamento extra [D]:** granadas de tinta (paint grenade, existem no esporte **[F]**), *bunker kit* inflável, escudo/barreira portátil, kit de limpeza de máscara.

## 4. Cores de tinta e bolinhas

Bolinhas **.68** são gelatina com recheio de tinta, vendidas em combinações **casca + recheio** (amarelo, laranja, rosa, verde, azul/aqua, vermelho, bronze/ouro) **[F]**; a tinta é lavável e biodegradável, existindo também a linha *eco* **[F]**.

No jogo **[D]**:
- **Cor de time** = cor do recheio (ex.: Laranja vs Azul-aqua, depois Rosa, Verde-limão, Amarelo). Sempre alto contraste e daltonismo-friendly (padrões + cor).
- **Cascas cosméticas**: dois tons (two-tone), metálico, neon, glitter, "eco" translúcido.
- **Tipos de bolinha (gameplay leve):**
  - *Padrão*: equilibrada.
  - *Premium/Field*: mais precisa, quebra mais fácil.
  - *Eco*: biodegradável, bônus de XP de "campo limpo".
  - *Cold-weather*: quebra melhor no frio/chuva (mapas com clima).
- **Trail de tinta** (rastro visual) e **splat** customizáveis por jogador (efeito mais viral).

## 5. Modos de jogo (do esporte real **[F]**)

**Principais (lançamento):**
1. **Centerflag** — uma bandeira no centro, leva até a base inimiga. Modo oficial de torneio.
2. **Capture the Flag** — duas bandeiras, uma por base.
3. **Eliminação Total** — último time em pé.
4. **Ataque e Defesa** — atacantes capturam; defensores seguram por tempo.
5. **Reentrada (Team Deathmatch)** — respawn por tempo, vence por pontos/acertos.

**Pós-lançamento:** Proteja o Presidente (VIP), Hopperball, **21** (marcar 21 acertos), Civil War, **Battle Royale de Tinta** (50 jogadores, zona que se fecha com "tinta tomando o mapa", inspirado no Free Fire) e **Scenario** (grande, objetivos longos, estilo evento).

Formatos de squad: **solo, duo, trio, 5v5, 10v10**. Tamanhos de time reais variam de 3 a 15 jogadores **[F]**.

## 6. Mapas — campos e cenários

Tipos reais de campo: **woodsball** (floresta, natureza), **speedball** (arena plana com bunkers infláveis de tecido), **urbano/tático**, **cenário** (histórico/ficcional), **indoor** com plataformas multinível **[F]**. Campos reais reutilizam galpões, casas antigas e áreas florestais **[F]**.

Lista inicial de mapas **[D]**:

| # | Mapa | Estilo | Ideia |
|---|---|---|---|
| 1 | **Arena Speedball** | Speedball | Campo simétrico, bunkers infláveis coloridos, tutorial e competitivo. |
| 2 | **Fábrica Abandonada** | Urbano indoor | Esteiras, tubulações, galpões, passarelas, luz com poeira. Muita verticalidade. |
| 3 | **Morro Vivo (comunidade vertical)** | Urbano | Becos, escadarias, lajes e caixas d'água, varais, fios, muita cor. Foco em **cultura, arte e cor** (grafites, bandeirinhas), jogabilidade de verticalidade; sem armas reais, sem tema de crime/polícia. |
| 4 | **Floresta Woodsball** | Natureza | Árvores, ravinas, mato; furtividade. |
| 5 | **Porto de Containers** | Urbano | Corredores de contêineres empilháveis, guindastes. |
| 6 | **Vila Fantasma** | Tático/cenário | Casas abandonadas, mercado, igreja, estilo faroeste/pós-guerra. |
| 7 | **Shopping Abandonado** | Indoor | Escadas rolantes, vitrines, lojas, atrium aberto. |
| 8 | **Parque Neon (Noite)** | Estilizado | Luz negra, tintas fluorescentes, ótimo para clipes. |
| 9 | **Ferro-Velho / Depósito de Ônibus** | Urbano | Carcaças de carro, ônibus, pneus, ferro, abrigo variado. |
| 10 | **Submarino / Base Polar** | Fantasia | Cenário sazonal; neve afeta quebra das bolinhas. |

**Dinâmicas por mapa:** clima (chuva, neblina, frio), tinta que persiste nas paredes e muda a cobertura, bunkers destrutíveis e infláveis que se esvaziam quando atingidos.

## 7. Social e multiplataforma

- **Plataformas alvo:** Android, iOS, PC (Steam/Epic) e, depois, console. **Crossplay** com matchmaking separado opcional (controle vs toque) **[D]**.
- **Grupos (squads):** convite por link/código/QR, lobby de amigos, voz in-game, ping, emotes de grito de time.
- **Amigos e clãs**, ranking sazonal, presença online.
- **Para redes sociais:** modo **Replay/Foto** com câmera livre, botão "compartilhar clipe de 15s" (vertical 9:16), **Splat Map** no fim (mapa pintado da partida), desafios semanais "tinta" (hashtag), Modo Criador (skins, bandeiras).
- **Segurança:** chat moderado, denúncias, modo infantil com chat desativado.

## 8. Tecnologia (proposta)

| Item | Recomendação | Motivo |
|---|---|---|
| Engine | **Unity** (alternativa: Unreal para PC/console premium) | Melhor suporte a mobile + PC + console, ecossistema de rede. |
| Rede | **Netcode/Photon Fusion** (servidor autoritativo) | Tiro rápido, rollback e lag compensation. |
| Serviços | Auth + Lobby + Relay + Voz (Unity Gaming Services ou PlayFab) | Crossplay, convite e squads. |
| Backend | Supabase (já usado neste repo) ou PlayFab | Perfis, inventário, ranking. |
| Tinta | Decals + render texture dinâmica, pool de splats | Barato em mobile, visualmente forte. |
| Alvo mobile | 60 FPS em aparelhos médios, mapas ≤ 10 jogadores por time | Realista. |

## 9. Monetização

Free-to-play, **só cosméticos**: skins de máscara/roupa, cascas de bolinha, trails, splats, acessórios, passe de temporada. **Nunca** vende dano/cadência.

## 10. Roadmap sugerido

1. **Protótipo (4–6 sem):** 1 mapa (Arena Speedball), 2 armas, andar/atirar/splat/marcado, offline com bots.
2. **MVP online (8–12 sem):** matchmaking, Centerflag + Eliminação, 3 mapas, squad por convite, Android + PC.
3. **Alpha social:** Replay/clipe vertical, Fábrica + Morro Vivo, ranking, passe.
4. **Lançamento aberto:** iOS, mais armas/mapas, Battle Royale de Tinta, console.

## 11. Pontos em aberto (decidir juntos)

- Nome definitivo e identidade visual.
- Engine: Unity vs Unreal vs Godot/web (para teste rápido nas redes).
- Perspectiva: **definido**, o jogo terá 1ª e 3ª pessoa alternáveis (ver 2.1). Falta decidir quais modos travam a câmera.
- Se começa como **protótipo web jogável** (compartilhável por link) antes do app nativo.
- Estilo de arte: realista suave, cartoon (estilo Fortnite) ou low-poly.

## 11.1 Estado atual do protótipo (v0.3)

**Implementado (navegador, PC e celular):** 5 campos jogáveis (Arena Speedball, Galpão Abandonado, Morro Vivo, Ferro-Velho, Cidade Abandonada), 1ª e 3ª pessoa, partida 5x5 contra bots (eliminação, melhor de 5), tinta na máscara, camuflagem por equipe, cores de tinta personalizáveis, menu com seleção de campo, configurações e acessibilidade, placar e tela de fim de partida.

**Princípios de UX adotados**
1. *Jogar em 1 toque:* o botão principal é o maior elemento da tela; tudo o mais (campo, tinta, câmera, bots) tem um padrão sensato.
2. *Mostrar, não explicar:* o campo 3D roda ao fundo do menu; cartões de campo com imagem; dicas curtas no carregamento e no primeiro jogo.
3. *Feedback imediato e legível:* marcador de acerto, feed, indicador de direção do tiro, tinta na máscara, vibração no celular.
4. *Acessível por padrão:* paleta laranja×azul segura para daltonismo, opção "reduzir efeitos", mira configurável, HUD redimensionável, navegação por teclado, modo canhoto.
5. *Mobile de verdade:* paisagem, zonas de toque grandes e seguras para o notch, joystick flutuante, botões redimensionáveis.

**Ainda não feito:** multiplayer online, modos Centerflag/Battle Royale, outros marcadores, arte 3D e animação própria (o soldado atual é provisório), teste em aparelhos reais, balanceamento com jogadores humanos.

## 12. Fontes da pesquisa

- [Paintball marker (Wikipedia)](https://www.wikipedia.org/wiki/Paintball_gun)
- [Types of paintball guns](https://paintballer.co/types-of-paintball-guns/)
- [Paintball variations](https://en.wikipedia.org/wiki/Paintball_variations)
- [Paintball games](https://paintballer.co/paintball-games/)
- [Paintball rules](https://propaintball.com/rules-in-paintball/)
- [Different types of paintball games](https://www.ypc.co.uk/2023/03/23/the-different-types-of-paintball-games-speedball-woodsball-and-more/)
- [Indoor vs outdoor paintball](https://paintballer.co/indoor-vs-outdoor-paintball/)
- [Best paintballs](https://paintballer.co/best-paintballs)
- [Best paintballs for woodsball and speedball](https://www.owntheyard.com/best-paintballs-for-woodsball)
