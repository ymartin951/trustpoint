import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  Heart,
  Compass,
  Users as Users2,
  User,
  Settings,
  LogOut,
  Shield,
  Bell,
  Wallet,
  TrendingUp,
  Gift,
  Crown,
} from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabase } from "../lib/supabase";
import {
  createOnlineStatusChannel,
  trackOnlineStatus,
  untrackOnlineStatus,
  updateLastSeen,
} from "../services/chatService";
import { getTotalLikesCount } from "../services/matchService";
import { getUnreadNotificationsCount } from "../services/notificationService";
import { useAuth } from "../context/AuthContext";
import DailyRewardPopup from "../components/DailyRewardPopup";

type NavigationIcon =
  | typeof Heart
  | typeof Compass
  | typeof Users2
  | typeof User
  | typeof Settings
  | typeof Shield
  | typeof Bell
  | typeof Wallet
  | typeof TrendingUp
  | typeof Gift
  | typeof Crown;

type NavigationItem = {
  name: string;
  href: string;
  icon: NavigationIcon;
  badge?: number;
  adminOnly?: boolean;
  highlight?: boolean;
};

export const DashboardLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut, user } = useAuth();

  const [likesCount, setLikesCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const channel: RealtimeChannel = createOnlineStatusChannel();

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await trackOnlineStatus(channel, user.id);
      }
    });

    const handleBeforeUnload = () => {
      void updateLastSeen(user.id);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      void updateLastSeen(user.id);
      void untrackOnlineStatus(channel);
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    let isMounted = true;

    const loadCounts = async () => {
      if (!user?.id) {
        if (isMounted) {
          setLikesCount(0);
          setNotificationCount(0);
        }
        return;
      }

      const [likesRes, notifRes] = await Promise.all([
        getTotalLikesCount(user.id),
        getUnreadNotificationsCount(user.id),
      ]);

      if (!isMounted) return;

      setLikesCount(likesRes.count ?? 0);
      setNotificationCount(notifRes.count ?? 0);
    };

    void loadCounts();

    return () => {
      isMounted = false;
    };
  }, [user?.id, location.pathname]);

  useEffect(() => {
    const handler = () => setNotificationCount(0);

    window.addEventListener("notifications-read", handler);

    return () => {
      window.removeEventListener("notifications-read", handler);
    };
  }, []);

  const navigation: NavigationItem[] = useMemo(
    () => [
      {
        name: "Discover",
        href: "/dashboard",
        icon: Compass,
      },
      {
        name: "Notifications",
        href: "/notifications",
        icon: Bell,
        badge: notificationCount > 0 ? notificationCount : undefined,
      },
      {
        name: `Likes ${likesCount}`,
        href: "/likes",
        icon: Heart,
      },
      {
        name: "Matches",
        href: "/matches",
        icon: Users2,
      },
      {
        name: "Premium",
        href: "/premium",
        icon: Crown,
        highlight: true,
      },
      {
        name: "Credits",
        href: "/credits",
        icon: Wallet,
      },
      {
        name: "Referrals",
        href: "/referrals",
        icon: Gift,
      },
      {
        name: "Admin Revenue",
        href: "/admin/revenue",
        icon: TrendingUp,
        adminOnly: true,
      },
      {
        name: "Admin",
        href: "/admin",
        icon: Shield,
        adminOnly: true,
      },
      {
        name: "Profile",
        href: "/profile",
        icon: User,
      },
      {
        name: "Settings",
        href: "/settings",
        icon: Settings,
      },
    ],
    [notificationCount, likesCount]
  );

  const visibleNavigation = useMemo(
    () => navigation.filter((item) => !item.adminOnly || profile?.is_admin),
    [navigation, profile?.is_admin]
  );

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard";
    }

    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);

      if (user?.id) {
        await updateLastSeen(user.id);
      }

      await signOut();

      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);

      navigate("/", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DailyRewardPopup />

      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-16 items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="rounded-lg bg-rose-500 p-2">
                <Heart className="h-5 w-5 text-white" fill="white" />
              </div>

              <span className="text-xl font-bold text-rose-600">
                TrustPoint
              </span>
            </Link>

            <div className="hidden items-center gap-3 md:flex">
              {visibleNavigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      active
                        ? item.highlight
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-rose-50 text-rose-600"
                        : item.highlight
                        ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>

                    {item.badge ? (
                      <span className="ml-1 rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 md:hidden"
              aria-label="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white md:hidden">
        <div className="flex items-center justify-around overflow-x-auto py-2">
          {visibleNavigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                to={item.href}
                className={`relative flex min-w-[70px] flex-col items-center px-2 text-xs ${
                  active
                    ? item.highlight
                      ? "text-yellow-600"
                      : "text-rose-600"
                    : item.highlight
                    ? "text-yellow-700"
                    : "text-gray-600"
                }`}
              >
                <div
                  className={`relative rounded-xl p-1.5 ${
                    item.highlight ? "bg-yellow-50" : ""
                  }`}
                >
                  <Icon className="h-5 w-5" />

                  {item.badge ? (
                    <span className="absolute -right-3 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-semibold text-white">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  ) : null}
                </div>

                <span className="mt-1 whitespace-nowrap">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 pb-24 md:pb-6">
        <Outlet />
      </main>
    </div>
  );
};