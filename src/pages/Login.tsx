import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  Heart,
  ShieldCheck,
  Sparkles,
  MessageCircle,
  LogIn,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

type LocationState = {
  from?: {
    pathname?: string;
  };
};

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as LocationState | null;
  const redirectPath = state?.from?.pathname || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const { error } = await signIn(email.trim(), password);

      if (error) {
        setError(error.message);
        return;
      }

      navigate(redirectPath, { replace: true });
    } catch (err) {
      console.error("Login failed:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-2">
        <div className="hidden lg:block">
          <Link to="/" className="mb-8 inline-flex items-center gap-2">
            <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 p-3 shadow-lg">
              <Heart className="h-7 w-7 text-white" fill="white" />
            </div>

            <span className="text-2xl font-bold text-rose-600">
              TrustPoint
            </span>
          </Link>

          <h1 className="mb-4 text-5xl font-bold leading-tight text-gray-900">
            Welcome back to real connection.
          </h1>

          <p className="mb-8 max-w-xl text-lg text-gray-600">
            Continue your TrustPoint journey. Discover genuine people, reply to
            messages, check your matches, manage your credits, and grow your
            chances of finding something meaningful.
          </p>

          <div className="grid gap-4">
            <div className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm">
              <div className="rounded-xl bg-rose-100 p-3 text-rose-600">
                <Heart className="h-6 w-6" />
              </div>

              <div>
                <h3 className="font-semibold text-gray-900">
                  Continue discovering matches
                </h3>
                <p className="text-sm text-gray-600">
                  Find people who match your relationship goals and location.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm">
              <div className="rounded-xl bg-pink-100 p-3 text-pink-600">
                <MessageCircle className="h-6 w-6" />
              </div>

              <div>
                <h3 className="font-semibold text-gray-900">
                  Reply to messages
                </h3>
                <p className="text-sm text-gray-600">
                  Stay connected with your matches and never miss important
                  conversations.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm">
              <div className="rounded-xl bg-rose-100 p-3 text-rose-600">
                <Sparkles className="h-6 w-6" />
              </div>

              <div>
                <h3 className="font-semibold text-gray-900">
                  Use premium features
                </h3>
                <p className="text-sm text-gray-600">
                  Boost your profile, see who liked you, unlock visitors, and
                  stand out more.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm">
              <div className="rounded-xl bg-pink-100 p-3 text-pink-600">
                <ShieldCheck className="h-6 w-6" />
              </div>

              <div>
                <h3 className="font-semibold text-gray-900">
                  Keep your profile trusted
                </h3>
                <p className="text-sm text-gray-600">
                  Verified and complete profiles help build confidence with
                  other members.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 text-center lg:hidden">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 p-3">
                <Heart className="h-7 w-7 text-white" fill="white" />
              </div>

              <span className="text-2xl font-bold text-rose-600">
                TrustPoint
              </span>
            </Link>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-6 text-center">
              <div className="mb-4 flex justify-center">
                <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 p-3 shadow-lg">
                  <Heart className="h-8 w-8 text-white" fill="white" />
                </div>
              </div>

              <h1 className="mb-2 text-3xl font-bold text-gray-900">
                Welcome Back
              </h1>

              <p className="text-sm text-gray-600">
                Sign in to continue your dating journey.
              </p>
            </div>

            {error ? (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Email Address
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-transparent focus:ring-2 focus:ring-rose-500"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Password
                </label>

                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-transparent focus:ring-2 focus:ring-rose-500"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 py-3 font-semibold text-white transition hover:from-rose-600 hover:to-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign In"}
                {!loading ? <LogIn className="h-5 w-5" /> : null}
              </button>
            </form>

            <div className="mt-6 rounded-2xl bg-rose-50 p-4 text-center">
              <p className="text-sm text-gray-700">
                New to TrustPoint? Create your profile and start meeting
                genuine people today.
              </p>

              <Link
                to="/signup"
                className="mt-2 inline-block font-semibold text-rose-600 hover:text-rose-700"
              >
                Create an account
              </Link>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};