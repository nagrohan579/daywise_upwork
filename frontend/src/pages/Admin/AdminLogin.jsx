import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import "./AdminLogin.css";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Hardcoded credentials - bypass Convex
    const ADMIN_EMAIL = "admin@daywise.app";
    const ADMIN_PASSWORD = "admin123";

    try {
      // Check credentials
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        toast.success('Admin login successful!');
        
        // Store admin session in localStorage
        localStorage.setItem('adminLoggedIn', 'true');
        
        // Redirect to admin dashboard
        setTimeout(() => {
          navigate('/admin/dashboard');
        }, 500);
      } else {
        toast.error('Invalid email or password');
      }
    } catch (error) {
      console.error('Admin login error:', error);
      toast.error('An error occurred during login');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-container">
        <div className="admin-login-header">
          <h1>Admin</h1>
          <p>System Administration</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@daywise.app"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            className="admin-login-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
