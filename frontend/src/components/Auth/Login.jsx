import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "../../lib";
import { Link } from "react-router-dom";
import Input from "../ui/Input/Input";

const LoginPage = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
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

          <Input
              type="password"
            placeholder="Enter your password"
            error={errors.password?.message}
            disabled={isSubmitting}
            style={{ height: "50px" }}
            {...register("password")}
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

        <p className="footer-text">
          Don't have an account?{" "}
          <Link to="/signup" className="login-link">
            Sign Up &rarr;
          </Link>
        </p>

        <p className="google-info">
          I forgot my password. Please{" "}
          <Link to="" className="login-link">
            send me a recovery email &rarr;
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
