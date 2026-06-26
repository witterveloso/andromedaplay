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
          event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
        } catch (err: any) {
          console.error("Stripe signature verification failed", err?.message);
          return new Response("invalid_signature", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

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
              try {
                await supabaseAdmin.auth.resetPasswordForEmail(order.buyer_email);
              } catch (e) {
                console.warn("password reset email failed", e);
              }
            }
            buyerId = found.id;
            await supabaseAdmin.from("orders").update({ buyer_id: buyerId }).eq("id", order.id);
          }

          await supabaseAdmin
            .from("user_roles")
            .upsert({ user_id: buyerId!, role: "student" as any }, { onConflict: "user_id,role" });

          const { data: course } = await supabaseAdmin
            .from("courses")
            .select("access_duration_days")
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
        }

        try {
          switch (event.type) {
            case "checkout.session.completed":
            case "checkout.session.async_payment_succeeded": {
              const s = event.data.object as any;
              const orderId = s.client_reference_id || s.metadata?.order_id;
              if (orderId && s.payment_status === "paid") {
                await grantAccess(
                  orderId,
                  (s.payment_intent as string) ?? null,
                  new Date((event.created ?? Date.now() / 1000) * 1000).toISOString(),
                );
              }
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
