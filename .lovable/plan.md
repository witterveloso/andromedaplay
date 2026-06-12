## Problema

`src/components/community/youtube-live-player.tsx` usa o endpoint `oembed` do YouTube para decidir se a live está "offline". Lives **não listadas** retornam 401/404 no oEmbed (porque oEmbed só responde para vídeos públicos), então o componente entra no estado `offline=true` e mostra o placeholder "A live começará em breve" — mesmo que o iframe embed funcione perfeitamente.

O embed do YouTube aceita vídeos não listados normalmente; a validação via oEmbed é o único bloqueio.

## Correção

### 1. `src/components/community/youtube-live-player.tsx`
- Remover o `useEffect` que faz polling em `youtube.com/oembed`.
- Remover o state `offline` e o branch que renderiza o placeholder por causa dele.
- Renderizar o iframe sempre que houver um `embed`/`id` válido extraído da URL.
- Manter o placeholder "A live começará em breve" **somente** quando:
  - `url` ausente/vazia, ou
  - `extractYouTubeId(url)` retornar `null` (URL inválida — não é youtube.com/watch, /live/ ou youtu.be).
- Manter o badge "AO VIVO" para URLs `/live/`.
- Manter `allow`/`allowFullScreen` atuais (já suportam autoplay/fullscreen).

### 2. Estúdio da Live (`src/routes/expert.courses.$id.live.$postId.tsx`)
- Já usa o mesmo `YouTubeLivePlayer` (ou o mesmo fluxo). Confirmar e, se estiver usando o componente compartilhado, a correção acima já cobre os dois lados (aluno + produtor). Se houver lógica duplicada inline, alinhar para usar o mesmo componente.

### 3. Não tocar
- Chat realtime, RLS, permissões, player de vídeo geral (`src/lib/video-player.tsx`), parsing em `src/lib/youtube.ts` (já cobre `/watch`, `/live/`, `youtu.be`, `/embed/`, `/shorts/`).

## Resultado

Lives não listadas renderizam normalmente na comunidade do aluno e no Estúdio do produtor. O placeholder só aparece quando realmente não há URL válida configurada.