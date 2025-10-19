# DayWise App - Setup Guide

This document explains the merged codebase structure and how to get it running.

## What Was Done

### Merged Codebases
Successfully merged two separate codebases:
1. **UI Code** - Clean, Bootstrap-based UI components and screens
2. **Replit Code** - Full-stack application with Express backend, database, and authentication

### Result
A unified React + Express application with:
- Tailwind CSS + shadcn/ui styling (modern approach)
- All UI screens and components from the original UI Code
- Complete backend functionality from Replit Code
- PostgreSQL database with Drizzle ORM
- Authentication (Email/Password + Google OAuth)
- Stripe payment integration
- Email notifications

## Project Structure

```
daywise-app/
├── client/                    # Frontend (React 18 + Tailwind)
│   ├── src/
│   │   ├── components/       # UI components (Header, Footer, Sidebar, etc.)
│   │   ├── pages/            # Page components (Home, Booking, Service, etc.)
│   │   │   ├── Home/
│   │   │   ├── Booking/
│   │   │   ├── Service/
│   │   │   ├── Availability/
│   │   │   ├── Branding/
│   │   │   ├── MyLink/
│   │   │   ├── Settings/
│   │   │   ├── Account/
│   │   │   ├── Billing/
│   │   │   ├── Login/
│   │   │   ├── Signup/
│   │   │   └── ...
│   │   ├── lib/              # Utilities (utils.ts, queryClient.ts, schemas)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── App.tsx           # Main app with routing
│   │   ├── main.tsx          # Entry point
│   │   └── index.css         # Tailwind styles
│   └── index.html
├── server/                    # Backend (Express + TypeScript)
│   ├── routes.ts             # API routes (auth, bookings, etc.)
│   ├── storage.ts            # Database queries
│   ├── email.ts              # SendGrid email service
│   ├── index.ts              # Server entry point
│   ├── db.ts                 # Database connection
│   ├── vite.ts               # Vite dev server integration
│   ├── lib/                  # Utilities (stripe, google-calendar, etc.)
│   └── security/             # Admin auth
├── shared/                    # Shared between client & server
│   └── schema.ts             # Drizzle database schema & Zod validation
├── public/                    # Static assets
│   ├── images/               # Images from both codebases
│   └── assets/               # Other assets
├── package.json              # Dependencies
├── vite.config.ts            # Vite configuration
├── tailwind.config.ts        # Tailwind CSS config
├── tsconfig.json             # TypeScript config
├── drizzle.config.ts         # Database config
└── .env.example              # Environment variables template
```

## Getting Started

### 1. Install Dependencies

```bash
cd daywise-app
npm install --legacy-peer-deps
```

Note: `--legacy-peer-deps` is used due to React version peer dependency requirements.

### 2. Set Up Environment Variables

**IMPORTANT**: The original Replit Code used Replit's Secrets feature to store environment variables (not `.env` files). You'll need to get these values from your client or the Replit project's Secrets section.

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Then fill in the following required variables (ask your client for the actual values from Replit Secrets):

```env
# Database (Required)
DATABASE_URL=postgresql://user:password@host:port/database

# Session (Required)
SESSION_SECRET=your-random-secret-key-here

# Email - SendGrid (Required for email notifications)
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com

# Google OAuth (Optional but recommended)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

# Stripe (Required for billing features)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Server
PORT=5000
NODE_ENV=development
```

### 3. Set Up Database

The application uses PostgreSQL. You can use:
- Local PostgreSQL
- Neon (recommended - serverless PostgreSQL)
- Any PostgreSQL hosting service

Once you have your database URL, push the schema:

```bash
npm run db:push
```

This will create all the necessary tables using Drizzle.

### 4. Run Development Server

```bash
npm run dev
```

The app will run on `http://localhost:5000`
- Frontend is served through Vite dev server
- Backend API is on the same port

### 5. Build for Production

```bash
npm run build
```

This creates:
- `/dist/public` - Frontend build
- `/dist/index.js` - Backend build

Run in production:
```bash
npm start
```

## Key Features

### Authentication
- Email/Password registration with email verification
- Google OAuth sign-in
- Password reset functionality
- Session-based authentication

### Booking System
- Create appointment types with custom durations
- Set availability schedules
- Block specific dates
- Accept bookings from customers
- Email confirmations and reminders

### Branding
- Custom colors
- Logo upload
- Business information
- Custom booking URLs (slugs)

### Billing
- Stripe integration
- Subscription plans (Free, Pro, etc.)
- Payment processing
- Subscription management

### Integrations
- Google Calendar sync
- SendGrid emails
- Stripe payments

## Available Routes

### Public Routes
- `/` - Landing page
- `/login` - Login page
- `/signup` - Sign up page
- `/terms` - Terms of service
- `/privacy-policy` - Privacy policy
- `/book/:slug` - Public booking page (for customers)

### Protected Routes (require login)
- `/booking` - View bookings
- `/service` - Manage appointment types
- `/availability` - Set availability
- `/branding` - Customize branding
- `/my-link` - Your booking link
- `/setting` - Settings
- `/account` - Account details
- `/billing` - Billing and subscriptions

## API Endpoints

See `server/routes.ts` for the complete list. Main endpoints:

### Authentication
- `POST /api/auth/signup` - Register
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/google` - Google OAuth
- `POST /api/auth/verify-email` - Verify email

### Bookings
- `GET /api/bookings` - Get user's bookings
- `POST /api/bookings` - Create booking
- `PATCH /api/bookings/:id` - Update booking
- `DELETE /api/bookings/:id` - Cancel booking

### Appointment Types
- `GET /api/appointment-types` - Get types
- `POST /api/appointment-types` - Create type
- `PATCH /api/appointment-types/:id` - Update type
- `DELETE /api/appointment-types/:id` - Delete type

### Availability
- `GET /api/availability` - Get availability
- `POST /api/availability` - Set availability
- `PATCH /api/availability/:id` - Update availability

### User/Settings
- `GET /api/user` - Get current user
- `PATCH /api/user` - Update user profile
- `PATCH /api/user/branding` - Update branding

### Billing
- `POST /api/stripe/checkout/start` - Start checkout
- `GET /api/stripe/subscription` - Get subscription
- `POST /api/stripe/subscription/cancel` - Cancel subscription

## Troubleshooting

### Port Already in Use
If port 5000 is in use, change it in `.env`:
```env
PORT=3000
```

### Database Connection Issues
- Check your DATABASE_URL is correct
- Ensure your database is running
- Check firewall/network settings

### Build Errors
If you get TypeScript errors:
```bash
npm run check
```

### Missing Dependencies
If components are missing:
```bash
npm install --legacy-peer-deps
```

## Next Steps

1. **Configure Environment** - Fill in all required environment variables
2. **Test Authentication** - Try signing up and logging in
3. **Set Up Stripe** - Configure Stripe for billing (if needed)
4. **Customize Branding** - Update the app branding for your use case
5. **Test Booking Flow** - Create appointment types and test booking

## Migration from Original Codebases

### From UI Code
- All screens copied to `client/src/pages/`
- Components copied to `client/src/components/`
- CSS files kept but can be gradually converted to Tailwind
- Images and assets preserved in `public/`

### From Replit Code
- Complete backend preserved
- Database schema unchanged
- API routes unchanged
- All integrations (Stripe, Google, SendGrid) working as before

### Changes Made
- Replaced wouter with react-router-dom
- React version downgraded to 18.3.1 for compatibility
- Removed Replit-specific plugins
- Merged dependencies into single package.json
- Unified build system

## Support

For issues or questions:
1. Check the logs in the terminal
2. Review environment variables in `.env`
3. Check the database connection
4. Verify all API keys are correct

## License

As per the original codebases.
