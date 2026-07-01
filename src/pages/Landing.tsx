import { Link } from "react-router-dom";
import {
  Heart,
  Shield,
  Users,
  MessageCircle,
  CheckCircle,
  BadgeCheck,
  Wallet,
  Gift,
  Sparkles,
  Lock,
  Zap,
  CreditCard,
  UserCheck,
  ArrowRight,
} from "lucide-react";

export const Landing = () => {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 p-2 shadow-sm">
                <Heart className="h-6 w-6 text-white" fill="white" />
              </div>

              <span className="text-xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent sm:text-2xl">
                TrustPoint Dating
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="rounded-lg px-4 py-2 font-medium text-gray-700 transition hover:text-rose-600"
              >
                Sign In
              </Link>

              <Link
                to="/signup"
                className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:from-rose-600 hover:to-pink-700"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden bg-gradient-to-br from-rose-50 via-white to-pink-50 py-20 sm:py-24">
        <div className="absolute left-10 top-20 h-32 w-32 rounded-full bg-rose-200/40 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-40 w-40 rounded-full bg-pink-200/50 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-rose-100 bg-white px-4 py-2 text-sm font-medium text-rose-600 shadow-sm">
              <BadgeCheck className="h-4 w-4" />
              Ghana-focused dating built on trust and verification
            </div>

            <h1 className="mb-6 text-5xl font-bold leading-tight text-gray-900 md:text-7xl">
              Meet Real People.
              <br />
              Build Real Connections.
              <br />
              <span className="bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                Date With Trust.
              </span>
            </h1>

            <p className="mx-auto mb-8 max-w-2xl text-lg leading-8 text-gray-600 sm:text-xl">
              TrustPoint Dating helps serious singles connect through verified
              profiles, smart matching, secure chat, and a credit-based system
              designed for meaningful conversations.
            </p>

            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition hover:from-rose-600 hover:to-pink-700"
              >
                Create Free Account
                <ArrowRight className="h-5 w-5" />
              </Link>

              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-2xl border-2 border-gray-200 bg-white px-8 py-4 text-lg font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Sign In
              </Link>
            </div>

            <div className="mt-10 grid gap-4 text-left sm:grid-cols-3">
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <BadgeCheck className="h-5 w-5" />
                </div>
                <p className="font-semibold text-gray-900">Verified Badge</p>
                <p className="mt-1 text-sm text-gray-500">
                  Users can verify with ID and selfie review.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <p className="font-semibold text-gray-900">Real-Time Chat</p>
                <p className="mt-1 text-sm text-gray-500">
                  Chat instantly after matching with someone.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Wallet className="h-5 w-5" />
                </div>
                <p className="font-semibold text-gray-900">Credit Wallet</p>
                <p className="mt-1 text-sm text-gray-500">
                  Buy credits and use them for text or image messages.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <p className="mb-3 font-semibold text-rose-600">
              Why TrustPoint stands out
            </p>

            <h2 className="mb-4 text-4xl font-bold text-gray-900">
              Built for trust, safety, and serious connections
            </h2>

            <p className="mx-auto max-w-2xl text-lg text-gray-600">
              TrustPoint is not just another dating app. It combines verification,
              safety controls, real-time communication, and monetization features
              into one strong platform.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-3xl bg-gradient-to-br from-rose-50 to-pink-50 p-8">
              <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600">
                <Shield className="h-8 w-8 text-white" />
              </div>

              <h3 className="mb-3 text-xl font-bold text-gray-900">
                Identity Verification
              </h3>

              <p className="leading-7 text-gray-600">
                Users can upload Ghana Card, Passport, Driver’s License, or NHIS
                card with selfie verification. Admin reviews each request before
                approval.
              </p>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-rose-50 to-pink-50 p-8">
              <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600">
                <Users className="h-8 w-8 text-white" />
              </div>

              <h3 className="mb-3 text-xl font-bold text-gray-900">
                Smart Matching
              </h3>

              <p className="leading-7 text-gray-600">
                Users can discover profiles, like people, match with mutual
                interest, and use a verified-only filter for safer connections.
              </p>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-rose-50 to-pink-50 p-8">
              <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600">
                <MessageCircle className="h-8 w-8 text-white" />
              </div>

              <h3 className="mb-3 text-xl font-bold text-gray-900">
                Secure Real-Time Chat
              </h3>

              <p className="leading-7 text-gray-600">
                Chat includes real-time messaging, image messages, typing
                indicators, online status, seen status, and blocked content
                protection.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-gray-50 via-white to-rose-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <p className="mb-3 font-semibold text-rose-600">
              Monetized from day one
            </p>

            <h2 className="mb-4 text-4xl font-bold text-gray-900">
              A dating platform with a real revenue engine
            </h2>

            <p className="mx-auto max-w-2xl text-lg text-gray-600">
              TrustPoint uses a credit system where users buy credits and spend
              them on conversations. This creates a simple and scalable revenue
              model.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <Wallet className="h-7 w-7" />
              </div>

              <h3 className="mb-3 text-xl font-bold text-gray-900">
                Credit Wallet
              </h3>

              <p className="mb-5 leading-7 text-gray-600">
                Every user has a wallet balance. Messages are charged based on
                type, helping the business earn from active conversations.
              </p>

              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Text message: 1 credit
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Image message: 3 credits
                </li>
              </ul>
            </div>

            <div className="relative rounded-3xl border-2 border-rose-200 bg-white p-8 shadow-lg">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-rose-500 px-4 py-1 text-sm font-semibold text-white">
                Best Value
              </div>

              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <CreditCard className="h-7 w-7" />
              </div>

              <h3 className="mb-3 text-xl font-bold text-gray-900">
                Paystack Payments
              </h3>

              <p className="mb-5 leading-7 text-gray-600">
                Users can buy credit bundles using Paystack. Payments are
                verified before credits are added.
              </p>

              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  50 credits → GHS 5
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  300 credits → GHS 20
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  800 credits → GHS 50
                </li>
              </ul>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Gift className="h-7 w-7" />
              </div>

              <h3 className="mb-3 text-xl font-bold text-gray-900">
                Referral Rewards
              </h3>

              <p className="mb-5 leading-7 text-gray-600">
                Users can invite friends with a referral link and earn credits
                when new users join through their code.
              </p>

              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Unique referral code
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Invite link sharing
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Credits earned automatically
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="mb-3 font-semibold text-rose-600">
                Safer by design
              </p>

              <h2 className="mb-5 text-4xl font-bold leading-tight text-gray-900">
                Safety features that protect the community
              </h2>

              <p className="mb-8 text-lg leading-8 text-gray-600">
                TrustPoint includes admin tools, reports, bans, verification
                review, notification history, and content filtering to reduce
                abuse and protect users.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-100 p-5">
                  <Lock className="mb-3 h-6 w-6 text-rose-600" />
                  <h3 className="font-semibold text-gray-900">
                    Blocked Content Filter
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    Helps reduce phone number and social media sharing inside
                    chat.
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-100 p-5">
                  <UserCheck className="mb-3 h-6 w-6 text-rose-600" />
                  <h3 className="font-semibold text-gray-900">
                    Admin Control
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    Admin can review verification, manage reports, ban users,
                    and track revenue.
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-100 p-5">
                  <Zap className="mb-3 h-6 w-6 text-rose-600" />
                  <h3 className="font-semibold text-gray-900">
                    Real-Time Presence
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    Users can see online status, typing activity, and message
                    read status.
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-100 p-5">
                  <Sparkles className="mb-3 h-6 w-6 text-rose-600" />
                  <h3 className="font-semibold text-gray-900">
                    Growth Ready
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    Referral rewards and upsell flows help increase engagement
                    and revenue.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-rose-500 to-pink-600 p-8 text-white shadow-xl">
              <div className="mb-6 inline-flex rounded-full bg-white/20 px-4 py-2 text-sm font-semibold">
                TrustPoint System
              </div>

              <h3 className="mb-6 text-3xl font-bold">
                What users get after joining
              </h3>

              <div className="space-y-4">
                {[
                  "Create a rich dating profile",
                  "Upload photos and manage profile details",
                  "Discover and like other users",
                  "Match before chatting",
                  "Chat in real time with text and images",
                  "Buy credits securely through Paystack",
                  "Verify identity for more trust",
                  "Invite friends and earn credits",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-6 w-6 shrink-0 text-white" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <Link
                to="/signup"
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 font-semibold text-rose-600 transition hover:bg-gray-50"
              >
                Join TrustPoint Today
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-rose-50 via-white to-pink-50 py-20">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-5 text-4xl font-bold text-gray-900">
            Ready to meet someone real?
          </h2>

          <p className="mx-auto mb-8 max-w-2xl text-lg leading-8 text-gray-600">
            Start with a free account, complete your profile, verify your
            identity, and begin connecting with serious singles on TrustPoint.
          </p>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition hover:from-rose-600 hover:to-pink-700"
            >
              Get Started Free
              <ArrowRight className="h-5 w-5" />
            </Link>

            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-2xl border-2 border-gray-200 bg-white px-8 py-4 text-lg font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              I Already Have an Account
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-gray-950 py-12 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <div className="rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 p-2">
                  <Heart className="h-5 w-5 text-white" fill="white" />
                </div>
                <span className="text-xl font-bold">TrustPoint Dating</span>
              </div>

              <p className="leading-7 text-gray-400">
                A trust-focused dating platform for meaningful relationships,
                verification, secure chat, and real monetization.
              </p>
            </div>

            <div>
              <h4 className="mb-4 font-semibold">Platform</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link to="/signup" className="hover:text-white">
                    Create Account
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-white">
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard" className="hover:text-white">
                    Discover
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-semibold">Features</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Verified Profiles</li>
                <li>Real-Time Chat</li>
                <li>Credit Wallet</li>
                <li>Referral Rewards</li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-semibold">Trust & Safety</h4>
              <ul className="space-y-2 text-gray-400">
                <li>ID Verification</li>
                <li>Admin Review</li>
                <li>Reports Management</li>
                <li>Content Protection</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>
              &copy; {new Date().getFullYear()} TrustPoint Dating. All rights
              reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};