import { Modal } from "react-bootstrap";
import { IoClose } from "react-icons/io5";
import "./modal.css";
import { Input, Textarea, ColorPicker, Checkbox, Button } from "../../index";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const ServicesModal = ({
  showServiceModal,
  setShowServiceModal,
  mode = "create",
  selectedService = null,
  onServiceSaved,
}) => {
  const isEdit = mode === "edit";

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration: 30,
    bufferTime: 0,
    price: 0,
    color: "#F19B11",
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState(null);

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
          setUserId(data.user.id);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  // Load selected service data when editing
  useEffect(() => {
    if (isEdit && selectedService) {
      setFormData({
        name: selectedService.name || "",
        description: selectedService.description || "",
        duration: selectedService.duration || 30,
        bufferTime: selectedService.bufferTime || 0,
        price: selectedService.price || 0,
        color: selectedService.color || "#F19B11",
        isActive: selectedService.isActive ?? true,
      });
    } else if (!isEdit) {
      // Reset form for create mode
      setFormData({
        name: "",
        description: "",
        duration: 30,
        bufferTime: 0,
        price: 0,
        color: "#F19B11",
        isActive: true,
      });
    }
  }, [isEdit, selectedService, showServiceModal]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.duration) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!userId) {
      toast.error("User not authenticated");
      return;
    }

    setIsSubmitting(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      if (isEdit && selectedService) {
        // Update existing service
        const response = await fetch(`${apiUrl}/api/appointment-types/${selectedService._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            duration: formData.duration,
            bufferTime: formData.bufferTime,
            price: formData.price,
            color: formData.color,
            isActive: formData.isActive,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update service');
        }

        toast.success("Service updated successfully!");
      } else {
        // Create new service
        const response = await fetch(`${apiUrl}/api/appointment-types`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            userId: userId,
            name: formData.name,
            description: formData.description,
            duration: formData.duration,
            bufferTime: formData.bufferTime,
            price: formData.price,
            color: formData.color,
            isActive: formData.isActive,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create service');
        }

        toast.success("Service created successfully!");
      }

      // Reset form and close modal
      setFormData({
        name: "",
        description: "",
        duration: 30,
        bufferTime: 0,
        price: 0,
        color: "#F19B11",
        isActive: true,
      });
      setShowServiceModal(false);

      if (onServiceSaved) {
        onServiceSaved();
      }
    } catch (error) {
      console.error(`Error ${isEdit ? 'updating' : 'creating'} service:`, error);
      toast.error(`Failed to ${isEdit ? 'update' : 'create'} service`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      show={showServiceModal}
      onHide={() => setShowServiceModal(false)}
      centered
      backdrop="static"
      className="serviceModal "
    >
      <Modal.Header>
        <div className="content-wrap">
          <Modal.Title>
            {isEdit ? "Edit Service/Appointment" : "Create Service/Appointment"}
          </Modal.Title>
          <p>
            {isEdit
              ? "Configure your details"
              : "Create a service or appointment type to offer to customers"}
          </p>
        </div>
        <button
          className="close-btn"
          onClick={() => setShowServiceModal(false)}
        >
          <IoClose size={20} color="#64748B" />
        </button>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={handleSubmit}>
          <Input
            label="Service Name*"
            placeholder="Enter your service/appointment name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
          />
          <Textarea
            label="Description"
            placeholder="Brief description of this service"
            height="116px"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
          />
          <Input
            label="Duration (minutes)*"
            placeholder="0"
            type="number"
            value={formData.duration}
            onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 0)}
          />
          <Input
            label="Buffer Time (optional)"
            placeholder="0"
            type="number"
            value={formData.bufferTime}
            onChange={(e) => handleInputChange('bufferTime', parseInt(e.target.value) || 0)}
          />
          <Input
            label="Price $ (optional)"
            placeholder="0"
            type="number"
            value={formData.price}
            onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
          />

          <ColorPicker
            label="Service color*"
            name="serviceColor"
            value={formData.color}
            onChange={(val) => handleInputChange('color', val)}
          />
          <Checkbox
            name="serviceActive"
            label="Service is active and available for booking"
            checked={formData.isActive}
            onChange={(e) => handleInputChange('isActive', e.target.checked)}
          />

          <div className="btn-wrap">
            <Button
              text={"Cancel"}
              style={{
                backgroundColor: "transparent",
                color: "#64748B",
                border: "1px solid #E0E9FE",
              }}
              onClick={() => setShowServiceModal(false)}
              disabled={isSubmitting}
            />
            <Button
              text={isSubmitting ? (isEdit ? "Saving..." : "Creating...") : (isEdit ? "Save Changes" : "Create")}
              type="submit"
              disabled={isSubmitting}
            />
          </div>
        </form>
      </Modal.Body>
    </Modal>
  );
};

export default ServicesModal;
