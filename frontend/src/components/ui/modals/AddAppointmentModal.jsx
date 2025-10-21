import { Modal } from "react-bootstrap";
import { IoClose } from "react-icons/io5";
import "./modal.css";
import { Input, Select, Button } from "../../index";
import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { toast } from "sonner";

const AddAppointmentModal = ({
  showAddAppointmentModal,
  setShowAddAppointmentModal,
  selectedEvent,
  mode = "add",
  onAppointmentCreated,
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
    duration: 30,
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState(null);

  // Convex mutations
  const createBooking = useMutation(api.bookings.create);
  const updateBooking = useMutation(api.bookings.update);

  // Get current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/auth/me`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          console.log('AddAppointmentModal - User data from /api/auth/me:', data);
          console.log('AddAppointmentModal - User ID type:', typeof data.user.id);
          console.log('AddAppointmentModal - User ID value:', data.user.id);
          setUserId(data.user.id);
        } else {
          console.error('AddAppointmentModal - Failed to fetch user, status:', response.status);
        }
      } catch (error) {
        console.error('AddAppointmentModal - Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

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
        duration: eventData.duration || 30,
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
        duration: 30,
        notes: "",
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

    if (!formData.customerName || !formData.customerEmail || !formData.appointmentDate || !formData.appointmentTime) {
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

        // Update in Convex
        await updateBooking({
          id: bookingId,
          updates: {
            customerName: formData.customerName,
            customerEmail: formData.customerEmail,
            appointmentDate: appointmentTimestamp,
            duration: formData.duration,
            notes: formData.notes,
          }
        });

        console.log('AddAppointmentModal - Booking updated successfully');

        // Update Google Calendar event if it exists
        if (eventData.googleCalendarEventId) {
          console.log('AddAppointmentModal - Updating Google Calendar event:', eventData.googleCalendarEventId);
          
          try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const description = "Appointment with " + formData.customerName + "\nEmail: " + formData.customerEmail;
            const fullDescription = formData.notes ? description + "\nNotes: " + formData.notes : description;
            
            const calendarUpdateData = {
              summary: "Appointment: " + formData.customerName,
              description: fullDescription,
              start: appointmentDateTime.toISOString(),
              end: new Date(appointmentTimestamp + formData.duration * 60 * 1000).toISOString(),
              attendees: [formData.customerEmail],
            };
            
            console.log('AddAppointmentModal - Sending Google Calendar update:', calendarUpdateData);
            
            const calendarResponse = await fetch(`${apiUrl}/api/google-calendar/events/${eventData.googleCalendarEventId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify(calendarUpdateData),
            });

            console.log('AddAppointmentModal - Google Calendar update response status:', calendarResponse.status);

            if (calendarResponse.ok) {
              const calendarResult = await calendarResponse.json();
              console.log('AddAppointmentModal - Google Calendar update response:', calendarResult);
              if (calendarResult.success) {
                console.log('AddAppointmentModal - Google Calendar event updated successfully');
                toast.success("Appointment updated successfully!");
              } else {
                console.warn('AddAppointmentModal - Google Calendar update failed:', calendarResult);
                toast.warning(`Appointment updated but calendar sync failed: ${calendarResult.error || 'Unknown error'}`);
              }
            } else {
              const errorText = await calendarResponse.text();
              console.error('AddAppointmentModal - Google Calendar update error:', calendarResponse.status, errorText);
              toast.warning("Appointment updated but calendar sync failed");
            }
          } catch (calendarError) {
            console.error('AddAppointmentModal - Google Calendar update error:', calendarError);
            toast.warning("Appointment updated but calendar sync failed");
          }
        } else {
          console.log('AddAppointmentModal - No Google Calendar event ID, skipping calendar update');
          toast.success("Appointment updated successfully!");
        }

      } else {
        // CREATE new appointment
        let googleCalendarEventId = null;
        
        try {
        // First check if Google Calendar is connected
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const statusResponse = await fetch(`${apiUrl}/api/google-calendar/status`, {
          credentials: 'include',
        });
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          console.log('AddAppointmentModal - Google Calendar connection status:', statusData);
          
          if (!statusData.isConnected) {
            console.warn('AddAppointmentModal - Google Calendar not connected, skipping event creation');
            toast.warning("Appointment created but Google Calendar is not connected. Please connect Google Calendar to sync events.");
          } else {
              const description = "Appointment with " + formData.customerName + "\nEmail: " + formData.customerEmail;
              const fullDescription = formData.notes ? description + "\nNotes: " + formData.notes : description;
              
              const eventData = {
                summary: "Appointment: " + formData.customerName,
                description: fullDescription,
                start: appointmentDateTime.toISOString(),
                end: new Date(appointmentTimestamp + formData.duration * 60 * 1000).toISOString(),
                attendees: [formData.customerEmail],
              };
              
              console.log('AddAppointmentModal - Creating Google Calendar event with data:', eventData);
              
              const calendarResponse = await fetch(`${apiUrl}/api/google-calendar/events`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(eventData),
              });

              console.log('AddAppointmentModal - Google Calendar response status:', calendarResponse.status);

              if (calendarResponse.ok) {
                const calendarResult = await calendarResponse.json();
                console.log('AddAppointmentModal - Google Calendar response:', calendarResult);
                if (calendarResult.success) {
                  googleCalendarEventId = calendarResult.eventId;
                  console.log('AddAppointmentModal - Google Calendar event created with ID:', googleCalendarEventId);
                  toast.success("Appointment created and added to Google Calendar!");
                } else {
                  console.warn('AddAppointmentModal - Google Calendar event creation failed:', calendarResult);
                  console.warn('AddAppointmentModal - Error details:', calendarResult.error);
                  toast.warning(`Appointment created but failed to add to Google Calendar: ${calendarResult.error || 'Unknown error'}`);
                }
              } else {
                const errorText = await calendarResponse.text();
                console.error('AddAppointmentModal - Google Calendar API error:', calendarResponse.status, errorText);
                let errorMessage = 'Unknown error';
                try {
                  const errorData = JSON.parse(errorText);
                  errorMessage = errorData.message || errorData.error || errorText;
                } catch (e) {
                  errorMessage = errorText;
                }
                toast.warning(`Appointment created but failed to add to Google Calendar: ${errorMessage}`);
              }
            }
          } else {
            console.error('AddAppointmentModal - Failed to check Google Calendar status:', statusResponse.status);
            toast.warning("Appointment created but could not verify Google Calendar connection. Please connect Google Calendar to sync events.");
          }
        } catch (calendarError) {
          console.error('AddAppointmentModal - Google Calendar error:', calendarError);
          toast.warning("Appointment created but failed to add to Google Calendar. Please connect Google Calendar to sync events.");
        }

        console.log('AddAppointmentModal - Creating Convex booking with userId:', userId, 'type:', typeof userId);

        // Validate userId exists
        if (!userId || typeof userId !== 'string') {
          throw new Error(`Invalid userId: ${userId}`);
        }

        const bookingId = await createBooking({
          userId: userId,
          customerName: formData.customerName,
          customerEmail: formData.customerEmail,
          appointmentDate: appointmentTimestamp,
          duration: formData.duration,
          status: "confirmed",
          notes: formData.notes,
          bookingToken: generateBookingToken(),
          googleCalendarEventId: googleCalendarEventId,
        });
        
        console.log('AddAppointmentModal - Convex booking created successfully with ID:', bookingId);
        toast.success("Appointment created successfully!");
      }

      // Reset form
      setFormData({
        customerName: "",
        customerEmail: "",
        appointmentDate: "",
        appointmentTime: "",
        duration: 30,
        notes: "",
      });

      setShowAddAppointmentModal(false);

      if (onAppointmentCreated) {
        console.log('AddAppointmentModal - Calling onAppointmentCreated callback');
        onAppointmentCreated();
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
      className="addAppointmentModal "
    >
      <Modal.Header>
        <div className="content-wrap">
          <Modal.Title>
            {isEdit ? "Edit Appointment" : "Appointment Details"}
          </Modal.Title>
          <p>
            {isEdit
              ? "Update the appointment details below"
              : "Add the appointment details below"}
          </p>
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
            <h5>Customer Name</h5>
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
              }}
            />
          </div>
          <div className={`input-wrap ${isView ? "view-wrap" : ""}`}>
            <h5>Duration (minutes)</h5>
            <Input
              type="number"
              placeholder="30"
              value={formData.duration}
              onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 30)}
              readOnly={isView}
              style={{
                border: isView ? "none" : "",
                backgroundColor: isView ? "transparent" : "",
                pointerEvents: isView ? "none" : "auto",
              }}
            />
          </div>
          <div className={`input-wrap ${isView ? "view-wrap" : ""}`}>
            <h5>Notes (Optional)</h5>
            <Input
              placeholder="Add any additional notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              readOnly={isView}
              style={{
                border: isView ? "none" : "",
                backgroundColor: isView ? "transparent" : "",
                pointerEvents: isView ? "none" : "auto",
              }}
            />
          </div>
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
              disabled={isSubmitting || isView}
            />
          </div>
        </form>
      </Modal.Body>
    </Modal>
  );
};

export default AddAppointmentModal;
