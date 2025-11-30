import { Modal } from "react-bootstrap";
import { IoClose } from "react-icons/io5";
import "./modal.css";
import { Input, Textarea, ColorPicker, Checkbox, Button, Select } from "../../index";
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
    intakeFormId: null,
    requirePayment: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState(null);
  const [intakeForms, setIntakeForms] = useState([]);
  const [loadingIntakeForms, setLoadingIntakeForms] = useState(false);
  const [userPlan, setUserPlan] = useState(null); // "free" or "pro"
  const [isStripeConnected, setIsStripeConnected] = useState(false);

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

  // Fetch intake forms, user plan, and Stripe status when modal opens
  useEffect(() => {
    const fetchData = async () => {
      if (!showServiceModal || !userId) return;
      
      setLoadingIntakeForms(true);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        
        // Fetch all data in parallel
        const [intakeFormsResponse, subscriptionResponse, stripeResponse] = await Promise.all([
          fetch(`${apiUrl}/api/intake-forms`, {
            credentials: 'include',
          }),
          fetch(`${apiUrl}/api/user-subscriptions/me`, {
            credentials: 'include',
          }),
          fetch(`${apiUrl}/api/stripe/status`, {
            credentials: 'include',
          })
        ]);
        
        if (intakeFormsResponse.ok) {
          const data = await intakeFormsResponse.json();
          // Filter out inactive forms - only show active forms in the dropdown
          const activeForms = (data || []).filter(form => form.isActive !== false);
          setIntakeForms(activeForms);
        }
        
        if (subscriptionResponse.ok) {
          const data = await subscriptionResponse.json();
          const planId = data.subscription?.planId || "free";
          setUserPlan(planId);
        }
        
        if (stripeResponse.ok) {
          const data = await stripeResponse.json();
          setIsStripeConnected(data.isConnected || false);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setIntakeForms([]);
        setUserPlan("free");
        setIsStripeConnected(false);
      } finally {
        setLoadingIntakeForms(false);
      }
    };
    fetchData();
  }, [showServiceModal, userId]);

  // Load selected service data when editing
  useEffect(() => {
    if (isEdit && selectedService) {
      const selectedFormId = selectedService.intakeFormId;
      
      // Only check if form is active after intakeForms have been loaded
      // If intakeForms is still empty, assume the form is valid (will be checked later)
      let isFormActive = true;
      if (selectedFormId && intakeForms.length > 0) {
        // Check if the selected intake form is in the active forms list
        isFormActive = intakeForms.some(form => form._id === selectedFormId);
        
        // Show warning if form was cleared due to being inactive
        if (!isFormActive) {
          toast.warning("The previously selected intake form is inactive and has been cleared. Please select an active form.");
        }
      }
      
      setFormData({
        name: selectedService.name || "",
        description: selectedService.description || "",
        duration: selectedService.duration || 30,
        bufferTime: selectedService.bufferTime || 0,
        price: selectedService.price || 0,
        color: selectedService.color || "#F19B11",
        isActive: selectedService.isActive ?? true,
        // Clear intakeFormId if the form is inactive (only after forms are loaded)
        intakeFormId: (selectedFormId && isFormActive) ? selectedFormId : null,
        requirePayment: selectedService.requirePayment || false,
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
        intakeFormId: null,
        requirePayment: false,
      });
    }
  }, [isEdit, selectedService, showServiceModal, intakeForms]);

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
        const updateData = {
          name: formData.name,
          description: formData.description,
          duration: formData.duration,
          bufferTime: formData.bufferTime,
          price: formData.price,
          color: formData.color,
          isActive: formData.isActive,
          requirePayment: formData.requirePayment,
        };
        
        // Always include intakeFormId - send null to clear it, undefined if not set
        if (formData.intakeFormId === null) {
          updateData.intakeFormId = null;
        } else if (formData.intakeFormId) {
          updateData.intakeFormId = formData.intakeFormId;
        }
        
        const response = await fetch(`${apiUrl}/api/appointment-types/${selectedService._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(updateData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update service');
        }

        toast.success("Service updated successfully!");
      } else {
        // Create new service
        const createData = {
          userId: userId,
          name: formData.name,
          description: formData.description || undefined,
          duration: formData.duration,
          bufferTime: formData.bufferTime,
          bufferTimeBefore: 0, // Default value
          price: formData.price,
          color: formData.color,
          isActive: formData.isActive,
          requirePayment: formData.requirePayment,
        };
        
        // Only include intakeFormId if it has a value (not null/undefined)
        if (formData.intakeFormId) {
          createData.intakeFormId = formData.intakeFormId;
        }
        
        const response = await fetch(`${apiUrl}/api/appointment-types`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(createData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          // Show backend error message (e.g., limit reached)
          toast.error(errorData.message || 'Failed to create service');
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
        intakeFormId: null,
        requirePayment: false,
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
          <Select
            label="Add an Intake Form"
            placeholder="No form selected"
            value={formData.intakeFormId ? (intakeForms.find(form => form._id === formData.intakeFormId)?.name || "") : "No form selected"}
            onChange={(selectedName) => {
              if (selectedName === "No form selected") {
                handleInputChange('intakeFormId', null);
              } else {
                const selectedForm = intakeForms.find(form => form.name === selectedName);
                handleInputChange('intakeFormId', selectedForm?._id || null);
              }
            }}
            options={["No form selected", ...intakeForms.map(form => form.name)]}
          />
          {!formData.intakeFormId && intakeForms.length === 0 && (
            <p className="intake-form-help-text">
              You have no forms. To add a form to this service, navigate to the 'Intake Forms' tab and create your form. Once created, return here and add your form to this service.
            </p>
          )}
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

          {/* Require Payment from Customers Section */}
          <div className={`service-payment-section ${userPlan === "free" ? "service-payment-free" : !isStripeConnected ? "service-payment-no-stripe" : ""}`}>
            <div className="service-payment-content">
              <div className="service-payment-header">
                <h4 className="service-payment-title">Require Payment from Customers</h4>
                <p className="service-payment-tooltip">
                  {userPlan === "free" 
                    ? "Upgrade to a paid plan to charge customers"
                    : !isStripeConnected
                    ? "Connect to Stripe Payments in the 'Payments' tab to charge your customers"
                    : ""
                  }
                </p>
              </div>
              <div className="service-payment-toggle-wrapper">
                <span className="service-payment-toggle-label">No</span>
                <label className={`service-payment-toggle ${formData.requirePayment ? "service-payment-toggle-active" : ""} ${(userPlan === "free" || !isStripeConnected) ? "service-payment-toggle-disabled" : ""}`}>
                  <input
                    type="checkbox"
                    checked={formData.requirePayment}
                    onChange={(e) => handleInputChange('requirePayment', e.target.checked)}
                    disabled={userPlan === "free" || !isStripeConnected}
                  />
                  <span className="service-payment-toggle-slider"></span>
                </label>
                <span className={`service-payment-toggle-label ${formData.requirePayment ? "service-payment-toggle-label-active" : ""}`}>Yes</span>
              </div>
            </div>
          </div>

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
