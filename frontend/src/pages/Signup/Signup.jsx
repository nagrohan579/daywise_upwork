import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SignUpSchema } from "../../lib";
import { Link, useNavigate } from "react-router-dom";
import Input from "../../components/ui/Input/Input";
import { toast } from "sonner";
import { detectUserLocation } from "../../utils/locationDetection";

// Google Icon component
const GoogleIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    width="20px"
    height="20px"
  >
    <path
      fill="#FFC107"
      d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.532,29.368,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.684,43.837,21.37,43.611,20.083z"
    />
    <path
      fill="#FF3D00"
      d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.532,29.368,4,24,4C16.318,4,9.66,8.307,6.306,14.691z"
    />
    <path
      fill="#4CAF50"
      d="M24,44c5.166,0,9.914-1.921,13.409-5.186l-6.088-4.992C29.202,34.02,26.685,36,24,36c-5.202,0-9.623-3.837-11.382-9.192l-6.589,5.204C9.501,38.807,16.318,44,24,44z"
    />
    <path
      fill="#1976D2"
      d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19-5.238C36.971,28.234,39.54,23.68,39.54,20c0-1.37-0.134-2.716-0.386-4.006l-5.657,5.657C33.153,20.598,32,22,32,24C32,28.418,28.418,32,24,32c-2.685,0-4.992-1.382-6.326-3.418l-5.62,4.421C14.655,39.814,19.318,42,24,42c11.045,0,20-8.955,20-20C44,22.684,43.837,21.37,43.611,20.083z"
    />
  </svg>
);

const SignupPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(SignUpSchema),
  });

  const onSubmit = async (data) => {
    try {
      // Detect user's timezone and country automatically
      const location = detectUserLocation();

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          timezone: location.timezone,
          country: location.country
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle error responses
        if (response.status === 409) {
          toast.error('An account with this email already exists');
        } else {
          toast.error(result.message || 'Signup failed. Please try again.');
        }
        return;
      }

      // Success!
      setSignupSuccess(true);
      toast.success('Account created successfully! Please check your email to verify your account.');

      // Optionally redirect to login after a delay
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (error) {
      console.error('Signup error:', error);
      toast.error('An error occurred during signup. Please try again.');
    }
  };

  const handleGoogleSignup = () => {
    // Detect user's timezone and country automatically
    const location = detectUserLocation();

    // Use redirect flow for now (popup has domain issues)
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    window.location.href = `${apiUrl}/api/auth/google?timezone=${encodeURIComponent(location.timezone)}&country=${encodeURIComponent(location.country)}`;
  };

  if (signupSuccess) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="logo-container">
            <Link to={"/"}>
              <img src="/assets/images/logo.svg" alt="logo" />
            </Link>
          </div>
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <svg
              style={{ width: '64px', height: '64px', margin: '0 auto', color: '#10b981' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="title" style={{ marginTop: '1rem' }}>Check your email!</h2>
            <p className="subtitle">We've sent you a verification link. Please check your email and click the link to verify your account.</p>
            <p className="subtitle" style={{ marginTop: '1rem' }}>Redirecting to login...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo-container">
          <Link to={"/"}>
            <img src="/assets/images/logo.svg" alt="logo" />
          </Link>
        </div>
        <h2 className="title">Create your free account</h2>
        <p className="subtitle">No credit card required. Upgrade anytime.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="form">
          <Input
            type="text"
            placeholder="Enter your name"
            error={errors.name?.message}
            disabled={isSubmitting}
            style={{height:"50px"}}
            {...register("name")}
          />

          <Input
            type="email"
            placeholder="Enter your email"
            error={errors.email?.message}
            disabled={isSubmitting}
            style={{height:"50px"}}
            {...register("email")}
          />

          <div style={{ position: 'relative' }}>
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Create a password (min 12 characters)"
              error={errors.password?.message}
              disabled={isSubmitting}
              style={{height:"50px"}}
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
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="separator">
          <hr className="separator-line" />
          <span className="separator-text">OR</span>
          <hr className="separator-line" />
        </div>

        <button
          onClick={handleGoogleSignup}
          className="button google-button"
          disabled={isSubmitting}
        >
          <img src="/assets/images/google-logo.svg" alt="google" />
          <span>Continue with Google</span>
        </button>

        <p className="google-info">
          Continue with Google to create your account.
        </p>

        <p className="footer-text">
          Already have an account?{" "}
          <Link to="/login" className="login-link">
            Log In &rarr;
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
