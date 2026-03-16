import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?: "parent" | "practitioner";
}

const ProtectedRoute = ({ children, allowedRole }: ProtectedRouteProps) => {
  const { user, role, loading } = useAuth();

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
    // Wrong role — redirect to correct dashboard
    if (role === "practitioner") return <Navigate to="/practitioner" replace />;
    if (role === "parent") return <Navigate to="/" replace />;
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
