import { Modal } from "react-bootstrap";
import { IoClose } from "react-icons/io5";
import "./modal.css";
import Input from "../Input/Input";
import Select from "../Input/Select";
import Button from "../Button";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const DateSpecificHourModal = ({
  showDateSpecificHour,
  setShowDateSpecificHour,
  mode = "create",
  onSuccess,
}) => {
  const isEdit = mode === "edit";

  // Form state
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [reason, setReason] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  // Services state
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState("All services");
  const [loadingServices, setLoadingServices] = useState(false);

  // check if we should show time inputs
  const showTimeInputs =
    selectedType === "Custom Hours" || selectedType === "Special Availability";

  // Fetch services when modal opens
  useEffect(() => {
    if (showDateSpecificHour) {
      fetchServices();
    }
  }, [showDateSpecificHour]);

  const fetchServices = async () => {
    setLoadingServices(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      const response = await fetch(`${apiUrl}/api/appointment-types`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      } else {
        console.error('Failed to fetch services');
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoadingServices(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Only handle "Unavailable" type for now
    if (selectedType !== "Unavailable") {
      toast.error("Only 'Unavailable' type is currently supported");
      return;
    }

    if (!selectedDate || !selectedType) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      // Find the selected service ID
      let appointmentTypeId = null;
      if (selectedService !== "All services") {
        const selectedServiceObj = services.find(service => service.name === selectedService);
        if (selectedServiceObj) {
          appointmentTypeId = selectedServiceObj._id;
        }
      }

      // Ensure date is in correct format
      const dateObj = new Date(selectedDate);
      if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date selected');
      }

      const exceptionData = {
        date: selectedDate, // Send as date string, schema will convert to Date object
        type: "unavailable",
        reason: reason || undefined,
        startTime: undefined, // All day for unavailable
        endTime: undefined,   // All day for unavailable
        appointmentTypeId: appointmentTypeId || undefined, // Include field, set to undefined if null
      };

      console.log('Sending exception data:', exceptionData);

      const response = await fetch(`${apiUrl}/api/availability-exceptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(exceptionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.message || 'Failed to create exception');
      }

      toast.success('Unavailable date added successfully!');
      setShowDateSpecificHour(false);
      
      // Reset form
      setSelectedDate("");
      setSelectedType("");
      setReason("");
      setSelectedService("All services");
      
      // Call success callback to refresh data
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating exception:', error);
      toast.error(error.message || 'Failed to create exception');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Modal
      show={showDateSpecificHour}
      onHide={() => setShowDateSpecificHour(false)}
      centered
      backdrop="static"
      className="dateSpecificHour "
    >
      <Modal.Header>
        <div className="content-wrap">
          <Modal.Title>
            {isEdit ? "Edit Specific Hours" : "Add Specific Hours"}
          </Modal.Title>
          <p>
            {isEdit
              ? "Customize your regular availability for specific dates."
              : "Customize your regular availability for specific dates."}
          </p>
        </div>
        <button
          className="close-btn"
          onClick={() => setShowDateSpecificHour(false)}
        >
          <IoClose size={20} color="#64748B" />
        </button>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={handleSubmit}>
          <div className="input-wrap">
            <Input 
              label={"Date*"} 
              type="date" 
              placeholder={"2025-09-29"}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <Select
              label={"Type*"}
              placeholder="Unavailable"
              style={{ borderRadius: "12px", backgroundColor: "#F9FAFF" }}
              options={["Unavailable"]}
              value={selectedType}
              onChange={setSelectedType}
            />
          </div>

          <div className="reason-input-con">
            <Input
              label={"Reason (optional)"}
              placeholder={"eg., Holiday, Vacation"}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {/* CONDITIONAL TIME INPUTS */}
          {showTimeInputs && (
            <div className="input-wrap">
              <Input
                label="Start Time*"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="Start Time"
              />
              <Input
                label="End Time*"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="End Time"
              />
            </div>
          )}
          <div className="reason-input-con">
            <Select
              label={"Services Affected (optional)"}
              placeholder="All services"
              style={{ backgroundColor: "#F9FAFF",borderRadius:"12px" }}
              options={["All services", ...services.map(service => service.name)]}
              value={selectedService}
              onChange={setSelectedService}
            />
          </div>

          <div className="btn-wrap">
            <Button
              text={"Cancel"}
              style={{
                backgroundColor: "transparent",
                color: "#64748B",
                border: "1px solid #E0E9FE",
              }}
              onClick={() => setShowDateSpecificHour(false)}
            />
            <Button 
              text={submitting ? "Creating..." : (isEdit ? "Save Changes" : "Create")} 
              type="submit" 
              disabled={submitting}
            />
          </div>
        </form>
      </Modal.Body>
    </Modal>
  );
};

export default DateSpecificHourModal;
