# Environment Variables Setup

To properly configure the Google authentication flow, you need to set up the following environment variables in your backend:

## Required Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```bash
# Frontend URL - Update this to your frontend URL
FRONTEND_URL=http://localhost:5173

# Base URL for the backend (used for OAuth redirects)
BASE_URL=http://localhost:3000

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Session Secret (generate a random string)
SESSION_SECRET=your_session_secret_here

# Convex Configuration
CONVEX_DEPLOYMENT=your_convex_deployment_url_here

# Email Configuration (SendGrid)
SENDGRID_API_KEY=your_sendgrid_api_key_here

# Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here

# Node Environment
NODE_ENV=development
```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API and Google Calendar API
4. Go to "Credentials" and create OAuth 2.0 Client ID
5. Add the following authorized redirect URIs:
   - `http://localhost:3000/api/auth/google/callback` (for development)
   - `http://localhost:3000/api/google-calendar/callback` (for Google Calendar integration)
6. Copy the Client ID and Client Secret to your `.env` file

## Important Notes

- The `FRONTEND_URL` should point to your frontend development server (usually `http://localhost:5173`)
- The `BASE_URL` should point to your backend server (usually `http://localhost:3000`)
- Make sure to update these URLs for production deployment
- The Google OAuth flow now opens in a popup window and communicates with the parent window
- After successful authentication, users will be redirected to the dashboard

