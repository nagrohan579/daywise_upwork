import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import Slider from "react-slick";

import { FAQ, Footer, Header } from "../../components";
import "./Home.css";

const canvaCards = [
  {
    img: "/assets/images/rocket-logo.png",
    title: "Add it easily",
    desc: "Drop a booking block right into your Canva site. No setup headaches.",
  },
  {
    img: "/assets/images/paint.png",
    title: "Matches your brand",
    desc: "Pick your main colors so the booking form blends in with your site.",
  },
  {
    img: "/assets/images/calendar.png",
    title: "Your schedule, your way",
    desc: "Set your weekly hours and block off special days like vacations. Choose different appointment types and times.",
  },
  {
    img: "/assets/images/email.png",
    title: "Instant confirmations",
    desc: "You and your guests get automatic email confirmations when a booking is made.",
  },
  {
    img: "/assets/images/dashboard.png",
    title: "Simple dashboard",
    desc: "See all your bookings in one place. Change your availability or appointment details anytime.",
  },
  {
    img: "/assets/images/price.png",
    title: "Clear pricing",
    desc: "Start free. Upgrade only if you need more features like extra appointment types or custom branding.",
  },
];
const stepsCard = [
  {
    step: "1",
    title: "Connect",
    desc: "Create an account with your email or Google. Add your business name, timezone, and hours.",
  },
  {
    step: "2",
    title: "Set your schedule",
    desc: "Set your appointment types, and choose when you're available.",
  },
  {
    step: "3",
    title: "Add to Canva",
    desc: "Place your booking form on your Canva website. Visitors pick a time, and you both get a confirmation.",
  },
];
const Home = () => {
  const sliderRef = useRef(null);
  const [billing, setBilling] = useState("monthly");

  const settings = {
    dots: false,
    arrows: false,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: 1 } },
      { breakpoint: 640, settings: { slidesToShow: 1 } },
    ],
  };
  return (
    <>
      <Header />
      <section className="section-one ">
        <div className="containerr">
          <div className="left">
            <h1>Scheduling made simple.</h1>
            <p>
              Easily book appointments & meetings with Canva's #1 scheduling
              tool.
            </p>
            <button className="signup-btn">
              <Link to={"/signup"}> Sign up free</Link>
            </button>
            <h5 className="no-credit">
              No credit card required • Free plan available
            </h5>
          </div>
          <div className="right">
            <img src="/assets/images/hero-right-image.png" alt="hero-right" />
          </div>
        </div>
      </section>
      <section className="section-two ">
        <div className="con">
          <h5 className="trusted">Trusted by</h5>
          <div className="img-con">
            <img src="/assets/images/google.svg" alt="google" />
            <img src="/assets/images/canva.svg" alt="google" />
            <img src="/assets/images/google-calendar.svg" alt="google" />
          </div>
        </div>
      </section>
      <section className="section-three ">
        <h1>Why it's perfect for Canva sites</h1>
        <div className="card-con">
          {canvaCards.map((card, index) => (
            <div className="cardd" key={index}>
              <img src={card.img} alt={card.title} />
              <div className="content">
                <h3>{card.title}</h3>
                <p>{card.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="section-four ">
        <div className="con">
          <h1>How it works</h1>
          <div className="card-con">
            {stepsCard.map((item, index) => (
              <div className="cardd" key={index}>
                <div className="box">{item.step}</div>
                <div className="content">
                  <h4>{item.title}</h4>
                  <p>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="card-slider-wrapper">
            <Slider ref={sliderRef} {...settings}>
              {stepsCard.map((item, index) => (
                <div className="slide" key={index}>
                  <div className="cardd">
                    <div className="box">{item.step}</div>
                    <div className="content">
                      <h4>{item.title}</h4>
                      <p>{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </Slider>

            {/* Buttons below the slider */}
            <div className="custom-arrow-container">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                onClick={() => sliderRef.current?.slickPrev()}
              >
                <path
                  d="M6.75 15.75L3 12M3 12L6.75 8.25M3 12H21"
                  stroke="black"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                onClick={() => sliderRef.current?.slickNext()}
              >
                <path
                  d="M17.25 15.75L21 12M21 12L17.25 8.25M21 12H3"
                  stroke="black"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </section>
      <section className="section-five ">
        <div className="con">
          <h1>Pick the perfect plan</h1>
          <div className="toggle-plan">
            <button
              className={billing === "monthly" ? "monthly active" : ""}
              onClick={() => setBilling("monthly")}
            >
              Billed monthly
            </button>
            <button
              className={billing === "yearly" ? "yearly active" : ""}
              onClick={() => setBilling("yearly")}
            >
              Billed yearly
            </button>
          </div>
          {/* Plan Cards */}
          <div className="plan-card-con">
            {billing === "monthly" ? (
              <>
                <div className="plans free">
                  <h3 className="plan-head">Free Plan</h3>
                  <h2 className="price">$0/month</h2>
                  <ul>
                    <li>5 bookings per month</li>
                    <li>1 appointment type</li>
                    <li>Email confirmations</li>
                    <li>Custom booking link</li>
                    <li>Google calendar integration</li>
                    <li>Email support</li>
                  </ul>
                  <button className="select-plan-btn free">Select Plan</button>
                </div>

                <div className="plans pro">
                  <div className="ribbon">Popular</div>
                  <h3 className="plan-head">Pro Plan</h3>
                  <h2 className="price">$10/month</h2>
                  <ul>
                    <li>Unlimited bookings per month</li>
                    <li>Unlimited appointment types</li>
                    <li>Email confirmations</li>
                    <li>24-hour email reminders</li>
                    <li>Custom booking link</li>
                    <li>Custom branding</li>
                    <li>Google calendar integration</li>
                    <li>Remove Daywise branding</li>
                    <li>Priority email support</li>
                  </ul>
                  <button className="select-plan-btn pro">Select Plan</button>
                </div>

                <div className="plans pro mobile">
                  <div className="ribbon">Best Savings</div>
                  <h3 className="plan-head">Pro Plan</h3>
                  <h2 className="price">$96/year</h2>
                  <ul>
                    <li>Unlimited bookings per month</li>
                    <li>Unlimited appointment types</li>
                    <li>Email confirmations</li>
                    <li>24-hour email reminders</li>
                    <li>Custom booking link</li>
                    <li>Custom branding</li>
                    <li>Google calendar integration</li>
                    <li>Remove Daywise branding</li>
                    <li>Priority email support</li>
                  </ul>
                  <button className="select-plan-btn pro">Select Plan</button>
                </div>
              </>
            ) : (
              <>
                <div className="plans free">
                  <h3 className="plan-head">Free Plan</h3>
                  <h2 className="price">$0/year</h2>
                  <ul>
                    <li>5 bookings per month</li>
                    <li>1 appointment type</li>
                    <li>Email confirmations</li>
                    <li>Custom booking link</li>
                    <li>Google calendar integration</li>
                    <li>Email support</li>
                  </ul>
                  <button className="select-plan-btn free">Select Plan</button>
                </div>

                <div className="plans pro">
                  <div className="ribbon">Best Savings</div>
                  <h3 className="plan-head">Pro Plan</h3>
                  <h2 className="price">$96/year</h2>
                  <ul>
                    <li>Unlimited bookings per month</li>
                    <li>Unlimited appointment types</li>
                    <li>Email confirmations</li>
                    <li>24-hour email reminders</li>
                    <li>Custom booking link</li>
                    <li>Custom branding</li>
                    <li>Google calendar integration</li>
                    <li>Remove Daywise branding</li>
                    <li>Priority email support</li>
                  </ul>
                  <button className="select-plan-btn pro">Select Plan</button>
                </div>
              </>
            )}
          </div>
          <p className="prices-shown">Prices shown in USD.</p>
        </div>
      </section>
      <section className="section-six ">
        <h1>FAQ</h1>
        <FAQ />
      </section>
      <section className="section-seven ">
        <div className="con">
          <h1>Start accepting bookings in minutes.</h1>
          <button> <Link to={"/signup"}>Get started - it's free</Link></button>
        </div>
      </section>
      <Footer />
    </>
  );
};

export default Home;
