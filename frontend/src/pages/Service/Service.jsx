import { useState, useEffect } from "react";
import { FaPlus } from "react-icons/fa6";
import { FaEdit } from "react-icons/fa";
import { RiDeleteBin5Line } from "react-icons/ri";
import { FiClock } from "react-icons/fi";
import { useMobile } from "../../hooks";
import { toast } from "sonner";
import { DollarIcon } from "../../components/SVGICONS/Svg";

import { ActionMenu, AppLayout, Button, ServicesModal } from "../../components";
import "./Service.css";

const Service = () => {
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const isMobile = useMobile(991);
  const [modalMode, setModalMode] = useState("add");
  const [selectedService, setSelectedService] = useState(null);
  const [userId, setUserId] = useState(null);
  const [appointmentTypes, setAppointmentTypes] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Fetch appointment types from API
  const fetchAppointmentTypes = async () => {
    if (!userId) return;
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/appointment-types`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setAppointmentTypes(data || []);
      } else {
        console.error('Failed to fetch appointment types');
        setAppointmentTypes([]);
      }
    } catch (error) {
      console.error('Error fetching appointment types:', error);
      setAppointmentTypes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchAppointmentTypes();
    }
  }, [userId]);

  const handleAddNew = () => {
    setModalMode("add");
    setSelectedService(null);
    setShowServiceModal(true);
  };

  const handleEdit = (service) => {
    setModalMode("edit");
    setSelectedService(service);
    setShowServiceModal(true);
  };

  const handleDeleteClick = (service) => {
    setServiceToDelete(service);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!serviceToDelete) return;

    setIsDeleting(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/appointment-types/${serviceToDelete._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (response.ok) {
        toast.success("Service deleted successfully!");
        await fetchAppointmentTypes(); // Refresh the list
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to delete service");
      }
      
      setShowDeleteModal(false);
      setServiceToDelete(null);
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error("Failed to delete service");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AppLayout>
      <div className="service-page">
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
            Services & Appointment Types
          </h1>
          <p>Manage your service offerings and appointment types</p>
        </div>
        <div className="add-new-btn-wrap">
          <Button
            text={isMobile ? "New" : "Add New"}
            style={{
              width: isMobile ? "75px" : "",
            }}
            icon={<FaPlus color="#fff" />}
            variant="primary"
            onClick={handleAddNew}
          />
          <p style={{ display: "none" }}>
            1/1 Services/appointments added. Upgrade to add more.
          </p>
        </div>
        
        {loading ? (
          <div className="service-loading">
            <div className="service-spinner"></div>
            <p className="service-loading-text">Loading services...</p>
          </div>
        ) : appointmentTypes.length === 0 ? (
          <div className="empty-state-container">
            <div className="empty-state-box">
              <h3>No services yet</h3>
              <p>Your services will appear here once you create them.</p>
            </div>
          </div>
        ) : (
          <div className="servies-card-list">
            {appointmentTypes.map((service) => (
              <div className="cardd" key={service._id}>
                <div className="top">
                  <div className="wrap">
                    <span
                      style={{
                        width: "11px",
                        height: "11px",
                        borderRadius: "50%",
                        backgroundColor: service.color,
                        display: "inline-block",
                        marginRight: "6px",
                      }}
                    />
                    <h2>{service.name}</h2>
                  </div>

                  <ActionMenu
                    items={[
                      {
                        label: "Edit",
                        icon: <FaEdit />,
                        onClick: () => handleEdit(service),
                      },
                      {
                        label: "Delete",
                        icon: <RiDeleteBin5Line />,
                        onClick: () => handleDeleteClick(service),
                      },
                    ]}
                  />
                </div>

                <div className="bottom">
                  <div className="wrap">
                    <FiClock color="#64748B" />
                    <span>{service.duration} minutes</span>
                  </div>
                  {service.price > 0 && (
                    <div className="wrap">
                      <DollarIcon />
                      <span>${service.price}</span>
                    </div>
                  )}
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
                    <span>{service.isActive ? "Active" : "Inactive"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ServicesModal
        showServiceModal={showServiceModal}
        setShowServiceModal={setShowServiceModal}
        mode={modalMode}
        selectedService={selectedService}
        onServiceSaved={() => {
          setSelectedService(null);
          fetchAppointmentTypes(); // Refresh the list
        }}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && serviceToDelete && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) {
              setShowDeleteModal(false);
              setServiceToDelete(null);
            }
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '480px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#FEE2E2',
                  margin: '0 auto 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#DC2626"
                  strokeWidth="2"
                >
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '12px', color: '#1F2937' }}>
                Delete Service
              </h2>
              <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
                Are you sure you want to delete this service?
              </p>
              <div style={{ 
                backgroundColor: '#F9FAFB', 
                padding: '16px', 
                borderRadius: '8px', 
                marginTop: '16px',
                textAlign: 'left'
              }}>
                <p style={{ fontSize: '14px', color: '#374151', marginBottom: '8px' }}>
                  <strong>{serviceToDelete.name}</strong>
                </p>
                <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '4px' }}>
                  ⏱️ {serviceToDelete.duration} minutes
                </p>
                {serviceToDelete.price > 0 && (
                  <p style={{ fontSize: '13px', color: '#6B7280' }}>
                    💰 ${serviceToDelete.price}
                  </p>
                )}
              </div>
              <p style={{ fontSize: '13px', color: '#DC2626', marginTop: '16px', fontWeight: '500' }}>
                This action cannot be undone.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <Button
                text="Cancel"
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setServiceToDelete(null);
                }}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  border: '1px solid #D1D5DB',
                  backgroundColor: 'white',
                  color: '#374151',
                }}
              />
              <Button
                text={isDeleting ? "Deleting..." : "Delete Service"}
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  backgroundColor: '#DC2626',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Service;
