# DayWise App

A smart scheduling application built with React, Express, and PostgreSQL.

## Features

- User authentication (Email/Password and Google OAuth)
- Appointment scheduling and booking
- Availability management
- Service/appointment type configuration
- Branding customization
- Billing and subscriptions (Stripe integration)
- Email notifications
- Google Calendar integration

## Tech Stack

### Frontend
- React 19
- React Router DOM
- TanStack Query (React Query)
- Tailwind CSS
- shadcn/ui components
- Radix UI primitives
- FullCalendar
- Vite

### Backend
- Express.js
- TypeScript
- Drizzle ORM
- PostgreSQL (Neon)
- Passport.js (authentication)
- Stripe (payments)
- SendGrid (email)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or Neon account)
- SendGrid account (for emails)
- Stripe account (for payments)
- Google OAuth credentials (optional)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy the environment template:
```bash
cp .env.example .env
```

3. Fill in your environment variables in `.env`

4. Push the database schema:
```bash
npm run db:push
```

### Development

Run the development server (includes both frontend and backend):

```bash
npm run dev
```

The application will be available at `http://localhost:5000`

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
daywise-app/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components (routes)
│   │   ├── lib/           # Utilities and helpers
│   │   ├── hooks/         # Custom React hooks
│   │   ├── App.tsx        # Main app component with routes
│   │   ├── main.tsx       # App entry point
│   │   └── index.css      # Global styles
│   └── index.html
├── server/                # Backend Express application
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Database queries
│   ├── email.ts           # Email service
│   ├── index.ts           # Server entry point
│   └── lib/               # Server utilities
├── shared/                # Shared code between client and server
│   └── schema.ts          # Database schema and types
├── public/                # Static assets
└── package.json

```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run check` - TypeScript type checking
- `npm run db:push` - Push database schema changes

## Environment Variables

See `.env.example` for all required environment variables.

## Notes

This project merges the UI from the original "UI Code" codebase with the backend functionality from the "Replit Code" codebase, creating a unified full-stack application.
