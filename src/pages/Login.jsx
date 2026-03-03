import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/UI/button";
import { Input } from "@/components/UI/input";
import { cn } from "@/lib/utils";

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!email?.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Invalid email";
    if (!password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Side - Branding */}
      <div className="relative hidden bg-muted lg:block">
        <div className="absolute left-8 top-8 text-lg font-semibold">
          POS-IMS
        </div>
        <div className="absolute bottom-8 left-8 right-8 text-sm">
          <blockquote className="space-y-2">
            <p>
              &ldquo;This library has saved me countless hours of work and helped me
              deliver stunning designs to my clients faster than ever before.&rdquo;
            </p>
            <footer className="text-muted-foreground">
              — Sofia Davis
            </footer>
          </blockquote>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex flex-col">
        <div className="flex justify-end p-8">
          <Link
            to="/login"
            className="text-sm font-medium text-foreground hover:text-primary"
          >
            Login
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center p-8 pt-0">
          <form
            onSubmit={handleSubmit}
            className="mx-auto w-full max-w-sm space-y-6"
          >
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                Login
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter your email and password to sign in
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                  }}
                  className={cn(errors.email && "border-red-500 focus:ring-red-500")}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
                    }}
                    className={cn(
                      "pr-10",
                      errors.password && "border-red-500 focus:ring-red-500"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in with Email"}
              </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Run <code className="bg-muted px-1.5 py-0.5 rounded text-xs">npm run seed</code> in backend to create admin user
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
