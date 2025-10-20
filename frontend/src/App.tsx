import { Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "sonner";

// Pages - will be created/ported from UI code
import HomePage from "./pages/Home";
import LoginPage from "./pages/Login";
import SignupPage from "./pages/Signup";
import VerifyPage from "./pages/Verify";
import BookingsPage from "./pages/Booking";
import ServicePage from "./pages/Service";
import AvailabilityPage from "./pages/Availability";
import BrandingPage from "./pages/Branding";
import MyLinkPage from "./pages/MyLink";
import SettingsPage from "./pages/Settings";
import AccountPage from "./pages/Account";
import BillingPage from "./pages/Billing";
import BookingStepsPage from "./pages/BookingSteps";
import TermsPage from "./pages/Terms";
import PrivacyPolicyPage from "./pages/PrivacyPolicy";

// Import slick carousel CSS for calendar/slider components
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="bottom-right" richColors />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify/:token" element={<VerifyPage />} />
        <Route path="/verify-error" element={<VerifyPage />} />
        <Route path="/dashboard" element={<BookingsPage />} />
        <Route path="/booking" element={<BookingsPage />} />
        <Route path="/service" element={<ServicePage />} />
        <Route path="/availability" element={<AvailabilityPage />} />
        <Route path="/branding" element={<BrandingPage />} />
        <Route path="/my-link" element={<MyLinkPage />} />
        <Route path="/setting" element={<SettingsPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/booking-steps" element={<BookingStepsPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </QueryClientProvider>
  );
}

export default App;
