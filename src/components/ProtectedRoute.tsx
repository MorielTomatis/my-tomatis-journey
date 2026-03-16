import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?: "parent" | "practitioner";
}

const ProtectedRoute = ({ children, allowedRole }: ProtectedRouteProps) => {
  const { user, role, loading, error } = useAuth();

  if (error) {
    return (
      <main className="min-h-svh flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-xl rounded-xl border border-destructive/20 bg-card p-4 text-center shadow-soft">
          <p className="font-bold text-destructive">שגיאת אימות</p>
          <p className="mt-2 break-words text-sm text-destructive">{error}</p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-svh flex items-center justify-center bg-background">
        <p className="text-muted-foreground">טוען...</p>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && role !== allowedRole) {
    if (role === "practitioner") return <Navigate to="/practitioner" replace />;
    if (role === "parent") return <Navigate to="/" replace />;
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
