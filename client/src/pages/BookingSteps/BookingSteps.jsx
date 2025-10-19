import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SingleCalendar from "../../components/Calendar/SingleCalendar";
import {
  CalendarIcon2,
  ClockIcon,
  GlobeIcon,
  TickIcon,
} from "../../components/SVGICONS/Svg";
import { useMobile } from "../../hooks";

import { Input, Select, Button, Textarea } from "../../components/index";
import "./BookingSteps.css";
const timeSlots = [
  "12:00 PM",
  "12:30 PM",
  "2:00 PM",
  "2:30 PM",
  "4:00 PM",
  "8:00 PM",
];

const BookingSteps = () => {
  const isMobile = useMobile(999);
  const [selectedTime, setSelectedTime] = useState(null);

  const [step, setStep] = useState(1);
  const goToNext = () => setStep((prev) => prev + 1);
  const goToPrev = () => setStep((prev) => prev - 1);

  // Optional: reset to step 1 if layout switches between mobile/desktop
  // useEffect(() => {
  //   setStep(1);
  // }, [isMobile]);

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
  };
  // SCROLL TO TOP
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);
  return (
    <div className="booking-steps-container">
      {console.log("STEPPP", step)}
      <div
        className={`main-wrapper ${
          (isMobile && step === 2) || step === 4 ? "border-hide" : ""
        }`}
      >
        {step === 1 && (
          <div className="steps-one ">
            <div className="left">
              <div className="daywise-branding">
                <Button text={"Powered by Daywise"} />
              </div>
              <div className="profile-con">
                <img
                  src="/assets/images/logo-here.png"
                  alt="logo"
                  style={{ display: "none" }}
                />
                <div className="profile-wrapper">
                  <img src="/assets/images/profile.png" alt="profile" />
                  <h5>Daniel Allen</h5>
                </div>
                <div className="business-wrapper">
                  <h2>Business Name Here</h2>
                  <p>Your business welcome message appears here.</p>
                </div>
                <div className="select-con">
                  <h4>Select Appointment Type</h4>
                  <Select
                    placeholder="30 Minute Appointment"
                    style={{ backgroundColor: "#F9FAFF", borderRadius: "12px" }}
                    options={[
                      "60 Minute Appointment",
                      "90 Minute Appointment",
                      "120 Minute Appointment",
                    ]}
                  />
                </div>
                <p className="description">
                  The service/Appointment description goes here if it has one.
                </p>
              </div>
            </div>
            <div className="right">
              <SingleCalendar onNext={goToNext} notShowTime />
            </div>
          </div>
        )}

        {isMobile && step === 2 && (
          <div className="step-two-mobile">
            <div className="containerr">
              <div className="top">
                <div className="back-arrow">
                  <img
                    src="/assets/images/back-arrow.png"
                    alt="arrow"
                    onClick={goToPrev}
                  />
                </div>
                <div className="heading-con">
                  <div className="daywise-branding">
                    <Button text={"Powered by Daywise"} />
                  </div>
                  <h1 className="appoint-name">30 Minute Appointment</h1>
                  <p>Tuesday, October 7, 2025</p>
                  <Select
                    placeholder="Pacific Time - US & Canada 8:38 AM"
                    style={{ backgroundColor: "#F9FAFF", borderRadius: "50px" }}
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
              <div className="bottom">
                <div className={`time-slot-wrapper `}>
                  {/* <div className="selected-date">
                    <h3>
                      {selectedDate.toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </h3>
                  </div> */}

                  <div className="time-slot-container">
                    {timeSlots.map((time, index) => (
                      <div key={index} className="time-slot-row">
                        {selectedTime === time ? (
                          <div className="time-slot-selected">
                            <div className="selected-time-text">{time}</div>
                            <button className="next-btn" onClick={goToNext}>
                              Next
                            </button>
                          </div>
                        ) : (
                          <button
                            className="time-slot-btn"
                            onClick={() => handleTimeSelect(time)}
                          >
                            {time}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {(!isMobile && step === 2) || (isMobile && step === 3) ? (
          <div className="step-two ">
            <div className="left">
              <div className="back-arrow">
                <img
                  src="/assets/images/back-arrow.png"
                  alt="arrow"
                  onClick={goToPrev}
                />
              </div>
              <div className="daywise-branding">
                <Button text={"Powered by Daywise"} />
              </div>
              <div className="appointment-wrapper">
                <h2>Appointment Name Here</h2>
                <p>
                  The service/Appointment description goes here if it has one.
                </p>
              </div>
              <div className="booking-details">
                <div className="wrap">
                  <ClockIcon />
                  <h4>30 min</h4>
                </div>
                <div className="wrap">
                  <CalendarIcon2 />
                  <h4>4:00-4:30pm, Tuesday, October 7, 2025</h4>
                </div>
                <div className="wrap">
                  <GlobeIcon />
                  <h4>Pacific Time - US & Canada</h4>
                </div>
              </div>
            </div>
            <div className="right">
              <h1>Enter Detail</h1>
              <form className="booking-detail">
                <Input label={"Name*"} placeholder={"Enter name"} />
                <Input label={"Email*"} placeholder={"Enter email address"} />
                <Textarea
                  label={"Comments (optional)"}
                  placeholder={
                    "Please share any comments or questions if needed"
                  }
                  style={{ borderRadius: "12px" }}
                />
                <p className="terms-con-desc">
                  By continuing, you confirm that you have read and agree
                  to Daywise's <Link to={"/terms"}> Terms of Use </Link>  and  
                  <Link to={"/privacy-policy"}> Privacy Notice</Link>.
                </p>
                <Button text={"Complete Booking"} onClick={goToNext} />
              </form>
            </div>
          </div>
        ) : null}

        {(!isMobile && step === 3) || (isMobile && step === 4) ? (
          <div className="step-three">
            <div className="containerr">
              <div className="heading-container">
                <div className="wrap">
                  <TickIcon />
                  <h3>Success! Your are booked in</h3>
                </div>
                <p>A confirmation has been sent to your email.</p>
              </div>
              <div className="appointment-container">
                <div className="daywise-branding">
                  <Button text={"Powered by Daywise"} />
                </div>
                <div className="booking-details">
                  <h1>Appointment Name Here</h1>
                  <div className="wrap">
                    <ClockIcon />
                    <h4>30 min</h4>
                  </div>
                  <div className="wrap">
                    <CalendarIcon2 />
                    <h4>4:00-4:30pm, Tuesday, October 7, 2025</h4>
                  </div>
                  <div className="wrap">
                    <GlobeIcon />
                    <h4>Pacific Time - US & Canada</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default BookingSteps;
