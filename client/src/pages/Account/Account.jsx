import {
  AppLayout,
  Button,
  GoogleButton,
  Input,
  Select,
} from "../../components";
import { useMobile } from "../../hooks";
import "./Account.css";

const Account = () => {
  const isMobile = useMobile(991);

  return (
    <AppLayout>
      <div className="account-page">
        <div className="top-con">
          <h1>Account</h1>
          <p>Configure your account settings and information</p>
        </div>
        <form className="form-my-account">
          <div className="form-wrap">
            <Input
              label={"Your Name"}
              placeholder={"Charlie Allen"}
              style={{ boxShadow: "0px 1px 2px 0px #0000000D" }}
            />
            <div className="email-con">
              <Input
                label={"Email Address"}
                placeholder={"testemail@gmail.com"}
                type="email"
                style={{
                  border: "none",
                  backgroundColor: "transparent",
                  paddingLeft: "0px",
                }}
              />
              <Button
                text={"Change Email"}
                style={{
                  border: "1px solid #E0E9FE",
                  background: "transparent",
                  color: "#64748B",
                  width: isMobile ? "150px " : "",
                }}
              />
            </div>
            <div className="email-con">
              <Input
                label={"Password"}
                placeholder={"***************"}
                type="password"
                style={{
                  border: "none",
                  backgroundColor: "transparent",
                  paddingLeft: "0px",
                }}
              />
              <Button
                text={"Change Password"}
                style={{
                  border: "1px solid #E0E9FE",
                  background: "transparent",
                  color: "#64748B",
                  width: isMobile ? "200px " : "",
                }}
              />
            </div>
            <div className="google-btn-con">
              <GoogleButton text={"Switch to Google Login"} />
            </div>
            <div className="select-con">
              <Select
                placeholder="United States"
                label={"Country"}
                style={{ backgroundColor: "#F9FAFF", borderRadius: "12px" }}
                options={[
                  "United States",
                  "Canada",
                  "United Kingdom",
                  "Australia",
                  "Germany",
                  "France",
                  "India",
                  "Japan",
                  "China",
                  "Brazil",
                ]}
              />
            </div>
            <div className="select-con">
              <Select
                placeholder="Pacific Time - US & Canada"
                label={"Timezone"}
                showCurrentTime={true}
                style={{ backgroundColor: "#F9FAFF", borderRadius: "12px" }}
                options={[
                  "Pacific Time (US & Canada)",
                  "Mountain Time (US & Canada)",
                  "Central Time (US & Canada)",
                  "Eastern Time (US & Canada)",
                  "Atlantic Time (Canada)",
                  "Greenwich Mean Time (GMT)",
                  "Central European Time (CET)",
                  "Eastern European Time (EET)",
                  "India Standard Time (IST)",
                  "China Standard Time (CST)",
                  "Japan Standard Time (JST)",
                  "Australia Eastern Standard Time (AEST)",
                ]}
              />
            </div>
          </div>

          <div className="btn-wrap-con">
            <div className="btn-wrap">
              <Button
                text={"Cancel"}
                style={{
                  border: "1px solid #E0E9FE",
                  color: "#64748B",
                  backgroundColor: "transparent",
                }}
              />
              <Button text={"Save Changes"} />
            </div>
            <Button
              text={"Delete Account"}
              style={{ backgroundColor: "#DF0404" }}
            />
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default Account;
