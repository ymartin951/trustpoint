import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Flag,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Coins,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Clock,
  Eye,
  Ban,
  RefreshCw,
  CreditCard,
  UserRoundCheck,
  X,
} from "lucide-react";

import BoostCard from "../components/BoostCard";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import {
  getAllUsers,
  getAllReports,
  updateReportStatus,
  banUser,
  unbanUser,
  getUserStats,
  type AdminUser,
} from "../services/adminService";

import {
  getRevenueSummary,
  getDailyRevenueChart,
  type DailyRevenuePoint,
} from "../services/adminRevenueService";

import { calculateAge } from "../lib/utils";
import { supabase } from "../lib/supabase";

type AdminTab = "stats" | "users" | "reports";
type UserFilter = "all" | "pending" | "verified" | "rejected" | "banned";

type VerificationStatus = "not_submitted" | "pending" | "verified" | "rejected";

type GhanaIdType = "ghana_card" | "drivers_license" | "nhis" | "passport";

type PreviewImage = {
  url: string;
  title: string;
} | null;

type ExtendedAdminUser = AdminUser & {
  verification_status?: VerificationStatus | null;
  verification_note?: string | null;
  verification_image_url?: string | null;
  verification_id_type?: GhanaIdType | null;
  verification_id_image_url?: string | null;
  verification_selfie_url?: string | null;
  submitted_for_verification_at?: string | null;
  verified_at?: string | null;
  verified_by?: string | null;
  avatar_url?: string | null;
  gender?: string | null;
  bio?: string | null;
  education?: string | null;
  religion?: string | null;
  created_at?: string | null;
};

type StatCardProps = {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  bg: string;
};

const ID_TYPE_LABELS: Record<GhanaIdType, string> = {
  ghana_card: "Ghana Card / ECOWAS ID",
  drivers_license: "Driving License",
  nhis: "NHIS Card",
  passport: "Ghana Passport",
};

const getIdTypeLabel = (value?: string | null) => {
  if (!value) return "Not selected";
  return ID_TYPE_LABELS[value as GhanaIdType] ?? value;
};

const getVerificationStatus = (user: ExtendedAdminUser): VerificationStatus => {
  if (user.verified || user.verification_status === "verified") {
    return "verified";
  }

  return user.verification_status ?? "not_submitted";
};

const getVerificationBadge = (user: ExtendedAdminUser) => {
  const status = getVerificationStatus(user);

  if (status === "verified") {
    return {
      label: "Verified",
      className: "bg-blue-100 text-blue-700",
      icon: ShieldCheck,
    };
  }

  if (status === "pending") {
    return {
      label: "Pending",
      className: "bg-amber-100 text-amber-700",
      icon: Clock,
    };
  }

  if (status === "rejected") {
    return {
      label: "Rejected",
      className: "bg-red-100 text-red-700",
      icon: ShieldAlert,
    };
  }

  return {
    label: "Not submitted",
    className: "bg-gray-100 text-gray-700",
    icon: ShieldQuestion,
  };
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
};

export const Admin = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>("stats");
  const [users, setUsers] = useState<ExtendedAdminUser[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [chartData, setChartData] = useState<DailyRevenuePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [userFilter, setUserFilter] = useState<UserFilter>("all");
  const [selectedUser, setSelectedUser] = useState<ExtendedAdminUser | null>(
    null
  );
  const [rejectingUser, setRejectingUser] = useState<ExtendedAdminUser | null>(
    null
  );
  const [rejectNote, setRejectNote] = useState("");
  const [previewImage, setPreviewImage] = useState<PreviewImage>(null);

  const [stats, setStats] = useState({
    totalUsers: 0,
    verifiedUsers: 0,
    bannedUsers: 0,
    totalMatches: 0,
    pendingReports: 0,
    totalRevenue: 0,
    todayRevenue: 0,
  });

  const verificationCounts = useMemo(() => {
    return users.reduce(
      (acc, user) => {
        const status = getVerificationStatus(user);

        acc.all += 1;

        if (status === "pending") acc.pending += 1;
        if (status === "verified") acc.verified += 1;
        if (status === "rejected") acc.rejected += 1;
        if (user.is_banned) acc.banned += 1;

        return acc;
      },
      {
        all: 0,
        pending: 0,
        verified: 0,
        rejected: 0,
        banned: 0,
      }
    );
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (userFilter === "all") return users;

    if (userFilter === "banned") {
      return users.filter((user) => user.is_banned);
    }

    return users.filter((user) => getVerificationStatus(user) === userFilter);
  }, [users, userFilter]);

  const formatMoney = (amount: number) => {
    return `GHS ${amount.toFixed(2)}`;
  };

  const loadData = async () => {
    try {
      setLoading(true);

      const [statsData, revenueResult, chartResult] = await Promise.all([
        getUserStats(),
        getRevenueSummary(),
        getDailyRevenueChart(14),
      ]);

      setStats({
        ...statsData,
        totalRevenue: revenueResult.data.totalRevenue,
        todayRevenue: revenueResult.data.todayRevenue,
      });

      if (chartResult.error) {
        console.error("Failed to load revenue chart:", chartResult.error);
        setChartData([]);
      } else {
        setChartData(chartResult.data);
      }

      const { data: usersData, error: usersError } = await getAllUsers();

      if (usersError) {
        console.error("Failed to load users:", usersError);
        setUsers([]);
      } else {
        setUsers((usersData ?? []) as ExtendedAdminUser[]);
      }

      const { data: reportsData, error: reportsError } = await getAllReports();

      if (reportsError) {
        console.error("Failed to load reports:", reportsError);
        setReports([]);
      } else {
        setReports(reportsData ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleBanUser = async (userId: string, isBanned: boolean) => {
    try {
      setActionLoading(userId);

      if (isBanned) {
        await unbanUser(userId);
      } else {
        if (!confirm("Ban this user?")) return;
        await banUser(userId);
      }

      await loadData();
    } finally {
      setActionLoading(null);
    }
  };

 const handleApproveVerification = async (userId: string) => {
  const confirmed = confirm("Approve this user's verification?");
  if (!confirmed) return;

  try {
    setActionLoading(userId);

    const { error } = await supabase
      .from("users")
      .update({
        verified: true,
        verification_status: "verified",
        verification_note: null,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", userId);

    if (error) {
      console.error("Failed to approve verification:", error);
      alert("Failed to approve verification. Please try again.");
      return;
    }

    setSelectedUser(null);
    await loadData();
    alert("User verified successfully.");
  } finally {
    setActionLoading(null);
  }
};

const handleUnverifyUser = async (userId: string) => {
  const confirmed = confirm("Remove this user's verified status?");
  if (!confirmed) return;

  try {
    setActionLoading(userId);

    const { error } = await supabase
      .from("users")
      .update({
        verified: false,
        verification_status: "not_submitted",
        verification_note: null,
        submitted_for_verification_at: null,
        verified_at: null,
        verified_by: null,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", userId);

    if (error) {
      console.error("Failed to unverify user:", error);
      alert("Failed to unverify user. Please try again.");
      return;
    }

    setSelectedUser(null);
    await loadData();
    alert("User verification removed.");
  } finally {
    setActionLoading(null);
  }
};

  const openRejectModal = (user: ExtendedAdminUser) => {
    setRejectingUser(user);
    setRejectNote("");
  };

const handleRejectVerification = async () => {
  if (!rejectingUser) return;

  if (!rejectNote.trim()) {
    alert("Please enter a reason for rejecting this verification.");
    return;
  }

  try {
    setActionLoading(rejectingUser.id);

    const { error } = await supabase
      .from("users")
      .update({
        verified: false,
        verification_status: "rejected",
        verification_note: rejectNote.trim(),
        verified_at: null,
        verified_by: null,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", rejectingUser.id);

    if (error) {
      console.error("Failed to reject verification:", error);
      alert("Failed to reject verification. Please try again.");
      return;
    }

    setRejectingUser(null);
    setRejectNote("");
    setSelectedUser(null);
    await loadData();
    alert("Verification rejected.");
  } finally {
    setActionLoading(null);
  }
};

  const handleUpdateReport = async (
    reportId: string,
    status: "pending" | "reviewed" | "resolved"
  ) => {
    await updateReportStatus(reportId, status);
    await loadData();
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-rose-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-gray-600">
            Manage users, revenue, credits, verification, bans, and reports.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="border-b border-gray-200">
          <nav className="flex">
            {(["stats", "users", "reports"] as AdminTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-6 py-4 text-center font-medium capitalize ${
                  activeTab === tab
                    ? "border-b-2 border-rose-500 text-rose-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab === "stats" ? "Statistics" : tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 sm:p-8">
          {activeTab === "stats" && (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <StatCard
                  title="Total Revenue"
                  value={formatMoney(stats.totalRevenue)}
                  icon={<Coins className="h-8 w-8 text-green-600" />}
                  bg="from-green-50 to-green-100"
                />

                <StatCard
                  title="Today Revenue"
                  value={formatMoney(stats.todayRevenue)}
                  icon={<Coins className="h-8 w-8 text-emerald-600" />}
                  bg="from-emerald-50 to-emerald-100"
                />

                <StatCard
                  title="Total Users"
                  value={stats.totalUsers}
                  icon={<Users className="h-8 w-8 text-blue-600" />}
                  bg="from-blue-50 to-blue-100"
                />

                <StatCard
                  title="Verified Users"
                  value={stats.verifiedUsers}
                  icon={<CheckCircle className="h-8 w-8 text-green-600" />}
                  bg="from-green-50 to-green-100"
                />

                <StatCard
                  title="Banned Users"
                  value={stats.bannedUsers}
                  icon={<XCircle className="h-8 w-8 text-red-600" />}
                  bg="from-red-50 to-red-100"
                />

                <StatCard
                  title="Total Matches"
                  value={stats.totalMatches}
                  icon={<Users className="h-8 w-8 text-purple-600" />}
                  bg="from-purple-50 to-purple-100"
                />

                <StatCard
                  title="Pending Reports"
                  value={stats.pendingReports}
                  icon={<AlertTriangle className="h-8 w-8 text-orange-600" />}
                  bg="from-orange-50 to-orange-100"
                />

                <StatCard
                  title="Pending Verification"
                  value={verificationCounts.pending}
                  icon={<Clock className="h-8 w-8 text-amber-600" />}
                  bg="from-amber-50 to-amber-100"
                />

                <StatCard
                  title="Rejected Verification"
                  value={verificationCounts.rejected}
                  icon={<ShieldAlert className="h-8 w-8 text-red-600" />}
                  bg="from-red-50 to-red-100"
                />
              </div>

              <div className="mt-10 rounded-2xl border bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">
                  Revenue — Last 14 Days
                </h2>

                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => {
                          const amount =
                            typeof value === "number"
                              ? value
                              : Number(value ?? 0);
                          return `GHS ${amount.toFixed(2)}`;
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#f43f5e"
                        strokeWidth={3}
                        dot
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {activeTab === "users" && (
            <div>
              <div className="mb-6 flex flex-wrap gap-2">
                {[
                  ["all", `All (${verificationCounts.all})`],
                  ["pending", `Pending (${verificationCounts.pending})`],
                  ["verified", `Verified (${verificationCounts.verified})`],
                  ["rejected", `Rejected (${verificationCounts.rejected})`],
                  ["banned", `Banned (${verificationCounts.banned})`],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setUserFilter(value as UserFilter)}
                    className={`rounded-full px-4 py-2 text-sm font-medium ${
                      userFilter === value
                        ? "bg-rose-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px]">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left">User</th>
                      <th className="px-4 py-3 text-left">Age</th>
                      <th className="px-4 py-3 text-left">Location</th>
                      <th className="px-4 py-3 text-left">Credits</th>
                      <th className="px-4 py-3 text-left">ID Type</th>
                      <th className="px-4 py-3 text-left">Verification</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredUsers.map((item) => {
                      const verification = getVerificationBadge(item);
                      const VerificationIcon = verification.icon;

                      return (
                        <tr
                          key={item.id}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-semibold text-gray-900">
                                {item.full_name ?? "No name"}
                              </div>
                              <div className="text-sm text-gray-600">
                                {item.relationship_goal ?? "No goal"}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-gray-700">
                            {item.date_of_birth
                              ? calculateAge(item.date_of_birth)
                              : "N/A"}
                          </td>

                          <td className="px-4 py-3 text-gray-700">
                            {[item.city, item.country]
                              .filter(Boolean)
                              .join(", ") || "N/A"}
                          </td>

                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                              <Coins className="h-3 w-3" />
                              {item.credit_balance ?? 0}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-sm text-gray-700">
                            {getIdTypeLabel(item.verification_id_type)}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${verification.className}`}
                            >
                              <VerificationIcon className="h-3.5 w-3.5" />
                              {verification.label}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              {item.is_banned && (
                                <span className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                                  Banned
                                </span>
                              )}

                              {item.is_admin && (
                                <span className="rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
                                  Admin
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedUser(item)}
                                className="inline-flex items-center gap-1 rounded bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View
                              </button>

                              {getVerificationStatus(item) === "pending" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleApproveVerification(item.id)
                                    }
                                    disabled={actionLoading === item.id}
                                    className="rounded bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-200 disabled:opacity-60"
                                  >
                                    Approve
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openRejectModal(item)}
                                    disabled={actionLoading === item.id}
                                    className="rounded bg-orange-100 px-3 py-1 text-sm font-medium text-orange-700 hover:bg-orange-200 disabled:opacity-60"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}

                              {getVerificationStatus(item) === "verified" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleUnverifyUser(item.id)
                                  }
                                  disabled={actionLoading === item.id}
                                  className="rounded bg-gray-200 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-60"
                                >
                                  Unverify
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  void handleBanUser(item.id, item.is_banned)
                                }
                                disabled={actionLoading === item.id}
                                className={`inline-flex items-center gap-1 rounded px-3 py-1 text-sm font-medium disabled:opacity-60 ${
                                  item.is_banned
                                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                                    : "bg-red-100 text-red-700 hover:bg-red-200"
                                }`}
                              >
                                <Ban className="h-3.5 w-3.5" />
                                {item.is_banned ? "Unban" : "Ban"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {filteredUsers.length === 0 && (
                  <div className="py-12 text-center text-gray-500">
                    No users found.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "reports" && (
            <div className="space-y-4">
              {reports.length === 0 ? (
                <div className="py-12 text-center">
                  <Flag className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                  <p className="text-gray-600">No reports</p>
                </div>
              ) : (
                reports.map((report) => (
                  <div
                    key={report.id}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-6"
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-3">
                          <span className="font-semibold text-gray-900">
                            Reporter: {report.reporter?.full_name || "Unknown"}
                          </span>

                          <span className="text-gray-400">→</span>

                          <span className="font-semibold text-red-600">
                            Reported: {report.reported?.full_name || "Unknown"}
                          </span>
                        </div>

                        <p className="mb-2 text-gray-700">
                          <span className="font-medium">Reason:</span>{" "}
                          {report.reason}
                        </p>

                        <p className="text-sm text-gray-500">
                          {new Date(report.created_at).toLocaleString()}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-sm font-medium ${
                          report.status === "pending"
                            ? "bg-orange-100 text-orange-700"
                            : report.status === "reviewed"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {report.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          void handleUpdateReport(report.id, "reviewed")
                        }
                        className="rounded-lg bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200"
                      >
                        Mark Reviewed
                      </button>

                      <button
                        onClick={() =>
                          void handleUpdateReport(report.id, "resolved")
                        }
                        className="rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-200"
                      >
                        Mark Resolved
                      </button>

                      {report.reported && (
                        <button
                          onClick={() =>
                            void handleBanUser(
                              report.reported_user_id,
                              report.reported.is_banned
                            )
                          }
                          className="rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
                        >
                          {report.reported.is_banned
                            ? "Unban User"
                            : "Ban User"}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {selectedUser && (
        <UserReviewModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onApprove={() => void handleApproveVerification(selectedUser.id)}
          onReject={() => openRejectModal(selectedUser)}
          onUnverify={() => void handleUnverifyUser(selectedUser.id)}
          onBanToggle={() =>
            void handleBanUser(selectedUser.id, selectedUser.is_banned)
          }
          onPreviewImage={(url, title) => setPreviewImage({ url, title })}
          actionLoading={actionLoading === selectedUser.id}
        />
      )}

      {rejectingUser && (
        <div className="fixed inset-x-0 bottom-0 top-20 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-6">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900">
              Reject Verification
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Add a clear reason so the user knows what to correct.
            </p>

            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={5}
              placeholder="Example: ID image is blurry. Please upload a clearer image."
              className="mt-4 w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-rose-400"
            />

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setRejectingUser(null);
                  setRejectNote("");
                }}
                className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleRejectVerification()}
                disabled={actionLoading === rejectingUser.id}
                className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
              >
                {actionLoading === rejectingUser.id
                  ? "Rejecting..."
                  : "Reject Verification"}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewImage && (
        <div className="fixed inset-0 z-[9999] bg-black/90">
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            className="fixed right-5 top-5 z-[10000] flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-900 shadow-lg hover:bg-gray-100"
            aria-label="Close image preview"
          >
            <X className="h-7 w-7" />
          </button>

          <div className="flex h-full w-full items-center justify-center p-4">
            <div className="max-h-[92vh] w-full max-w-6xl rounded-2xl bg-white p-4 shadow-xl">
              <h3 className="mb-3 pr-14 text-lg font-semibold text-gray-900">
                {previewImage.title}
              </h3>

              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[82vh] w-full rounded-xl object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const UserReviewModal = ({
  user,
  onClose,
  onApprove,
  onReject,
  onUnverify,
  onBanToggle,
  onPreviewImage,
  actionLoading,
}: {
  user: ExtendedAdminUser;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onUnverify: () => void;
  onBanToggle: () => void;
  onPreviewImage: (url: string, title: string) => void;
  actionLoading: boolean;
}) => {
  const verification = getVerificationBadge(user);
  const VerificationIcon = verification.icon;
  const status = getVerificationStatus(user);

  const idImageUrl =
    user.verification_id_image_url ?? user.verification_image_url ?? null;

  return (
    <div className="fixed inset-x-0 bottom-0 top-20 z-40 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-6">
      <div className="w-full max-w-5xl rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 z-20 flex items-start justify-between border-b bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              User Verification Review
            </h2>
            <p className="text-sm text-gray-500">
              Review profile information, ID card, and selfie before approval.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200"
            aria-label="Close user review"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-100 p-5">
              <div className="flex items-start gap-4">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name ?? "User avatar"}
                    className="h-20 w-20 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                    <Users className="h-8 w-8" />
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {user.full_name ?? "No name"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {user.date_of_birth
                      ? `${calculateAge(user.date_of_birth)} years old`
                      : "Age not provided"}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${verification.className}`}
                    >
                      <VerificationIcon className="h-3.5 w-3.5" />
                      {verification.label}
                    </span>

                    {user.is_banned && (
                      <span className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                        Banned
                      </span>
                    )}

                    {user.is_admin && (
                      <span className="rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
                        Admin
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 text-sm">
                <InfoRow label="Gender" value={user.gender ?? "N/A"} />
                <InfoRow
                  label="Location"
                  value={
                    [user.city, user.country].filter(Boolean).join(", ") ||
                    "N/A"
                  }
                />
                <InfoRow
                  label="Relationship Goal"
                  value={user.relationship_goal ?? "N/A"}
                />
                <InfoRow label="Education" value={user.education ?? "N/A"} />
                <InfoRow label="Religion" value={user.religion ?? "N/A"} />
                <InfoRow
                  label="Credits"
                  value={String(user.credit_balance ?? 0)}
                />
                <InfoRow
                  label="Submitted"
                  value={formatDateTime(user.submitted_for_verification_at)}
                />
                <InfoRow
                  label="Last Seen"
                  value={formatDateTime(user.last_seen_at)}
                />
              </div>

              {user.bio && (
                <div className="mt-5 rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    Bio
                  </p>
                  <p className="mt-1 text-sm leading-6 text-gray-700">
                    {user.bio}
                  </p>
                </div>
              )}

              {user.verification_note && (
                <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                  <p className="font-semibold">Verification Note</p>
                  <p className="mt-1">{user.verification_note}</p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-100 p-5">
              <h3 className="mb-3 font-semibold text-gray-900">
                Admin Actions
              </h3>

              <div className="flex flex-wrap gap-2">
                {status === "pending" && (
                  <>
                    <button
                      type="button"
                      onClick={onApprove}
                      disabled={actionLoading}
                      className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
                    >
                      Approve
                    </button>

                    <button
                      type="button"
                      onClick={onReject}
                      disabled={actionLoading}
                      className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </>
                )}

                {status === "verified" && (
                  <button
                    type="button"
                    onClick={onUnverify}
                    disabled={actionLoading}
                    className="rounded-xl bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300 disabled:opacity-60"
                  >
                    Unverify
                  </button>
                )}

                <button
                  type="button"
                  onClick={onBanToggle}
                  disabled={actionLoading}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60 ${
                    user.is_banned
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "bg-red-100 text-red-700 hover:bg-red-200"
                  }`}
                >
                  {user.is_banned ? "Unban User" : "Ban User"}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-100 p-5">
              <div className="mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-gray-700" />
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Uploaded ID Card
                  </h3>
                  <p className="text-sm text-gray-500">
                    {getIdTypeLabel(user.verification_id_type)}
                  </p>
                </div>
              </div>

              {idImageUrl ? (
                <button
                  type="button"
                  onClick={() => onPreviewImage(idImageUrl, "Uploaded ID Card")}
                  className="block w-full rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-300"
                >
                  <img
                    src={idImageUrl}
                    alt="Verification ID"
                    className="max-h-[520px] w-full rounded-xl object-contain"
                  />
                  <p className="mt-2 text-center text-xs text-gray-500">
                    Click image to enlarge
                  </p>
                </button>
              ) : (
                <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-500">
                  No ID card uploaded.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-100 p-5">
              <div className="mb-4 flex items-center gap-2">
                <UserRoundCheck className="h-5 w-5 text-gray-700" />
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Uploaded Selfie
                  </h3>
                  <p className="text-sm text-gray-500">
                    Compare this selfie with the ID card face.
                  </p>
                </div>
              </div>

              {user.verification_selfie_url ? (
                <button
                  type="button"
                  onClick={() =>
                    onPreviewImage(
                      user.verification_selfie_url ?? "",
                      "Uploaded Selfie"
                    )
                  }
                  className="block w-full rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-300"
                >
                  <img
                    src={user.verification_selfie_url}
                    alt="Verification selfie"
                    className="max-h-[520px] w-full rounded-xl object-contain"
                  />
                  <p className="mt-2 text-center text-xs text-gray-500">
                    Click image to enlarge
                  </p>
                </button>
              ) : (
                <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-500">
                  No selfie uploaded.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 pb-2 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{value}</span>
    </div>
  );
};

const StatCard = ({ title, value, icon, bg }: StatCardProps) => {
  return (
    <div className={`rounded-xl bg-gradient-to-br ${bg} p-6`}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {icon}
      </div>

      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
};