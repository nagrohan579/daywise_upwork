# Stripe Setup Instructions

## Customer Portal Configuration

To fix the "No configuration provided" error when clicking "Manage Subscription":

1. Go to [Stripe Dashboard - Customer Portal Settings (Test Mode)](https://dashboard.stripe.com/test/settings/billing/portal)
2. Click "Activate test link" or "Activate link"
3. Configure the portal settings:
   - **Business information**: Add your business name and logo (optional)
   - **Subscription management**: Enable "Allow customers to cancel subscriptions"
   - **Payment method updates**: Enable "Allow customers to update payment methods"
   - **Invoice history**: Enable "Show invoice history"
4. Click "Save" or "Activate"

## Fixing Existing Prices in Stripe

If you're seeing incorrect prices ($0.10 instead of $10.00, $0.96 instead of $96.00):

### Option 1: Delete and Recreate (Recommended for Test Mode)

1. Go to [Stripe Dashboard - Products](https://dashboard.stripe.com/test/products)
2. Find the "Pro Plan" product
3. Delete the incorrect prices
4. Restart your backend server - it will automatically create new prices with correct amounts

### Option 2: Use API Endpoint to Sync Prices

The backend has an endpoint `/api/admin/sync-stripe-prices` (if you have admin access) that will recreate prices correctly.

### Option 3: Manual Fix in Stripe Dashboard

1. Go to the product in Stripe Dashboard
2. Edit the price
3. Update the amount to:
   - Monthly: $10.00 (or 1000 cents)
   - Yearly: $96.00 (or 9600 cents)
4. Save

## Important Notes

- Prices in Stripe must be in **cents** (smallest currency unit)
- $10.00 = 1000 cents
- $96.00 = 9600 cents
- The backend automatically creates prices with correct amounts on server startup if they don't exist
- Make sure your `STRIPE_SECRET_KEY` environment variable is set to your test key (starts with `sk_test_`)

## Webhook Configuration

Make sure your webhook endpoint is configured in Stripe:
1. Go to [Stripe Dashboard - Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the webhook signing secret and add it to your `.env` as `STRIPE_WEBHOOK_SECRET`

