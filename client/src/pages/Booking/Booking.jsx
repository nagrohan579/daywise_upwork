import {
  ActionMenu,
  AddAppointmentModal,
  AppLayout,
  Button,
  GoogleButton,
} from "../../components";
import { FaPlus } from "react-icons/fa6";
import { FaEye, FaEdit } from "react-icons/fa";
import { RiDeleteBin5Line } from "react-icons/ri";
import "./Booking.css";
import { useState } from "react";
import { useMobile } from "../../hooks";
import CalendarApp from "../../components/Calendar/CalendarTest";

const bookings = [
  {
    title: "30-Minute Appointment",
    name: "Chris Howard",
    date: "September 04, 2025",
    time: "8:00am",
    color: "#F19B11",
  },
  {
    title: "1-Hour Appointment",
    name: "Sarah Johnson",
    date: "September 05, 2025",
    time: "10:30am",
    color: "#D01DC7",
  },
  {
    title: "15-Minute Check-in",
    name: "David Smith",
    date: "September 06, 2025",
    time: "2:00pm",
    color: "#5162FA",
  },
];

const BookingsPage = () => {
  const [showBookingList, setShowBookingList] = useState(true);
  const [showBookingCalendar, setShowBookingCalendar] = useState(false);
  const [showAddAppointmentModal, setShowAddAppointmentModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");

  const isMobile = useMobile(991);

  return (
    <AppLayout>
      <div className="booking-page ">
        <div className="top-con">
          <div className="content-main-wrapper">
            <div className="wrap">
              <h1>Bookings</h1>
              <p>View and manage your upcoming appointments</p>
            </div>
            <GoogleButton
              text={isMobile ? "Calendar" : "Sync to Google Calendar"}
              style={{ width: isMobile ? "110px" : "240px" }}
            />
          </div>
          <p className="mobile-head">
            View and manage your upcoming appointments
          </p>
        </div>
        <div className="center-con">
          <div className="wrap">
            <button
              onClick={() => {
                setShowBookingList(true);
                setShowBookingCalendar(false);
              }}
              className={showBookingList ? "active" : ""}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 8H2.00667"
                  stroke={showBookingList ? "#fff" : "#64748B"}
                  stroke-width="1.33333"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M2 12H2.00667"
                  stroke={showBookingList ? "#fff" : "#64748B"}
                  stroke-width="1.33333"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M2 4H2.00667"
                  stroke={showBookingList ? "#fff" : "#64748B"}
                  stroke-width="1.33333"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M5.33301 8H13.9997"
                  stroke={showBookingList ? "#fff" : "#64748B"}
                  stroke-width="1.33333"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M5.33301 12H13.9997"
                  stroke={showBookingList ? "#fff" : "#64748B"}
                  stroke-width="1.33333"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M5.33301 4H13.9997"
                  stroke={showBookingList ? "#fff" : "#64748B"}
                  stroke-width="1.33333"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              List
            </button>
            <button
              onClick={() => {
                setShowBookingList(false);
                setShowBookingCalendar(true);
              }}
              className={showBookingCalendar ? "active" : ""}
            >
              <svg
                width="19"
                height="18"
                viewBox="0 0 19 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5.29688 2.25V3.9375M13.1719 2.25V3.9375M2.48438 14.0625V5.625C2.48437 5.17745 2.66216 4.74823 2.97863 4.43176C3.2951 4.11529 3.72432 3.9375 4.17188 3.9375H14.2969C14.7444 3.9375 15.1736 4.11529 15.4901 4.43176C15.8066 4.74823 15.9844 5.17745 15.9844 5.625V14.0625M2.48438 14.0625C2.48437 14.5101 2.66216 14.9393 2.97863 15.2557C3.2951 15.5722 3.72432 15.75 4.17188 15.75H14.2969C14.7444 15.75 15.1736 15.5722 15.4901 15.2557C15.8066 14.9393 15.9844 14.5101 15.9844 14.0625M2.48438 14.0625V8.4375C2.48437 7.98995 2.66216 7.56073 2.97863 7.24426C3.2951 6.92779 3.72432 6.75 4.17188 6.75H14.2969C14.7444 6.75 15.1736 6.92779 15.4901 7.24426C15.8066 7.56073 15.9844 7.98995 15.9844 8.4375V14.0625"
                  stroke={showBookingCalendar ? "#fff" : "#64748B"}
                  stroke-width="1.125"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              Calendar
            </button>
          </div>
          <Button
            text={isMobile ? "New" : "Add Appointment"}
            style={{ width: isMobile ? "75px" : "" }}
            icon={<FaPlus color="#fff" />}
            variant="primary"
            onClick={() => {
              setShowAddAppointmentModal(true);
              setModalMode("add");
            }}
          />{" "}
        </div>

        {showBookingList && (
          <div className="booking-detail-con">
            {bookings.map((booking, index) => (
              <div className="booking-card" key={index}>
                <div className="left">
                  <div className="top">
                    <span style={{ backgroundColor: booking.color }} />
                    <h3>{booking.title}</h3>
                  </div>

                  <div className="bottom">
                    <div className="wrap">
                      {/* Person icon */}
                      <svg
                        width="14"
                        height="16"
                        viewBox="0 0 14 16"
                        fill="none"
                      >
                        <path
                          d="M9.81273 3.5C9.81273 4.24592 9.51641 4.96129 8.98896 5.48874C8.46152 6.01618 7.74615 6.3125 7.00023 6.3125C6.25431 6.3125 5.53893 6.01618 5.01149 5.48874C4.48404 4.96129 4.18773 4.24592 4.18773 3.5C4.18773 2.75408 4.48404 2.03871 5.01149 1.51126C5.53893 0.983816 6.25431 0.6875 7.00023 0.6875C7.74615 0.6875 8.46152 0.983816 8.98896 1.51126C9.51641 2.03871 9.81273 2.75408 9.81273 3.5ZM1.37598 14.0885C1.40008 12.6128 2.00323 11.2056 3.05536 10.1705C4.10749 9.13545 5.52429 8.55535 7.00023 8.55535C8.47616 8.55535 9.89296 9.13545 10.9451 10.1705C11.9972 11.2056 12.6004 12.6128 12.6245 14.0885C10.86 14.8976 8.94134 15.3151 7.00023 15.3125C4.99323 15.3125 3.08823 14.8745 1.37598 14.0885Z"
                          stroke="#64748B"
                          strokeWidth="1.125"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span>{booking.name}</span>
                    </div>
                    <div className="wrap">
                      {/* Calendar icon */}
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 18 18"
                        fill="none"
                      >
                        <path
                          d="M5.0625 2.25V3.9375M12.9375 2.25V3.9375M2.25 14.0625V5.625C2.25 5.17745 2.42779 4.74823 2.74426 4.43176C3.06072 4.11529 3.48995 3.9375 3.9375 3.9375H14.0625C14.5101 3.9375 14.9393 4.11529 15.2557 4.43176C15.5722 4.74823 15.75 5.17745 15.75 5.625V14.0625M2.25 14.0625C2.25 14.5101 2.42779 14.9393 2.74426 15.2557C3.06072 15.5722 3.48995 15.75 3.9375 15.75H14.0625C14.5101 15.75 14.9393 15.5722 15.2557 15.2557C15.5722 14.9393 15.75 14.5101 15.75 14.0625M2.25 14.0625V8.4375C2.25 7.98995 2.42779 7.56073 2.74426 7.24426C3.06072 6.92779 3.48995 6.75 3.9375 6.75H14.0625C14.5101 6.75 14.9393 6.92779 15.2557 7.24426C15.5722 7.56073 15.75 7.98995 15.75 8.4375V14.0625"
                          stroke="#64748B"
                          strokeWidth="1.125"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span>{booking.date}</span>
                    </div>
                    <div className="wrap">
                      {/* Clock icon */}
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 18 18"
                        fill="none"
                      >
                        <path
                          d="M9 4.5V9H12.375M15.75 9C15.75 9.88642 15.5754 10.7642 15.2362 11.5831C14.897 12.4021 14.3998 13.1462 13.773 13.773C13.1462 14.3998 12.4021 14.897 11.5831 15.2362C10.7642 15.5754 9.88642 15.75 9 15.75C8.11358 15.75 7.23583 15.5754 6.41689 15.2362C5.59794 14.897 4.85382 14.3998 4.22703 13.773C3.60023 13.1462 3.10303 12.4021 2.76381 11.5831C2.42459 10.7642 2.25 9.88642 2.25 9C2.25 7.20979 2.96116 5.4929 4.22703 4.22703C5.4929 2.96116 7.20979 2.25 9 2.25C10.7902 2.25 12.5071 2.96116 13.773 4.22703C15.0388 5.4929 15.75 7.20979 15.75 9Z"
                          stroke="#64748B"
                          strokeWidth="1.125"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span>{booking.time}</span>
                    </div>
                  </div>
                </div>

                <div className="right">
                  <ActionMenu
                    items={[
                      {
                        label: "View",
                        icon: <FaEye />,
                        onClick: () => {
                          setModalMode("view");
                          setShowAddAppointmentModal(true);
                        },
                      },
                      {
                        label: "Edit",
                        icon: <FaEdit />,
                        onClick: () => {
                          setModalMode("edit");
                          setShowAddAppointmentModal(true);
                        },
                      },
                      {
                        label: "Delete",
                        icon: <RiDeleteBin5Line />,
                        onClick: () => console.log("Delete"),
                      },
                    ]}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        {showBookingCalendar && (
          <div className="booking-full-calendar">
            {/* <FullCalendarComp /> */}
            <CalendarApp />
          </div>
        )}

        <div className="no-appointment-con" style={{ display: "none" }}>
          <div className="content">
            <h4>No appointments yet</h4>
            <p>
              Your appointments will appear here once customers start booking.
            </p>
          </div>
        </div>
      </div>
      <AddAppointmentModal
        showAddAppointmentModal={showAddAppointmentModal}
        setShowAddAppointmentModal={setShowAddAppointmentModal}
        mode={modalMode}
      />
    </AppLayout>
  );
};
export default BookingsPage;
