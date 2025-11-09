import { useState, useEffect } from "react";
import { FaPlus } from "react-icons/fa6";
import { FaEdit } from "react-icons/fa";
import { RiDeleteBin5Line } from "react-icons/ri";
import { useMobile } from "../../hooks";
import { toast } from "sonner";
import { ActionMenu, AppLayout, Button } from "../../components";
import "./Forms.css";

const Forms = () => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formToDelete, setFormToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const isMobile = useMobile(991);
  const [userId, setUserId] = useState(null);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLimit, setFormLimit] = useState(null); // null = unlimited, 1 = free tier

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
        fetch(`${apiUrl}/api/forms`, {
          credentials: 'include',
        }),
        fetch(`${apiUrl}/api/user-subscriptions/me`, {
          credentials: 'include',
        })
      ]);
      
      if (formsResponse.ok) {
        const data = await formsResponse.json();
        setForms(data || []);
      } else {
        // If endpoint doesn't exist yet, just set empty array
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

  const handleAddNew = () => {
    // Check if user has reached the limit
    if (formLimit !== null && forms.length >= formLimit) {
      toast.error("Upgrade to Pro plan to add more forms.");
      return;
    }
    // TODO: Open form creation modal
    console.log("Add new form");
  };

  const handleEdit = (form) => {
    // TODO: Open form edit modal
    console.log("Edit form:", form);
  };

  const handleDeleteClick = (form) => {
    setFormToDelete(form);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!formToDelete) return;

    setIsDeleting(true);
    try {
      // TODO: Implement delete API call
      console.log("Delete form:", formToDelete);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // TODO: Refresh forms list after deletion
      setShowDeleteModal(false);
      setFormToDelete(null);
    } catch (error) {
      console.error('Error deleting form:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AppLayout>
      <div className="forms-page">
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
        {!loading && (
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
              <p className="forms-count-text">
                <strong>{forms.length} of {formLimit}</strong> intake forms created. Upgrade to add more.
              </p>
            )}
          </div>
        )}
        
        {loading ? (
          <div className="forms-loading">
            <div className="forms-spinner"></div>
            <p className="forms-loading-text">Loading forms...</p>
          </div>
        ) : forms.length === 0 ? (
          <div className="empty-state-container">
            <div className="empty-state-box">
              <h3>No forms yet</h3>
              <p>Your intake forms will appear here once you create them.</p>
            </div>
          </div>
        ) : (
          <div className="forms-card-list">
            {forms.map((form) => (
              <div className="cardd" key={form.id}>
                <div className="top">
                  <h2>{form.name}</h2>
                  <ActionMenu
                    items={[
                      {
                        label: "Edit",
                        icon: <FaEdit />,
                        onClick: () => handleEdit(form),
                      },
                      {
                        label: "Delete",
                        icon: <RiDeleteBin5Line />,
                        onClick: () => handleDeleteClick(form),
                      },
                    ]}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && formToDelete && (
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
              setFormToDelete(null);
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
                Delete Form
              </h2>
              <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
                Are you sure you want to delete this form?
              </p>
              <div style={{ 
                backgroundColor: '#F9FAFB', 
                padding: '16px', 
                borderRadius: '8px', 
                marginTop: '16px',
                textAlign: 'left'
              }}>
                <p style={{ fontSize: '14px', color: '#374151', marginBottom: '0' }}>
                  <strong>{formToDelete.name}</strong>
                </p>
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
                  setFormToDelete(null);
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
                text={isDeleting ? "Deleting..." : "Delete Form"}
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

export default Forms;

