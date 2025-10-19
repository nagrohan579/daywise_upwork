import Stripe from "stripe";
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

export async function ensureStripePrices(plan: {
  id: string; name: string;
  priceMonthly?: number | null; priceYearly?: number | null;
  stripePriceMonthly?: string | null; stripePriceYearly?: string | null;
}) {
  // Check for existing product first using metadata lookup
  let product: Stripe.Product;
  const existingProducts = await stripe.products.search({
    query: `metadata[\'app_plan_id\']:\'${plan.id}\'`,
    limit: 1
  });
  
  if (existingProducts.data.length > 0) {
    product = existingProducts.data[0];
  } else {
    // Create new product only if none exists
    product = await stripe.products.create({
      name: plan.name, 
      metadata: { app_plan_id: plan.id }
    });
  }

  const out: { monthly?: string; yearly?: string } = {};
  
  // Only create monthly price if needed and doesn't exist
  if (plan.priceMonthly && !plan.stripePriceMonthly) {
    const p = await stripe.prices.create({
      unit_amount: plan.priceMonthly, 
      currency: "usd",
      recurring: { interval: "month" }, 
      product: product.id
    });
    out.monthly = p.id;
  }
  
  // Only create yearly price if needed and doesn't exist
  if (plan.priceYearly && !plan.stripePriceYearly) {
    const p = await stripe.prices.create({
      unit_amount: plan.priceYearly, 
      currency: "usd",
      recurring: { interval: "year" }, 
      product: product.id
    });
    out.yearly = p.id;
  }
  
  return out;
}