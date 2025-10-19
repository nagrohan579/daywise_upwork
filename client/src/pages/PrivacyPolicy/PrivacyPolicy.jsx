import { Footer, Header } from "../../components";
import "./PrivacyPolicy.css";

const PrivacyPolicy = () => {
  return (
    <>
      <Header />
      <div className="terms-con">
        <h1>Privacy Policy</h1>
        <div className="content">
          <p>
            Last updated: October 1, 2025 <br />
            <br /> Daywise Booking (“we,” “our,” or “us”) values your privacy.
            This Privacy Policy explains how we collect, use, and protect your
            data when you use our booking application (the “App”).
            <br />
            <br /> 1. Information We Collect
            <ul>
              <li>
                Account Information: Name, email, password (if using email
                signup), or Google account info (if signing in with Google).
              </li>
              <li>
                Business Information: Business name, appointment details,
                schedule preferences.
              </li>
              <li>
                Usage Data: Technical logs (browser type, device, IP address)
                for app performance and security.
              </li>
            </ul>
            <br /> 2. How We Use Your Information
            <br />
            We use your data to:
            <ul>
              <li>Create and manage your account.</li>
              <li>Display and operate your booking form.</li>
              <li>Provide customer support.</li>
              <li>Improve and secure the App.</li>
            </ul>
            <br /> 3. Sharing of Information
            <br />
            We do not sell your personal information. We may share limited data
            with:
            <ul>
              <li>
                {" "}
                Service providers (e.g., hosting, database, Google Calendar
                integration).
              </li>
              <li>Legal authorities if required by law.</li>
            </ul>
            <br /> 4. Cookies & Tracking
            <br /> We use cookies or tokens to keep you logged in. Disabling
            cookies may limit functionality.
            <br /> 5. Data Retention <br /> We keep your account data while your
            account is active. You may request deletion of your data at any
            time.
            <br /> <br />
            6. Security <br /> We use encryption, secure hosting, and access
            controls to protect your data. However, no system is 100% secure.{" "}
            <br /> <br />
            7. Your Rights <br /> You may request at any time:
            <ul>
              <li>Access to your personal data.</li>
              <li>Correction or deletion of your data.</li>
              <li>To opt out of marketing communications.</li>
            </ul>
            <br /> 8. Children’s Privacy <br /> Our App is not intended for
            children under 13. We do not knowingly collect data from minors.
            <br /> <br /> 9. International Users <br /> Data may be stored or
            processed in Canada or other countries where our service providers
            operate.
            <br /> <br /> 10. Changes to this Policy
            <br /> ThWe may update this Privacy Policy from time to time.
            Updates will be posted within the App.
            <br />
            <br /> 11. Contact
            <br /> For questions, contact us at:{" "}
            <a href="mailto:hello@daywisebooking.com" className="contact-link">
              hello@daywisebooking.com
            </a>
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default PrivacyPolicy;
