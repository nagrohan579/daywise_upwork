import { Footer, Header } from "../../components";
import "./Terms.css";
const Terms = () => {
  return (
    <>
      <Header />
      <div className="terms-con">
        <h1>Terms of Service</h1>
        <div className="content">
          <p>
            Last updated: October 1, 2025 <br />
            <br /> Welcome to Daywise Booking (“we,” “our,” or “us”). By
            accessing or using our booking application through Canva (the
            “App”), you agree to these Terms of Service (“Terms”). Please read
            them carefully.
            <br />
            <br /> 1. Acceptance of Terms
            <br /> By using our App, you confirm that you are at least 18 years
            old and legally able to enter into this agreement. If you do not
            agree to these Terms, do not use the App.
            <br /> <br /> 2. Our Service
            <br /> Daywise Booking provides scheduling and booking functionality
            that you can embed into Canva designs and websites.We reserve the
            right to modify, suspend, or discontinue features at any time.
            <br /> <br /> 3. User Accounts
            <ul>
              <li> You must create an account to use the App.</li>
              <li>
                You agree to provide accurate information (e.g., business name,
                schedule).
              </li>
              <li>
                You are responsible for safeguarding your login credentials and
                all activity under your account.
              </li>
            </ul>
            <br /> <br /> 4. Acceptable Use
            <br /> You agree not to:
            <ul>
              <li>
                {" "}
                Misuse the App for fraudulent, unlawful, or harmful activity.
              </li>
              <li> Attempt to disrupt, reverse-engineer, or damage the App.</li>
              <li>
                Share, sublicense, or resell the service without our permission.
              </li>
            </ul>
            <br /> <br /> 5. Booking Transactions <br /> All scheduling and
            appointment details are managed directly between you and your
            customers.Daywise Booking is not responsible for cancellations,
            no-shows, disputes, or outcomes of bookings.
            <br /> <br /> 6. Payments (if applicable) <br /> If you purchase
            paid features, payments are processed securely through third-party
            providers (e.g., Stripe).Refunds and billing disputes are subject to
            the policies of those providers. 7. Data & Privacy <br /> Your use
            of the App is also governed by our [Privacy Policy]. We do not sell
            user data.
            <br /> <br /> 8. Termination <br /> We may suspend or terminate your
            access if you violate these Terms. You may stop using the App at any
            time.
            <br /> <br /> 9. Limitation of Liability <br /> We provide the App
            “as is,” without warranties of any kind. To the maximum extent
            permitted by law, we are not liable for lost data, missed bookings,
            or indirect, incidental, or consequential damages.
            <br /> <br /> 10. Governing Law <br /> These Terms are governed by
            the laws of Canada (Province of British Columbia). <br />
            <br /> 11. Contact <br /> For questions or support, contact us at: {" "}
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

export default Terms;
