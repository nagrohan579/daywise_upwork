import Stripe from "stripe";

// Make Stripe optional for development
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "sk_test_dummy_key_for_dev";
export const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

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
    // Prices should already be in cents (e.g., 1000 = $10.00)
    // Log for debugging if price seems wrong
    if (plan.priceMonthly < 100) {
      console.warn(`⚠️ Warning: priceMonthly (${plan.priceMonthly}) seems low. Expected value in cents (e.g., 1000 for $10.00).`);
    }
    const p = await stripe.prices.create({
      unit_amount: plan.priceMonthly, 
      currency: "usd",
      recurring: { interval: "month" }, 
      product: product.id
    });
    console.log(`✅ Created monthly price: $${(plan.priceMonthly / 100).toFixed(2)} (${plan.priceMonthly} cents)`);
    out.monthly = p.id;
  }
  
  // Only create yearly price if needed and doesn't exist
  if (plan.priceYearly && !plan.stripePriceYearly) {
    // Prices should already be in cents (e.g., 9600 = $96.00)
    // Log for debugging if price seems wrong
    if (plan.priceYearly < 100) {
      console.warn(`⚠️ Warning: priceYearly (${plan.priceYearly}) seems low. Expected value in cents (e.g., 9600 for $96.00).`);
    }
    const p = await stripe.prices.create({
      unit_amount: plan.priceYearly, 
      currency: "usd",
      recurring: { interval: "year" }, 
      product: product.id
    });
    console.log(`✅ Created yearly price: $${(plan.priceYearly / 100).toFixed(2)} (${plan.priceYearly} cents)`);
    out.yearly = p.id;
  }
  
  return out;
}