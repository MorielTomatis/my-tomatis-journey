import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?: "parent" | "practitioner";
}

const ProtectedRoute = ({ children, allowedRole }: ProtectedRouteProps) => {
  const { user, role, loading, error } = useAuth();

  // Show loading while session OR role is still being resolved
  if (loading) {
    return (
      <main className="min-h-svh flex items-center justify-center bg-background">
        <p className="text-muted-foreground">טוען...</p>
      </main>
    );
  }

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

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role is definitively loaded here (loading is false).
  // Redirect practitioners away from parent routes
  if (allowedRole === "parent" && role === "practitioner") {
    return <Navigate to="/practitioner" replace />;
  }

  // Redirect non-practitioners away from practitioner routes
  if (allowedRole === "practitioner" && role !== "practitioner") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
