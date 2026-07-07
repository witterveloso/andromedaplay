import { createFileRoute } from "@tanstack/react-router";

/**
 * Stripe webhook.
 *
 * Listens for:
 *   - checkout.session.completed   → mark order paid + grant access
 *   - checkout.session.async_payment_succeeded
 *   - checkout.session.async_payment_failed
 *   - charge.refunded              → mark order refunded
 *   - customer.subscription.*      → keep enrollment in sync (subscriptions)
 *
 * Requires raw body for signature verification.
 */
export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secretKey || !webhookSecret)
          return new Response("not_configured", { status: 503 });

        const sig = request.headers.get("stripe-signature");
        if (!sig) return new Response("missing_signature", { status: 400 });

        const rawBody = await request.text();

        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(secretKey, { apiVersion: "2024-12-18.acacia" as any });

        let event: any;
        try {
          event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhookSecret);
        } catch (err: any) {
          console.error("Stripe signature verification failed", err?.message);
          return new Response("invalid_signature", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { buildPurchaseConfirmationEmail } = await import(
          "@/lib/emails/purchase-confirmation"
        );

        async function sendAccessEmail(params: {
          email: string;
          productName: string;
          redirectTo: string;
        }) {
          try {
            const resendKey = process.env.RESEND_API_KEY;
            if (!resendKey) {
              console.warn("RESEND_API_KEY not configured; skipping access email");
              return;
            }
            const { data: linkData, error: linkError } =
              await supabaseAdmin.auth.admin.generateLink({
                type: "recovery",
                email: params.email,
                options: { redirectTo: params.redirectTo },
              });
            if (linkError || !linkData?.properties?.action_link) {
              console.error("generateLink failed", linkError);
              return;
            }
            const actionUrl = linkData.properties.action_link;
            const html = buildPurchaseConfirmationEmail({
              productName: params.productName,
              customerEmail: params.email,
              actionUrl,
            });
            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${resendKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "Andromeda Play <acesso@andromedaplay.com.br>",
                to: [params.email],
                subject: "Sua compra foi confirmada — acesse a Andromeda Play",
                html,
              }),
            });
            if (!res.ok) {
              const body = await res.text();
              console.error("Resend send failed", res.status, body);
            }
          } catch (e) {
            console.error("sendAccessEmail failed", e);
          }
        }

        async function grantAccess(orderId: string, paymentId: string | null, paidAtIso: string) {
          const { data: order } = await supabaseAdmin
            .from("orders")
            .select("id, course_id, buyer_email, buyer_id")
            .eq("id", orderId)
            .maybeSingle();
          if (!order) {
            console.error("Order not found", orderId);
            return;
          }

          await supabaseAdmin
            .from("orders")
            .update({
              status: "approved",
              mp_payment_id: paymentId,
              paid_at: paidAtIso,
            })
            .eq("id", order.id);

          // Ensure user exists
          let buyerId = order.buyer_id as string | null;
          let isNewUser = false;
          if (!buyerId) {
            const email = order.buyer_email.toLowerCase();
            let found: any = null;
            let page = 1;
            const perPage = 1000;
            while (true) {
              const { data: usersPage, error } = await supabaseAdmin.auth.admin.listUsers({
                page,
                perPage,
              });
              if (error) break;
              found = usersPage.users.find((u) => (u.email ?? "").toLowerCase() === email);
              if (found) break;
              if (usersPage.users.length < perPage) break;
              page++;
              if (page > 20) break;
            }
            if (!found) {
              const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
                email: order.buyer_email,
                email_confirm: true,
              });
              if (cErr) {
                console.error("createUser failed", cErr);
                return;
              }
              found = created.user;
              isNewUser = true;
            }
            buyerId = found.id;
            await supabaseAdmin.from("orders").update({ buyer_id: buyerId }).eq("id", order.id);
          }

          await supabaseAdmin
            .from("user_roles")
            .upsert({ user_id: buyerId!, role: "student" as any }, { onConflict: "user_id,role" });

          const { data: course } = await supabaseAdmin
            .from("courses")
            .select("title, access_duration_days")
            .eq("id", order.course_id)
            .maybeSingle();
          const expires_at = course?.access_duration_days
            ? new Date(Date.now() + course.access_duration_days * 86400 * 1000).toISOString()
            : null;

          await supabaseAdmin.from("enrollments").upsert(
            {
              student_id: buyerId!,
              course_id: order.course_id,
              status: "active",
              expires_at,
              created_by: buyerId!,
            },
            { onConflict: "course_id,student_id" },
          );

          if (isNewUser) {
            await sendAccessEmail({
              email: order.buyer_email,
              productName: course?.title ?? "sua compra",
              redirectTo: "https://andromedaplay.com.br/reset-password",
            });
          }
        }

        try {
          switch (event.type) {
            case "checkout.session.completed":
            case "checkout.session.async_payment_succeeded": {
              const s = event.data.object as any;
              if (s.payment_status !== "paid") break;
              const paidAtIso = new Date((event.created ?? Date.now() / 1000) * 1000).toISOString();
              const paymentId = (s.payment_intent as string) ?? null;
              let orderId: string | null = s.client_reference_id || s.metadata?.order_id || null;

              if (!orderId) {
                // External Payment Link: resolve course by stripe_price_id from line items.
                const email = s.customer_details?.email as string | undefined;
                if (!email) {
                  console.warn("Stripe external payment: no customer email", s.id);
                  break;
                }
                let priceId: string | null = null;
                try {
                  const items = await stripe.checkout.sessions.listLineItems(s.id, {
                    expand: ["data.price"],
                    limit: 10,
                  });
                  priceId = items.data[0]?.price?.id ?? null;
                } catch (e) {
                  console.error("listLineItems failed", e);
                  break;
                }
                if (!priceId) {
                  console.warn("Stripe external payment: no price id on session", s.id);
                  break;
                }
                const { data: course } = await supabaseAdmin
                  .from("courses")
                  .select("id")
                  .eq("stripe_price_id" as any, priceId)
                  .maybeSingle();
                if (!course) {
                  console.warn("Stripe external payment: no course matches price", priceId);
                  break;
                }
                const buyerName = (s.customer_details?.name as string | undefined) ?? null;
                const currency = (s.currency as string | undefined)?.toUpperCase() ?? "BRL";
                const amountCents = (s.amount_total as number | undefined) ?? 0;
                const { data: inserted, error: insErr } = await supabaseAdmin
                  .from("orders")
                  .insert({
                    course_id: course.id,
                    buyer_email: email,
                    buyer_name: buyerName,
                    amount_cents: amountCents,
                    currency,
                    status: "pending" as any,
                    mp_payment_id: paymentId,
                  })
                  .select("id")
                  .single();
                if (insErr || !inserted) {
                  console.error("failed to create external order", insErr);
                  break;
                }
                orderId = inserted.id;
              }

              await grantAccess(orderId!, paymentId, paidAtIso);
              break;
            }
            case "checkout.session.async_payment_failed":
            case "checkout.session.expired": {
              const s = event.data.object as any;
              const orderId = s.client_reference_id || s.metadata?.order_id;
              if (orderId) {
                await supabaseAdmin
                  .from("orders")
                  .update({
                    status: event.type === "checkout.session.expired" ? "cancelled" : "rejected",
                    mp_status_detail: event.type,
                  })
                  .eq("id", orderId);
              }
              break;
            }
            case "charge.refunded": {
              const ch = event.data.object as any;
              const paymentIntent = ch.payment_intent as string | null;
              if (paymentIntent) {
                const { data: order } = await supabaseAdmin
                  .from("orders")
                  .select("id, buyer_id, course_id")
                  .eq("mp_payment_id", paymentIntent)
                  .maybeSingle();
                if (order) {
                  await supabaseAdmin
                    .from("orders")
                    .update({ status: "refunded" })
                    .eq("id", order.id);
                  if (order.buyer_id) {
                    await supabaseAdmin
                      .from("enrollments")
                      .update({ status: "revoked" })
                      .eq("student_id", order.buyer_id)
                      .eq("course_id", order.course_id);
                  }
                }
              }
              break;
            }
            case "customer.subscription.created":
            case "customer.subscription.updated": {
              const sub = event.data.object as any;
              const orderId = sub.metadata?.order_id;
              const status = sub.status; // active, past_due, canceled, ...
              if (orderId) {
                await supabaseAdmin
                  .from("orders")
                  .update({ mp_status_detail: `subscription:${status}` })
                  .eq("id", orderId);
                if (status === "active") {
                  await grantAccess(
                    orderId,
                    (sub.latest_invoice as string) ?? null,
                    new Date().toISOString(),
                  );
                }
              }
              break;
            }
            case "customer.subscription.deleted": {
              const sub = event.data.object as any;
              const orderId = sub.metadata?.order_id;
              if (orderId) {
                const { data: order } = await supabaseAdmin
                  .from("orders")
                  .select("buyer_id, course_id")
                  .eq("id", orderId)
                  .maybeSingle();
                if (order?.buyer_id) {
                  await supabaseAdmin
                    .from("enrollments")
                    .update({ status: "revoked" })
                    .eq("student_id", order.buyer_id)
                    .eq("course_id", order.course_id);
                }
                await supabaseAdmin
                  .from("orders")
                  .update({ status: "cancelled", mp_status_detail: "subscription:deleted" })
                  .eq("id", orderId);
              }
              break;
            }
            default:
              // ignore other events
              break;
          }
        } catch (err) {
          console.error("Stripe webhook handler error", err);
          return new Response("handler_error", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
