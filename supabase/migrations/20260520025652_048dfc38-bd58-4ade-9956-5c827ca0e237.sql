
-- 1. course type
CREATE TYPE public.course_type AS ENUM ('video', 'community');
ALTER TABLE public.courses
  ADD COLUMN course_type public.course_type NOT NULL DEFAULT 'video';

-- 2. status enums
CREATE TYPE public.lesson_status AS ENUM ('published', 'draft', 'locked');
CREATE TYPE public.post_status AS ENUM ('published', 'draft', 'hidden');

-- 3. modules
CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_modules_course ON public.modules(course_id, position);

-- 4. lessons
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  youtube_url TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  status public.lesson_status NOT NULL DEFAULT 'draft',
  is_free BOOLEAN NOT NULL DEFAULT false,
  release_after_days INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lessons_module ON public.lessons(module_id, position);
CREATE INDEX idx_lessons_course ON public.lessons(course_id);

-- 5. lesson materials
CREATE TABLE public.lesson_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  file_type TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lesson_materials_lesson ON public.lesson_materials(lesson_id, position);

-- 6. community channels
CREATE TABLE public.community_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_channels_course ON public.community_channels(course_id, position);

-- 7. community posts
CREATE TABLE public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.community_channels(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT,
  body TEXT,
  image_url TEXT,
  youtube_url TEXT,
  allow_comments BOOLEAN NOT NULL DEFAULT true,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  status public.post_status NOT NULL DEFAULT 'draft',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_posts_channel ON public.community_posts(channel_id, position);
CREATE INDEX idx_posts_course ON public.community_posts(course_id);

-- 8. community comments
CREATE TABLE public.community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_post ON public.community_comments(post_id);

-- 9. community reactions
CREATE TABLE public.community_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id, reaction)
);
CREATE INDEX idx_reactions_post ON public.community_reactions(post_id);

-- 10. updated_at triggers
CREATE TRIGGER trg_modules_updated BEFORE UPDATE ON public.modules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_lessons_updated BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_channels_updated BEFORE UPDATE ON public.community_channels
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_posts_updated BEFORE UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_comments_updated BEFORE UPDATE ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 11. RLS
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reactions ENABLE ROW LEVEL SECURITY;

-- Modules
CREATE POLICY "Admins gerenciam módulos" ON public.modules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Autenticados veem módulos de cursos publicados" ON public.modules
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = modules.course_id AND c.status = 'published'
    )
  );

-- Lessons
CREATE POLICY "Admins gerenciam aulas" ON public.lessons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Autenticados veem aulas publicadas" ON public.lessons
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      status = 'published'
      AND EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = lessons.course_id AND c.status = 'published'
      )
    )
  );

-- Lesson materials
CREATE POLICY "Admins gerenciam materiais" ON public.lesson_materials
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Autenticados veem materiais de aulas publicadas" ON public.lesson_materials
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = lesson_materials.lesson_id AND l.status = 'published'
    )
  );

-- Community channels
CREATE POLICY "Admins gerenciam canais" ON public.community_channels
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Autenticados veem canais de cursos publicados" ON public.community_channels
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = community_channels.course_id AND c.status = 'published'
    )
  );

-- Community posts
CREATE POLICY "Admins gerenciam publicações" ON public.community_posts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Autenticados veem publicações publicadas" ON public.community_posts
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR status = 'published'
  );

-- Comments
CREATE POLICY "Autenticados veem comentários" ON public.community_comments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuários criam próprios comentários" ON public.community_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Usuários editam próprios comentários" ON public.community_comments
  FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "Usuários e admins apagam comentários" ON public.community_comments
  FOR DELETE TO authenticated
  USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

-- Reactions
CREATE POLICY "Autenticados veem reações" ON public.community_reactions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuários gerenciam próprias reações" ON public.community_reactions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
