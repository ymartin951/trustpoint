import { useEffect, useState } from "react";
import { Gift, X, Coins } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { claimDailyReward } from "../services/dailyRewardService";

export default function DailyRewardPopup() {
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    const run = async () => {
      if (!user?.id) return;

      const today = new Date().toISOString().slice(0, 10);
      const storageKey = `daily-reward-checked-${user.id}-${today}`;

      if (localStorage.getItem(storageKey)) return;

      localStorage.setItem(storageKey, "true");

      const { data, error } = await claimDailyReward(user.id);

      if (error) {
        console.error("Daily reward error:", error);
        return;
      }

      if (data?.claimed) {
        setCredits(data.credits_awarded);
        setOpen(true);
      }
    };

    void run();
  }, [user?.id]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4">
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <Gift className="h-8 w-8" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900">
          Daily Reward Claimed!
        </h2>

        <p className="mt-2 text-gray-600">
          You received free credits for logging in today.
        </p>

        <div className="mt-5 rounded-2xl bg-amber-50 p-4">
          <div className="flex items-center justify-center gap-2 text-amber-700">
            <Coins className="h-6 w-6" />
            <span className="text-3xl font-bold">+{credits}</span>
          </div>
          <p className="mt-1 text-sm text-amber-700">credits added</p>
        </div>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-6 w-full rounded-xl bg-rose-500 py-3 font-semibold text-white hover:bg-rose-600"
        >
          Continue
        </button>
      </div>
    </div>
  );
}