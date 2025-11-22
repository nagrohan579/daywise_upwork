import { useState, useEffect, useRef } from "react";
import { FaPlus } from "react-icons/fa6";
import { FaEdit } from "react-icons/fa";
import { RiDeleteBin5Line } from "react-icons/ri";
import { IoClose } from "react-icons/io5";
import { Modal } from "react-bootstrap";
import { useMobile } from "../../hooks";
import { toast } from "sonner";
import { ActionMenu, AppLayout, Button, Input, Textarea, Checkbox, Select } from "../../components";
import HowThisWorksButton from "../../components/HowThisWorksButton";
import "../../components/ui/modals/modal.css";
import "./Forms.css";

const Forms = () => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formToDelete, setFormToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const [formName, setFormName] = useState("Click to add form name");
  const [formDescription, setFormDescription] = useState("");
  const [isEditingFormName, setIsEditingFormName] = useState(false);
  const [formFields, setFormFields] = useState([]);
  const [selectedFieldIndex, setSelectedFieldIndex] = useState(null);
  const [showFieldTypeSelection, setShowFieldTypeSelection] = useState(true);
  const [newOptionValues, setNewOptionValues] = useState({}); // Track new option input values per field
  const [selectedFiles, setSelectedFiles] = useState({}); // Track selected files for file upload fields
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const formNameRef = useRef(null);
  const fieldTypeSectionRef = useRef(null);
  const headerActionsRef = useRef(null);
  const saveButtonRef = useRef(null);
  const isMobile = useMobile(991);
  const [userId, setUserId] = useState(null);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLimit, setFormLimit] = useState(null); // null = unlimited, 1 = free tier
  const [editingFormId, setEditingFormId] = useState(null); // Track if we're editing an existing form
  const [savingForm, setSavingForm] = useState(false);
  const [loadingFormData, setLoadingFormData] = useState(false);
  const [refreshingForms, setRefreshingForms] = useState(false);
  const [showTopWarning, setShowTopWarning] = useState(true); // For dismissing top warning banner
  const [togglingFormId, setTogglingFormId] = useState(null); // Track which form is being toggled
  const [openMenuId, setOpenMenuId] = useState(null); // Track which menu is open
  const [showMobileActionBar, setShowMobileActionBar] = useState(false);

  // Fetch current user
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

  // Fetch forms and user features together
  const fetchForms = async () => {
    if (!userId) return;
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      // Fetch both in parallel
      const [formsResponse, featuresResponse] = await Promise.all([
        fetch(`${apiUrl}/api/intake-forms`, {
          credentials: 'include',
        }),
        fetch(`${apiUrl}/api/user-subscriptions/me`, {
          credentials: 'include',
        })
      ]);
      
      if (formsResponse.ok) {
        const data = await formsResponse.json();
        console.log('Fetched forms:', data?.length, data);
        setForms(data || []);
      } else {
        // If endpoint doesn't exist yet, just set empty array
        console.error('Failed to fetch forms:', formsResponse.status);
        setForms([]);
      }
      
      if (featuresResponse.ok) {
        const featuresData = await featuresResponse.json();
        // formLimit will be null for pro plan (unlimited), or a number for free tier
        // This will be updated when backend implements form limits
        setFormLimit(featuresData.features?.formLimit ?? null);
      } else {
        console.error('Failed to fetch features');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setForms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchForms();
    }
  }, [userId]);

  useEffect(() => {
    if (isEditingFormName && formNameRef.current) {
      formNameRef.current.focus();
      formNameRef.current.select();
    }
  }, [isEditingFormName]);

  // Scroll to field type selection when it becomes visible
  useEffect(() => {
    if (showFieldTypeSelection && fieldTypeSectionRef.current) {
      // Use setTimeout to ensure the DOM has fully rendered
      const timer = setTimeout(() => {
        if (fieldTypeSectionRef.current) {
          fieldTypeSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showFieldTypeSelection]);

  useEffect(() => {
    // Always show the mobile action bar when on mobile and in form builder
    if (isMobile && showFormBuilder) {
      setShowMobileActionBar(true);
    } else {
      setShowMobileActionBar(false);
    }
  }, [isMobile, showFormBuilder]);

  const handleAddNew = () => {
    // Check if user has reached the limit
    if (formLimit !== null && forms.length >= formLimit) {
      toast.error("Upgrade to Pro plan to add more forms.");
      return;
    }
    setShowFormBuilder(true);
    setFormName("Click to add form name");
    setFormDescription("");
    setFormFields([]);
    setEditingFormId(null); // Clear editing form ID when creating new
  };

  const handleCancelFormBuilder = () => {
    setShowFormBuilder(false);
    setFormName("Click to add form name");
    setFormDescription("");
    setFormFields([]);
    setSelectedFieldIndex(null);
    setShowFieldTypeSelection(true);
    setSelectedFiles({});
    setNewOptionValues({});
    setEditingFormId(null);
  };

  const handleFieldTypeClick = (fieldType) => {
    const newField = {
      id: Date.now(),
      type: fieldType,
      question: "",
      required: false,
      answerSize: "single", // "single" or "medium" for text fields
      options: (fieldType === "dropdown" || fieldType === "checkbox-list") ? ["Option 1", "Option 2"] : [], // for dropdown and checkbox-list fields
      checkboxLabel: fieldType === "checkbox" ? "I agree" : "", // for checkbox fields
    };
    const newIndex = formFields.length;
    setFormFields([...formFields, newField]);
    setSelectedFieldIndex(newIndex);
    setShowFieldTypeSelection(false);
    
    // Scroll to the newly added field configuration section
    setTimeout(() => {
      const fieldElement = document.querySelector(`[data-field-id="${newField.id}"]`);
      if (fieldElement) {
        fieldElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleFieldUpdate = (index, updates) => {
    const updatedFields = [...formFields];
    updatedFields[index] = { ...updatedFields[index], ...updates };
    setFormFields(updatedFields);
  };

  const handleFieldRemove = (index) => {
    const updatedFields = formFields.filter((_, i) => i !== index);
    setFormFields(updatedFields);
    
    // Clean up newOptionValues for removed field
    const updatedOptionValues = { ...newOptionValues };
    delete updatedOptionValues[index];
    // Shift indices for fields after the removed one
    const shiftedOptionValues = {};
    Object.keys(updatedOptionValues).forEach(key => {
      const keyIndex = parseInt(key);
      if (keyIndex > index) {
        shiftedOptionValues[keyIndex - 1] = updatedOptionValues[key];
      } else if (keyIndex < index) {
        shiftedOptionValues[keyIndex] = updatedOptionValues[key];
      }
    });
    setNewOptionValues(shiftedOptionValues);
    
    if (selectedFieldIndex === index) {
      setSelectedFieldIndex(null);
      setShowFieldTypeSelection(true);
    } else if (selectedFieldIndex > index) {
      setSelectedFieldIndex(selectedFieldIndex - 1);
    }
  };

  const handleAddAnother = () => {
    setShowFieldTypeSelection(true);
    setSelectedFieldIndex(null);
    // Use setTimeout to ensure the DOM has updated before scrolling
    setTimeout(() => {
      if (fieldTypeSectionRef.current) {
        fieldTypeSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleMoveField = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === formFields.length - 1) return;
    
    const newFields = [...formFields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    setFormFields(newFields);
    setSelectedFieldIndex(targetIndex);
  };

  const handleAddDropdownOption = (fieldIndex) => {
    const newOptionValue = newOptionValues[fieldIndex]?.trim() || `Option ${formFields[fieldIndex]?.options?.length + 1 || 1}`;
    if (!newOptionValue) return;
    
    const updatedFields = [...formFields];
    const field = updatedFields[fieldIndex];
    if (!field.options) {
      field.options = [];
    }
    field.options.push(newOptionValue);
    setFormFields(updatedFields);
    
    // Clear the input
    setNewOptionValues({ ...newOptionValues, [fieldIndex]: "" });
  };

  const handleRemoveDropdownOption = (fieldIndex, optionIndex) => {
    const updatedFields = [...formFields];
    const field = updatedFields[fieldIndex];
    if (field.options && field.options.length > 1) {
      field.options = field.options.filter((_, i) => i !== optionIndex);
      setFormFields(updatedFields);
    }
  };

  const handleUpdateDropdownOption = (fieldIndex, optionIndex, value) => {
    const updatedFields = [...formFields];
    const field = updatedFields[fieldIndex];
    if (field.options) {
      field.options[optionIndex] = value;
      setFormFields(updatedFields);
    }
  };

  // Reuse the same handlers for checkbox-list options
  const handleAddCheckboxListOption = handleAddDropdownOption;
  const handleRemoveCheckboxListOption = handleRemoveDropdownOption;
  const handleUpdateCheckboxListOption = handleUpdateDropdownOption;

  const handleSaveForm = async () => {
    if (!formName || formName === "Click to add form name") {
      toast.error("Please enter a form name");
      return;
    }

    if (formFields.length === 0) {
      toast.error("Please add at least one field to the form");
      return;
    }

    setSavingForm(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const url = editingFormId
        ? `${apiUrl}/api/intake-forms/${editingFormId}`
        : `${apiUrl}/api/intake-forms`;

      const method = editingFormId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formName,
          description: formDescription,
          fields: formFields,
          isActive: true,
          sortOrder: forms.length,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(editingFormId ? "Form updated successfully!" : "Form created successfully!");
        handleCancelFormBuilder();
        setRefreshingForms(true);
        await fetchForms(); // Refresh forms list
        setRefreshingForms(false);
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to save form");
      }
    } catch (error) {
      console.error('Error saving form:', error);
      toast.error("An error occurred while saving the form");
      setRefreshingForms(false);
    } finally {
      setSavingForm(false);
    }
  };

  const handleEdit = async (form) => {
    setLoadingFormData(true);
    try {
      // Set form data - if form data needs to be fetched from backend, add that here
      setEditingFormId(form._id);
      setFormName(form.name);
      setFormDescription(form.description || "");
      setFormFields(form.fields || []);
      setShowFormBuilder(true);
    } finally {
      // Loading state will be cleared once the form builder is shown
      // The actual loading duration depends on React's render cycle
      setTimeout(() => setLoadingFormData(false), 0);
    }
  };

  const handleDeleteClick = (form) => {
    setFormToDelete(form);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!formToDelete) return;

    setIsDeleting(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/intake-forms/${formToDelete._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast.success("Form deleted successfully");
        await fetchForms(); // Refresh forms list
      setShowDeleteModal(false);
      setFormToDelete(null);
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to delete form");
      }
    } catch (error) {
      console.error('Error deleting form:', error);
      toast.error("An error occurred while deleting the form");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async (form) => {
    // Check if user is on free plan and trying to activate a form
    if (formLimit === 1 && !form.isActive) {
      // Check if there's already an active form
      const activeForms = forms.filter(f => f.isActive && f._id !== form._id);
      if (activeForms.length > 0) {
        toast.error("Deactivate one of the active forms or upgrade to Pro to activate this");
        return;
      }
    }

    // Set loading state immediately
    setTogglingFormId(form._id);

    // Store original state for potential revert
    const originalForms = [...forms];
    
    // Optimistically update the UI
    const updatedForms = forms.map(f => {
      if (f._id === form._id) {
        return { ...f, isActive: !f.isActive };
      }
      // If activating on free plan, deactivate all others
      if (formLimit === 1 && !form.isActive && f.isActive) {
        return { ...f, isActive: false };
      }
      return f;
    });
    setForms(updatedForms);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const updateData = { isActive: !form.isActive };
      
      const response = await fetch(`${apiUrl}/api/intake-forms/${form._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });
      
      if (response.ok) {
        // If activating on free plan, deactivate all other forms
        if (formLimit === 1 && !form.isActive) {
          const otherActiveForms = updatedForms.filter(f => f.isActive && f._id !== form._id);
          for (const otherForm of otherActiveForms) {
            await fetch(`${apiUrl}/api/intake-forms/${otherForm._id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({
                isActive: false,
              }),
            });
          }
        }
        // Refresh the list to ensure consistency
        await fetchForms();
      } else {
        // Revert optimistic update on error
        setForms(originalForms);
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to update form");
      }
    } catch (error) {
      // Revert optimistic update on error
      setForms(originalForms);
      console.error('Error toggling form:', error);
      toast.error("Failed to update form");
    } finally {
      setTogglingFormId(null);
    }
  };

  // Check if user is on free plan with more than 1 form
  const isFreePlanWithMultipleForms = formLimit === 1 && forms.length > 1;
  
  // Check if there's an active form (for free plan)
  const hasActiveForm = forms.some(f => f.isActive);
  
  // Count active forms
  const activeFormCount = forms.filter(f => f.isActive).length;
  
  // Show warnings only when: free plan + more than 1 form + (no active OR more than 1 active)
  const shouldShowWarnings = isFreePlanWithMultipleForms && (activeFormCount === 0 || activeFormCount > 1);

  return (
    <AppLayout>
      <div className="forms-page">
        {/* Top Warning Banner */}
        {shouldShowWarnings && showTopWarning && (
          <div className="forms-top-warning-banner">
            <div className="forms-warning-content">
              <div className="forms-warning-icon">
                <svg width="16" height="14" viewBox="0 0 21 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M7.76007 1.5C8.91507 -0.5 11.8031 -0.5 12.9571 1.5L20.3121 14.248C21.4661 16.248 20.0221 18.748 17.7131 18.748H3.00407C0.695065 18.748 -0.747935 16.248 0.406065 14.248L7.75907 1.5H7.76007ZM10.3591 6.747C10.558 6.747 10.7487 6.82602 10.8894 6.96667C11.03 7.10732 11.1091 7.29809 11.1091 7.497V11.247C11.1091 11.4459 11.03 11.6367 10.8894 11.7773C10.7487 11.918 10.558 11.997 10.3591 11.997C10.1602 11.997 9.96939 11.918 9.82874 11.7773C9.68808 11.6367 9.60907 11.4459 9.60907 11.247V7.497C9.60907 7.29809 9.68808 7.10732 9.82874 6.96667C9.96939 6.82602 10.1602 6.747 10.3591 6.747ZM10.3591 14.997C10.558 14.997 10.7487 14.918 10.8894 14.7773C11.03 14.6367 11.1091 14.4459 11.1091 14.247C11.1091 14.0481 11.03 13.8573 10.8894 13.7167C10.7487 13.576 10.558 13.497 10.3591 13.497C10.1602 13.497 9.96939 13.576 9.82874 13.7167C9.68808 13.8573 9.60907 14.0481 9.60907 14.247C9.60907 14.4459 9.68808 14.6367 9.82874 14.7773C9.96939 14.918 10.1602 14.997 10.3591 14.997Z" fill="white"/>
                </svg>
              </div>
              <p className="forms-warning-text">
                You've switched to the Free Plan. All intake forms have been set to inactive. Activate one intake form to continue using intake forms. Other features like services, branding, and payments are limited while on the Free Plan.
              </p>
            </div>
            <button
              className="forms-warning-close"
              onClick={() => setShowTopWarning(false)}
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0.5625 9.5625L9.5625 0.5625M0.5625 0.5625L9.5625 9.5625" stroke="white" strokeWidth="1.125" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}

        <div className="top-con">
          <h1>
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M17.1983 8.27175L17.0073 10.3012C16.6926 13.645 16.5353 15.3169 15.5498 16.325C14.5643 17.3332 13.0872 17.3332 10.1331 17.3332H7.86658C4.91248 17.3332 3.43543 17.3332 2.44991 16.325C1.4644 15.3169 1.30704 13.645 0.992335 10.3012L0.801344 8.27175C0.651335 6.67792 0.576335 5.881 0.848994 5.55156C0.996485 5.37336 1.19705 5.26417 1.41149 5.24534C1.8079 5.21052 2.30574 5.77725 3.30139 6.91073C3.81631 7.49692 4.07377 7.79 4.36098 7.83542C4.52012 7.8605 4.68227 7.83467 4.82922 7.76075C5.09443 7.62725 5.27125 7.26494 5.62489 6.54027L7.48892 2.72055C8.15717 1.35119 8.49133 0.666504 8.99984 0.666504C9.50834 0.666504 9.8425 1.35119 10.5108 2.72055L12.3748 6.54026C12.7284 7.26494 12.9053 7.62725 13.1704 7.76075C13.3174 7.83467 13.4796 7.8605 13.6387 7.83542C13.9259 7.79 14.1833 7.49692 14.6983 6.91073C15.6939 5.77725 16.1918 5.21052 16.5882 5.24534C16.8026 5.26417 17.0032 5.37336 17.1507 5.55156C17.4233 5.881 17.3483 6.67792 17.1983 8.27175ZM9.7935 9.58234L9.71159 9.43542C9.39492 8.86734 9.23658 8.58334 8.99984 8.58334C8.76308 8.58334 8.60475 8.86734 8.28808 9.43542L8.20617 9.58234C8.11625 9.74375 8.07125 9.8245 8.00109 9.87775C7.93092 9.931 7.84358 9.95075 7.66883 9.99034L7.50975 10.0263C6.8948 10.1654 6.58734 10.235 6.51419 10.4703C6.44104 10.7055 6.65064 10.9506 7.06986 11.4408L7.17832 11.5676C7.29744 11.7069 7.357 11.7766 7.38383 11.8628C7.41058 11.9489 7.40159 12.0418 7.38358 12.2277L7.36717 12.3969C7.3038 13.0509 7.27212 13.378 7.46358 13.5233C7.65517 13.6688 7.943 13.5362 8.51875 13.2711L8.66767 13.2025C8.83134 13.1272 8.91308 13.0895 8.99984 13.0895C9.08659 13.0895 9.16833 13.1272 9.332 13.2025L9.48092 13.2711C10.0567 13.5362 10.3445 13.6688 10.5361 13.5233C10.7276 13.378 10.6958 13.0509 10.6325 12.3969L10.6161 12.2277C10.5981 12.0418 10.5891 11.9489 10.6158 11.8628C10.6427 11.7766 10.7023 11.7069 10.8213 11.5676L10.9298 11.4408C11.349 10.9506 11.5587 10.7055 11.4855 10.4703C11.4123 10.235 11.1048 10.1654 10.4899 10.0263L10.3308 9.99034C10.1561 9.95075 10.0688 9.931 9.99858 9.87775C9.92842 9.8245 9.88342 9.74375 9.7935 9.58234Z"
                fill="#ECAD19"
              />
            </svg>
            Intake Forms
          </h1>
          <p>Create forms for your clients to fill out when they book with you.</p>
        </div>
        {!loading && !refreshingForms && !showFormBuilder && (
          <>
          <div className="add-new-btn-wrap">
            <Button
              text={isMobile ? "New" : "Add New"}
              style={{
                width: isMobile ? "75px" : "",
                ...(formLimit !== null && forms.length >= formLimit ? {
                  backgroundColor: '#64748B33',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748B80',
                } : {})
              }}
              icon={<FaPlus color={formLimit !== null && forms.length >= formLimit ? "#64748B80" : "#fff"} />}
              variant="primary"
              onClick={handleAddNew}
            />
            {formLimit !== null && (
              <p className={`forms-count-text ${isFreePlanWithMultipleForms ? 'forms-count-text-over-limit' : ''}`}>
                  <strong>{forms.length} of {formLimit}</strong> intake forms created. Upgrade to add more.
              </p>
            )}
          </div>
          </>
        )}
        
        {showFormBuilder ? (
          <div className="form-builder-container">
            {(savingForm || loadingFormData) && (
              <div className="form-builder-loading-overlay">
          <div className="forms-loading">
            <div className="forms-spinner"></div>
                  <p className="forms-loading-text">
                    {savingForm ? "Saving information..." : "Loading form data..."}
                  </p>
                </div>
              </div>
            )}
            <div className="form-builder-header-top" ref={headerActionsRef}>
              <div className="form-name-header">
                {isEditingFormName ? (
                  <Input
                    ref={formNameRef}
                    value={formName === "Click to add form name" ? "" : formName}
                    onChange={(e) => setFormName(e.target.value)}
                    onBlur={() => {
                      setIsEditingFormName(false);
                      if (!formName.trim()) {
                        setFormName("Click to add form name");
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.target.blur();
                      }
                    }}
                    placeholder="Click to add form name"
                    style={{
                      fontSize: '24px',
                      fontWeight: '600',
                      border: 'none',
                      borderBottom: '2px solid #3B82F6',
                      borderRadius: '0',
                      padding: '4px 0',
                      flex: 1,
                    }}
                  />
                ) : (
                  <h2 
                    className={formName === "Click to add form name" ? "form-name-placeholder" : "form-name-display"}
                    onClick={() => {
                      setIsEditingFormName(true);
                    }}
                    style={{ flex: 1 }}
                  >
                    {formName}
                  </h2>
                )}
              </div>
              <div className="form-builder-actions">
                <Button
                  text="Preview"
                  variant="secondary"
                  onClick={() => setShowPreviewModal(true)}
                  style={{
                    backgroundColor: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    color: '#121212',
                    marginRight: '12px',
                  }}
                />
                <div ref={saveButtonRef} style={{ display: 'flex' }}>
                  <Button
                    text="Save Form"
                    variant="primary"
                    onClick={handleSaveForm}
                    style={{ marginRight: '12px' }}
                  />
                </div>
                <button
                  onClick={handleCancelFormBuilder}
                  className="cancel-icon-btn"
                  type="button"
                >
                  <IoClose size={20} />
                </button>
              </div>
            </div>

            <div className="form-builder-content">
              <div className="form-description-preview-grid">
                <div className="form-builder-left-column">
                  <div className="form-name-section">
                    <div className="form-description-wrapper">
                      <Textarea
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder="Form Description (optional)"
                        style={{
                          minHeight: '100px',
                          border: '1px solid #3B82F6',
                          borderRadius: '8px',
                        }}
                      />
                    </div>
                  </div>

                  {showFieldTypeSelection && (
                    <div className="field-type-section" ref={fieldTypeSectionRef}>
                      <h3 className="field-type-heading">To start creating your form, pick a field type.</h3>
                      <div className="field-type-grid">
                      <div className="field-type-card" onClick={() => handleFieldTypeClick("text")}>
                        <div className="field-type-icon">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 6H20M4 12H20M4 18H20" stroke="#64748B" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        </div>
                        <h4>Text box</h4>
                        <p>Short or medium answer</p>
                      </div>
                      <div className="field-type-card" onClick={() => handleFieldTypeClick("dropdown")}>
                        <div className="field-type-icon">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 9L12 15L18 9" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <h4>Dropdown list</h4>
                        <p>Choose one option</p>
                      </div>
                      <div className="field-type-card" onClick={() => handleFieldTypeClick("checkbox")}>
                        <div className="field-type-icon">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <h4>Checkbox</h4>
                        <p>Single toggle</p>
                      </div>
                      <div className="field-type-card" onClick={() => handleFieldTypeClick("checkbox-list")}>
                        <div className="field-type-icon">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 6H20M8 12H20M8 18H20M4 6H4.01M4 12H4.01M4 18H4.01" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <h4>Checkbox list</h4>
                        <p>Select many</p>
                      </div>
                      <div className="field-type-card" onClick={() => handleFieldTypeClick("yes-no")}>
                        <div className="field-type-icon">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="#64748B"/>
                          </svg>
                        </div>
                        <h4>Yes / No</h4>
                        <p>Binary choice</p>
                      </div>
                      <div className="field-type-card" onClick={() => handleFieldTypeClick("file")}>
                        <div className="field-type-icon">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M14 2V8H20" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <h4>File upload</h4>
                        <p>Add a file</p>
                      </div>
                    </div>
                  </div>
                )}

                  {formFields.map((field, index) => {
                    if (field.type === "text") {
                      return (
                        <div key={field.id} className="field-config-section" data-field-id={field.id}>
                          <div className="field-config-header">
                            <span className="field-type-label">TEXT</span>
                            <div className="field-actions">
                              <button
                                className="field-action-btn"
                                onClick={() => handleMoveField(index, 'up')}
                                disabled={index === 0}
                              >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M12 10L8 6L4 10" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                              <button
                                className="field-action-btn"
                                onClick={() => handleMoveField(index, 'down')}
                                disabled={index === formFields.length - 1}
                              >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M4 6L8 10L12 6" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                              <button
                                className="field-action-btn remove-btn"
                                onClick={() => handleFieldRemove(index)}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                          <div className="field-config-content">
                            <div className="field-config-item">
                              <label className="field-config-label">Question</label>
                              <Input
                                value={field.question}
                                onChange={(e) => handleFieldUpdate(index, { question: e.target.value })}
                                placeholder="Your question"
                                style={{
                                  borderRadius: '8px',
                                }}
                              />
                            </div>
                            <div className="field-config-item">
                              <Checkbox
                                label="Required"
                                name={`required-${field.id}`}
                                checked={field.required}
                                onChange={(e) => handleFieldUpdate(index, { required: e.target.checked })}
                              />
                            </div>
                            <div className="field-config-item">
                              <label className="field-config-label">Answer size</label>
                              <div className="answer-size-options">
                                <button
                                  className={`answer-size-btn ${field.answerSize === 'single' ? 'active' : ''}`}
                                  onClick={() => handleFieldUpdate(index, { answerSize: 'single' })}
                                >
                                  Single line
                                </button>
                                <button
                                  className={`answer-size-btn ${field.answerSize === 'medium' ? 'active' : ''}`}
                                  onClick={() => handleFieldUpdate(index, { answerSize: 'medium' })}
                                >
                                  Medium text box
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    } else if (field.type === "dropdown") {
                      return (
                        <div key={field.id} className="field-config-section" data-field-id={field.id}>
                          <div className="field-config-header">
                            <span className="field-type-label">DROPDOWN</span>
                            <div className="field-actions">
                              <button
                                className="field-action-btn"
                                onClick={() => handleMoveField(index, 'up')}
                                disabled={index === 0}
                              >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M12 10L8 6L4 10" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                              <button
                                className="field-action-btn"
                                onClick={() => handleMoveField(index, 'down')}
                                disabled={index === formFields.length - 1}
                              >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M4 6L8 10L12 6" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                              <button
                                className="field-action-btn remove-btn"
                                onClick={() => handleFieldRemove(index)}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                          <div className="field-config-content">
                            <div className="field-config-item">
                              <label className="field-config-label">Question</label>
                              <Input
                                value={field.question}
                                onChange={(e) => handleFieldUpdate(index, { question: e.target.value })}
                                placeholder="Your question"
                                style={{
                                  borderRadius: '8px',
                                }}
                              />
                            </div>
                            <div className="field-config-item">
                              <Checkbox
                                label="Required"
                                name={`required-${field.id}`}
                                checked={field.required}
                                onChange={(e) => handleFieldUpdate(index, { required: e.target.checked })}
                              />
                            </div>
                            <div className="field-config-item">
                              <label className="field-config-label">Options</label>
                              <div className="dropdown-options-list">
                                {field.options && field.options.map((option, optionIndex) => (
                                  <div key={optionIndex} className="dropdown-option-item">
                                    <Input
                                      value={option}
                                      onChange={(e) => handleUpdateDropdownOption(index, optionIndex, e.target.value)}
                                      style={{
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '8px',
                                        flex: 1,
                                      }}
                                    />
                                    <button
                                      className="delete-option-btn"
                                      onClick={() => handleRemoveDropdownOption(index, optionIndex)}
                                      type="button"
                                      disabled={field.options.length <= 1}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                ))}
                                <div className="dropdown-option-item">
                                  <Input
                                    value={newOptionValues[index] || ""}
                                    onChange={(e) => setNewOptionValues({ ...newOptionValues, [index]: e.target.value })}
                                    placeholder="Add an option"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddDropdownOption(index);
                                      }
                                    }}
                                    style={{
                                      border: '1px solid #E5E7EB',
                                      borderRadius: '8px',
                                      flex: 1,
                                    }}
                                  />
                                  <button
                                    className="add-option-btn"
                                    onClick={() => handleAddDropdownOption(index)}
                                    type="button"
                                  >
                                    Add
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    } else if (field.type === "checkbox") {
                      return (
                        <div key={field.id} className="field-config-section" data-field-id={field.id}>
                          <div className="field-config-header">
                            <span className="field-type-label">CHECKBOX</span>
                            <div className="field-actions">
                              <button
                                className="field-action-btn"
                                onClick={() => handleMoveField(index, 'up')}
                                disabled={index === 0}
                              >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M12 10L8 6L4 10" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                              <button
                                className="field-action-btn"
                                onClick={() => handleMoveField(index, 'down')}
                                disabled={index === formFields.length - 1}
                              >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M4 6L8 10L12 6" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                              <button
                                className="field-action-btn remove-btn"
                                onClick={() => handleFieldRemove(index)}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                          <div className="field-config-content">
                            <div className="field-config-item">
                              <label className="field-config-label">Question</label>
                              <Input
                                value={field.question}
                                onChange={(e) => handleFieldUpdate(index, { question: e.target.value })}
                                placeholder="Your question"
                                style={{
                                  borderRadius: '8px',
                                }}
                              />
                            </div>
                            <div className="field-config-item">
                              <Checkbox
                                label="Required"
                                name={`required-${field.id}`}
                                checked={field.required}
                                onChange={(e) => handleFieldUpdate(index, { required: e.target.checked })}
                              />
                            </div>
                            <div className="field-config-item">
                              <label className="field-config-label">Checkbox label</label>
                              <Input
                                value={field.checkboxLabel || ""}
                                onChange={(e) => handleFieldUpdate(index, { checkboxLabel: e.target.value })}
                                placeholder="I agree"
                                style={{
                                  borderRadius: '8px',
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    } else if (field.type === "checkbox-list") {
                      return (
                        <div key={field.id} className="field-config-section" data-field-id={field.id}>
                          <div className="field-config-header">
                            <span className="field-type-label">CHECKBOX LIST</span>
                            <div className="field-actions">
                              <button
                                className="field-action-btn"
                                onClick={() => handleMoveField(index, 'up')}
                                disabled={index === 0}
                              >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M12 10L8 6L4 10" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                              <button
                                className="field-action-btn"
                                onClick={() => handleMoveField(index, 'down')}
                                disabled={index === formFields.length - 1}
                              >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M4 6L8 10L12 6" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                              <button
                                className="field-action-btn remove-btn"
                                onClick={() => handleFieldRemove(index)}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                          <div className="field-config-content">
                            <div className="field-config-item">
                              <label className="field-config-label">Question</label>
                              <Input
                                value={field.question}
                                onChange={(e) => handleFieldUpdate(index, { question: e.target.value })}
                                placeholder="Your question"
                                style={{
                                  borderRadius: '8px',
                                }}
                              />
                            </div>
                            <div className="field-config-item">
                              <Checkbox
                                label="Required"
                                name={`required-${field.id}`}
                                checked={field.required}
                                onChange={(e) => handleFieldUpdate(index, { required: e.target.checked })}
                              />
                            </div>
                            <div className="field-config-item">
                              <label className="field-config-label">Options</label>
                              <div className="dropdown-options-list">
                                {field.options && field.options.map((option, optionIndex) => (
                                  <div key={optionIndex} className="dropdown-option-item">
                                    <Input
                                      value={option}
                                      onChange={(e) => handleUpdateCheckboxListOption(index, optionIndex, e.target.value)}
                                      style={{
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '8px',
                                        flex: 1,
                                      }}
                                    />
                                    <button
                                      className="delete-option-btn"
                                      onClick={() => handleRemoveCheckboxListOption(index, optionIndex)}
                                      type="button"
                                      disabled={field.options.length <= 1}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                ))}
                                <div className="dropdown-option-item">
                                  <Input
                                    value={newOptionValues[index] || ""}
                                    onChange={(e) => setNewOptionValues({ ...newOptionValues, [index]: e.target.value })}
                                    placeholder="Add an option"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddCheckboxListOption(index);
                                      }
                                    }}
                                    style={{
                                      border: '1px solid #E5E7EB',
                                      borderRadius: '8px',
                                      flex: 1,
                                    }}
                                  />
                                  <button
                                    className="add-option-btn"
                                    onClick={() => handleAddCheckboxListOption(index)}
                                    type="button"
                                  >
                                    Add
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    } else if (field.type === "yes-no") {
                      return (
                        <div key={field.id} className="field-config-section" data-field-id={field.id}>
                          <div className="field-config-header">
                            <span className="field-type-label">YESNO</span>
                            <div className="field-actions">
                              <button
                                className="field-action-btn"
                                onClick={() => handleMoveField(index, 'up')}
                                disabled={index === 0}
                              >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M12 10L8 6L4 10" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                              <button
                                className="field-action-btn"
                                onClick={() => handleMoveField(index, 'down')}
                                disabled={index === formFields.length - 1}
                              >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M4 6L8 10L12 6" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                              <button
                                className="field-action-btn remove-btn"
                                onClick={() => handleFieldRemove(index)}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                          <div className="field-config-content">
                            <div className="field-config-item">
                              <label className="field-config-label">Question</label>
                              <Input
                                value={field.question}
                                onChange={(e) => handleFieldUpdate(index, { question: e.target.value })}
                                placeholder="Yes or No?"
                                style={{
                                  borderRadius: '8px',
                                }}
                              />
                            </div>
                            <div className="field-config-item">
                              <Checkbox
                                label="Required"
                                name={`required-${field.id}`}
                                checked={field.required}
                                onChange={(e) => handleFieldUpdate(index, { required: e.target.checked })}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    } else if (field.type === "file") {
                      return (
                        <div key={field.id} className="field-config-section" data-field-id={field.id}>
                          <div className="field-config-header">
                            <span className="field-type-label">FILE</span>
                            <div className="field-actions">
                              <button
                                className="field-action-btn"
                                onClick={() => handleMoveField(index, 'up')}
                                disabled={index === 0}
                              >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M12 10L8 6L4 10" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                              <button
                                className="field-action-btn"
                                onClick={() => handleMoveField(index, 'down')}
                                disabled={index === formFields.length - 1}
                              >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M4 6L8 10L12 6" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                              <button
                                className="field-action-btn remove-btn"
                                onClick={() => handleFieldRemove(index)}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                          <div className="field-config-content">
                            <div className="field-config-item">
                              <label className="field-config-label">Question</label>
                              <Input
                                value={field.question}
                                onChange={(e) => handleFieldUpdate(index, { question: e.target.value })}
                                placeholder="Upload a file"
                                style={{
                                  borderRadius: '8px',
                                }}
                              />
                            </div>
                            <div className="field-config-item">
                              <Checkbox
                                label="Required"
                                name={`required-${field.id}`}
                                checked={field.required}
                                onChange={(e) => handleFieldUpdate(index, { required: e.target.checked })}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}

                  {!showFieldTypeSelection && (
                    <div className="form-builder-footer">
                      <button
                        className="add-another-btn"
                        onClick={handleAddAnother}
                        type="button"
                      >
                        <FaPlus style={{ marginRight: '8px' }} />
                        Add another
                      </button>
                    </div>
                  )}
                </div>

                <div className="form-builder-preview">
                  <h3 className="preview-title">
                    {!formName || formName.trim() === "" || formName === "Click to add form name" 
                      ? "Untitled Form" 
                      : formName}
                  </h3>
                  {formDescription && formDescription.trim() !== "" && (
                    <p className="preview-description">
                      {formDescription}
                    </p>
                  )}
                  {formFields.length === 0 ? (
                    <p className="preview-placeholder">Your questions will appear here.</p>
                  ) : (
                    <div className="preview-fields">
                      {formFields.map((field, index) => (
                        <div key={field.id} className="preview-field">
                          <p className="preview-question">
                            {field.question || "Your question"}
                            {field.required && <span className="required-asterisk"> *</span>}
                          </p>
                          {field.type === "text" && (
                            field.answerSize === "single" ? (
                              <Input
                                placeholder="Your answer"
                                disabled
                                style={{
                                  backgroundColor: '#F9FAFB',
                                  border: '1px solid #E5E7EB',
                                  cursor: 'not-allowed',
                                }}
                              />
                            ) : (
                              <Textarea
                                placeholder="Your answer"
                                disabled
                                style={{
                                  backgroundColor: '#F9FAFB',
                                  border: '1px solid #E5E7EB',
                                  cursor: 'not-allowed',
                                  minHeight: '80px',
                                }}
                              />
                            )
                          )}
                          {field.type === "dropdown" && (
                            <div style={{ width: '100%' }}>
                              <select
                                style={{
                                  width: '100%',
                                  padding: '10px 14px',
                                  backgroundColor: '#FFFFFF',
                                  border: '1px solid #E5E7EB',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  fontFamily: 'Inter, sans-serif',
                                  fontSize: '14px',
                                  lineHeight: '20px',
                                  color: '#121212',
                                  appearance: 'none',
                                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6L8 10L12 6' stroke='%2364748B' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                                  backgroundRepeat: 'no-repeat',
                                  backgroundPosition: 'right 14px center',
                                  paddingRight: '40px',
                                }}
                                value={field.options && field.options.length > 0 ? field.options[0] : ""}
                                onChange={(e) => e.preventDefault()} // Prevent changes in preview
                              >
                                {field.options && field.options.length > 0 ? (
                                  field.options.map((option, optIndex) => (
                                    <option key={optIndex} value={option}>
                                      {option}
                                    </option>
                                  ))
                                ) : (
                                  <option value="">Select an option</option>
                                )}
                              </select>
                            </div>
                          )}
                          {field.type === "checkbox" && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="checkbox"
                                disabled
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  cursor: 'not-allowed',
                                  opacity: 0.6,
                                }}
                              />
                              <span style={{
                                fontFamily: 'Inter, sans-serif',
                                fontSize: '14px',
                                lineHeight: '20px',
                                color: '#121212',
                              }}>
                                {field.checkboxLabel || "I agree"}
                              </span>
                            </div>
                          )}
                          {field.type === "checkbox-list" && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {field.options && field.options.length > 0 ? (
                                field.options.map((option, optIndex) => (
                                  <div key={optIndex} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                      type="checkbox"
                                      disabled
                                      style={{
                                        width: '20px',
                                        height: '20px',
                                        cursor: 'not-allowed',
                                        opacity: 0.6,
                                      }}
                                    />
                                    <span style={{
                                      fontFamily: 'Inter, sans-serif',
                                      fontSize: '14px',
                                      lineHeight: '20px',
                                      color: '#121212',
                                    }}>
                                      {option}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <input
                                    type="checkbox"
                                    disabled
                                    style={{
                                      width: '20px',
                                      height: '20px',
                                      cursor: 'not-allowed',
                                      opacity: 0.6,
                                    }}
                                  />
                                  <span style={{
                                    fontFamily: 'Inter, sans-serif',
                                    fontSize: '14px',
                                    lineHeight: '20px',
                                    color: '#121212',
                                  }}>
                                    Option 1
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                          {field.type === "yes-no" && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'not-allowed' }}>
                                <input
                                  type="radio"
                                  name={`yes-no-${field.id}`}
                                  disabled
                                  style={{
                                    width: '20px',
                                    height: '20px',
                                    cursor: 'not-allowed',
                                    opacity: 0.6,
                                  }}
                                />
                                <span style={{
                                  fontFamily: 'Inter, sans-serif',
                                  fontSize: '14px',
                                  lineHeight: '20px',
                                  color: '#121212',
                                }}>
                                  Yes
                                </span>
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'not-allowed' }}>
                                <input
                                  type="radio"
                                  name={`yes-no-${field.id}`}
                                  disabled
                                  style={{
                                    width: '20px',
                                    height: '20px',
                                    cursor: 'not-allowed',
                                    opacity: 0.6,
                                  }}
                                />
                                <span style={{
                                  fontFamily: 'Inter, sans-serif',
                                  fontSize: '14px',
                                  lineHeight: '20px',
                                  color: '#121212',
                                }}>
                                  No
                                </span>
                              </label>
                            </div>
                          )}
                          {field.type === "file" && (
                            <div style={{ width: '100%' }}>
                              <div style={{ marginBottom: '8px', position: 'relative' }}>
                                <input
                                  type="file"
                                  accept=".png,.jpg,.jpeg,.heic,.pdf"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setSelectedFiles({
                                        ...selectedFiles,
                                        [field.id]: file
                                      });
                                    }
                                  }}
                                  className="preview-file-input"
                                  style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    fontFamily: 'Inter, sans-serif',
                                    fontSize: '14px',
                                    lineHeight: '20px',
                                    color: '#121212',
                                    border: '1px solid #3B82F6',
                                    borderRadius: '8px',
                                    backgroundColor: '#F0F4FF',
                                    cursor: 'pointer',
                                  }}
                                />
                              </div>
                              <p style={{
                                fontFamily: 'Inter, sans-serif',
                                fontSize: '12px',
                                lineHeight: '16px',
                                color: '#64748B',
                                margin: 0,
                              }}>
                                accepted file types: PNG, JPG, HEIC, PDF.
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <Button
                    text="Submit (disabled in preview)"
                    variant="primary"
                    style={{
                      marginTop: '24px',
                      width: '100%',
                      opacity: 0.6,
                      cursor: 'not-allowed',
                    }}
                    disabled
                  />
                </div>
              </div>
            </div>
          </div>
        ) : loading || refreshingForms ? (
          <div className="forms-loading">
            <div className="forms-spinner"></div>
            <p className="forms-loading-text">{refreshingForms ? "Refreshing forms..." : "Loading forms..."}</p>
          </div>
        ) : forms.length === 0 ? (
          <div className="empty-state-container">
            <div className="empty-state-box">
              <h3>No forms yet</h3>
              <p>Your intake forms will appear here once you create them.</p>
            </div>
          </div>
        ) : (
          <>
          <div className="forms-card-list">
            {forms.map((form) => {
              // Gray out all inactive forms regardless of plan
              const isGrayedOut = !form.isActive;
              const isToggling = togglingFormId === form._id;
              // Can toggle if: not on free plan, OR form is active, OR no active form yet
              // On free plan with multiple forms: can only activate if no other is active
              const canToggle = formLimit !== 1 || form.isActive || !hasActiveForm;
              // Disable toggle for inactive forms when another is already active (but still allow click for toast)
              const isToggleDisabled = formLimit === 1 && !form.isActive && hasActiveForm;
              const isMenuOpen = openMenuId === form._id;
              
              return (
              <div 
                className={`cardd ${isGrayedOut ? 'forms-grayed-out' : ''} ${isToggling ? 'forms-toggling' : ''}`}
                key={form._id || form.id}
                style={{ position: 'relative' }}
              >
                {isToggling && (
                  <div className="forms-card-loader-overlay">
                    <div className="forms-card-spinner"></div>
                  </div>
                )}
                <div className="top">
                  <h2>{form.name}</h2>
                  <ActionMenu
                    isOpen={isMenuOpen}
                    onOpenChange={(open) => {
                      if (open) {
                        setOpenMenuId(form._id || form.id);
                      } else {
                        setOpenMenuId(null);
                      }
                    }}
                    items={[
                      {
                        label: "Edit",
                        icon: <FaEdit />,
                        onClick: () => {
                          setOpenMenuId(null);
                          handleEdit(form);
                        },
                      },
                      {
                        label: "Delete",
                        icon: <RiDeleteBin5Line />,
                        onClick: () => {
                          setOpenMenuId(null);
                          handleDeleteClick(form);
                        },
                      },
                      {
                        label: form.isActive ? "Active" : "Inactive",
                        icon: (
                          <div className={`forms-toggle-switch ${form.isActive ? 'active' : ''}`}>
                            <div className={`forms-toggle-slider ${form.isActive ? 'active' : ''} ${isToggleDisabled ? 'disabled' : ''}`} />
                          </div>
                        ),
                        onClick: () => {
                          if (isToggleDisabled) {
                            toast.error("Deactivate one of the active forms or upgrade to Pro to activate this");
                            return;
                          }
                          if (!canToggle) {
                            toast.error("Toggle disable one of the active forms to activate or upgrade to pro");
                            return;
                          }
                          setOpenMenuId(null);
                          handleToggleActive(form);
                        },
                        disabled: isToggleDisabled,
                      },
                    ]}
                  />
                </div>

                <div className="bottom">
                  <div className="wrap">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12.017 7.01108H15.761L13.3753 4.62383C12.6072 3.85573 11.6504 3.30337 10.6012 3.02228C9.55196 2.74119 8.4472 2.74127 7.39799 3.02252C6.34879 3.30377 5.39211 3.85627 4.62414 4.62448C3.85617 5.39269 3.30397 6.34954 3.02304 7.39883M2.23854 14.7331V10.9891M2.23854 10.9891H5.98254M2.23854 10.9891L4.62354 13.3763C5.39163 14.1444 6.34839 14.6968 7.39763 14.9779C8.44688 15.259 9.55164 15.2589 10.6008 14.9776C11.65 14.6964 12.6067 14.1439 13.3747 13.3757C14.1427 12.6075 14.6949 11.6506 14.9758 10.6013M15.761 3.26708V7.00958"
                        stroke="#64748B"
                        strokeWidth="1.125"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>{form.isActive ? "Active" : "Inactive"}</span>
                  </div>
                </div>
              </div>
              );
            })}
          </div>

          {/* Bottom Warning Section */}
          {shouldShowWarnings && (
            <div className="forms-bottom-warning">
              <div className="forms-bottom-warning-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"
                    fill="#FA5151"
                  />
                </svg>
              </div>
              <p className="forms-bottom-warning-text">
                You've switched to the Free Plan. This plan allows 1 active intake form. All of your forms are currently set to inactive. Please choose 1 intake form to activate.
              </p>
            </div>
          )}
          </>
        )}

        {/* Preview Modal */}
        <Modal
          show={showPreviewModal}
          onHide={() => setShowPreviewModal(false)}
          centered
          backdrop="static"
          className="previewFormModal"
        >
          <Modal.Header>
            <div className="content-wrap">
              <Modal.Title>Preview</Modal.Title>
            </div>
            <button
              className="close-btn"
              onClick={() => setShowPreviewModal(false)}
              type="button"
            >
              <IoClose size={20} color="#64748B" />
            </button>
          </Modal.Header>
          <Modal.Body>
            <h3 className="preview-title">
                  {!formName || formName.trim() === "" || formName === "Click to add form name" 
                    ? "Untitled Form" 
                    : formName}
                </h3>
                {formDescription && formDescription.trim() !== "" && (
                  <p className="preview-description">
                    {formDescription}
                  </p>
                )}
                {formFields.length === 0 ? (
                  <p className="preview-placeholder">Your questions will appear here.</p>
                ) : (
                  <div className="preview-fields">
                    {formFields.map((field, index) => (
                      <div key={field.id} className="preview-field">
                        <p className="preview-question">
                          {field.question || "Your question"}
                          {field.required && <span className="required-asterisk"> *</span>}
                        </p>
                        {field.type === "text" && (
                          field.answerSize === "single" ? (
                            <Input
                              placeholder="Your answer"
                              disabled
          style={{
                                backgroundColor: '#F9FAFB',
                                border: '1px solid #E5E7EB',
                                cursor: 'not-allowed',
                              }}
                            />
                          ) : (
                            <Textarea
                              placeholder="Your answer"
                              disabled
                              style={{
                                backgroundColor: '#F9FAFB',
                                border: '1px solid #E5E7EB',
                                cursor: 'not-allowed',
                                minHeight: '80px',
                              }}
                            />
                          )
                        )}
                        {field.type === "dropdown" && (
                          <div style={{ width: '100%' }}>
                            <select
            style={{
                                width: '100%',
                                padding: '10px 14px',
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #E5E7EB',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontFamily: 'Inter, sans-serif',
                                fontSize: '14px',
                                lineHeight: '20px',
                                color: '#121212',
                                appearance: 'none',
                                backgroundImage: `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6L8 10L12 6' stroke='%2364748B' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right 14px center',
                                paddingRight: '40px',
                              }}
                              value={field.options && field.options.length > 0 ? field.options[0] : ""}
                              onChange={(e) => e.preventDefault()}
                            >
                              {field.options && field.options.length > 0 ? (
                                field.options.map((option, optIndex) => (
                                  <option key={optIndex} value={option}>
                                    {option}
                                  </option>
                                ))
                              ) : (
                                <option value="">Select an option</option>
                              )}
                            </select>
                          </div>
                        )}
                        {field.type === "checkbox" && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="checkbox"
                              disabled
                style={{
                                width: '20px',
                                height: '20px',
                                cursor: 'not-allowed',
                                opacity: 0.6,
                              }}
                            />
                            <span style={{
                              fontFamily: 'Inter, sans-serif',
                              fontSize: '14px',
                              lineHeight: '20px',
                              color: '#121212',
                            }}>
                              {field.checkboxLabel || "I agree"}
                            </span>
              </div>
                        )}
                        {field.type === "checkbox-list" && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {field.options && field.options.length > 0 ? (
                              field.options.map((option, optIndex) => (
                                <div key={optIndex} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <input
                                    type="checkbox"
                                    disabled
                                    style={{
                                      width: '20px',
                                      height: '20px',
                                      cursor: 'not-allowed',
                                      opacity: 0.6,
                                    }}
                                  />
                                  <span style={{
                                    fontFamily: 'Inter, sans-serif',
                                    fontSize: '14px',
                                    lineHeight: '20px',
                                    color: '#121212',
                                  }}>
                                    {option}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                  type="checkbox"
                                  disabled
                                  style={{
                                    width: '20px',
                                    height: '20px',
                                    cursor: 'not-allowed',
                                    opacity: 0.6,
                                  }}
                                />
                                <span style={{
                                  fontFamily: 'Inter, sans-serif',
                                  fontSize: '14px',
                                  lineHeight: '20px',
                                  color: '#121212',
                                }}>
                                  Option 1
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                        {field.type === "yes-no" && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'not-allowed' }}>
                              <input
                                type="radio"
                                name={`yes-no-modal-${field.id}`}
                                disabled
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  cursor: 'not-allowed',
                                  opacity: 0.6,
                                }}
                              />
                              <span style={{
                                fontFamily: 'Inter, sans-serif',
                                fontSize: '14px',
                                lineHeight: '20px',
                                color: '#121212',
                              }}>
                                Yes
                              </span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'not-allowed' }}>
                              <input
                                type="radio"
                                name={`yes-no-modal-${field.id}`}
                                disabled
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  cursor: 'not-allowed',
                                  opacity: 0.6,
                                }}
                              />
                              <span style={{
                                fontFamily: 'Inter, sans-serif',
                                fontSize: '14px',
                                lineHeight: '20px',
                                color: '#121212',
                              }}>
                                No
                              </span>
                            </label>
                          </div>
                        )}
                        {field.type === "file" && (
                          <div style={{ width: '100%' }}>
                            <div style={{ marginBottom: '8px', position: 'relative' }}>
                              <input
                                type="file"
                                accept=".png,.jpg,.jpeg,.heic,.pdf"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setSelectedFiles({
                                      ...selectedFiles,
                                      [field.id]: file
                                    });
                                  }
                                }}
                                className="preview-file-input"
                                style={{
                                  width: '100%',
                                  padding: '10px 14px',
                                  fontFamily: 'Inter, sans-serif',
                                  fontSize: '14px',
                                  lineHeight: '20px',
                                  color: '#121212',
                                  border: '1px solid #3B82F6',
                borderRadius: '8px', 
                                  backgroundColor: '#F0F4FF',
                                  cursor: 'pointer',
                                }}
                              />
                            </div>
                            <p style={{
                              fontFamily: 'Inter, sans-serif',
                              fontSize: '12px',
                              lineHeight: '16px',
                              color: '#64748B',
                              margin: 0,
                            }}>
                              accepted file types: PNG, JPG, HEIC, PDF.
                </p>
              </div>
                        )}
            </div>
                    ))}
                  </div>
                )}
              <Button
                  text="Submit (disabled in preview)"
                  variant="primary"
                  style={{
                    marginTop: '24px',
                    width: '100%',
                    opacity: 0.6,
                    cursor: 'not-allowed',
                  }}
                  disabled
                />
          </Modal.Body>
        </Modal>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        show={showDeleteModal}
        onHide={() => {
          if (!isDeleting) {
            setShowDeleteModal(false);
            setFormToDelete(null);
          }
        }}
        centered
        backdrop="static"
        className="delete-confirmation-modal"
      >
        <Modal.Body style={{ padding: 0 }}>
          <div className="delete-modal-content">
            <button 
              className="delete-modal-close-btn"
                onClick={() => {
                if (!isDeleting) {
                  setShowDeleteModal(false);
                  setFormToDelete(null);
                }
                }}
                disabled={isDeleting}
                style={{
                position: 'absolute',
                right: '13px',
                top: '13px',
                width: '18px',
                height: '18px',
                background: 'none',
                border: 'none',
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.5 4.5L13.5 13.5M13.5 4.5L4.5 13.5" stroke="#64748B" strokeWidth="1.125" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            
            <div className="delete-modal-text">
              <h4>Delete form?</h4>
              {formToDelete && (
                <p style={{ marginBottom: '8px' }}>Are you sure you want to delete{' '}<strong>{formToDelete.name}</strong>?</p>
              )}
              <p>This action can't be undone.</p>
            </div>
            
            <div className="delete-modal-buttons">
              <button 
                className="delete-modal-delete-btn"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
              <button 
                className="delete-modal-cancel-btn"
                onClick={() => {
                  if (!isDeleting) {
                    setShowDeleteModal(false);
                    setFormToDelete(null);
                  }
                }}
                disabled={isDeleting}
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal.Body>
      </Modal>
      {!showFormBuilder && <HowThisWorksButton title="How Forms Works" />}

      {isMobile && showFormBuilder && (
        <div className={`form-builder-mobile-toolbar ${showMobileActionBar ? 'visible' : ''}`}>
          <button
            type="button"
            className="mobile-toolbar-btn secondary"
            onClick={handleAddAnother}
          >
            Add field
          </button>
          <button
            type="button"
            className="mobile-toolbar-btn ghost"
            onClick={() => setShowPreviewModal(true)}
          >
            Preview
          </button>
          <button
            type="button"
            className="mobile-toolbar-btn primary"
            onClick={handleSaveForm}
            disabled={savingForm}
          >
            {savingForm ? "Saving..." : "Save Form"}
          </button>
        </div>
      )}
    </AppLayout>
  );
};

export default Forms;

