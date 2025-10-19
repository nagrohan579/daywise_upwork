import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SignUpSchema } from "../../helpers";
import { Link } from "react-router-dom";
import Input from "../UI/Input/Input";

// Placeholder icons (you'd replace these with SVG or components)
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
// Logo placeholder (replace with your actual image)

const SignupPage = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(SignUpSchema),
  });

  const onSubmit = (data) => {
    // Simulate API call
    console.log("Form submitted:", data);
    return new Promise((resolve) => setTimeout(resolve, 1500));
  };

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
            type="email"
            placeholder="Enter your email"
            error={errors.email?.message}
            disabled={isSubmitting}
            style={{height:"50px"}}
            {...register("email")}
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="button primary-button"
          >
            {isSubmitting ? "Continuing..." : "Continue with email"}
          </button>
        </form>

        <div className="separator">
          <hr className="separator-line" />
          <span className="separator-text">OR</span>
          <hr className="separator-line" />
        </div>

        <button
          onClick={() => console.log("Continue with Google")}
          className="button google-button"
          disabled={isSubmitting}
        >
          <img src="/assets/images/google-logo.svg" alt="google" />
          <span>Continue with Google</span>
        </button>

        <p className="google-info">
          Continue with Google to connect your calendar.
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
