import { Modal } from "react-bootstrap";
import { IoClose } from "react-icons/io5";
import "./modal.css";
import { Input, Select, Button, Textarea } from "../../index";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const AddAppointmentModal = ({
  showAddAppointmentModal,
  setShowAddAppointmentModal,
  selectedEvent,
  mode = "add",
  onAppointmentCreated,
  onSuccess, // Additional callback for consistency
}) => {
  console.log("modemode", mode);
  console.log("selectedEvent", selectedEvent);
  const isEdit = mode === "edit";
  const isView = mode === "view";
  const isAdd = mode === "add";

  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    appointmentDate: "",
    appointmentTime: "",
    serviceType: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState(null);
  const [appointmentTypes, setAppointmentTypes] = useState([]);

  // Get current user and appointment types
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/auth/me`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          console.log('AddAppointmentModal - User data from /api/auth/me:', data);
          console.log('AddAppointmentModal - User ID type:', typeof data.user.id);
          console.log('AddAppointmentModal - User ID value:', data.user.id);
          setUserId(data.user.id);
          
          // Fetch appointment types for this user
          await fetchAppointmentTypes(data.user.id);
        } else {
          console.error('AddAppointmentModal - Failed to fetch user, status:', response.status);
        }
      } catch (error) {
        console.error('AddAppointmentModal - Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  // Fetch appointment types
  const fetchAppointmentTypes = async (userId) => {
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/appointment-types?userId=${userId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        console.log('AddAppointmentModal - Appointment types:', data);
        setAppointmentTypes(data);
      } else {
        console.error('AddAppointmentModal - Failed to fetch appointment types, status:', response.status);
      }
    } catch (error) {
      console.error('AddAppointmentModal - Error fetching appointment types:', error);
    }
  };

  // Initialize form with current date/time OR selected event data
  useEffect(() => {
    if (selectedEvent && (isEdit || isView)) {
      // Load data from selected event
      console.log('AddAppointmentModal - Loading selected event:', selectedEvent);
      
      // Check if this is from booking data or calendar event
      const eventData = selectedEvent.data || selectedEvent;
      
      // Extract appointment date and time
      let appointmentDate = '';
      let appointmentTime = '';
      
      if (eventData.appointmentDate) {
        // From Convex booking - timestamp
        const date = new Date(eventData.appointmentDate);
        appointmentDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
        appointmentTime = date.toTimeString().slice(0, 5); // HH:MM
      } else if (selectedEvent.date && selectedEvent.time) {
        // From calendar event transformation
        appointmentDate = selectedEvent.date;
        appointmentTime = selectedEvent.time;
      }
      
      setFormData({
        customerName: eventData.customerName || eventData.name || '',
        customerEmail: eventData.customerEmail || '',
        appointmentDate: appointmentDate,
        appointmentTime: appointmentTime,
        serviceType: eventData.appointmentTypeId || '',
        notes: eventData.notes || '',
      });
    } else if (isAdd) {
      // Initialize with current date/time for new appointments
      const now = new Date();
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

      setFormData({
        customerName: "",
        customerEmail: "",
        appointmentDate: today,
        appointmentTime: currentTime,
      });
    }
  }, [selectedEvent, isEdit, isView, isAdd]);

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Generate booking token
  const generateBookingToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isView) return;

    if (!formData.customerName || !formData.customerEmail || !formData.appointmentDate || !formData.appointmentTime || !formData.serviceType) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!userId) {
      toast.error("User not authenticated");
      return;
    }

    console.log(`AddAppointmentModal - Starting appointment ${isEdit ? 'update' : 'creation'} process`);
    console.log('AddAppointmentModal - Form data:', formData);
    console.log('AddAppointmentModal - User ID for booking:', userId, 'type:', typeof userId);

    setIsSubmitting(true);

    try {
      const appointmentDateTime = new Date(`${formData.appointmentDate}T${formData.appointmentTime}`);
      const appointmentTimestamp = appointmentDateTime.getTime();

      console.log('AddAppointmentModal - Appointment date/time:', appointmentDateTime);
      console.log('AddAppointmentModal - Appointment timestamp:', appointmentTimestamp);

      if (isEdit && selectedEvent) {
        // UPDATE existing appointment
        const eventData = selectedEvent.data || selectedEvent;
        const bookingId = eventData._id;
        
        if (!bookingId) {
          throw new Error('Booking ID not found for update');
        }

        console.log('AddAppointmentModal - Updating booking with ID:', bookingId);

        // Update via API
        const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const updatePayload = {
          customerName: formData.customerName,
          customerEmail: formData.customerEmail,
          appointmentDate: appointmentTimestamp,
          appointmentTypeId: formData.serviceType,
        };

        const response = await fetch(`${apiUrl}/api/bookings/${bookingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(updatePayload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update booking');
        }

        console.log('AddAppointmentModal - Booking updated successfully');
        toast.success("Appointment updated successfully!");

      } else {
        // CREATE new appointment
        console.log('AddAppointmentModal - Creating booking via API');

        const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const bookingPayload = {
          customerName: formData.customerName,
          customerEmail: formData.customerEmail,
          appointmentDate: appointmentTimestamp,
          appointmentTypeId: formData.serviceType,
        };

        console.log('AddAppointmentModal - Booking payload:', bookingPayload);

        const response = await fetch(`${apiUrl}/api/bookings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(bookingPayload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('AddAppointmentModal - Server error response:', errorData);
          console.error('AddAppointmentModal - Error message:', errorData.message);
          console.error('AddAppointmentModal - Error details:', errorData.error);
          console.error('AddAppointmentModal - Full error object:', JSON.stringify(errorData, null, 2));
          // Show backend error message (e.g., limit reached)
          toast.error(errorData.message || errorData.error || 'Failed to create booking');
          throw new Error(errorData.error || errorData.message || 'Failed to create booking');
        }

        const result = await response.json();
        console.log('AddAppointmentModal - Booking created successfully:', result);
        toast.success("Appointment created successfully!");
      }

      // Reset form
      setFormData({
        customerName: "",
        customerEmail: "",
        appointmentDate: "",
        appointmentTime: "",
      });

      setShowAddAppointmentModal(false);

      // Call callbacks for refresh
      if (onAppointmentCreated) {
        console.log('AddAppointmentModal - Calling onAppointmentCreated callback');
        onAppointmentCreated();
      }
      if (onSuccess) {
        console.log('AddAppointmentModal - Calling onSuccess callback');
        onSuccess();
      }

    } catch (error) {
      console.error(`AddAppointmentModal - Error ${isEdit ? 'updating' : 'creating'} appointment:`, error);
      console.error('AddAppointmentModal - Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      toast.error(`Failed to ${isEdit ? 'update' : 'create'} appointment: ` + (error.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      show={showAddAppointmentModal}
      onHide={() => setShowAddAppointmentModal(false)}
      centered
      backdrop="static"
      className={`addAppointmentModal ${isView ? "view-mode" : ""}`}
    >
      <Modal.Header>
        <div className="content-wrap">
          <Modal.Title>
            {isEdit ? "Edit Appointment" : "Appointment Details"}
          </Modal.Title>
          {!isView && (
            <p>
              {isEdit
                ? "Update the appointment details below"
                : "Add the appointment details below"}
            </p>
          )}
        </div>
        <button
          className="close-btn"
          onClick={() => setShowAddAppointmentModal(false)}
        >
          <IoClose size={20} color="#64748B" />
        </button>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={handleSubmit}>
          <div className={`input-wrap ${isView ? "view-wrap" : ""}`}>
            <h5>Name</h5>
            <Input
              placeholder="Enter customer name"
              value={formData.customerName}
              onChange={(e) => handleInputChange('customerName', e.target.value)}
              readOnly={isView}
              style={{
                border: isView ? "none" : "",
                backgroundColor: isView ? "transparent" : "",
                pointerEvents: isView ? "none" : "auto",
              }}
            />
          </div>
          <div className={`input-wrap ${isView ? "view-wrap" : ""}`}>
            <h5>Email</h5>
            <Input
              placeholder="Enter customer email"
              type="email"
              value={formData.customerEmail}
              onChange={(e) => handleInputChange('customerEmail', e.target.value)}
              readOnly={isView}
              style={{
                border: isView ? "none" : "",
                backgroundColor: isView ? "transparent" : "",
                pointerEvents: isView ? "none" : "auto",
              }}
            />
          </div>
          <div className={`input-wrap ${isView ? "view-wrap" : ""}`}>
            <h5>Date</h5>
            <Input
              type="date"
              value={formData.appointmentDate}
              onChange={(e) => handleInputChange('appointmentDate', e.target.value)}
              readOnly={isView}
              style={{
                border: isView ? "none" : "",
                backgroundColor: isView ? "transparent" : "",
                pointerEvents: isView ? "none" : "auto",
                textAlign: "left",
              }}
            />
          </div>
          <div className={`input-wrap ${isView ? "view-wrap" : ""}`}>
            <h5>Time</h5>
            <Input
              type="time"
              value={formData.appointmentTime}
              onChange={(e) => handleInputChange('appointmentTime', e.target.value)}
              readOnly={isView}
              style={{
                border: isView ? "none" : "",
                backgroundColor: isView ? "transparent" : "",
                pointerEvents: isView ? "none" : "auto",
                textAlign: "left",
              }}
            />
          </div>
          <div className={`input-wrap ${isView ? "view-wrap" : ""}`}>
            <h5>Service</h5>
            <Select
              placeholder="Service Type"
              value={appointmentTypes.find(type => type._id === formData.serviceType)?.name || ''}
              onChange={(selectedName) => {
                const selectedType = appointmentTypes.find(type => type.name === selectedName);
                handleInputChange('serviceType', selectedType?._id || '');
              }}
              options={appointmentTypes.map(type => type.name)}
              disabled={isView}
              style={{
                border: isView ? "none" : "",
                backgroundColor: isView ? "transparent" : "",
                pointerEvents: isView ? "none" : "auto",
              }}
            />
          </div>
          {(isEdit || isView) && formData.notes && (
            <div className={`input-wrap comments-wrap ${isView ? "view-wrap" : ""}`}>
              <h5>Comments</h5>
              <Textarea
                placeholder="No notes provided"
                value={formData.notes}
                readOnly={true}
                disabled={true}
                style={{
                  border: "none",
                  backgroundColor: "transparent",
                  cursor: "default",
                  width: "100%",
                  padding: "12px 14px 12px 0",
                  minHeight: "auto",
                }}
              />
            </div>
          )}
          {!isView && (
            <div className="btn-wrap">
              <Button
                text="Cancel"
                style={{
                  backgroundColor: "transparent",
                  color: "#64748B",
                  border: "1px solid #E0E9FE",
                }}
                onClick={() => setShowAddAppointmentModal(false)}
                disabled={isSubmitting}
              />
              <Button 
                text={isSubmitting ? (isEdit ? "Updating..." : "Creating...") : (isEdit ? "Save Changes" : "Create")} 
                type="submit" 
                disabled={isSubmitting}
              />
            </div>
          )}
        </form>
      </Modal.Body>
    </Modal>
  );
};

export default AddAppointmentModal;
