import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Heart, MessageCircle, Zap, Eye, CheckCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  getAllNotifications,
  markAllNotificationsAsRead,
  markConversationMessagesAsRead,
  markLikeNotificationAsRead,
  markProfileViewNotificationAsRead,
  markSuperLikeAsRead,
  type AppNotification,
} from "../services/notificationService";
import { getAvatarUrl } from "../lib/utils";

const formatTimeAgo = (dateString: string) => {
  const now = new Date().getTime();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
};

export const Notifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  const notifyBadgeToRefresh = () => {
    window.dispatchEvent(new Event("notifications-read"));
    window.dispatchEvent(new Event("notifications-updated"));
  };

  const markLocalNotificationAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notificationId ? { ...item, is_read: true } : item
      )
    );

    notifyBadgeToRefresh();
  };

  const loadNotifications = async () => {
    if (!user?.id) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await getAllNotifications(user.id);

    if (error) {
      console.error("Failed to load notifications:", error);
      setNotifications([]);
    } else {
      setNotifications(data ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadNotifications();
  }, [user?.id]);

  const handleMarkAllAsRead = async () => {
    if (!user?.id || unreadCount === 0) return;

    try {
      setMarkingAll(true);

      const { error } = await markAllNotificationsAsRead(user.id);

      if (error) {
        console.error("Failed to mark all notifications as read:", error);
        return;
      }

      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          is_read: true,
        }))
      );

      notifyBadgeToRefresh();
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = async (notification: AppNotification) => {
    if (!user?.id) return;

    if (notification.type === "like") {
      if (!notification.is_read) {
        const { error } = await markLikeNotificationAsRead(
          notification.id,
          user.id
        );

        if (!error) {
          markLocalNotificationAsRead(notification.id);
        }
      }

      if (notification.actor_id) {
        navigate(`/profile/${notification.actor_id}`);
      }

      return;
    }

    if (notification.type === "super_like") {
      if (!notification.is_read) {
        const { error } = await markSuperLikeAsRead(notification.id, user.id);

        if (!error) {
          markLocalNotificationAsRead(notification.id);
        }
      }

      if (notification.actor_id) {
        navigate(`/profile/${notification.actor_id}`);
      }

      return;
    }

    if (notification.type === "profile_view") {
      if (!notification.is_read) {
        const { error } = await markProfileViewNotificationAsRead(
          notification.id,
          user.id
        );

        if (!error) {
          markLocalNotificationAsRead(notification.id);
        }
      }

      if (notification.actor_id) {
        navigate(`/profile/${notification.actor_id}`);
      } else {
        navigate("/profile");
      }

      return;
    }

    if (notification.type === "message") {
      if (!notification.conversation_id) return;

      if (!notification.is_read) {
        const { error } = await markConversationMessagesAsRead(
          notification.conversation_id,
          user.id
        );

        if (!error) {
          markLocalNotificationAsRead(notification.id);
        }
      }

      navigate(`/chat/${notification.conversation_id}`);
    }
  };

  const getNotificationIcon = (type: AppNotification["type"]) => {
    if (type === "super_like") return Zap;
    if (type === "like") return Heart;
    if (type === "profile_view") return Eye;
    return MessageCircle;
  };

  const getIconStyle = (type: AppNotification["type"]) => {
    if (type === "super_like") return "bg-blue-600";
    if (type === "like") return "bg-rose-500";
    if (type === "profile_view") return "bg-purple-600";
    return "bg-green-600";
  };

  const getUnreadStyle = (notification: AppNotification) => {
    if (notification.is_read) return "bg-white opacity-80";

    if (notification.type === "super_like") {
      return "bg-blue-50 ring-1 ring-blue-100";
    }

    if (notification.type === "message") {
      return "bg-green-50 ring-1 ring-green-100";
    }

    if (notification.type === "profile_view") {
      return "bg-purple-50 ring-1 ring-purple-100";
    }

    return "bg-rose-50 ring-1 ring-rose-100";
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-rose-500" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="py-20 text-center">
        <Bell className="mx-auto h-10 w-10 text-gray-400" />
        <h2 className="mt-4 text-xl font-semibold">No notifications yet</h2>
        <p className="mt-2 text-gray-500">
          Likes, Super Likes, profile views, and messages will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-rose-500" />
          <h1 className="text-2xl font-bold">Notifications</h1>

          {unreadCount > 0 && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void handleMarkAllAsRead()}
            disabled={markingAll}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
          >
            <CheckCheck className="h-4 w-4" />
            {markingAll ? "Marking..." : "Mark all read"}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.map((notification) => {
          const Icon = getNotificationIcon(notification.type);

          return (
            <button
              key={`${notification.type}-${notification.id}`}
              type="button"
              onClick={() => void handleNotificationClick(notification)}
              className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left shadow-sm transition hover:shadow-md ${getUnreadStyle(
                notification
              )}`}
            >
              <div className="relative">
                <img
                  src={getAvatarUrl(notification.avatar_url ?? "")}
                  alt={notification.title}
                  className="h-14 w-14 rounded-full object-cover"
                />

                <span
                  className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-white ${getIconStyle(
                    notification.type
                  )}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>

                {!notification.is_read && (
                  <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2
                    className={`truncate text-sm ${
                      notification.is_read
                        ? "font-medium text-gray-800"
                        : "font-bold text-gray-900"
                    }`}
                  >
                    {notification.title}
                  </h2>

                  <span className="text-xs text-gray-400">
                    {formatTimeAgo(notification.created_at)}
                  </span>
                </div>

                <p
                  className={`truncate text-sm ${
                    notification.is_read ? "text-gray-500" : "text-gray-700"
                  }`}
                >
                  {notification.body}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};