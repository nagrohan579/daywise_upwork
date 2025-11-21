import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "../../lib";
import { Link, useNavigate } from "react-router-dom";
import Input from "../../components/ui/Input/Input";
import { toast } from "sonner";

const LoginPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const emailValue = watch("email");

  const onSubmit = async (data) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important: include cookies
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 403 && result.requiresVerification) {
          toast.error('Please verify your email before logging in. Check your inbox!');
        } else if (response.status === 404) {
          toast.error('No account found with this email. Please sign up first.');
        } else if (response.status === 401) {
          toast.error('Invalid email or password');
        } else if (response.status === 400) {
          toast.error(result.message || 'Please sign in with Google');
        } else {
          toast.error(result.message || 'Login failed. Please try again.');
        }
        return;
      }

      // Success!
      toast.success(`Welcome back, ${result.user.name}!`);
      
      // Redirect to booking page
      setTimeout(() => {
        navigate('/booking');
      }, 500);

    } catch (error) {
      console.error('Login error:', error);
      toast.error('An error occurred during login. Please try again.');
    }
  };

  const handleGoogleLogin = () => {
    // Use redirect flow for now (popup has domain issues)
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    window.location.href = `${apiUrl}/api/auth/google`;
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    // Check if email is filled
    if (!emailValue || !emailValue.trim()) {
      toast.error("Please fill in your email address");
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      // First, check if email exists and if it's a Google-only account
      const checkResponse = await fetch(`${apiUrl}/api/auth/check-email-for-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: emailValue }),
      });

      const checkResult = await checkResponse.json();

      // If email doesn't exist
      if (!checkResult.exists) {
        toast.error(checkResult.message || "Email doesn't exist");
        return;
      }

      // If it's a Google-only account
      if (checkResult.isGoogleOnly) {
        toast.error(checkResult.message || "This is a Google login account. Please login through Google. No password required.");
        return;
      }

      // Email exists and has password - proceed with password reset
      const response = await fetch(`${apiUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: emailValue }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message || "If an account exists with this email, a password reset link will be sent.");
      } else {
        toast.error(result.message || "Failed to send recovery email. Please try again.");
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      toast.error('An error occurred. Please try again.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo-container">
          <Link to={"/"}>
            <img src="/assets/images/logo.svg" alt="logo" />
          </Link>
        </div>
        <h2 className="title">Welcome back</h2>
        <p className="subtitle">Sign in to your account</p>

        <form onSubmit={handleSubmit(onSubmit)} className="form">
          <Input
            type="email"
            placeholder="Enter your email"
            error={errors.email?.message}
            disabled={isSubmitting}
            style={{ height: "50px" }}
            {...register("email")}
          />

          <div style={{ position: 'relative' }}>
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="button primary-button"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="separator">
          <hr className="separator-line" />
          <span className="separator-text">OR</span>
          <hr className="separator-line" />
        </div>

        <button
          onClick={handleGoogleLogin}
          className="button google-button"
          disabled={isSubmitting}
        >
          <img src="/assets/images/google-logo.svg" alt="google" />
          <span>Continue with Google</span>
        </button>

        <p className="footer-text">
          Don't have an account?{" "}
          <Link to="/signup" className="login-link">
            Sign Up &rarr;
          </Link>
        </p>

        <p className="google-info">
          I forgot my password. Please{" "}
          <button
            type="button"
            onClick={handleForgotPassword}
            className="login-link"
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              font: 'inherit',
              cursor: 'pointer',
              textDecoration: 'none',
            }}
          >
            send me a recovery email &rarr;
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
