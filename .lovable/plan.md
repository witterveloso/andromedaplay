
## Objetivo

Adicionar uma área de **Produtos** acessível pelo topo da Home, onde qualquer visitante pode ver os cursos/mentorias à venda, comprar via **Mercado Pago** e, após o pagamento aprovado, receber automaticamente acesso (enrollment) ao curso dentro da Andromeda Play.

Sem alterar a arte da Home, login, autenticação ou design existente — apenas adicionar uma camada nova de e‑commerce.

---

## 1. Estrutura de dados (migration)

Novas colunas em `courses`:
- `is_for_sale boolean default false`
- `price_cents integer` (em centavos, BRL)
- `currency text default 'BRL'`
- `sales_headline text`, `sales_subheadline text`, `sales_description text` (markdown)
- `sales_hero_url text`, `sales_video_url text`
- `sales_bullets jsonb` (lista de benefícios)
- `access_duration_days integer null` (null = vitalício)

Nova tabela `orders`:
- `course_id`, `buyer_id` (nullable — guest checkout permitido), `buyer_email`, `buyer_name`
- `amount_cents`, `currency`
- `status` enum: `pending | approved | rejected | refunded | cancelled`
- `mp_preference_id`, `mp_payment_id`, `mp_status_detail`
- `created_at`, `updated_at`, `paid_at`

GRANTs + RLS:
- `courses` (já existe) — adicionar policy `TO anon SELECT` apenas das colunas via view pública `public_products` filtrando `is_for_sale=true AND status='active'`.
- `orders`: usuário vê apenas seus próprios pedidos; service_role full; webhook escreve via service role.

## 2. Hotspot "Produtos" na Home

Em `src/routes/index.tsx`, adicionar um hotspot invisível no topo (mesma técnica usada para Entrar/Criar Conta) apontando para `/produtos`, em desktop e mobile. Nenhuma alteração visual na arte.

## 3. Páginas novas

```
src/routes/produtos.index.tsx        → catálogo público (grid de cards)
src/routes/produtos.$slug.tsx        → página de venda do curso
src/routes/checkout.sucesso.tsx      → confirmação pós-pagamento
src/routes/checkout.pendente.tsx
src/routes/checkout.falhou.tsx
src/routes/_authenticated/admin/produtos.tsx  → painel para marcar curso como à venda, preço, textos
```

Design: reaproveita paleta azul/índigo/violeta da Andromeda — não cria nova identidade visual, segue o sistema existente em `src/styles.css`.

## 4. Integração Mercado Pago (BYOK)

Mercado Pago não tem integração nativa Lovable. Usaremos a API oficial via secret.

Secrets necessários (peço via add_secret quando aprovar):
- `MP_ACCESS_TOKEN` (token de produção/teste do MP)
- `MP_WEBHOOK_SECRET` (assinatura de webhook)

Server functions (`src/lib/payments.functions.ts`):
- `createCheckoutPreference({ courseId, buyerEmail, buyerName })` — cria `preference` no MP (`/checkout/preferences`), grava `orders` com status `pending`, retorna `init_point` para redirecionar.

Server route pública (`src/routes/api/public/mp-webhook.ts`):
- Recebe notificação de pagamento, valida assinatura `x-signature` do MP, consulta `/v1/payments/{id}`, atualiza `orders.status` e — se `approved` — insere em `enrollments` (cria conta auto via Auth Admin se o e-mail ainda não existir, depois `claim_invitations_for_user`-style).

## 5. Fluxo do comprador

```text
Home → Produtos → /produtos/<slug>
     → "Comprar agora" (pede email/nome se deslogado)
     → redireciona para Mercado Pago (init_point)
     → MP redireciona para /checkout/sucesso
     → webhook MP confirma pagamento → cria enrollment
     → /checkout/sucesso mostra "Acesse seu curso" (link /login ou direto se já logado)
```

Se o comprador não tinha conta: o webhook cria usuário via Auth Admin com senha provisória e envia e-mail de definição de senha (Supabase reset password). O enrollment fica vinculado ao novo user_id.

## 6. Admin

Tela simples em `/_authenticated/admin/produtos` (somente role `admin`): lista cursos, toggle "à venda", campos de preço e textos da landing. Sem novo design — usa shadcn já presente.

## 7. Detalhes técnicos

- `createServerFn` para todas as chamadas autenticadas (`requireSupabaseAuth` quando logado, server fn pública para guest checkout).
- Webhook em `/api/public/*` com verificação HMAC do header `x-signature` do MP.
- `supabaseAdmin` carregado dentro do handler (nunca em module scope).
- Liberação de acesso = `INSERT INTO enrollments (course_id, student_id, status, expires_at)` respeitando `access_duration_days`.
- Catálogo público usa client publishable + policy `TO anon` em view `public_products`.

## 8. Fora do escopo desta etapa

- Cupons / descontos
- Assinatura recorrente (só pagamento único agora)
- Split de pagamento para experts
- Notas fiscais

---

## O que vou precisar de você após aprovar o plano

1. Confirmar se quer modo **produção** ou **sandbox** do Mercado Pago para começar.
2. Fornecer o `MP_ACCESS_TOKEN` (te mostro onde gerar) quando eu pedir via formulário seguro.
3. Indicar 1 curso existente para usarmos como primeiro produto de teste (ou crio um de exemplo).
