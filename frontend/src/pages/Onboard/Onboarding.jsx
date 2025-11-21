import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Input, Textarea, ColorPicker, Checkbox, Select } from "../../components";
import { PlusIcon, ClockIcon, DollarIcon, IPhoneShareIcon, AddIconIPhone } from "../../components/SVGICONS/Svg";
import { RxCross2 } from "react-icons/rx";
import { FaRegCopy } from "react-icons/fa6";
import { toast } from "sonner";
import { detectUserLocation } from "../../utils/locationDetection";
import { getTimezoneOptions, getTimezoneLabel, getTimezoneValue, mapToSupportedTimezone } from "../../utils/timezones";
import "./Onboarding.css";

const days = ["S", "M", "T", "W", "T", "F", "S"];
const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const Onboarding = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isSavingOnboarding, setIsSavingOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState("start"); // "start", "step1", "step2", "step3", "step4", "step5", or "step6"
  
  // Track completion status
  const [step1Completed, setStep1Completed] = useState(false);
  const [step1Skipped, setStep1Skipped] = useState(false);
  const [step2Completed, setStep2Completed] = useState(false);
  const [step2Skipped, setStep2Skipped] = useState(false);
  const [step3Completed, setStep3Completed] = useState(false);
  const [step3Skipped, setStep3Skipped] = useState(false);
  const [step4Completed, setStep4Completed] = useState(false);
  const [step4Skipped, setStep4Skipped] = useState(false);
  
  // Step1 state
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [otherIndustry, setOtherIndustry] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  // Step2 state - weekly availability
  const [weeklyAvailability, setWeeklyAvailability] = useState({
    sunday: [],
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
  });
  
  // Step3 state - services
  const [services, setServices] = useState([]);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceFormData, setServiceFormData] = useState({
    name: "",
    description: "",
    duration: 0,
    bufferTime: 0,
    price: 0,
    color: "#CC0B0B",
    isActive: true,
  });
  
  // Step4 state - business info
  const [businessName, setBusinessName] = useState("");
  const [selectedTimezone, setSelectedTimezone] = useState(null);
  const [timezoneOptions, setTimezoneOptions] = useState([]);
  
  // Step5 state - booking link
  const [bookingSlug, setBookingSlug] = useState("");
  const [isLoadingSlug, setIsLoadingSlug] = useState(false);

  const industryOptions = [
    "Beauty & Aesthetics",
    "Wellness & Healing",
    "Fitness & Coaching",
    "Creative & Content",
    "Education & Tutoring",
    "Home & Personal Services",
    "Marketing & Strategy",
    "Other",
  ];

  // Check if user is authenticated and if they've completed onboarding
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/auth/me`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();

          // If user has already completed onboarding, redirect to booking page
          if (data.user?.onboardingCompleted) {
            navigate('/booking');
            return;
          }

          setIsAuthenticated(true);
        } else {
          window.location.href = '/login';
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        window.location.href = '/login';
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [navigate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (currentStep !== "step1") return;
    
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [currentStep]);

  const handleStart = () => {
    setCurrentStep("step1");
  };

  const handleOptionSelect = (option) => {
    setSelectedIndustry(option);
    setIsDropdownOpen(false);
    if (option !== "Other") {
      setOtherIndustry("");
    }
  };

  const handleContinue = () => {
    if (isContinueEnabled) {
      // Save the selection (to be implemented with backend)
      console.log("Selected Industry:", selectedIndustry);
      if (selectedIndustry === "Other") {
        console.log("Other Industry:", otherIndustry);
      }
      setStep1Completed(true);
      setStep1Skipped(false);
      setCurrentStep("step2");
    }
  };

  const handleSkip = () => {
    setStep1Skipped(true);
    setStep1Completed(false);
    setCurrentStep("step2");
  };

  const handleStep2Continue = () => {
    if (isStep2ContinueEnabled) {
      console.log("Weekly Availability:", weeklyAvailability);
      setStep2Completed(true);
      setStep2Skipped(false);
      setCurrentStep("step3");
    }
  };

  const handleStep2Skip = () => {
    setStep2Skipped(true);
    setStep2Completed(false);
    setCurrentStep("step3");
  };
  
  const handleStep3Continue = () => {
    if (isStep3ContinueEnabled) {
      console.log("Services:", services);
      setStep3Completed(true);
      setStep3Skipped(false);
      setCurrentStep("step4");
    }
  };

  const handleStep3Skip = () => {
    setStep3Skipped(true);
    setStep3Completed(false);
    setCurrentStep("step4");
  };
  
  const handleStep4Continue = () => {
    if (isStep4ContinueEnabled) {
      console.log("Business Name:", businessName);
      console.log("Timezone:", selectedTimezone);
      setStep4Completed(true);
      setStep4Skipped(false);
      setCurrentStep("step5");
    }
  };

  const handleStep4Skip = () => {
    setStep4Skipped(true);
    setStep4Completed(false);
    setCurrentStep("step5");
  };
  
  // Generate slug from business name
  const generateSlugFromName = (name) => {
    if (!name || typeof name !== 'string') {
      return "yourbusinessname";
    }

    // Convert to lowercase
    let slug = name.toLowerCase();

    // Remove apostrophes
    slug = slug.replace(/'/g, '');

    // Replace spaces and underscores with hyphens
    slug = slug.replace(/[\s_]+/g, '-');

    // Remove all special characters except hyphens
    slug = slug.replace(/[^a-z0-9-]/g, '');

    // Replace multiple consecutive hyphens with a single hyphen
    slug = slug.replace(/-+/g, '-');

    // Remove leading and trailing hyphens
    slug = slug.replace(/^-+|-+$/g, '');

    // Ensure slug is not empty
    if (!slug) {
      slug = "yourbusinessname";
    }

    return slug;
  };
  
  // Fetch slug from API if step4 was skipped
  useEffect(() => {
    if (currentStep === "step5" && step4Skipped && !bookingSlug) {
      setIsLoadingSlug(true);
      const fetchSlug = async () => {
        try {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
          const response = await fetch(`${apiUrl}/api/auth/me`, {
            credentials: 'include',
          });

          if (response.ok) {
            const data = await response.json();
            setBookingSlug(data.user?.slug || "yourbusinessname");
          } else {
            setBookingSlug("yourbusinessname");
          }
        } catch (error) {
          console.error('Error fetching slug:', error);
          setBookingSlug("yourbusinessname");
        } finally {
          setIsLoadingSlug(false);
        }
      };
      fetchSlug();
    } else if (currentStep === "step5" && step4Completed && businessName) {
      // Generate slug from business name
      const generatedSlug = generateSlugFromName(businessName);
      setBookingSlug(generatedSlug);
    } else if (currentStep === "step5" && !bookingSlug) {
      // Fallback
      setBookingSlug("yourbusinessname");
    }
  }, [currentStep, step4Skipped, step4Completed, businessName, bookingSlug]);
  
  const handleCopyLink = () => {
    const frontendBase = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
    const bookingLink = `${frontendBase}/${bookingSlug}`;
    
    navigator.clipboard.writeText(bookingLink).then(() => {
      toast.success('Link copied to clipboard!');
    }).catch((err) => {
      console.error('Failed to copy link:', err);
      toast.error('Failed to copy link');
    });
  };
  
  const handleCompleteSetup = () => {
    // Immediately go to step6 (Add to Home Screen page) without saving
    setCurrentStep('step6');
  };
  
  const handleDone = async () => {
    // Now do all the backend saving when "Done" is clicked
    setIsSavingOnboarding(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      // Step 2: Save weekly availability using the same endpoint as Availability page
      if (!step2Skipped && weeklyAvailability && Object.keys(weeklyAvailability).length > 0) {
        try {
          console.log('Saving weekly availability:', weeklyAvailability);
          const availabilityResponse = await fetch(`${apiUrl}/api/availability/weekly`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              weeklySchedule: weeklyAvailability,
            }),
          });

          if (!availabilityResponse.ok) {
            const errorData = await availabilityResponse.json();
            throw new Error(errorData.message || 'Failed to save weekly availability');
          }

          const availabilityResult = await availabilityResponse.json();
          console.log('Weekly availability saved:', availabilityResult);
        } catch (error) {
          console.error('Error saving weekly availability:', error);
          toast.error('Failed to save weekly availability. Please try again.');
          setIsSavingOnboarding(false);
          return;
        }
      }

      // Prepare data to send - handle skipped steps
      const onboardingData = {
        // Step 1 - Industry (if not skipped)
        industry: !step1Skipped && selectedIndustry !== "Other" ? selectedIndustry : undefined,
        otherIndustry: !step1Skipped && selectedIndustry === "Other" ? otherIndustry : undefined,

        // Step 2 - Timezone (weekly availability already saved above)
        timezone: selectedTimezone,

        // Step 3 - Services (if not skipped)
        services: !step3Skipped ? services : undefined,

        // Step 4 - Business info (if not skipped)
        businessName: !step4Skipped ? businessName : undefined,
        bookingSlug: bookingSlug,
      };

      const response = await fetch(`${apiUrl}/api/onboarding/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(onboardingData),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.message || 'Failed to save onboarding data');
        setIsSavingOnboarding(false);
        return;
      }

      // Success - navigate to booking page
      toast.success('Setup completed successfully!');
      // Set flag to show onboarding video modal on booking page
      sessionStorage.setItem('showOnboardingVideo', 'true');
      navigate('/booking');

    } catch (error) {
      console.error('Error saving onboarding:', error);
      toast.error('An error occurred. Please try again.');
      setIsSavingOnboarding(false);
    }
  };
  
  const handleTimezoneChange = (label) => {
    const timezoneValue = getTimezoneValue(label);
    setSelectedTimezone(timezoneValue);
    console.log("Timezone changed to:", timezoneValue);
  };
  
  // Auto-detect timezone when step4 is shown
  useEffect(() => {
    if (currentStep === "step4" && !selectedTimezone) {
      const location = detectUserLocation();
      const detectedTimezone = location.timezone;
      setSelectedTimezone(detectedTimezone);
      console.log("Auto-detected timezone:", detectedTimezone);
      
      // Get timezone options
      const options = getTimezoneOptions();
      setTimezoneOptions(options.map(([label]) => label));
    }
  }, [currentStep, selectedTimezone]);
  
  const handleAddNewService = () => {
    setShowServiceForm(true);
    setServiceFormData({
      name: "",
      description: "",
      duration: 0,
      bufferTime: 0,
      price: 0,
      color: "#CC0B0B",
      isActive: true,
    });
  };
  
  const handleServiceFormChange = (field, value) => {
    setServiceFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleCreateService = () => {
    if (!serviceFormData.name) {
      return;
    }
    
    const newService = {
      id: Date.now(), // Temporary ID for frontend tracking
      ...serviceFormData,
    };
    
    setServices(prev => [...prev, newService]);
    setShowServiceForm(false);
    setServiceFormData({
      name: "",
      description: "",
      duration: 0,
      bufferTime: 0,
      price: 0,
      color: "#CC0B0B",
      isActive: true,
    });
  };

  const handleDayChange = (dayName, timeRanges) => {
    setWeeklyAvailability(prev => ({
      ...prev,
      [dayName]: timeRanges,
    }));
  };

  const formatTimeDisplay = (time) => {
    const [hour, minute] = time.split(":");
    const h = parseInt(hour, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    const formattedHour = h % 12 || 12;
    return `${formattedHour}:${minute} ${ampm}`;
  };

  const isContinueEnabled = selectedIndustry && (selectedIndustry !== "Other" || otherIndustry.trim() !== "");
  
  // Step2 continue is enabled if at least one day has availability
  const isStep2ContinueEnabled = Object.values(weeklyAvailability).some(day => day.length > 0);
  
  // Step3 continue is enabled if at least one service is created
  const isStep3ContinueEnabled = services.length > 0;
  
  // Step4 continue is enabled if business name is filled
  const isStep4ContinueEnabled = businessName.trim() !== "";

  if (isChecking || !isAuthenticated) {
    return null;
  }

  return (
    <div className={`onboarding-page ${currentStep === "step3" && showServiceForm ? "onboarding-page-scrollable" : ""}`}>
      {/* Full-screen loader while saving onboarding data */}
      {isSavingOnboarding && (
        <div className="onboarding-saving-loader">
          <div className="onboarding-saving-spinner"></div>
          <p className="onboarding-saving-text">Getting things ready...</p>
        </div>
      )}

      {currentStep === "start" && (
        <div className="onboarding-container onboarding-start-container">
          <div className="onboarding-logo-section">
            <div className="onboarding-logo">
              <img src="/assets/images/logo.svg" alt="Daywise logo" />
            </div>
          </div>

          <div className="onboarding-content">
            <h1 className="onboarding-heading">
              Welcome to Daywise 👋
            </h1>
            <p className="onboarding-subheading">
              Let's get you set up quickly!
            </p>
          </div>

          <button className="onboarding-start-button" onClick={handleStart}>
            Start
          </button>
        </div>
      )}

      {currentStep === "step1" && (
        <div className="onboarding-container onboarding-step1-container">
          <div className="onboarding-step1-header-section">
            <div className="onboarding-step1-logo-wrapper">
              <img src="/assets/images/logo.svg" alt="Daywise logo" className="onboarding-step1-logo" />
            </div>

            <div className="onboarding-step1-text-section">
              <h2 className="onboarding-step1-heading">What kind of work do you do?</h2>
              <p className="onboarding-step1-subheading">Select the industry you work in.</p>
            </div>

            <div className="onboarding-step1-progress">
              {[...Array(6)].map((_, index) => (
                <div
                  key={index}
                  className={`onboarding-step1-progress-line ${index === 0 ? "active" : ""}`}
                />
              ))}
            </div>
          </div>

          <div className="onboarding-step1-form-section">
            <div
              className={`onboarding-step1-custom-select ${isDropdownOpen ? "open" : ""}`}
              ref={dropdownRef}
            >
              <div
                className="onboarding-step1-select-header"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <span className={`onboarding-step1-select-placeholder ${selectedIndustry ? "selected-value" : ""}`}>
                  {selectedIndustry || "Select an option"}
                </span>
                <div className="onboarding-step1-dropdown-arrow-wrapper">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={`onboarding-step1-dropdown-arrow ${isDropdownOpen ? "open" : ""}`}
                  >
                    <path
                      d="M3.5 5.25L7 8.75L10.5 5.25"
                      stroke="#64748B"
                      strokeWidth="0.875"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              {isDropdownOpen && (
                <div className="onboarding-step1-select-options-list">
                  <div className="onboarding-step1-select-options-inner">
                    {industryOptions.map((option) => (
                      <div
                        key={option}
                        className={`onboarding-step1-select-option-item ${selectedIndustry === option ? "selected" : ""}`}
                        onClick={() => handleOptionSelect(option)}
                      >
                        <span>{option}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selectedIndustry === "Other" && (
              <div className="onboarding-step1-other-input-section">
                <div className="onboarding-step1-other-label-wrapper">
                  <p className="onboarding-step1-other-label">Please specify:</p>
                </div>
                <Input
                  type="text"
                  value={otherIndustry}
                  onChange={(e) => setOtherIndustry(e.target.value)}
                  placeholder="Enter your type of work here"
                  className="onboarding-step1-other-input"
                />
              </div>
            )}
          </div>

          <div className="onboarding-step1-actions">
            <button className="onboarding-step1-skip-button" onClick={handleSkip}>
              Skip Step
            </button>
            <button
              className="onboarding-step1-continue-button"
              onClick={handleContinue}
              disabled={!isContinueEnabled}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {currentStep === "step2" && (
        <div className="onboarding-container onboarding-step2-container">
          <div className="onboarding-step2-header-section">
            <div className="onboarding-step2-logo-wrapper">
              <img src="/assets/images/logo.svg" alt="Daywise logo" className="onboarding-step2-logo" />
            </div>

            <div className="onboarding-step2-text-section">
              <h2 className="onboarding-step2-heading">When are you usually available?</h2>
              <p className="onboarding-step2-subheading">Set your working hours and timezone below</p>
            </div>

            <div className="onboarding-step2-progress">
              {[...Array(6)].map((_, index) => (
                <div
                  key={index}
                  className={`onboarding-step2-progress-line ${index < 2 ? "active" : ""}`}
                />
              ))}
            </div>
          </div>

          <div className="onboarding-step2-availability-section">
            {days.map((day, index) => {
              const dayName = dayNames[index];
              const timeRanges = weeklyAvailability[dayName];
              const hasAvailability = timeRanges && timeRanges.length > 0;

              return (
                <div key={index} className="onboarding-step2-day-row">
                  <div className="onboarding-step2-day-icon">
                    {day}
                  </div>
                  
                  {hasAvailability ? (
                    <>
                      {timeRanges.map((range, rangeIndex) => (
                        <div key={rangeIndex} className="onboarding-step2-time-range">
                          <div className="onboarding-step2-time-edit-fields">
                            <input
                              type="time"
                              value={range.start}
                              onChange={(e) => {
                                const updated = [...timeRanges];
                                updated[rangeIndex].start = e.target.value;
                                handleDayChange(dayName, updated);
                              }}
                              className="onboarding-step2-time-input"
                            />
                            <span> - </span>
                            <input
                              type="time"
                              value={range.end}
                              onChange={(e) => {
                                const updated = [...timeRanges];
                                updated[rangeIndex].end = e.target.value;
                                handleDayChange(dayName, updated);
                              }}
                              className="onboarding-step2-time-input"
                            />
                          </div>
                          <span
                            className="onboarding-step2-remove-icon"
                            onClick={() => {
                              const updated = timeRanges.filter((_, i) => i !== rangeIndex);
                              handleDayChange(dayName, updated);
                            }}
                          >
                            <RxCross2 color="#64748B" size={12} />
                          </span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      <div className="onboarding-step2-unavailable">
                        <span>Unavailable</span>
                      </div>
                      <span
                        className="onboarding-step2-add-icon"
                        onClick={() => {
                          handleDayChange(dayName, [{ start: "09:00", end: "17:00" }]);
                        }}
                      >
                        <PlusIcon />
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="onboarding-step2-actions">
            <button className="onboarding-step2-skip-button" onClick={handleStep2Skip}>
              Skip Step
            </button>
            <button
              className="onboarding-step2-continue-button"
              onClick={handleStep2Continue}
              disabled={!isStep2ContinueEnabled}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {currentStep === "step3" && (
        <div className="onboarding-container onboarding-step3-container">
          <div className="onboarding-step3-header-section">
            <div className="onboarding-step3-logo-wrapper">
              <img src="/assets/images/logo.svg" alt="Daywise logo" className="onboarding-step3-logo" />
            </div>

            <div className="onboarding-step3-text-section">
              <h2 className="onboarding-step3-heading">What services do you offer?</h2>
              <p className="onboarding-step3-subheading">Create a service/appointment type below.</p>
            </div>

            <div className="onboarding-step3-progress">
              {[...Array(5)].map((_, index) => (
                <div
                  key={index}
                  className={`onboarding-step3-progress-line ${index < 3 ? "active" : ""}`}
                />
              ))}
            </div>
          </div>

          {!showServiceForm && services.length === 0 && (
            <button className="onboarding-step3-add-new-button" onClick={handleAddNewService}>
              <PlusIcon />
              <span>Add New</span>
            </button>
          )}

          {showServiceForm && (
            <div className="onboarding-step3-form-section">
              <Input
                label="Service Name*"
                placeholder="Enter your service/appointment name"
                value={serviceFormData.name}
                onChange={(e) => handleServiceFormChange('name', e.target.value)}
              />
              <Textarea
                label="Description"
                placeholder="Brief description of this service"
                height="116px"
                value={serviceFormData.description}
                onChange={(e) => handleServiceFormChange('description', e.target.value)}
              />
              <div className="onboarding-step3-form-row">
                <Input
                  label="Duration (minutes)*"
                  placeholder="0"
                  type="number"
                  value={serviceFormData.duration}
                  onChange={(e) => handleServiceFormChange('duration', parseInt(e.target.value) || 0)}
                />
                <Input
                  label="Buffer Time (optional)"
                  placeholder="0"
                  type="number"
                  value={serviceFormData.bufferTime}
                  onChange={(e) => handleServiceFormChange('bufferTime', parseInt(e.target.value) || 0)}
                />
              </div>
              <Input
                label="Price $ (optional)"
                placeholder="0"
                type="number"
                value={serviceFormData.price}
                onChange={(e) => handleServiceFormChange('price', parseFloat(e.target.value) || 0)}
              />
              <ColorPicker
                label="Service color*"
                name="serviceColor"
                value={serviceFormData.color}
                onChange={(val) => handleServiceFormChange('color', val)}
              />
              <Checkbox
                name="serviceActive"
                label="Service is active and available for booking"
                checked={serviceFormData.isActive}
                onChange={(e) => handleServiceFormChange('isActive', e.target.checked)}
              />
              <button
                className="onboarding-step3-create-service-button"
                onClick={handleCreateService}
                disabled={!serviceFormData.name}
              >
                Create Service
              </button>
            </div>
          )}

          {services.length > 0 && (
            <div className="onboarding-step3-services-section">
              {services.map((service) => (
                <div key={service.id} className="onboarding-step3-service-card">
                  <div className="onboarding-step3-service-header">
                    <div className="onboarding-step3-service-name-row">
                      <div
                        className="onboarding-step3-service-color-dot"
                        style={{ backgroundColor: service.color }}
                      />
                      <span className="onboarding-step3-service-name">{service.name}</span>
                    </div>
                  </div>
                  <div className="onboarding-step3-service-details">
                    <div className="onboarding-step3-service-detail-item">
                      <ClockIcon />
                      <span>{service.duration} minutes</span>
                    </div>
                    {service.price > 0 && (
                      <div className="onboarding-step3-service-detail-item">
                        <DollarIcon />
                        <span>${service.price}</span>
                      </div>
                    )}
                    <div className="onboarding-step3-service-detail-item">
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
                      <span>Active</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="onboarding-step3-actions">
            <button className="onboarding-step3-skip-button" onClick={handleStep3Skip}>
              Skip Step
            </button>
            <button
              className="onboarding-step3-continue-button"
              onClick={handleStep3Continue}
              disabled={!isStep3ContinueEnabled}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {currentStep === "step4" && (
        <div className="onboarding-container onboarding-step4-container">
          <div className="onboarding-step4-header-section">
            <div className="onboarding-step4-logo-wrapper">
              <img src="/assets/images/logo.svg" alt="Daywise logo" className="onboarding-step4-logo" />
            </div>

            <div className="onboarding-step4-text-section">
              <h2 className="onboarding-step4-heading">Final business info</h2>
              <p className="onboarding-step4-subheading">Add your business name and set your timezone.</p>
            </div>

            <div className="onboarding-step4-progress">
              {[...Array(5)].map((_, index) => (
                <div
                  key={index}
                  className={`onboarding-step4-progress-line ${index < 4 ? "active" : ""}`}
                />
              ))}
            </div>
          </div>

          <div className="onboarding-step4-form-section">
            <Input
              label="Your Business Name"
              placeholder="Enter your business name here"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />

            <Select
              label="Timezone"
              value={selectedTimezone ? getTimezoneLabel(selectedTimezone) : ""}
              onChange={handleTimezoneChange}
              options={timezoneOptions}
              placeholder="Select timezone"
            />
          </div>

          <div className="onboarding-step4-actions">
            <button
              className="onboarding-step4-continue-button"
              onClick={handleStep4Continue}
              disabled={!isStep4ContinueEnabled}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {currentStep === "step5" && (
        <div className="onboarding-container onboarding-step5-container">
          <div className="onboarding-step5-header-section">
            <div className="onboarding-step5-logo-wrapper">
              <img src="/assets/images/logo.svg" alt="Daywise logo" className="onboarding-step5-logo" />
            </div>

            <div className="onboarding-step5-text-section">
              <h2 className="onboarding-step5-heading">You're all set 🎉</h2>
              <p className="onboarding-step5-subheading">
                Your booking link is ready! Share it, text it, or put it on your Instagram. Client's can book directly with you through this link.
              </p>
            </div>

            <div className="onboarding-step5-progress">
              {[...Array(5)].map((_, index) => (
                <div
                  key={index}
                  className="onboarding-step5-progress-line active"
                />
              ))}
            </div>
          </div>

          <div className="onboarding-step5-link-section">
            <div className="onboarding-step5-link-wrapper">
              <span className="onboarding-step5-link-prefix">daywisebooking.com/</span>
              <div className="onboarding-step5-link-input-wrapper">
                <Input
                  placeholder="yourbusinessname"
                  value={bookingSlug}
                  readOnly
                  style={{ 
                    boxShadow: "0px 1px 2px 0px rgba(0, 0, 0, 0.05)", 
                    backgroundColor: "#F9FAFF", 
                    cursor: "default"
                  }}
                />
              </div>
            </div>
            <button className="onboarding-step5-copy-button" onClick={handleCopyLink}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="9" y="9" width="13" height="13" rx="2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Copy Link</span>
            </button>
          </div>

          <div className="onboarding-step5-actions">
            <button
              className="onboarding-step5-complete-button"
              onClick={handleCompleteSetup}
            >
              Complete Setup
            </button>
          </div>
        </div>
      )}

      {currentStep === "step6" && (
        <div className="onboarding-container onboarding-step6-container">
          <div className="onboarding-step6-header-section">
            <div className="onboarding-step6-logo-wrapper">
              <img src="/assets/images/logo.svg" alt="Daywise logo" className="onboarding-step6-logo" />
            </div>

            <div className="onboarding-step6-text-section">
              <h2 className="onboarding-step6-heading">Add to your home screen</h2>
              <p className="onboarding-step6-subheading">Manage clients directly from your phone.</p>
            </div>
          </div>

          <div className="onboarding-step6-instructions-box">
            <div className="onboarding-step6-platform-options">
              <div className="onboarding-step6-platform-option">
                <div className="onboarding-step6-platform-icon">
                  <img src="/assets/images/iphone_icon.png" alt="iPhone" className="onboarding-step6-phone-icon" />
                </div>
                <span className="onboarding-step6-platform-text">iPhone</span>
              </div>
              <div className="onboarding-step6-platform-option">
                <div className="onboarding-step6-platform-icon">
                  <img src="/assets/images/android_phone_icon.png" alt="Android" className="onboarding-step6-phone-icon" />
                </div>
                <span className="onboarding-step6-platform-text">Android</span>
              </div>
            </div>

            <div className="onboarding-step6-instructions">
              <div className="onboarding-step6-instruction-item">
                <span className="onboarding-step6-instruction-number">1.</span>
                <span className="onboarding-step6-instruction-text">Tap on the</span>
                <IPhoneShareIcon className="onboarding-step6-share-icon" />
                <span className="onboarding-step6-instruction-text">in the browser toolbar</span>
              </div>
              <div className="onboarding-step6-instruction-item">
                <span className="onboarding-step6-instruction-number">2.</span>
                <span className="onboarding-step6-instruction-text">Scroll down and select "Add to Home Screen"</span>
                <AddIconIPhone className="onboarding-step6-add-icon" />
              </div>
            </div>
          </div>

          <div className="onboarding-step6-actions">
            <button
              className="onboarding-step6-done-button"
              onClick={handleDone}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Onboarding;

