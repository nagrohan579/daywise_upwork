import { FaRegCopy } from "react-icons/fa6";
import { AppLayout, Button, Input } from "../../components";
import "./MyLink.css";

const MyLink = () => {
  return (
    <AppLayout>
      <div className="mylink-page">
        <div className="top-con">
          <h1>My Link</h1>
          <p>Share your personalized booking page with customers</p>
        </div>
        <div className="business-container">
          <div className="business-input-wrap">
            <h3>Your Business Name</h3>
            <div className="wrap">
              <span>daywisebooking.com/</span>
              <Input
                placeholder={"yourbusinessname"}
                type="text"
                style={{ boxShadow: "0px 1px 2px 0px #0000000D" }}
              />
            </div>
          </div>
          <div className="btn-copy-con">
            <Button text={"Copy Link"} icon={<FaRegCopy size={18} />} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default MyLink;
