import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema } from "../../lib/ResetPasswordSchema";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Input from "../../components/ui/Input/Input";
import { toast } from "sonner";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data) => {
    if (!token) {
      toast.error('Invalid reset link. Please request a new password reset.');
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          newPassword: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 400) {
          toast.error(result.message || 'Invalid or expired reset link');
        } else {
          toast.error(result.message || 'Password reset failed. Please try again.');
        }
        return;
      }

      toast.success('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('An error occurred. Please try again.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo-container">
          <Link to="/">
            <img src="/assets/images/logo.svg" alt="logo" />
          </Link>
        </div>
        <h2 className="title">Reset your password</h2>
        <p className="subtitle">Enter your new password below</p>

        <form onSubmit={handleSubmit(onSubmit)} className="form">
          <div style={{ position: 'relative' }}>
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="New password (min 12 characters)"
              error={errors.password?.message}
              disabled={isSubmitting}
              style={{ height: "50px" }}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '15px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#6b7280'
              }}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <div style={{ position: 'relative' }}>
            <Input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm new password"
              error={errors.confirmPassword?.message}
              disabled={isSubmitting}
              style={{ height: "50px" }}
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '15px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#6b7280'
              }}
            >
              {showConfirmPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="button primary-button"
          >
            {isSubmitting ? "Resetting password..." : "Reset password"}
          </button>
        </form>

        <p className="footer-text">
          Remember your password?{" "}
          <Link to="/login" className="login-link">
            Back to Login &rarr;
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
