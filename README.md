# DayWise - Smart Booking Application

A comprehensive full-stack booking application designed for Canva websites, enabling businesses to manage appointments, services, and customer bookings.

> **⚠️ Project Structure Update (2025):** This project uses a monorepo architecture with separate `frontend/`, `backend/`, and `convex/` directories for independent deployment.

## Overview

DayWise is a scheduling platform that integrates with Canva, Stripe, SendGrid, and Google Calendar to provide a complete appointment booking solution for businesses.

**Status**: Active Development - Monorepo architecture with Convex database

## Recent updates (October 2025)

- ✅ Authentication: Signup and login with Google OAuth are implemented and verified.
- ✅ Google Calendar: Users can connect their Google account and sync operations are working (connect/disconnect flows are implemented).
- ✅ Bookings: Creating, updating, and deleting appointments works end-to-end. Changes persist in Convex and (when connected) are synchronized to Google Calendar.


## Features

### Core Functionality
- 📅 **Appointment Scheduling** - Customer-facing booking interface
- 🎨 **Canva Integration** - In-editor configuration panel
- 💳 **Stripe Payments** - Subscription plans and service payments
- 📧 **Email Notifications** - SendGrid-powered confirmations and reminders
- 🔐 **Authentication** - Email/password + Google OAuth
- 📊 **Dashboard** - Business owner interface with 8 management tabs
- 👤 **Admin Panel** - Platform oversight and subscription management
- 📱 **Responsive Design** - Mobile-friendly UI

### User Interfaces
1. **Public Booking Page** - Customer appointment scheduling
2. **Dashboard** - Business owner management (8 tabs):
   - Bookings
   - Services
   - Availability
   - Branding
   - My Link
   - Settings
   - Account
   - Billing
3. **Canva Panel** - In-editor configuration
4. **Admin Panel** - Platform management

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** - Build tool & dev server
- **React Router DOM** - Client-side routing
- **TanStack Query v5** - Server state management
- **React Hook Form + Zod** - Form validation
- **Tailwind CSS + shadcn/ui** - Styling & components
- **Radix UI** - Accessible primitives
- **FullCalendar** - Calendar views
- **Lucide React** - Icons

### Backend
- **Node.js** with Express.js
- **TypeScript** (tsx runtime)
- **Express Session** - Session management
- **Passport.js** - Authentication
- **Bcrypt** - Password hashing
- **Multer** - File uploads
- **Helmet** - Security headers
- **Express Rate Limit** - API protection

### Database
- **Convex** - Real-time cloud database with type safety

### Third-Party Services
- **Stripe** - Billing & payments
- **SendGrid** - Transactional emails
- **Google OAuth 2.0** - Authentication
- **Google Calendar API** - Calendar sync
- **Canva Apps SDK** - Canva integration

## Project Structure

**Monorepo Architecture** - Frontend and backend are now separated for independent deployment:

```
daywise-app/
├── frontend/                 # React Frontend (Deploy to Vercel)
│   ├── src/
│   │   ├── pages/           # Page components
│   │   │   ├── Home/
│   │   │   ├── Login/
│   │   │   ├── Signup/
│   │   │   ├── Booking/
│   │   │   ├── Service/
│   │   │   ├── Availability/
│   │   │   ├── Branding/
│   │   │   ├── MyLink/
│   │   │   ├── Settings/
│   │   │   ├── Account/
│   │   │   ├── Billing/
│   │   │   └── ...
│   │   ├── components/      # Reusable components
│   │   │   ├── ui/         # shadcn/ui components
│   │   │   └── layout/     # Layout components
│   │   ├── lib/            # Utilities & validation schemas
│   │   ├── hooks/          # Custom React hooks
│   │   ├── App.tsx         # Main app with routing
│   │   ├── main.tsx        # Entry point
│   │   └── index.css       # Tailwind styles
│   ├── public/             # Static assets (images, etc.)
│   ├── index.html
│   ├── package.json        # Frontend dependencies only
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── backend/                 # Express Backend (Deploy to DigitalOcean VPS)
│   ├── lib/                # Server utilities
│   │   ├── features.ts
│   │   ├── stripe.ts
│   │   ├── google-calendar.ts
│   │   ├── slug.ts
│   │   └── plan-features.ts
│   ├── security/
│   │   └── adminAuth.ts
│   ├── public/uploads/     # Uploaded files
│   ├── email.ts           # SendGrid email service
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Convex database queries
│   ├── schemas.ts         # Zod validation schemas
│   ├── package.json       # Backend dependencies only
│   ├── tsconfig.json
│   └── .env               # Backend environment variables
│
├── convex/                 # Convex Database (Deploy separately)
│   ├── schema.ts          # Database schema
│   ├── users.ts           # User mutations/queries
│   ├── bookings.ts        # Booking mutations/queries
│   └── ...
│
└── Root Configuration
    ├── package.json        # Monorepo scripts
    ├── README.md           # This file
    └── .gitignore
```

### Deployment Architecture

```
┌──────────────────────────────────────────┐
│           GitHub Repository              │
│  (frontend/ + backend/ + convex/)       │
└─────────┬──────────────┬─────────────┬──┘
          │              │             │
    ┌─────▼─────┐  ┌────▼──────┐  ┌──▼────────┐
    │  Vercel   │  │ DigitalOcean│ │  Convex   │
    │ (Frontend)│  │  (Backend)  │ │(Database) │
    │Port 80/443│  │  Port 3000  │ │Cloud-based│
    └─────┬─────┘  └─────┬───────┘ └──┬────────┘
          │              │             │
          └──────────────┴─────────────┘
                     │
          ┌──────────▼─────────────┐
          │  External Services     │
          │  • Stripe (Payments)   │
          │  • SendGrid (Emails)   │
          │  • Google (OAuth/Cal)  │
          │  • Canva Apps SDK      │
          └────────────────────────┘
```


## Getting Started

### Prerequisites
- Node.js 18+
- Convex account (for database)
- Stripe account (for payments)
- SendGrid account (for emails)
- Google OAuth credentials (optional)
- Canva Developer account (for Canva integration)

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd daywise-app

   # Install frontend dependencies
   cd frontend
   npm install

   # Install backend dependencies
   cd ../backend
   npm install

   # Return to root
   cd ..
   ```

2. **Set up environment variables:**

   Create `.env` file in `backend/` directory:
   ```env
   # Convex Database
   CONVEX_DEPLOYMENT=prod:your-deployment-name
   CONVEX_URL=https://your-deployment.convex.cloud

   # Session
   SESSION_SECRET=your-random-32-character-secret-key

   # Server
   NODE_ENV=development
   PORT=3000

   # Stripe (optional)
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...

   # SendGrid (optional)
   SENDGRID_API_KEY=SG....
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com

   # Google OAuth (optional)
   GOOGLE_CLIENT_ID=...apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
   ```

3. **Set up Convex database:**
   ```bash
   # From root directory
   npx convex dev
   ```

   This will:
   - Initialize Convex deployment
   - Generate schema types
   - Start Convex dev server

4. **Run development servers:**

   You need **2 separate terminals**:

   **Terminal 1 - Frontend Dev Server:**
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend runs at `http://localhost:5173`

   **Terminal 2 - Backend API Server:**
   ```bash
   cd backend
   npm run dev
   ```
   Backend runs at `http://localhost:3000`

5. **Deploy Convex changes (when needed):**
   ```bash
   # From root directory
   npx convex deploy -y
   ```

6. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - Convex Dashboard: https://dashboard.convex.dev

### Building for Production

**Frontend (for Vercel):**
```bash
cd frontend
npm run build
# Output: frontend/dist/
```

**Backend (for DigitalOcean VPS):**
```bash
cd backend
npm run build
# Output: backend/dist/
npm start  # Runs production build
```

## Database Architecture

See [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md) for complete schema documentation.

### Core Tables (14 total)
- **users** - User accounts & profiles
- **bookings** - Appointments
- **appointmentTypes** - Service types
- **availability** - Weekly hours (legacy)
- **availabilityPatterns** - Advanced schedules
- **availabilityExceptions** - Date-specific overrides
- **subscriptionPlans** - Pricing tiers
- **userSubscriptions** - User subscriptions
- **branding** - Custom colors/logos
- **notifications** - In-app notifications
- **feedback** - User feedback
- **googleCalendarCredentials** - OAuth tokens
- And more...

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/google` - Google OAuth
- `POST /api/auth/verify-email` - Verify email

### Bookings
- `GET /api/bookings` - List bookings
- `POST /api/bookings` - Create booking
- `PATCH /api/bookings/:id` - Update booking
- `DELETE /api/bookings/:id` - Cancel booking

### Services (Appointment Types)
- `GET /api/appointment-types` - List services
- `POST /api/appointment-types` - Create service
- `PATCH /api/appointment-types/:id` - Update service
- `DELETE /api/appointment-types/:id` - Delete service

### Availability
- `GET /api/availability` - Get availability
- `POST /api/availability` - Set availability
- `PATCH /api/availability/:id` - Update availability

### Billing (Stripe)
- `POST /api/stripe/checkout/start` - Start checkout
- `GET /api/stripe/subscription` - Get subscription
- `POST /api/stripe/subscription/cancel` - Cancel subscription
- `POST /api/stripe/webhook` - Stripe webhooks

See `backend/routes.ts` for complete API documentation.

## Development Status

### ✅ Phase 1: Frontend Development (COMPLETE)
- Fully functional, responsive React frontend
- All UI routes and components
- Form validation and state management
- Tailwind CSS + shadcn/ui styling

### ✅ Phase 2: Database Setup (COMPLETE)
- Convex real-time database fully integrated
- User authentication and session management
- Email verification with SendGrid

### ✅ Phase 3: Backend Integration (COMPLETED)
- ✅ User signup and authentication
- ✅ SendGrid email integration
- ✅ Account and Settings page data fetching
- ✅ Google Calendar sync (connect/disconnect, event create/update/delete)
- ✅ Complete booking flow (create/update/delete bookings synced with Convex and Google Calendar)
- ⏳ Stripe payments

### ⏳ Phase 4: Canva SDK Integration
- Canva Developer Portal registration
- Manifest.json setup
- In-editor embed experience
- App listing

### ⏳ Phase 5: Testing & Deployment
- End-to-end testing
- Production deployment
- Performance optimization

### ⏳ Phase 6: Admin Panel
- User management
- Booking analytics
- Revenue tracking
- Reporting tools

## Remaining Tasks

### High Priority
- [ ] Feedback tab UI
- [ ] Notifications popup/dropdown
- [ ] Payments page enhancements (invoices, history)
- [ ] Booking confirmation details page
- [ ] Price field in service modal
- [ ] Buffer time inputs (before/after)

### Medium Priority
- [ ] Calendar layout improvements
- [ ] Sidebar/menu completion
- [ ] Admin navigation items
- [ ] Mobile responsiveness refinements

## Environment Variables

See `.env.example` for template. Key variables:

**Required:**
- `DATABASE_URL` or `CONVEX_DEPLOYMENT` - Database connection
- `SESSION_SECRET` - Session encryption key
- `NODE_ENV` - Environment (development/production)

**Optional but Recommended:**
- `SENDGRID_API_KEY` - Email notifications
- `GOOGLE_CLIENT_ID` - Google OAuth
- `GOOGLE_CLIENT_SECRET` - Google OAuth
- `STRIPE_SECRET_KEY` - Payments
- `STRIPE_PUBLISHABLE_KEY` - Payments (frontend)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhooks

## Deployment

### Architecture Overview

This project uses a **hybrid deployment strategy**:

1. **Frontend** → Vercel (Free tier, CDN, auto-scaling)
2. **Backend** → DigitalOcean VPS (Always-on server for webhooks, background jobs)
3. **Database** → Convex (Managed real-time database)

### Frontend Deployment (Vercel)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Your message"
   git push origin main
   ```

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Set **Root Directory** to `frontend`
   - Framework preset: Vite
   - Build command: `npm run build`
   - Output directory: `dist`
   - Deploy

3. **Environment variables (Vercel):**
   - Add in Vercel dashboard under Settings → Environment Variables
   - `VITE_API_URL=https://your-backend-domain.com` (your DigitalOcean backend URL)
   - `VITE_CONVEX_URL=https://your-deployment.convex.cloud`

### Backend Deployment (DigitalOcean VPS)

1. **SSH into your VPS:**
   ```bash
   ssh root@your-vps-ip
   ```

2. **Clone repository:**
   ```bash
   git clone https://github.com/yourusername/daywise-app.git
   cd daywise-app/backend
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Set up environment variables:**
   ```bash
   nano .env
   # Add all backend environment variables
   ```

5. **Build and start:**
   ```bash
   npm run build
   npm start
   ```

6. **Set up PM2 for process management:**
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name daywise-backend
   pm2 save
   pm2 startup
   ```

7. **Set up Nginx reverse proxy:**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Convex Deployment

1. **Deploy from root directory:**
   ```bash
   npx convex deploy
   ```

2. **Note your deployment URL** (needed for frontend and backend .env files)

### Why This Architecture?

- **Vercel (Frontend)**: Free, fast CDN, automatic scaling, perfect for React apps
- **DigitalOcean VPS (Backend)**: Always-on server needed for:
  - Stripe webhook endpoints (must be publicly accessible)
  - Email reminder background jobs (run every 10 minutes)
  - Session management
  - File uploads
- **Convex (Database)**: Real-time updates, managed infrastructure, easy account switching

## Documentation

- [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md) - Complete database schema
- [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md) - Deployment guide

## Codebase History

This application was created by merging two separate codebases:
1. **UI Code** - Clean Bootstrap-based UI components and screens
2. **Replit Code** - Full-stack application with backend, database, and integrations

The merged version uses:
- UI design and components from UI Code
- Backend functionality from Replit Code
- Modern Tailwind CSS + shadcn/ui styling
- React Router DOM for routing

## Contributing

This is a client project. Changes should be coordinated with the project owner.

## License

Proprietary - Client project for DayWise

## Support

For issues or questions, refer to:
1. Server logs in terminal
2. Environment variable configuration
3. Database connection status
4. API key validation

---

## Admin System

### Overview

DayWise includes a built-in admin system for platform management and oversight. The admin panel is separate from the regular user dashboard and provides system-wide access to users, bookings, and statistics.

### Automatic Admin User Creation

The admin user is **automatically created** when the backend server starts for the first time. The initialization process:

1. Checks if an admin user already exists in the database
2. If no admin exists, creates a new admin user with:
   - Email: `admin@daywise.app`
   - Password: `admin123` (hashed with bcrypt)
   - Full admin privileges (`isAdmin: true`)
   - No email verification required
3. Logs the default credentials to the console

**Backend Location**: `/backend/lib/admin-init.ts`

**Initialization Logs**: When the backend starts, you'll see:
```
Checking for admin user...
Creating default admin user...
Admin user created successfully: admin@daywise.app
⚠️  Default password: admin123
⚠️  Please change the admin password after first login!
```

### Default Admin Credentials

**Email**: `admin@daywise.app`
**Password**: `admin123`

⚠️ **IMPORTANT**: Change these credentials in production! The default password is only for initial setup.

### Accessing the Admin Panel

1. **Login Page**: Navigate to `/admin/login` in your browser
   - Development: `http://localhost:5173/admin/login`
   - Production: `https://your-domain.com/admin/login`

2. **Login Form**: Simple, clean interface with:
   - Email field
   - Password field
   - Sign in button
   - No Google OAuth
   - No signup link
   - No email verification UI

3. **After Login**: Successfully authenticated admins are redirected to `/admin/dashboard`

### Admin Dashboard

**Route**: `/admin/dashboard`

The admin dashboard provides:

#### Dashboard Features
- **Welcome Card**: Overview and system information
- **Statistics Cards**:
  - Total Users
  - Total Bookings
  - Active Subscriptions
- **Management Sections** (placeholders for future features):
  - User Management
  - Booking Management
  - System Settings
- **Logout Button**: End admin session

#### Session Verification
The dashboard automatically verifies the admin session on load. If the user is not logged in or doesn't have admin privileges, they're redirected back to `/admin/login`.

### Security Features

1. **Password Hashing**: Admin passwords are hashed with bcrypt (10 salt rounds)
2. **Session-Based Authentication**: Uses Express sessions with secure cookies
3. **Admin Privilege Check**: All admin endpoints verify `isAdmin` flag
4. **No Email Verification**: Admin accounts don't require email verification
5. **Separate Login Flow**: Admin login is isolated from regular user login

### API Endpoints

#### Admin Login
```
POST /api/admin/login
```
**Request Body**:
```json
{
  "email": "admin@daywise.app",
  "password": "admin123"
}
```
**Response**:
```json
{
  "message": "Admin login successful",
  "user": {
    "id": "...",
    "email": "admin@daywise.app",
    "name": "Admin",
    "isAdmin": true
  }
}
```

#### Admin Stats
```
GET /api/admin/stats
```
**Authentication**: Requires admin session

**Response**:
```json
{
  "totalUsers": 42,
  "totalBookings": 128,
  "activeSubscriptions": 15
}
```

### Customizing Admin Credentials

You can customize the default admin credentials using environment variables in your `backend/.env` file:

```env
# Admin Configuration (Optional)
ADMIN_EMAIL=your-admin@yourdomain.com
ADMIN_PASSWORD=your-secure-password-here
ADMIN_NAME=Administrator
```

If not specified, the system uses these defaults:
- Email: `admin@daywise.app`
- Password: `admin123`
- Name: `Admin`

**Note**: Changes to environment variables only affect NEW admin user creation. If an admin already exists in the database, updating these variables won't change the existing admin credentials.

### File Structure

```
frontend/src/pages/Admin/
├── AdminLogin.jsx         # Admin login page
├── AdminLogin.css         # Login page styles
├── AdminDashboard.jsx     # Admin dashboard
└── AdminDashboard.css     # Dashboard styles

backend/
├── lib/
│   └── admin-init.ts      # Admin user initialization
└── routes.ts              # Admin login and stats endpoints (lines 919-1008)
```

### Routes Configuration

Routes are configured in `frontend/src/App.tsx`:
```javascript
<Route path="/admin/login" element={<AdminLogin />} />
<Route path="/admin/dashboard" element={<AdminDashboard />} />
```

### Database Schema

The admin flag is stored in the `users` table in Convex:

```typescript
users: defineTable({
  // ... other fields
  isAdmin: v.boolean(),  // Admin privilege flag
  password: v.optional(v.string()),  // Hashed password
  emailVerified: v.boolean(),  // Skip verification for admin
  // ... other fields
})
```

### Troubleshooting

**Issue**: Admin user not created on startup
**Solution**: Check backend logs for errors. Ensure Convex database connection is working.

**Issue**: Can't login with default credentials
**Solution**:
1. Check if admin user exists in Convex dashboard
2. Verify backend logs show "Admin user created successfully"
3. Clear browser cache/cookies
4. Try restarting the backend server

**Issue**: Redirected from dashboard to login
**Solution**: Check session configuration. Ensure `SESSION_SECRET` is set in backend `.env` file.

**Issue**: Stats not loading on dashboard
**Solution**: Check browser console for API errors. Verify backend is running and admin session is active.

### Production Deployment Notes

1. **Change Default Password**: Update `ADMIN_PASSWORD` environment variable before deploying to production
2. **Secure Sessions**: Ensure `SESSION_SECRET` is a strong, random value
3. **HTTPS Required**: Admin endpoints should only be accessed over HTTPS in production
4. **IP Allowlist**: Consider adding IP restrictions for admin endpoints in production (see `backend/security/adminAuth.ts` for HTTP Basic Auth middleware)

### Future Enhancements

The admin system is designed to be extensible. Planned features include:
- User management (view, edit, delete users)
- Booking management (view all bookings, cancel, reschedule)
- System settings (global configuration)
- Analytics and reporting
- Audit logs
- Role-based access control

---

**Last Updated**: October 2025
