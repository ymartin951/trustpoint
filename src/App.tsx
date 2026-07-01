import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { UnreadMessagesProvider } from "./context/UnreadMessagesContext";
import { ProtectedRoute, AdminRoute } from "./components/ProtectedRoute";
import { DashboardLayout } from "./components/DashboardLayout";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import Signup from "./pages/Signup";
import { Discover } from "./pages/Discover";
import { Matches } from "./pages/Matches";
import { InboxPage } from "./pages/InboxPage";
import { ChatPage } from "./pages/ChatPage";
import { Profile } from "./pages/Profile";
import { Settings } from "./pages/Settings";
import { Admin } from "./pages/Admin";
import { LikesReceived } from "./pages/LikesReceived";
import { Notifications } from "./pages/Notifications";
import { Credits } from "./pages/Credits";
import { AdminRevenue } from "./pages/AdminRevenue";
import { ToastProvider } from "./context/ToastContext";
import ReferralDashboard from "./pages/ReferralDashboard";
import { Premium } from "./pages/Premium";
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
        <UnreadMessagesProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Discover />} />
<Route path="/notifications" element={<Notifications />} />
<Route path="/matches" element={<Matches />} />
<Route path="/messages" element={<InboxPage />} />
<Route path="/inbox" element={<InboxPage />} />
<Route path="/chat/:conversationId" element={<ChatPage />} />
<Route path="/profile" element={<Profile />} />
<Route path="/profile/:id" element={<Profile />} />
<Route path="/likes" element={<LikesReceived />} />
<Route path="/credits" element={<Credits />} />
<Route path="/referrals" element={<ReferralDashboard />} />
<Route path="/premium" element={<Premium />} />
<Route path="/settings" element={<Settings />} />
<Route
  path="/admin/revenue"
  element={
    <AdminRoute>
      <AdminRevenue />
    </AdminRoute>
  }
/>
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <Admin />
                  </AdminRoute>
                }
              />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </UnreadMessagesProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;