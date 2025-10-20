import { useState } from "react";

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: "How do I add this to my Canva website?",
      answer:
        "You can embed the booking widget directly into your Canva website using the embed code we provide.",
    },
    {
      question: "Can I change the colors to match my brand?",
      answer:
        "Yes, you can customize the booking page colors and branding in your account settings. This feature is limited to Pro plan accounts. Free account customization is limited to your personal display name and profile photo.",
    },
    {
      question: "Will my customers get confirmation?",
      answer:
        "Customers will receive an instant email confirmation after booking.",
    },
    {
      question: "Can I offer different types of appointments or services?",
      answer:
        "Absolutely, you can create multiple appointment types with different durations and settings. This feature is limited to 1 appointment/service type for free accounts. Paid plans can have unlimited services/appointment types.",
    },
    {
      question: "Is it really free?",
      answer: "Yes! We offer a free plan with no hidden costs.",
    },
    {
      question: "What if I need to close for vacation?",
      answer:
        "You can block off dates in your availability settings whenever you need time off.",
    },
    {
      question: "How do I manage my appointments?",
      answer:
        "You can view and manage all bookings from your dashboard or through Google Calendar integration.",
    },
    {
      question: "Can I cancel or reschedule bookings?",
      answer:
        "Yes, both you and your customers can cancel or reschedule appointments easily.",
    },
  ];

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <>
      <div className="faq-con">
        {faqs.map((item, index) => (
          <div key={index} className="faq-block">
            <div
              className={`faq-item ${openIndex === index ? "open" : ""}`}
              onClick={() => toggleFAQ(index)}
            >
              <span>{item.question}</span>
              <span className="arrow">›</span>
            </div>
            <div className={`faq-answer ${openIndex === index ? "show" : ""}`}>
              <p>{item.answer}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
