import { AppLayout, Button, PricingTable } from "../../components";
import "./Billing.css";

const Billing = () => {
  return (
    <AppLayout>
      <div className="billing-page">
        <div className="top-con">
          <h1>Billing & Subsciption</h1>
          <p>Manage your subscription and payment methods</p>
        </div>
        <div className="subscription-plan-con">
          <div className="header">
            <h1>Subscription Plans</h1>
            <div className="subscription-card-box">
              <div className="subs-card">
                <div className="boxx">
                  <div className="top-content">
                    <div className="wrap">
                      <h3>Free Plan</h3>
                      <h5>$0/month</h5>
                    </div>
                    <p>
                      Perfect for getting started. Manage your first bookings
                      with all the essential tools at no cost.
                    </p>
                  </div>
                  <Button
                    text={"Your Current Plan"}
                    style={{ backgroundColor: "#64748B33", color: "#64748B" }}
                  />
                </div>
              </div>
              <div className="subs-card">
                <div className="boxx">
                  <div className="top-content">
                    <div className="wrap">
                      <h3>Pro Plan</h3>
                      <h5>$10/month</h5>
                    </div>
                    <p>
                      Perfect for getting started. Manage your first bookings
                      with all the essential tools at no cost.
                    </p>
                  </div>
                  <Button
                    text={"Select"}
                    style={{ backgroundColor: "#0053F1", color: "#fff" }}
                  />
                </div>
              </div>
              <div className="subs-card">
                <div className="boxx">
                  <div className="top-content">
                    <div className="wrap">
                      <h3>Pro Plan</h3>
                      <h5>$96/month</h5>
                    </div>
                    <p>
                      Get the full power of Pro for only $96 a year and save
                      20%. Unlock unlimited bookings, custom branding, and
                      automated reminders while keeping more money in your
                      pocket.
                    </p>
                  </div>
                  <Button
                    text={"Select"}
                    style={{ backgroundColor: "#0053F1", color: "#fff" }}
                  />
                </div>
              </div>
            </div>
          </div>
          <PricingTable />
        </div>
        <div className="add-update-billing-card">
          <h1>Add/Update Your Payment Method</h1>
          <p className="no-card-text">You have no payment methods added.</p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Billing;
