import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { Database, Json } from "../lib/database.types";

type UserProfile = Database["public"]["Tables"]["users"]["Row"];
type UserInsert = Database["public"]["Tables"]["users"]["Insert"];
type UserUpdate = Database["public"]["Tables"]["users"]["Update"];

type ReferralRewardResult = {
  success?: boolean;
  message?: string;
  referrer_id?: string;
  new_user_id?: string;
  reward?: number;
  code_used?: string;
};

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    userData: Omit<UserInsert, "id">,
    referralCode?: string
  ) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: UserUpdate) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
};

const parseReferralResult = (result: Json): ReferralRewardResult | null => {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return null;
  }

  return result as ReferralRewardResult;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Failed to fetch profile:", error);
      setProfile(null);
      return null;
    }

    setProfile(data ?? null);
    return data ?? null;
  };

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      setLoading(true);

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (error) {
        console.error("Failed to get session:", error);
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }

      if (isMounted) {
        setLoading(false);
      }
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        setLoading(true);

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }

        setLoading(false);
      })();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    userData: Omit<UserInsert, "id">,
    referralCode?: string
  ) => {
    try {
      const cleanEmail = email.trim();
      const cleanReferralCode = referralCode?.trim().toUpperCase() || "";

      console.log("Signup started with referral code:", cleanReferralCode);

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("User creation failed");

      const newUserId = authData.user.id;

      const { error: profileError } = await supabase.from("users").upsert(
        {
          id: newUserId,
          ...userData,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        }
      );

      if (profileError) throw profileError;

      const { data: generatedCode, error: codeError } = await supabase.rpc(
        "ensure_user_referral_code",
        {
          p_user_id: newUserId,
        }
      );

      if (codeError) {
        console.error("Failed to generate referral code:", codeError);
      } else {
        console.log("Referral code generated for new user:", generatedCode);
      }

      const { error: subscriptionError } = await supabase
        .from("subscriptions")
        .insert({
          user_id: newUserId,
          plan_type: "free",
          status: "active",
        });

      if (subscriptionError && subscriptionError.code !== "23505") {
        console.error("Subscription creation error:", subscriptionError);
      }

      const { error: walletError } = await supabase.rpc(
        "create_user_wallet_if_missing",
        {
          p_user_id: newUserId,
        }
      );

      if (walletError) {
        console.error("Failed to create credit wallet:", walletError);
      }

      if (cleanReferralCode) {
        console.log("Applying referral reward:", {
          newUserId,
          cleanReferralCode,
        });

        const { data: referralResult, error: referralError } =
          await supabase.rpc("apply_referral_reward", {
            p_new_user_id: newUserId,
            p_referral_code: cleanReferralCode,
          });

        if (referralError) {
          console.error("Failed to apply referral reward:", referralError);
          throw new Error(referralError.message || "Referral reward failed.");
        }

        const parsedResult = parseReferralResult(referralResult);

        console.log("Referral reward result:", parsedResult);

        if (!parsedResult?.success) {
          throw new Error(
            parsedResult?.message || "Referral reward was not applied."
          );
        }
      }

      await fetchProfile(newUserId);

      return { error: null };
    } catch (error) {
      console.error("Signup failed:", error);
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error("Signin failed:", error);
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();

    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (updates: UserUpdate) => {
    try {
      if (!user) throw new Error("No user logged in");

      const { error } = await supabase
        .from("users")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      await fetchProfile(user.id);

      return { error: null };
    } catch (error) {
      console.error("Profile update failed:", error);
      return { error: error as Error };
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};