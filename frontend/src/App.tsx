import { Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "sonner";
import { ImageCropProvider } from "./providers/ImageCropProvider";

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
import PublicBookingPage from "./pages/PublicBooking";
import TermsPage from "./pages/Terms";
import PrivacyPolicyPage from "./pages/PrivacyPolicy";
import FeedbackPage from "./pages/Feedback/Feedback";
import PaymentsPage from "./pages/Payments/Payments";
import EventPage from "./pages/Event";
import CancelledEventPage from "./pages/CancelledEvent/CancelledEvent";
import RescheduleBookingPage from "./pages/RescheduleBooking/RescheduleBooking";
import AdminLogin from "./pages/Admin/AdminLogin";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import Onboarding from "./pages/Onboard/Onboarding";

// Import slick carousel CSS for calendar/slider components
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ImageCropProvider>
        <Toaster position="bottom-right" richColors />
        <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify/:token" element={<VerifyPage />} />
        <Route path="/verify-error" element={<VerifyPage />} />
        <Route path="/booking" element={<BookingsPage />} />
        <Route path="/service" element={<ServicePage />} />
        <Route path="/availability" element={<AvailabilityPage />} />
        <Route path="/branding" element={<BrandingPage />} />
        <Route path="/my-link" element={<MyLinkPage />} />
        <Route path="/setting" element={<SettingsPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/onboard" element={<Onboarding />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/reschedule_event/:token" element={<RescheduleBookingPage />} />
        <Route path="/event/:token" element={<EventPage />} />
        <Route path="/cancelled_event/:slug" element={<CancelledEventPage />} />
        {/* Public booking page - must be last to catch slug routes */}
        <Route path="/:slug" element={<PublicBookingPage />} />
      </Routes>
      </ImageCropProvider>
    </QueryClientProvider>
  );
}

export default App;
