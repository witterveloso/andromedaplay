## Momento em Destaque

Bloco cinematográfico no topo da comunidade (estilo Netflix hero) com um destaque definido pelo produtor.

### 1. Banco de dados (mínimo)

Adicionar campos opcionais em `courses` (sem nova tabela, sem novas policies):

- `featured_kind` text — `post` | `video` | `lesson` | `notice`
- `featured_title` text
- `featured_description` text
- `featured_image_url` text
- `featured_cta_label` text (default "Acessar")
- `featured_cta_url` text (link interno ou externo)
- `featured_enabled` boolean default false

Tudo nullable; quando `featured_enabled = false` ou sem dados, o bloco não aparece.

### 2. Admin (gestão)

Em `src/components/admin/contents-community.tsx`, adicionar uma seção compacta "Momento em Destaque" com:

- Switch ativar/desativar
- Select do tipo (postagem / vídeo / aula / aviso)
- Input título
- Textarea descrição curta
- Upload de imagem/banner (usa `ImageUploadCrop`, bucket `course-assets`)
- Input rótulo do botão (default "Acessar")
- Input URL de destino
- Botão salvar (update na linha de `courses`)

Sem mudanças no banco além das colunas acima, sem mexer em policies (admin já pode atualizar `courses`).

### 3. Hero do aluno

Em `src/routes/aluno.c.$slug.tsx`, acima do feed, renderizar `<FeaturedMoment />` quando `featured_enabled` e dados presentes.

Visual:
- Banner 16:7 desktop / 4:3 mobile, `object-cover`
- Overlay gradiente escuro (esquerda forte → direita transparente)
- Glow ambiente roxo/azul nas bordas
- Badge do tipo (Postagem / Vídeo / Aula / Aviso) com ícone
- Título grande (`text-3xl sm:text-5xl`), descrição limitada a 2 linhas
- Botão CTA pill com glassmorphism + ícone Play/ArrowRight
- Hover sutil: brilho aumenta, escala 1.005

### 4. Mobile

- Mesma estrutura, padding ajustado, altura mínima reduzida, fontes menores, CTA full-width opcional.

### 5. Arquivos

Novos:
- `src/components/community/featured-moment.tsx` (apresentacional)
- `src/components/admin/featured-moment-editor.tsx` (form admin)

Editados:
- `src/components/admin/contents-community.tsx` (monta o editor)
- `src/routes/aluno.c.$slug.tsx` (renderiza o hero)
- Migration adicionando colunas em `courses`

### Fora do escopo

- Não cria nova tabela, nem novas RLS policies
- Não altera feed, canais, posts existentes
- Não mexe em permissões
