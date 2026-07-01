import { useEffect, useState } from "react";
import { Zap, Clock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { activateBoost, getActiveBoost } from "../services/boostService";

type BoostResult = {
  success: boolean;
  message?: string;
  ends_at?: string;
};

type ActiveBoost = {
  id?: string;
  user_id?: string;
  starts_at?: string;
  ends_at: string;
  is_active?: boolean;
  created_at?: string;
};

const isBoostResult = (value: unknown): value is BoostResult => {
  return typeof value === "object" && value !== null && "success" in value;
};

export default function BoostCard() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [activeBoost, setActiveBoost] = useState<ActiveBoost | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;

      const { data, error } = await getActiveBoost(user.id);

      if (error) {
        console.error("Failed to load active boost:", error);
        return;
      }

      setActiveBoost(data as ActiveBoost | null);
    };

    void load();
  }, [user?.id]);

  const handleBoost = async (minutes: number, cost: number) => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const { data, error } = await activateBoost(user.id, minutes, cost);

      if (error) {
        console.error("Boost activation error:", error);
        alert("Failed to activate boost. Please try again.");
        return;
      }

      if (!isBoostResult(data)) {
        alert("Unexpected boost response. Please try again.");
        return;
      }

      if (data.success) {
        alert("Boost activated!");

        if (data.ends_at) {
          setActiveBoost({
            ends_at: data.ends_at,
            is_active: true,
          });
        }

        return;
      }

      alert(data.message || "Failed to activate boost.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h3 className="flex items-center gap-2 text-lg font-bold">
        <Zap className="h-5 w-5 text-rose-500" />
        Boost Your Profile
      </h3>

      <p className="mt-2 text-sm text-gray-500">
        Appear higher in Discover and get more attention from serious users.
      </p>

      {activeBoost ? (
        <div className="mt-4 rounded-xl bg-green-50 p-4 text-green-700">
          <div className="flex items-center gap-2 font-medium">
            <Clock className="h-4 w-4" />
            Boost Active
          </div>

          <p className="mt-1 text-sm">
            Active until: {new Date(activeBoost.ends_at).toLocaleString()}
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => void handleBoost(30, 20)}
            disabled={loading}
            className="rounded-xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60"
          >
            30 mins
            <span className="block text-xs font-normal">20 credits</span>
          </button>

          <button
            type="button"
            onClick={() => void handleBoost(60, 35)}
            disabled={loading}
            className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
          >
            1 hour
            <span className="block text-xs font-normal">35 credits</span>
          </button>

          <button
            type="button"
            onClick={() => void handleBoost(1440, 150)}
            disabled={loading}
            className="rounded-xl bg-rose-700 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60"
          >
            24 hours
            <span className="block text-xs font-normal">150 credits</span>
          </button>
        </div>
      )}

      {loading && (
        <p className="mt-3 text-sm text-gray-500">Activating boost...</p>
      )}
    </div>
  );
}