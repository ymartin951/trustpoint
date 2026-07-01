import { useEffect, useState } from "react";
import { Coins, CreditCard, TrendingUp, Users } from "lucide-react";
import {
  getRecentPurchases,
  getRevenueSummary,
  getTopBuyers,
  type RevenueSummary,
  type TopBuyer,
} from "../services/adminRevenueService";
import type { Database } from "../lib/database.types";
import { getAvatarUrl } from "../lib/utils";
type CreditTransaction =
  Database["public"]["Tables"]["credit_transactions"]["Row"];

const formatMoney = (value: number, currency = "GHS") => {
  return `${currency} ${value.toFixed(2)}`;
};

export const AdminRevenue = () => {
  const [summary, setSummary] = useState<RevenueSummary>({
    totalRevenue: 0,
    todayRevenue: 0,
    totalCreditsSold: 0,
    totalPurchases: 0,
  });

  const [recentPurchases, setRecentPurchases] = useState<CreditTransaction[]>(
    []
  );
  const [topBuyers, setTopBuyers] = useState<TopBuyer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadRevenue = async () => {
      setLoading(true);

      const [summaryResult, purchasesResult, buyersResult] =
        await Promise.all([
          getRevenueSummary(),
          getRecentPurchases(10),
          getTopBuyers(),
        ]);

      if (!isMounted) return;

      if (summaryResult.error) {
        console.error("Failed to load revenue summary:", summaryResult.error);
      } else {
        setSummary(summaryResult.data);
      }

      if (purchasesResult.error) {
        console.error("Failed to load purchases:", purchasesResult.error);
        setRecentPurchases([]);
      } else {
        setRecentPurchases(purchasesResult.data);
      }

      if (buyersResult.error) {
        console.error("Failed to load top buyers:", buyersResult.error);
        setTopBuyers([]);
      } else {
        setTopBuyers(buyersResult.data);
      }

      setLoading(false);
    };

    void loadRevenue();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-rose-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Revenue Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Track credit purchases, revenue, and top spending users.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-green-50 p-3 text-green-600">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <h2 className="text-2xl font-bold text-gray-900">
                {formatMoney(summary.totalRevenue)}
              </h2>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-rose-50 p-3 text-rose-600">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Today</p>
              <h2 className="text-2xl font-bold text-gray-900">
                {formatMoney(summary.todayRevenue)}
              </h2>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Credits Sold</p>
              <h2 className="text-2xl font-bold text-gray-900">
                {summary.totalCreditsSold}
              </h2>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Purchases</p>
              <h2 className="text-2xl font-bold text-gray-900">
                {summary.totalPurchases}
              </h2>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Recent Purchases
          </h2>

          {recentPurchases.length === 0 ? (
            <p className="text-sm text-gray-500">No purchases yet.</p>
          ) : (
            <div className="space-y-3">
              {recentPurchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {purchase.description ?? "Credit purchase"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(purchase.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">
                      {formatMoney(Number(purchase.amount_paid ?? 0))}
                    </p>
                    <p className="text-xs text-gray-500">
                      +{purchase.amount} credits
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Top Buyers
          </h2>

          {topBuyers.length === 0 ? (
            <p className="text-sm text-gray-500">No buyers yet.</p>
          ) : (
            <div className="space-y-3">
              {topBuyers.map((buyer) => (
                <div
                  key={buyer.user_id}
                  className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={getAvatarUrl(buyer.profile?.avatar_url ?? "")}
                      alt={buyer.profile?.full_name ?? "User"}
                      className="h-10 w-10 rounded-full object-cover"
                    />

                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {buyer.profile?.full_name ?? "Unknown user"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {buyer.purchase_count} purchases
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">
                      {formatMoney(buyer.total_spent)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {buyer.total_credits} credits
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};