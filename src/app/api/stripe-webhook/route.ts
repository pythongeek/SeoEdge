/**
 * Stripe Webhook
 * Handles subscription events
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key, { apiVersion: "2024-12-18.acacia" });
}

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(payload, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId = parseInt(session.subscription_data?.metadata?.workspaceId || "0");
        const tier = session.subscription_data?.metadata?.tier || "pro";

        if (workspaceId) {
          await db
            .update(workspaces)
            .set({
              tier: tier as any,
              subscriptionStatus: "active",
              stripeSubscriptionId: session.subscription as string,
              stripePriceId: session.line_items?.data[0]?.price?.id,
            })
            .where(eq(workspaces.id, workspaceId));
        }
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        const [ws] = await db
          .select()
          .from(workspaces)
          .where(eq(workspaces.stripeSubscriptionId, subscriptionId))
          .limit(1);

        if (ws) {
          await db
            .update(workspaces)
            .set({
              subscriptionStatus: "active",
              currentPeriodEnd: invoice.lines.data[0]?.period?.end
                ? new Date(invoice.lines.data[0].period.end * 1000)
                : undefined,
            })
            .where(eq(workspaces.id, ws.id));
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await db
          .update(workspaces)
          .set({ subscriptionStatus: "past_due" })
          .where(eq(workspaces.stripeSubscriptionId, invoice.subscription as string));
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await db
          .update(workspaces)
          .set({ tier: "free", subscriptionStatus: "canceled" })
          .where(eq(workspaces.stripeSubscriptionId, subscription.id));
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[Stripe Webhook] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
