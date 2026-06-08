# Plano: Plataforma multi-tenant (Admin → Expert → Aluno)

## Modelo de papéis

```text
ADMIN (Andromeda)
  └─ cadastra EXPERTS (email + senha) e controla status (ativo/pausado/bloqueado)
       └─ EXPERT cria seus cursos, personaliza, cadastra ALUNOS (email + senha)
            └─ ALUNO faz login → sistema identifica o(s) curso(s) e direciona
```

Regras:
- Admin **não** cria curso nem aluno. Só cadastra expert e gerencia pagamento/acesso.
- Expert só vê e edita os próprios cursos e os próprios alunos.
- Aluno só vê os cursos em que está matriculado.
- Se o expert estiver `paused` ou `blocked`, seus cursos ficam inacessíveis a alunos e o próprio expert não consegue logar no painel.

## Mudanças no banco

### Enum `app_role`
Adicionar valor `expert` (já existem `admin` e `student`).

### Nova tabela `experts`
- `id` (= `user_id` de auth.users, PK)
- `display_name`, `email`
- `status`: enum `expert_status` (`active`, `paused`, `blocked`)
- `paused_reason`, `paused_at`, `blocked_at`
- `created_by` (admin id)
- timestamps

### Alterar `courses`
- adicionar `expert_id uuid` (FK → experts.id) — dono do curso
- backfill com `created_by` atual
- RLS: expert só vê/edita cursos onde `expert_id = auth.uid()`; admin vê tudo; aluno vê apenas se `published` **e** expert.status='active' **e** matriculado

### Nova tabela `enrollments`
- `id`, `course_id`, `student_id` (user_id), `created_by` (expert), `status` (`active`/`revoked`), timestamps
- unique (course_id, student_id)
- RLS: expert dono do curso gerencia; aluno lê só os próprios; admin lê tudo

### Trigger `handle_new_user` (ajustar)
Hoje dá role `student` automaticamente. Mudar para:
- se metadata tiver `role=expert` → cria linha em `experts` + role `expert`
- senão → role `student` (padrão)

(Admin continua sendo promovido manualmente via SQL.)

### Function `current_user_role()` / helpers
Manter `has_role()`. Adicionar `is_expert_active(uuid)` para uso em policies de cursos/aulas.

## Mudanças no app

### Rotas novas
```
/admin/experts              → lista de experts (cadastrar, pausar, bloquear, excluir)
/admin/experts/new          → form de cadastro (email + senha + nome)
/admin/experts/$id          → detalhes + ações de status

/expert                     → layout do painel do expert (sidebar própria)
/expert/courses             → lista dos cursos dele
/expert/courses/new         → criar curso
/expert/courses/$id         → editar (reaproveita CourseForm + tabs atuais)
/expert/courses/$id/students→ alunos matriculados neste curso (cadastrar/remover)

/aluno                      → após login do aluno, lista os cursos matriculados
/aluno/c/$slug              → área do curso (player de vídeo / comunidade)
```

### Roteamento pós-login (`/login` → destino)
1. carrega roles do usuário
2. se `admin` → `/admin`
3. se `expert` → `/expert` (se status≠active, mostra tela "acesso pausado/bloqueado")
4. se `student` → `/aluno`
5. nenhum dos três → tela "sem acesso, fale com seu expert"

### Cadastro de expert e aluno (server functions)
Como criar usuário com senha exige `service_role`, usar `createServerFn` com `requireSupabaseAuth` + checagem de papel:
- `createExpert` (somente admin) — usa `supabaseAdmin.auth.admin.createUser` + insere em `experts` + role `expert`
- `setExpertStatus` (somente admin) — atualiza `experts.status`
- `deleteExpert` (somente admin) — bloqueia auth + remove
- `createStudent` (somente expert dono) — cria user + role `student` + `enrollments`
- `removeStudent` (somente expert dono) — revoga enrollment

Wire `attachSupabaseAuth` já existe.

### UI do admin
Reduzir o menu atual para: Dashboard, Experts. Remover "Cursos" do admin (passa a ser do expert).

### UI do expert
Reaproveita componentes existentes (`CourseForm`, `ContentsVideo`, `ContentsCommunity`) sob `/expert/*`.

### Bloqueio de expert
- middleware em todas as server fns do expert: se `experts.status≠'active'` → 403
- RLS de `courses`/`modules`/`lessons` para alunos checa `is_expert_active(expert_id)`
- tela `/expert` mostra banner vermelho quando pausado/bloqueado

## Detalhes técnicos

- Senhas iniciais: admin define ao cadastrar expert; expert define ao cadastrar aluno. Ambos recebem aviso para trocar no primeiro login (fase 2 opcional).
- Email é a chave de identificação — sistema já matricula pelo `user_id` retornado pelo `createUser`.
- Aluno com múltiplos cursos: `/aluno` lista todos; se só houver 1, redireciona direto.
- Política de exclusão de expert: cascade nos cursos do expert (mantém histórico via `archived`? — proposta: marcar `blocked` em vez de hard delete, e oferecer botão "Excluir definitivamente" separado).

## Ordem de execução

1. Migration: enum `expert`, tabela `experts`, `enrollments`, `expert_id` em courses, ajuste do trigger, helpers, novas policies.
2. Server fns admin (createExpert, setStatus, deleteExpert).
3. Rotas `/admin/experts/*` + remover "Cursos" do menu admin.
4. Server fns expert (createStudent, removeStudent) + gate de status.
5. Rotas `/expert/*` (layout, courses, students) reaproveitando os componentes atuais.
6. Rotas `/aluno/*` (lista + área do curso — versão mínima já planejada).
7. Roteamento pós-login + tela de acesso bloqueado.
8. Testes manuais: criar expert → logar como expert → criar curso → cadastrar aluno → logar como aluno → ver curso → admin pausa expert → aluno perde acesso.

## Pontos para confirmar antes de codar

1. **Aluno pode estar em cursos de experts diferentes?** (Assumo que sim — chave é email.)
2. **Expert pausado: alunos perdem acesso imediatamente ou só ao próximo login?** (Assumo imediato.)
3. **Player de aulas / área do aluno**: faço uma versão mínima (lista de módulos/aulas + player de vídeo embed + comunidade básica) ou só a estrutura de rotas + matrícula, deixando o player para depois?
4. **Cobrança/pagamento**: por enquanto o status é manual no admin (sem gateway), correto?
