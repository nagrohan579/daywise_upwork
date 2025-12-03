import React from "react";
import "./PricingTable.css";
// import { Check } from "lucide-react";

// Data structure replicating the table content
const pricingData = {
  plans: {
    free: {
      title: "Free Plan",
      price: "$0/month",
      support: "Standard",
      color: "text-gray-900",
      bgColor: "bg-white",
    },
    pro: {
      title: "Pro Plan",
      price: "$10/month or $96/year",
      support: "Priority",
      color: "text-white",
      bgColor: "bg-blue-600",
    },
  },
  features: [
    {
      name: "Bookings Per Month",
      desc: null,
      free: "5",
      pro: "Unlimited",
      type: "value",
    },
    {
      name: "Services/Appointment Types",
      desc: "Create services/appointments that customers can book",
      free: "1",
      pro: "Unlimited",
      type: "value",
    },
    {
      name: "Intake Forms",
      desc: "Create forms for your customers to fill out",
      free: "1",
      pro: "Unlimited",
      type: "value",
    },
    {
      name: "Email Notifications",
      desc: "Bookings and cancellations",
      free: true,
      pro: true,
      type: "check",
    },
    {
      name: "24-Hour Email Reminders",
      desc: null,
      free: false,
      pro: true,
      type: "check",
    },
    {
      name: "Custom Booking Link",
      desc: null,
      free: true,
      pro: true,
      type: "check",
    },
    {
      name: "Custom Branding",
      desc: "Add your logo, custom colors, and more to your booking form",
      free: "Limited Options",
      desc2: "Only user display name & profile photo",
      pro: true,
      type: "mixed",
    },
    {
      name: "Google Calendar Integration",
      desc: null,
      free: true,
      pro: true,
      type: "check",
    },
    {
      name: "Remove Daywise Branding",
      desc: null,
      free: false,
      pro: true,
      type: "check",
    },
  ],
};

// Component for the Checkmark icon used in the table
const PricingCheck = () => (
  //   <Check className="check-icon" aria-hidden="true" />
  <svg
    width="24"
    height="24"
    viewBox="0 0 25 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M3 12C3 6.615 7.365 2.25 12.75 2.25C18.135 2.25 22.5 6.615 22.5 12C22.5 17.385 18.135 21.75 12.75 21.75C7.365 21.75 3 17.385 3 12ZM16.36 10.186C16.42 10.1061 16.4634 10.0149 16.4877 9.91795C16.512 9.82098 16.5166 9.72014 16.5014 9.62135C16.4861 9.52257 16.4512 9.42782 16.3989 9.3427C16.3465 9.25757 16.2776 9.18378 16.1963 9.12565C16.1149 9.06753 16.0228 9.02624 15.9253 9.00423C15.8278 8.98221 15.7269 8.97991 15.6285 8.99746C15.5301 9.01501 15.4362 9.05205 15.3523 9.10641C15.2684 9.16077 15.1962 9.23135 15.14 9.314L11.904 13.844L10.28 12.22C10.1378 12.0875 9.94978 12.0154 9.75548 12.0188C9.56118 12.0223 9.37579 12.101 9.23838 12.2384C9.10097 12.3758 9.02225 12.5612 9.01882 12.7555C9.0154 12.9498 9.08752 13.1378 9.22 13.28L11.47 15.53C11.547 15.6069 11.6398 15.6662 11.742 15.7036C11.8442 15.7411 11.9533 15.7559 12.0618 15.7469C12.1702 15.738 12.2755 15.7055 12.3701 15.6519C12.4648 15.5982 12.5467 15.5245 12.61 15.436L16.36 10.186Z"
      fill="#0053F1"
    />
  </svg>
);

// Component for the main row structure
const TableRow = ({ feature, index }) => {
  // Determine content for the cell based on type (value, check, or mixed)
  const renderCellContent = (value) => {
    switch (feature.type) {
      case "check":
        return value ? <PricingCheck /> : null;
      case "value":
        return <span className="feature-value">{value}</span>;
      case "mixed":
        if (typeof value === "boolean") {
          return value ? <PricingCheck /> : null;
        }
        // Handle multiline string for limited options
        return <p className="limited-options">{value}</p>;
      default:
        return value;
    }
  };

  // Logic to handle alternating row backgrounds:
  // index 0, 2, 4, 6 (even) -> Feature: odd-row-bg / Plan: even-row-bg
  // index 1, 3, 5, 7 (odd) -> Feature: even-row-bg / Plan: odd-row-bg
  const isEvenIndex = index % 2 === 0;
  const featureBgClass = isEvenIndex ? "odd-row-bg" : "even-row-bg";
  const planBgClass = isEvenIndex ? "even-row-bg" : "odd-row-bg";

  // Check if this is the Email Notifications row (index 2)
  const isEmailNotifications = feature.name === "Email Notifications";
  
  return (
    <div className="contents">
      {/* Feature Name Column (Col 1) */}
      <div
        className={`cell cell-right-border feature-column ${featureBgClass} ${isEmailNotifications ? 'email-notifications-row' : ''}`}
      >
        <p className="feature-name">{feature.name}</p>
        {feature.desc && <p className="feature-description">{feature.desc}</p>}
      </div>

      {/* Free Plan Column (Col 2) */}
      <div
        className={`cell cell-right-border feature-column column-2 ${planBgClass} ${isEmailNotifications ? 'email-notifications-row' : ''}`}
      >
        {renderCellContent(feature.free)}
        {feature.desc && <p className="feature-description two">{feature.desc2}</p>}
      </div>

      {/* Pro Plan Column (Col 3) */}
      <div className={`cell ${planBgClass} ${isEmailNotifications ? 'email-notifications-row' : ''}`}>
        {renderCellContent(feature.pro)}
      </div>
    </div>
  );
};

// Main App Component
const PricingTable = () => {
  return (
    <div className="pricing-container">
      <style>
        {`
          /* === Base Styles and Utilities === */
          .pricing-container {
              font-family: 'Inter', sans-serif;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
              margin-top:60px
          }
          
          .table-wrapper {
              background-color: white;
              border-radius: 14px; 
              overflow: hidden;
              border: 1px solid rgba(100, 116, 139, 0.2);
          }
          
          /* === Grid Layout === */
          .pricing-grid {
              display: grid;
              /* Mobile default: 45% / 27.5% / 27.5% - gives more space to Features column */
              grid-template-columns: 45% 27.5% 27.5%;
              font-size: 0.875rem; /* text-sm */
              text-align: center;
          }
          
          /* Tablet/Desktop breakpoint - Based on Figma: 393px / 341.5px / 341.5px = 36.5% / 31.75% / 31.75% */
          @media (min-width: 769px) {
              .pricing-grid {
                  grid-template-columns: 36.5% 31.75% 31.75%;
                  font-size: 1rem;
              }
          }
          
          /* Mobile specific adjustments */
          @media (max-width: 768px) {
              .pricing-grid {
                  /* Slightly more space for Features column on mobile */
                  grid-template-columns: 46% 27% 27%;
              }
          }
          
          /* Grid rows must use display: contents to work with the parent grid */
          .contents {
            display: contents;
          }

          /* === Cell/Row Styles === */
          .cell {
              border-bottom: 1px solid rgba(100, 116, 139, 0.2);
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 52px; 
              transition: background-color 0.15s ease-in-out;
              font-size: 14px;
              word-break: normal;
              overflow-wrap: break-word;
              hyphens: none;
              white-space: normal;
              padding: 16px 14px;
              background: #FFFFFF;
          }
          
          /* Desktop/Tablet cell padding - Figma: 16px 20px */
          @media (min-width: 769px) {
              .cell {
                  padding: 16px 20px;
              }
          }
          .cell-right-border {
              border-right: 1px solid #64748B33; 
          }
          
  
          
          /* Feature Column (Col 1) */
          .cell.feature-column {
              text-align: left;
              align-items: flex-start;
              flex-direction: column;
              padding: 16px 14px;
              gap: 3px;
              word-break: normal;
              overflow-wrap: break-word;
              hyphens: none;
              white-space: normal;
              min-width: 0; /* Allows flex items to shrink below content size */
          }
          
          /* Desktop/Tablet feature column padding - Figma: 16px 20px */
          @media (min-width: 769px) {
              .cell.feature-column {
                  padding: 16px 20px;
              }
          }
          
          /* === Header Styles (First Row) === */
          .header-cell {
              font-weight: 600;
              border-bottom: 1px solid rgba(100, 116, 139, 0.2);
              background-color:#F9FAFF;
              min-height:68px;
              font-size:14px;
              line-height: 20px;
              word-break: normal;
              overflow-wrap: break-word;
              hyphens: none;
              white-space: normal;
              padding: 16px 14px;
          }
          .header-cell.feature {
              color: #121212; 
              text-align: left;
              display: flex;
              align-items: center;
              padding: 16px 14px;
              border-radius: 14px 0px 0px 0px;
          }
          .header-cell.plan {
              color: #121212;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 16px 20px;
              gap: 4px;
          }
          .header-cell.pro {
              background-color: #0053F1;
              color: #FFFFFF;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 16px 20px;
              gap: 4px;
              border-radius: 0px 14px 0px 0px;
          }
          
          /* Desktop/Tablet header padding - Figma: 16px 20px */
          @media (min-width: 769px) {
              .header-cell.feature {
                  padding: 16px 20px;
              }
              /* Email Notifications row - Figma: 12px 20px */
              .cell.email-notifications-row {
                  padding: 12px 20px;
              }
          }
          .header-cell .price-detail {
              font-weight: 600;
              font-size: 12px;
              line-height: 14px;
              margin: 0;
              text-align: center;
          }
          .header-cell.pro .price-detail {
              color: #FFFFFF;
          }
          
          /* Desktop/Tablet price detail - Figma: 14px/22px */
          @media (min-width: 769px) {
              .header-cell .price-detail {
                  font-size: 14px;
                  line-height: 22px;
              }
          }
          
          /* === Content Styles === */
          .feature-name {
              font-weight: 500;
              font-size: 12px;
              line-height: 15px;
              color: #121212; 
              margin: 0px;
              text-transform: capitalize;
              word-break: normal;
              overflow-wrap: break-word;
              hyphens: none;
              white-space: normal;
              max-width: 100%; /* Ensures text doesn't overflow */
          }
          .feature-description {
              font-size: 8px;
              font-weight: 400;
              line-height: 10px;
              color: #64748B;  
              margin: 0px;
              word-break: normal;
              overflow-wrap: break-word;
              hyphens: none;
              white-space: normal;
          }
          
          /* Desktop/Tablet typography - Figma: feature-name 14px, feature-description 12px */
          @media (min-width: 769px) {
              .feature-name {
                  font-size: 14px;
                  line-height: 20px;
              }
              .feature-description {
                  font-size: 12px;
                  line-height: 12px;
              }
          }
          .feature-description.two {
              font-size: 8px;
              font-weight: 400;
              line-height: 10px;
              color: #64748B;
              text-align: center;
              margin: 0px;
              word-break: normal;
              overflow-wrap: break-word;
              hyphens: none;
              white-space: normal;
          }
          
          /* Desktop/Tablet desc2 text - Figma: 12px */
          @media (min-width: 769px) {
              .feature-description.two {
                  font-size: 12px;
                  line-height: 12px;
              }
          }
          .feature-value {
              font-size: 14px;
              font-weight: 400;
              line-height: 20px;
              color: #121212;
              text-transform: capitalize;
              word-break: normal;
              overflow-wrap: break-word;
              hyphens: none;
              white-space: normal;
          }
          .limited-options {
              font-size: 14px;
              font-weight: 400;
              line-height: 20px;
              color: #121212;
              text-align: center;
              text-transform: capitalize;
              margin: 0px;
              word-break: normal;
              overflow-wrap: break-word;
              hyphens: none;
              white-space: normal;
          }
          
          /* Checkmark */
          .check-icon {
              width: 24px;
              height: 24px;
              color: #0053F1;
          }
          .cell svg {
              width: 24px;
              height: 24px;
          }

          /* === Last Row (Email Support) Specific Styles === */
          .last-row .cell {
            border-bottom: none;
          }
          .last-row .cell.feature-column {
            border-radius: 0px 0px 0px 14px;
          }
          .last-row .cell:last-child {
            border-radius: 0px 0px 14px 0px;
          }
          .column-2 {
            text-align: center;
            align-items: center !important;
          }
    

        `}
      </style>

      <div className="table-wrapper">
        <div className="pricing-grid">
          {/* === Header Row === */}
          <div className="header-cell cell-right-border feature">Features</div>
          <div className="header-cell cell-right-border plan">
            {pricingData.plans.free.title}
            <p className="price-detail">{pricingData.plans.free.price}</p>
          </div>
          <div className="header-cell pro">
            {pricingData.plans.pro.title}
            <p className="price-detail">{pricingData.plans.pro.price}</p>
          </div>

          {/* === Feature Rows === */}
          {pricingData.features.map((feature, index) => (
            <TableRow key={index} feature={feature} index={index} />
          ))}

          {/* === Support Row (Last Row) === */}
          <div className="contents last-row">
            {/* Feature Name Column (Col 1) */}
            <div
              className={`cell cell-right-border feature-column feature-cell`}
            >
              <p className="feature-name">Email Support</p>
            </div>

            {/* Free Plan Column (Col 2) */}
            <div className={`cell cell-right-border free-cell`}>
              <span className="feature-value">
                {pricingData.plans.free.support}
              </span>
            </div>

            {/* Pro Plan Column (Col 3) */}
            <div className={`cell pro-cell`}>
              <span className="feature-value">
                {pricingData.plans.pro.support}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingTable;
