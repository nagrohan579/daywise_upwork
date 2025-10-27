import { useState } from "react";
import { toast } from "sonner";
import AppLayout from "../../components/Sidebar/Sidebar";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input/Input";
import Textarea from "../../components/ui/Input/Textarea";
import "./Feedback.css";

const Feedback = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate fields
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    
    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }
    
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    
    setSubmitting(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to submit feedback");
      }
      
      toast.success("Feedback sent successfully!");
      
      // Clear all fields
      setName("");
      setEmail("");
      setMessage("");
    } catch (error) {
      console.error("Feedback submission error:", error);
      toast.error(error.message || "Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="feedback-page">
        <div className="feedback-header">
          <div className="wrap">
            <h1>Leave Us Feedback</h1>
            <p className="feedback-description">
              Let us know your thoughts. whether it's a new feature you'd like to see, something that's not working right, or an idea to make things smoother. Every suggestion helps improve the experience for everyone.
            </p>
          </div>
        </div>

        <div className="feedback-form-section">
          <div className="feedback-form-container">
            <div className="input-group">
              <label htmlFor="name">Name*</label>
              <div className="input-wrapper">
                <input
                  id="name"
                  type="text"
                  placeholder="Enter name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="feedback-input"
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="email">Email*</label>
              <div className="input-wrapper">
                <input
                  id="email"
                  type="email"
                  placeholder="Enter email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="feedback-input"
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="message">Your Message</label>
              <div className="input-wrapper">
                <textarea
                  id="message"
                  placeholder="Type your message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="feedback-textarea"
                  rows={5}
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={handleSubmit}
                className="submit-button"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Message"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Feedback;

