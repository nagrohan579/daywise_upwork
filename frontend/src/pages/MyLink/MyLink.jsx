import { useState, useEffect } from "react";
import { FaRegCopy } from "react-icons/fa6";
import { toast } from "sonner";
import { AppLayout, Button, Input } from "../../components";
import "./MyLink.css";

const MyLink = () => {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({
    slug: "",
    businessName: "",
  });

  // Fetch user data on mount
  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/auth/me`, {
        credentials: 'include',
      });

      if (response.status === 401) {
        toast.error('Please log in to access your link');
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const data = await response.json();
      setUserData({
        slug: data.user.slug || "",
        businessName: data.user.businessName || "",
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load your booking link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    // Prefer explicit Vite env var (set in Vercel). Fallback to window.location.origin for local dev.
    const frontendBase = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
    const bookingLink = `${frontendBase}/${userData.slug}`;
    
    navigator.clipboard.writeText(bookingLink).then(() => {
      toast.success('Link copied to clipboard!');
    }).catch((err) => {
      console.error('Failed to copy link:', err);
      toast.error('Failed to copy link');
    });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="mylink-page">
          <div className="top-con">
            <h1>My Link</h1>
            <p>Share your personalized booking page with customers</p>
          </div>
          <div className="mylink-loading">
            <div className="mylink-spinner"></div>
            <p>Loading your booking link...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mylink-page">
        <div className="top-con">
          <h1>My Link</h1>
          <p>Share your personalized booking page with customers</p>
        </div>
        <div className="business-container">
          <div className="business-input-wrap">
            <h3>Your Booking Link</h3>
            <div className="wrap">
              <span>daywisebooking.com/</span>
              <Input
                placeholder={"your-business-name"}
                type="text"
                value={userData.slug}
                readOnly
                style={{ boxShadow: "0px 1px 2px 0px #0000000D", backgroundColor: "#f9fafb", cursor: "default" }}
              />
            </div>
            <p className="link-info">
              This is your personalized booking link. Share it with customers so they can book appointments with you.
            </p>
          </div>
          <div className="btn-copy-con">
            <Button 
              text={"Copy Link"} 
              icon={<FaRegCopy size={18} />}
              onClick={handleCopyLink}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default MyLink;
