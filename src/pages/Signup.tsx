import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Heart,
  ShieldCheck,
  Gift,
  MapPin,
  Camera,
  UserPlus,
  Globe2,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import type { Database } from "../lib/database.types";
import { AFRICAN_COUNTRIES } from "../lib/africanCountries";

type UserUpdate = Database["public"]["Tables"]["users"]["Update"];

const uploadAvatar = async (file: File, userId: string) => {
  const ext = file.name.split(".").pop();
  const filePath = `${userId}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

  return data.publicUrl;
};

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUp, refreshProfile } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    gender: "male" as "male" | "female" | "other",
    date_of_birth: "",
    country: "",
    region: "",
    city: "",
    relationship_goal: "dating" as "dating" | "marriage",
    referral_code: "",
  });

  useEffect(() => {
    const ref = searchParams.get("ref");

    if (ref) {
      setForm((prev) => ({
        ...prev,
        referral_code: ref.trim().toUpperCase(),
      }));
    }
  }, [searchParams]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: name === "referral_code" ? value.toUpperCase() : value,
    }));
  };

  const next = () => {
    setError("");

    if (step === 1) {
      if (!form.email || !form.password) {
        setError("Please enter your email and password to continue.");
        return;
      }

      if (form.password.length < 6) {
        setError("Password should be at least 6 characters.");
        return;
      }
    }

    if (step === 2) {
      if (!form.full_name || !form.date_of_birth) {
        setError("Please complete your basic profile information.");
        return;
      }
    }

    setStep((s) => s + 1);
  };

  const back = () => {
    setError("");
    setStep((s) => s - 1);
  };

  const handleSignup = async () => {
    const {
      full_name,
      email,
      password,
      gender,
      date_of_birth,
      country,
      region,
      city,
      relationship_goal,
      referral_code,
    } = form;

    if (
      !full_name ||
      !email ||
      !password ||
      !date_of_birth ||
      !country ||
      !region ||
      !city
    ) {
      setError("Please fill all required fields.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const { error } = await signUp(
        email.trim(),
        password,
        {
          full_name: full_name.trim(),
          gender,
          date_of_birth,
          country,
          region: region.trim(),
          city: city.trim(),
          relationship_goal,
          verified: false,
          verification_status: "not_submitted",
          is_admin: false,
          is_banned: false,
        } as any,
        referral_code
      );

      if (error) throw error;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && avatar) {
        const avatarUrl = await uploadAvatar(avatar, user.id);

        const updates: UserUpdate = {
          avatar_url: avatarUrl,
        };

        const { error: updateError } = await supabase
          .from("users")
          .update(updates)
          .eq("id", user.id);

        if (updateError) {
          console.error("Profile update error:", updateError);
          setError("Account created, but avatar failed to save.");
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      await refreshProfile();

      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const stepTitle =
    step === 1
      ? "Create your account"
      : step === 2
      ? "Tell us about yourself"
      : "Complete your African profile";

  const stepDescription =
    step === 1
      ? "Join TrustPoint and start meeting genuine people looking for real connection."
      : step === 2
      ? "Your profile helps us recommend better matches for you."
      : "Choose your country, location, and profile photo so people across Africa can connect with you.";

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
            Start your love journey across Africa.
          </h1>

          <p className="mb-8 max-w-xl text-lg text-gray-600">
            TrustPoint helps you meet serious and genuine people from Ghana,
            Nigeria, South Africa, Kenya, Togo, Uganda, Morocco, and other
            African countries. Create your profile, discover matches, send
            likes, and build meaningful connections in a safer dating space.
          </p>

          <div className="grid gap-4">
            <div className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm">
              <div className="rounded-xl bg-rose-100 p-3 text-rose-600">
                <ShieldCheck className="h-6 w-6" />
              </div>

              <div>
                <h3 className="font-semibold text-gray-900">
                  Safer dating experience
                </h3>
                <p className="text-sm text-gray-600">
                  Profiles can be verified to build trust between members.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm">
              <div className="rounded-xl bg-pink-100 p-3 text-pink-600">
                <Gift className="h-6 w-6" />
              </div>

              <div>
                <h3 className="font-semibold text-gray-900">
                  Earn rewards and credits
                </h3>
                <p className="text-sm text-gray-600">
                  Complete your profile, invite friends, and unlock premium
                  features with credits.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm">
              <div className="rounded-xl bg-rose-100 p-3 text-rose-600">
                <Globe2 className="h-6 w-6" />
              </div>

              <div>
                <h3 className="font-semibold text-gray-900">
                  Connect across Africa
                </h3>
                <p className="text-sm text-gray-600">
                  Choose your country and discover people from your country or
                  across Africa.
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
            <div className="mb-6">
              <div className="mb-4 flex gap-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-2 flex-1 rounded-full transition ${
                      step >= i
                        ? "bg-gradient-to-r from-rose-500 to-pink-600"
                        : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-rose-600">
                  Step {step} of 3
                </p>

                <Link
                  to="/login"
                  className="text-sm font-medium text-gray-500 hover:text-rose-600"
                >
                  Already have account?
                </Link>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {stepTitle}
              </h2>

              <p className="mt-2 text-sm text-gray-600">
                {stepDescription}
              </p>
            </div>

            {error ? (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Email Address
                  </label>

                  <input
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleChange}
                    autoComplete="email"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-transparent focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Password
                  </label>

                  <input
                    type="password"
                    name="password"
                    placeholder="Create a secure password"
                    value={form.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-transparent focus:ring-2 focus:ring-rose-500"
                  />

                  <p className="mt-2 text-xs text-gray-500">
                    Use at least 6 characters.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Referral Code{" "}
                    <span className="text-gray-400">(optional)</span>
                  </label>

                  <input
                    name="referral_code"
                    placeholder="Enter referral code if you have one"
                    value={form.referral_code}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 uppercase outline-none transition focus:border-transparent focus:ring-2 focus:ring-rose-500"
                  />

                  <p className="mt-2 text-xs text-gray-500">
                    Referral codes may give you or your inviter rewards.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={next}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 p-3 font-semibold text-white transition hover:from-rose-600 hover:to-pink-700"
                >
                  Continue
                  <UserPlus className="h-5 w-5" />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Full Name
                  </label>

                  <input
                    name="full_name"
                    placeholder="Your full name"
                    value={form.full_name}
                    onChange={handleChange}
                    autoComplete="name"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-transparent focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Gender
                  </label>

                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-transparent focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Date of Birth
                  </label>

                  <input
                    type="date"
                    name="date_of_birth"
                    value={form.date_of_birth}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-transparent focus:ring-2 focus:ring-rose-500"
                  />

                  <p className="mt-2 text-xs text-gray-500">
                    Your age helps us show more suitable matches.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={back}
                    className="w-1/2 rounded-xl bg-gray-100 p-3 font-medium text-gray-700 transition hover:bg-gray-200"
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={next}
                    className="w-1/2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 p-3 font-semibold text-white transition hover:from-rose-600 hover:to-pink-700"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Globe2 className="h-4 w-4 text-rose-500" />
                    Country
                  </label>

                  <select
                    name="country"
                    value={form.country}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-transparent focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="">Select your country</option>
                    {AFRICAN_COUNTRIES.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                    <MapPin className="h-4 w-4 text-rose-500" />
                    Region / State / Province
                  </label>

                  <input
                    name="region"
                    placeholder="Example: Greater Accra, Lagos, Gauteng"
                    value={form.region}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-transparent focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    City / Town
                  </label>

                  <input
                    name="city"
                    placeholder="Example: Accra, Lagos, Johannesburg"
                    value={form.city}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-transparent focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Relationship Goal
                  </label>

                  <select
                    name="relationship_goal"
                    value={form.relationship_goal}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-transparent focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="dating">Dating</option>
                    <option value="marriage">Marriage</option>
                  </select>
                </div>

                <div className="rounded-2xl border border-dashed border-rose-300 bg-rose-50 p-4">
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Camera className="h-4 w-4 text-rose-500" />
                    Profile Photo{" "}
                    <span className="text-gray-400">(optional)</span>
                  </label>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setAvatar(e.target.files[0]);
                      }
                    }}
                    className="w-full text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-rose-500 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-rose-600"
                  />

                  <p className="mt-2 text-xs text-gray-500">
                    A clear photo helps other users trust your profile.
                  </p>

                  {avatar ? (
                    <p className="mt-2 text-xs font-medium text-rose-600">
                      Selected: {avatar.name}
                    </p>
                  ) : null}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={back}
                    className="w-1/2 rounded-xl bg-gray-100 p-3 font-medium text-gray-700 transition hover:bg-gray-200"
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={handleSignup}
                    disabled={loading}
                    className="w-1/2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 p-3 font-semibold text-white transition hover:from-rose-600 hover:to-pink-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Creating..." : "Create Account"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            By creating an account, you agree to use TrustPoint respectfully and
            honestly across Africa.
          </p>
        </div>
      </div>
    </div>
  );
}