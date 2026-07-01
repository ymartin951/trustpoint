# TrustPoint Dating

A modern, full-stack dating and matchmaking platform focused on serious relationships and marriage.

## Features

### Authentication
- Email/password signup and login
- Secure session handling with Supabase Auth
- Multi-step onboarding process

### User Profiles
- Comprehensive profile creation
- Profile photo upload
- Multiple photo gallery
- Profile verification system
- Edit profile information

### Matching System
- Smart discovery with filters (age, location, religion, relationship goal)
- Like/skip functionality
- Mutual matching system
- Daily like limits for free users

### Real-time Messaging
- Instant messaging between matched users
- Real-time message updates using Supabase Realtime
- Conversation history
- Unread message indicators

### Premium Features
- Free Plan: 10 likes per day, basic features
- Premium Plan: Unlimited likes, see who liked you, profile boost

### Safety & Moderation
- User blocking system
- Report inappropriate users
- Admin dashboard for moderation
- User verification system
- Row-level security policies

### Admin Dashboard
- User management (ban, verify users)
- View and manage reports
- Platform statistics
- Content moderation tools

## Tech Stack

### Frontend
- React 18
- TypeScript
- TailwindCSS
- React Router
- Lucide React (icons)

### Backend
- Supabase (PostgreSQL)
- Supabase Authentication
- Supabase Storage
- Supabase Realtime

### Deployment
- Ready for Vercel or Netlify deployment

## Database Schema

### Tables
- `users` - User profiles and account information
- `photos` - User photo gallery
- `likes` - User likes tracking
- `matches` - Mutual matches
- `messages` - Chat messages
- `reports` - User reports for moderation
- `subscriptions` - Premium subscription management
- `blocks` - Blocked users
- `daily_likes` - Daily like quota tracking

### Security
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Only matched users can message each other
- Admin-specific policies for moderation

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Environment variables are already configured in `.env`

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── DashboardLayout.tsx
│   ├── ProtectedRoute.tsx
│   └── ReportModal.tsx
├── context/            # React context providers
│   └── AuthContext.tsx
├── lib/                # Utility functions and configs
│   ├── database.types.ts
│   ├── supabase.ts
│   └── utils.ts
├── pages/              # Application pages
│   ├── Admin.tsx
│   ├── Discover.tsx
│   ├── Landing.tsx
│   ├── Login.tsx
│   ├── Matches.tsx
│   ├── Messages.tsx
│   ├── Profile.tsx
│   ├── Settings.tsx
│   └── Signup.tsx
└── services/           # API service layers
    ├── adminService.ts
    ├── matchService.ts
    ├── messageService.ts
    ├── safetyService.ts
    ├── subscriptionService.ts
    └── userService.ts
```

## Key Features Implementation

### Matching Logic
When a user likes another user, the system checks for mutual likes. If both users have liked each other, a match is automatically created using a database trigger.

### Real-time Messaging
Messages are delivered in real-time using Supabase Realtime subscriptions. The system listens for new messages and updates the UI instantly.

### Premium Subscription
Free users are limited to 10 likes per day. Premium users have unlimited likes and access to additional features like seeing who liked them.

### Safety Features
Users can block and report other users. Admins can review reports, ban users, and verify profiles through the admin dashboard.

## Deployment

### Environment Variables
The following environment variables are required:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

### Deploy to Vercel
```bash
npm run build
# Deploy the dist folder to Vercel
```

### Deploy to Netlify
```bash
npm run build
# Deploy the dist folder to Netlify
```

## License

This project is built for demonstration purposes.
