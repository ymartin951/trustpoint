import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: number;
  type: ToastType;
  message: string;
};

type ToastContextType = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now();

    setToasts((prev) => [...prev, { id, type, message }]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3500);
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const value: ToastContextType = {
    success: (message) => showToast("success", message),
    error: (message) => showToast("error", message),
    info: (message) => showToast("info", message),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="fixed right-4 top-4 z-[9999] space-y-3">
        {toasts.map((toast) => {
          const Icon =
            toast.type === "success"
              ? CheckCircle
              : toast.type === "error"
              ? XCircle
              : AlertCircle;

          const styles =
            toast.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : toast.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-blue-200 bg-blue-50 text-blue-700";

          return (
            <div
              key={toast.id}
              className={`flex min-w-[280px] max-w-sm items-start gap-3 rounded-2xl border p-4 shadow-lg ${styles}`}
            >
              <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" />

              <p className="flex-1 text-sm font-medium">{toast.message}</p>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="rounded-full p-1 hover:bg-black/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
};