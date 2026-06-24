import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Mercado Pago webhook (IPN / notifications).
 *
 * MP sends POSTs with a JSON body like:
 *   { "action": "payment.updated", "data": { "id": "<payment_id>" }, "type": "payment", ... }
 * Headers include:
 *   x-signature: "ts=1741010000,v1=<hmac-sha256-hex>"
 *   x-request-id: "<uuid>"
 *
 * Manifest signed by MP:
 *   "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
 * HMAC-SHA256(secret = MP_WEBHOOK_SECRET, manifest).
 *
 * After validating the signature we fetch the payment from MP's API, look up
 * the order by external_reference (= order id), update status, and on
 * approval grant access by inserting/updating an enrollment.
 */
export const Route = createFileRoute("/api/public/mp-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const accessToken = process.env.MP_ACCESS_TOKEN;
        const webhookSecret = process.env.MP_WEBHOOK_SECRET;
        if (!accessToken) return new Response("not_configured", { status: 503 });

        const rawBody = await request.text();
        let payload: any;
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return new Response("bad_json", { status: 400 });
        }

        // Validate signature when a secret is configured. If no secret is
        // configured, we accept and rely on payment lookup as the source of truth.
        if (webhookSecret) {
          const sigHeader = request.headers.get("x-signature") ?? "";
          const requestId = request.headers.get("x-request-id") ?? "";
          const parts = Object.fromEntries(
            sigHeader.split(",").map((p) => {
              const [k, ...rest] = p.split("=");
              return [k.trim(), rest.join("=").trim()];
            }),
          ) as Record<string, string>;
          const ts = parts.ts;
          const v1 = parts.v1;
          const dataId = payload?.data?.id ?? new URL(request.url).searchParams.get("data.id") ?? "";
          if (!ts || !v1 || !dataId) {
            return new Response("invalid_signature", { status: 401 });
          }
          const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
          const expected = createHmac("sha256", webhookSecret).update(manifest).digest("hex");
          const a = Buffer.from(v1, "utf8");
          const b = Buffer.from(expected, "utf8");
          if (a.length !== b.length || !timingSafeEqual(a, b)) {
            return new Response("invalid_signature", { status: 401 });
          }
        }

        // Only process payment notifications
        const type = payload?.type ?? payload?.topic;
        const paymentId = payload?.data?.id ?? new URL(request.url).searchParams.get("data.id");
        if (type !== "payment" || !paymentId) {
          // Acknowledge other notifications so MP stops retrying
          return new Response("ignored", { status: 200 });
        }

        // Fetch payment detail
        const paymentResp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!paymentResp.ok) {
          console.error("MP payment fetch failed", paymentResp.status, await paymentResp.text());
          return new Response("payment_fetch_failed", { status: 502 });
        }
        const payment = (await paymentResp.json()) as {
          id: number | string;
          status: string;
          status_detail?: string;
          external_reference?: string;
          payer?: { email?: string; first_name?: string; last_name?: string };
          date_approved?: string | null;
        };

        const orderId = payment.external_reference;
        if (!orderId) return new Response("no_external_reference", { status: 200 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Map MP status → our enum
        const status =
          payment.status === "approved"
            ? "approved"
            : payment.status === "rejected" || payment.status === "cancelled"
            ? "rejected"
            : payment.status === "refunded" || payment.status === "charged_back"
            ? "refunded"
            : "pending";

        const { data: order, error: ordErr } = await supabaseAdmin
          .from("orders")
          .select("id, course_id, buyer_email, buyer_id, status")
          .eq("id", orderId)
          .maybeSingle();
        if (ordErr || !order) {
          console.error("Order not found for webhook", orderId, ordErr);
          return new Response("order_not_found", { status: 200 });
        }

        await supabaseAdmin
          .from("orders")
          .update({
            status,
            mp_payment_id: String(payment.id),
            mp_status_detail: payment.status_detail ?? null,
            paid_at: status === "approved" ? payment.date_approved ?? new Date().toISOString() : null,
          })
          .eq("id", order.id);

        // On approval: ensure user exists, then grant enrollment
        if (status === "approved") {
          let buyerId = order.buyer_id as string | null;

          if (!buyerId) {
            // Find or create user by email
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
              const fullName =
                [payment.payer?.first_name, payment.payer?.last_name].filter(Boolean).join(" ") ||
                order.buyer_email;
              const { data: created, error: createErr } =
                await supabaseAdmin.auth.admin.createUser({
                  email: order.buyer_email,
                  email_confirm: true,
                  user_metadata: { full_name: fullName },
                });
              if (createErr) {
                console.error("Failed to create user", createErr);
                return new Response("user_create_failed", { status: 500 });
              }
              found = created.user;

              // Trigger password setup email
              try {
                await supabaseAdmin.auth.resetPasswordForEmail(order.buyer_email);
              } catch (e) {
                console.warn("Could not send password reset email", e);
              }
            }
            buyerId = found.id;
            await supabaseAdmin.from("orders").update({ buyer_id: buyerId }).eq("id", order.id);
          }

          // Ensure student role
          await supabaseAdmin
            .from("user_roles")
            .upsert({ user_id: buyerId!, role: "student" as any }, { onConflict: "user_id,role" });

          // Compute expiry from course's access_duration_days
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

        return new Response("ok", { status: 200 });
      },
    },
  },
});
