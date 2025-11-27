import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { FaUsers, FaUserCheck, FaDollarSign, FaPercent, FaPlus, FaEllipsisV, FaTimes } from "react-icons/fa";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ViewIcon, EditIconAdmin, ManageSubscriptionIcon, SuspendIcon, UserGrowthIcon, BookingTrendsIcon, DeleteIcon, CalendarIcon } from "../../components/SVGICONS/Svg";

// Custom Tooltip component to replace red colors with #0053F1
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#111827' }}>{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ margin: '4px 0', color: '#0053F1', fontSize: '14px' }}>
            <span style={{ color: '#0053F1' }}>●</span> {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

import { Input } from "../../components/index";
import Select from "../../components/ui/Input/Select";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showViewUserModal, setShowViewUserModal] = useState(false);
  const [showManageSubscriptionModal, setShowManageSubscriptionModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    // Check if admin is logged in
    const isAdminLoggedIn = localStorage.getItem('adminLoggedIn');
    if (!isAdminLoggedIn) {
      toast.error('Access denied. Please login.');
      navigate('/admin/login');
      return;
    }

    // Fetch admin stats and users
    const fetchData = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        console.log('Fetching admin data from:', apiUrl);

        const [statsResponse, usersResponse, plansResponse] = await Promise.all([
          fetch(`${apiUrl}/api/admin/stats`, { credentials: 'include' }),
          fetch(`${apiUrl}/api/admin/users`, { credentials: 'include' }),
          fetch(`${apiUrl}/api/admin/plans`, { credentials: 'include' })
        ]);

        console.log('Stats response status:', statsResponse.status);
        console.log('Users response status:', usersResponse.status);
        console.log('Plans response status:', plansResponse.status);

        if (!statsResponse.ok || !usersResponse.ok || !plansResponse.ok) {
          const statsError = await statsResponse.text();
          const usersError = await usersResponse.text();
          const plansError = await plansResponse.text();
          console.error('Stats error:', statsError);
          console.error('Users error:', usersError);
          console.error('Plans error:', plansError);
          throw new Error('Failed to fetch admin data');
        }

        const statsData = await statsResponse.json();
        const usersData = await usersResponse.json();
        const plansData = await plansResponse.json();

        console.log('Stats data:', statsData);
        console.log('Users data count:', usersData.length);
        console.log('Plans data:', plansData);

        setStats(statsData);
        setUsers(usersData);
        setPlans(plansData);
      } catch (error) {
        console.error('Error fetching admin data:', error);
        toast.error('Failed to load dashboard data. Check console for details.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminLoggedIn');
    toast.success('Logged out successfully');
    navigate('/admin/login');
  };

  // Handle Edit Plan
  const handleEditPlan = (plan) => {
    setEditingPlan(plan);
    setShowEditPlanModal(true);
    setShowPlanMenu(null);
  };

  // Handle Delete Plan
  const handleDeletePlan = (plan) => {
    setDeletingPlan(plan);
    setShowDeleteModal(true);
    setShowPlanMenu(null);
  };

  // Confirm Delete Plan
  const [isDeletingPlan, setIsDeletingPlan] = useState(false);
  const confirmDeletePlan = async () => {
    if (!deletingPlan) return;

    setIsDeletingPlan(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/admin/plans/${deletingPlan._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete plan');
      }

      toast.success('Plan deleted successfully');
      setShowDeleteModal(false);
      setDeletingPlan(null);

      // Refresh plans list
      const plansResponse = await fetch(`${apiUrl}/api/admin/plans`, { credentials: 'include' });
      if (plansResponse.ok) {
        const plansData = await plansResponse.json();
        setPlans(plansData);
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error(error.message || 'Failed to delete plan');
    } finally {
      setIsDeletingPlan(false);
    }
  };

  const [showUserMenu, setShowUserMenu] = useState(null);
  const [showPlanMenu, setShowPlanMenu] = useState(null);
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [showEditPlanModal, setShowEditPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdPriceIds, setCreatedPriceIds] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState(null);
  const dropdownRef = useRef(null);
  const planDropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          !event.target.closest('.action-menu-btn')) {
        setShowUserMenu(null);
      }
      if (planDropdownRef.current && !planDropdownRef.current.contains(event.target) &&
          !event.target.closest('.plan-menu-btn')) {
        setShowPlanMenu(null);
      }
    };

    if (showUserMenu || showPlanMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu, showPlanMenu]);

  // Prepare subscription data for pie chart from stats
  const subscriptionData = stats?.planDistribution?.map((plan, index) => ({
    name: plan.planName,
    value: plan.subscriptions,
    color: index === 0 ? '#E0E7FF' : '#4F46E5'
  })) || [];

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-dashboard-header">
        <div>
          <h1>Billing & Subscription</h1>
          <p>Manage your subscription and payment methods</p>
        </div>
        <button onClick={handleLogout} className="admin-logout-btn">
          Logout
        </button>
      </header>

      <div className="admin-dashboard-content">
        {/* Stats Cards */}
        <div className="stats-cards-grid">
          <div className="stat-card">
            <div className="stat-card-content">
              <div>
                <div className="stat-label">Total Users</div>
                <div className="stat-value">{stats?.totalUsers || 0}</div>
                <div className="stat-change positive">+{stats?.newUsersThisMonth || 0} this month</div>
              </div>
              <div className="stat-icon blue">
                <FaUsers />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-content">
              <div>
                <div className="stat-label">Active Users</div>
                <div className="stat-value">{stats?.activeUsers || 0}</div>
                <div className="stat-change positive">+{stats?.userGrowthRate || 0}% growth</div>
              </div>
              <div className="stat-icon blue">
                <FaUserCheck />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-content">
              <div>
                <div className="stat-label">Monthly Revenue</div>
                <div className="stat-value">${stats?.monthlyRevenue?.toFixed(2) || '0.00'}</div>
                <div className="stat-change positive">+{stats?.revenueGrowthRate || 0}% this month</div>
              </div>
              <div className="stat-icon blue">
                <FaDollarSign />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-content">
              <div>
                <div className="stat-label">Churn Rate</div>
                <div className="stat-value">{stats?.churnRate || 0}%</div>
                <div className="stat-change">ARPU= ${stats?.arpu?.toFixed(2) || '0.00'}</div>
              </div>
              <div className="stat-icon blue">
                <FaPercent />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="charts-grid">
          {/* User Growth Trend */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>
                <UserGrowthIcon style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }} />
                User Growth Trend
              </h3>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stats?.userTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="#0053F1"
                    strokeWidth={2}
                    dot={{ fill: '#0053F1', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Booking Trends */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>
                <BookingTrendsIcon style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }} />
                Booking Trends
              </h3>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats?.bookingTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="bookings"
                    fill="#0053F1"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Subscription Distribution */}
        <div className="subscription-section">
          <h3>Subscription & Plan Distribution</h3>
          <div className="subscription-content">
            <div className="pie-chart-container">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={subscriptionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {subscriptionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="plan-details">
              {stats?.planDistribution?.map((plan, index) => (
                <div className="plan-item" key={plan.planName}>
                  <div className="plan-info">
                    <span className="plan-dot" style={{ backgroundColor: index === 0 ? '#E0E7FF' : '#4F46E5' }}></span>
                    <span className="plan-name">{plan.planName}</span>
                  </div>
                  <div className="plan-stats">
                    <span className="plan-users">{plan.subscriptions} users</span>
                    <span className="plan-revenue">${plan.revenue?.toFixed(2) || '0.00'}/mo</span>
                  </div>
                </div>
              )) || null}
            </div>
          </div>
        </div>

        {/* User Management */}
        <div className="user-management-section">
          <div className="section-header">
            <h3>User Management</h3>
            <div className="section-filters">
              <input 
                type="text" 
                placeholder="Search users by name or email..."
                className="search-input"
              />
              <select className="filter-select">
                <option>All Plans</option>
                <option>Free Plan</option>
                <option>Pro Plan</option>
              </select>
              <select className="filter-select">
                <option>All Statuses</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
          </div>

          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Bookings</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-name">{user.name || 'No Name'}</div>
                        <div className="user-email">{user.email}</div>
                      </div>
                    </td>
                    <td>
                      <span className={`plan-badge ${user.plan?.toLowerCase() || 'free'}`}>
                        {user.plan || 'Free'}
                      </span>
                    </td>
                    <td>{user.bookingCount || 0}</td>
                    <td>{user.joinDate || 'N/A'}</td>
                    <td>
                      <span className={`status-badge ${user.status?.toLowerCase() || 'active'}`}>
                        {user.status || 'Active'}
                      </span>
                    </td>
                    <td>
                      <div className={`action-menu-wrapper ${showUserMenu === user.id ? 'menu-open' : ''}`}>
                        <button
                          className={`action-menu-btn ${user.status === 'Admin' ? 'disabled' : ''}`}
                          onClick={() => {
                            if (user.status !== 'Admin') {
                              setShowUserMenu(showUserMenu === user.id ? null : user.id);
                            }
                          }}
                          disabled={user.status === 'Admin'}
                        >
                          <FaEllipsisV />
                        </button>
                        {showUserMenu === user.id && user.status !== 'Admin' && (
                          <div 
                            ref={dropdownRef}
                            className="action-menu-dropdown"
                          >
                            <button 
                              className="action-menu-item"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowViewUserModal(true);
                                setShowUserMenu(null);
                              }}
                            >
                              <span className="action-menu-icon"><ViewIcon /></span>
                              <span>View</span>
                            </button>
                            <button 
                              className="action-menu-item"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowEditUserModal(true);
                                setShowUserMenu(null);
                              }}
                            >
                              <span className="action-menu-icon"><EditIconAdmin /></span>
                              <span>Edit</span>
                            </button>
                            <button 
                              className="action-menu-item"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowManageSubscriptionModal(true);
                                setShowUserMenu(null);
                              }}
                            >
                              <span className="action-menu-icon"><ManageSubscriptionIcon /></span>
                              <span>Manage Subscription</span>
                            </button>
                            <button 
                              className="action-menu-item"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowSuspendModal(true);
                                setShowUserMenu(null);
                              }}
                            >
                              <span className="action-menu-icon"><SuspendIcon /></span>
                              <span>Suspend/Deactivate Account</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Subscription Plan Management */}
        <div className="plan-management-section">
          <div className="plan-management-header">
            <h3>Subscription Plan Management</h3>
            <button className="create-plan-btn" onClick={() => setShowCreatePlanModal(true)}>
              <FaPlus style={{ width: '16px', height: '16px' }} />
              <span>Create New Plan</span>
            </button>
          </div>

          <div className="plans-list">
            {plans.map((plan, index) => {
              const isPro = plan.planId === 'pro';
              const monthlyPrice = plan.priceMonthly ? (plan.priceMonthly / 100).toFixed(2) : '0.00';
              const yearlyPrice = plan.priceYearly ? (plan.priceYearly / 100).toFixed(2) : null;
              
              return (
                <div key={plan._id || index}>
                  <div className="plan-row">
                    <div className="plan-row-left">
                      <div className="plan-name-badge">
                        <span className="plan-name">{plan.name}</span>
                        <span className="plan-status-badge active">Active</span>
                      </div>
                    </div>
                    <div className="plan-row-right">
                      <div className="plan-prices">
                        <div className="plan-price-item">
                          <div className="plan-price-row">
                            <span className="plan-price-amount">${monthlyPrice}</span>
                            <span className="plan-price-period">/month</span>
                          </div>
                        </div>
                        {isPro && yearlyPrice && (
                          <div className="plan-price-item">
                            <div className="plan-price-row">
                              <span className="plan-price-amount">${yearlyPrice}</span>
                              <span className="plan-price-period">/year</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="plan-menu-wrapper">
                        <button
                          className="plan-menu-btn"
                          onClick={() => setShowPlanMenu(showPlanMenu === plan._id ? null : plan._id)}
                        >
                          <FaEllipsisV />
                        </button>
                        {showPlanMenu === plan._id && (
                          <div
                            ref={planDropdownRef}
                            className="plan-menu-dropdown"
                          >
                            <button
                              className="plan-menu-item"
                              onClick={() => handleEditPlan(plan)}
                            >
                              <span className="plan-menu-icon"><EditIconAdmin /></span>
                              <span>Edit</span>
                            </button>
                            <button
                              className="plan-menu-item"
                              onClick={() => handleDeletePlan(plan)}
                            >
                              <span className="plan-menu-icon"><DeleteIcon /></span>
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {index < plans.length - 1 && <div className="plan-divider"></div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Create Plan Modal */}
      {showCreatePlanModal && (
        <CreatePlanModal
          onClose={() => setShowCreatePlanModal(false)}
          onSuccess={() => {
            setShowCreatePlanModal(false);
            // Refresh plans data
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            fetch(`${apiUrl}/api/admin/plans`, { credentials: 'include' })
              .then(res => res.json())
              .then(data => setPlans(data))
              .catch(err => console.error('Error refreshing plans:', err));
          }}
          setCreatedPriceIds={setCreatedPriceIds}
          setShowSuccessModal={setShowSuccessModal}
        />
      )}

      {/* Edit Plan Modal */}
      {showEditPlanModal && editingPlan && (
        <CreatePlanModal
          editMode={true}
          planData={editingPlan}
          onClose={() => {
            setShowEditPlanModal(false);
            setEditingPlan(null);
          }}
          onSuccess={() => {
            setShowEditPlanModal(false);
            setEditingPlan(null);
            // Refresh plans data
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            fetch(`${apiUrl}/api/admin/plans`, { credentials: 'include' })
              .then(res => res.json())
              .then(data => setPlans(data))
              .catch(err => console.error('Error refreshing plans:', err));
          }}
          setCreatedPriceIds={setCreatedPriceIds}
          setShowSuccessModal={setShowSuccessModal}
        />
      )}

      {/* Success Modal */}
      {showSuccessModal && createdPriceIds && (
        <PlanSuccessModal
          onClose={() => {
            setShowSuccessModal(false);
            setCreatedPriceIds(null);
          }}
          priceIds={createdPriceIds}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingPlan && (
        <DeletePlanModal
          onClose={() => {
            setShowDeleteModal(false);
            setDeletingPlan(null);
          }}
          onConfirm={confirmDeletePlan}
          planName={deletingPlan.name}
          isDeleting={isDeletingPlan}
        />
      )}

      {/* Edit User Modal */}
      {showEditUserModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => {
            setShowEditUserModal(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            setShowEditUserModal(false);
            setSelectedUser(null);
            // Refresh users data
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            fetch(`${apiUrl}/api/admin/users`, { credentials: 'include' })
              .then(res => res.json())
              .then(data => setUsers(data))
              .catch(err => console.error('Error refreshing users:', err));
          }}
        />
      )}

      {/* View User Modal */}
      {showViewUserModal && selectedUser && (
        <ViewUserModal
          user={selectedUser}
          onClose={() => {
            setShowViewUserModal(false);
            setSelectedUser(null);
          }}
        />
      )}

      {/* Manage Subscription Modal */}
      {showManageSubscriptionModal && selectedUser && (
        <ManageSubscriptionModal
          user={selectedUser}
          onClose={() => {
            setShowManageSubscriptionModal(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            setShowManageSubscriptionModal(false);
            setSelectedUser(null);
            // Refresh users data
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            fetch(`${apiUrl}/api/admin/users`, { credentials: 'include' })
              .then(res => res.json())
              .then(data => setUsers(data))
              .catch(err => console.error('Error refreshing users:', err));
          }}
        />
      )}

      {/* Suspend/Deactivate Account Modal */}
      {showSuspendModal && selectedUser && (
        <SuspendAccountModal
          user={selectedUser}
          onClose={() => {
            setShowSuspendModal(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            setShowSuspendModal(false);
            setSelectedUser(null);
            // Refresh users data
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            fetch(`${apiUrl}/api/admin/users`, { credentials: 'include' })
              .then(res => res.json())
              .then(data => setUsers(data))
              .catch(err => console.error('Error refreshing users:', err));
          }}
        />
      )}
    </div>
  );
};

// Create/Edit Plan Modal Component
const CreatePlanModal = ({ onClose, onSuccess, editMode = false, planData = null, setCreatedPriceIds, setShowSuccessModal }) => {
  const [formData, setFormData] = useState(editMode && planData ? {
    planName: planData.name || '',
    bookingsPerMonth: planData.features?.bookingLimit ?? 0,
    appointmentTypes: planData.features?.appointmentTypeLimit ?? 0,
    monthlyPrice: planData.priceMonthly ? (planData.priceMonthly / 100) : 0,
    annualPrice: planData.priceYearly ? (planData.priceYearly / 100) : 0,
    emailConfirmations: planData.features?.emailConfirmations ? 'Yes' : 'No',
    emailReminders: planData.features?.emailReminders ? 'Yes' : 'No',
    customBookingLink: 'Yes', // Not in features
    customBranding: planData.features?.customBranding ? 'Yes' : 'No',
    googleCalendarIntegration: 'Yes', // Not in features
    removeDaywiseBranding: planData.features?.poweredBy ? 'No' : 'Yes',
    emailSupport: planData.features?.prioritySupport ? 'Priority' : 'Basic',
    stripePaymentCollection: 'Yes', // Not in features
    trialPeriod: 0 // Not in features
  } : {
    planName: '',
    bookingsPerMonth: 0,
    appointmentTypes: 0,
    monthlyPrice: 0,
    annualPrice: 0,
    emailConfirmations: 'Yes',
    emailReminders: 'Yes',
    customBookingLink: 'Yes',
    customBranding: 'Yes',
    googleCalendarIntegration: 'Yes',
    removeDaywiseBranding: 'Yes',
    emailSupport: 'Priority',
    stripePaymentCollection: 'Yes',
    trialPeriod: 0
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field, e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field, e) => {
    const value = e.target.value === '' ? 0 : (field.includes('Price') ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.planName.trim()) {
      toast.error('Plan name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      // Build the payload
      const payload = {
        id: editMode ? planData.planId : formData.planName.toLowerCase().replace(/\s+/g, '-'),
        name: formData.planName,
        priceMonthly: Math.round(formData.monthlyPrice * 100), // Convert to cents
        priceYearly: Math.round(formData.annualPrice * 100), // Convert to cents
        features: {
          bookingLimit: formData.bookingsPerMonth === 0 ? null : formData.bookingsPerMonth,
          appointmentTypeLimit: formData.appointmentTypes === 0 ? null : formData.appointmentTypes,
          emailConfirmations: formData.emailConfirmations === 'Yes',
          emailReminders: formData.emailReminders === 'Yes',
          customBranding: formData.customBranding === 'Yes',
          prioritySupport: formData.emailSupport === 'Priority',
          poweredBy: formData.removeDaywiseBranding !== 'Yes'
        },
        isActive: true
      };

      const url = editMode
        ? `${apiUrl}/api/admin/plans/${planData._id}`
        : `${apiUrl}/api/admin/plans`;
      const method = editMode ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to ${editMode ? 'update' : 'create'} plan`);
      }

      const result = await response.json();

      // Set the created/updated Price IDs for the success modal
      setCreatedPriceIds({
        planName: result.name,
        monthly: result.stripePriceMonthly,
        yearly: result.stripePriceYearly
      });

      // Close this modal and show success modal
      onClose();
      setShowSuccessModal(true);

      // Refresh plans list
      onSuccess();
    } catch (error) {
      console.error(`Error ${editMode ? 'updating' : 'creating'} plan:`, error);
      toast.error(error.message || `Failed to ${editMode ? 'update' : 'create'} plan`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-plan-modal-overlay" onClick={onClose}>
      <div className="create-plan-modal" onClick={(e) => e.stopPropagation()}>
        <div className="create-plan-modal-content">
          <div className="create-plan-modal-header">
            <h2>{editMode ? 'Edit Subscription Plan' : 'Create Subscription Plan'}</h2>
            <button className="create-plan-close-btn" onClick={onClose} disabled={isSubmitting}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M4.5 4.5L13.5 13.5M13.5 4.5L4.5 13.5" stroke="#64748B" strokeWidth="1.125" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <form className="create-plan-form" onSubmit={handleSubmit}>
            {/* Plan Name */}
            <Input
              label="Plan Name"
              name="planName"
              type="text"
              placeholder="Name here"
              value={formData.planName}
              onChange={(e) => handleInputChange('planName', e)}
              required
            />

            {/* Bookings Per Month & Appointment Types */}
            <div className="create-plan-row">
              <Input
                label="Bookings Per Month"
                name="bookingsPerMonth"
                type="number"
                value={formData.bookingsPerMonth}
                onChange={(e) => handleNumberChange('bookingsPerMonth', e)}
                min="0"
              />
              <Input
                label="Appointment Types"
                name="appointmentTypes"
                type="number"
                value={formData.appointmentTypes}
                onChange={(e) => handleNumberChange('appointmentTypes', e)}
                min="0"
              />
            </div>

            {/* Monthly Price & Annual Price */}
            <div className="create-plan-row">
              <Input
                label="Monthly Price"
                name="monthlyPrice"
                type="number"
                value={formData.monthlyPrice}
                onChange={(e) => handleNumberChange('monthlyPrice', e)}
                min="0"
                step="0.01"
              />
              <Input
                label="Annual Price"
                name="annualPrice"
                type="number"
                value={formData.annualPrice}
                onChange={(e) => handleNumberChange('annualPrice', e)}
                min="0"
                step="0.01"
              />
            </div>

            {/* Email Confirmations & Email Reminders */}
            <div className="create-plan-row">
              <Select
                label="Email Confirmations"
                name="emailConfirmations"
                options={['Yes', 'No']}
                value={formData.emailConfirmations}
                onChange={(value) => handleSelectChange('emailConfirmations', value)}
                placeholder="Select an option"
              />
              <Select
                label="Email Reminders"
                name="emailReminders"
                options={['Yes', 'No']}
                value={formData.emailReminders}
                onChange={(value) => handleSelectChange('emailReminders', value)}
                placeholder="Select an option"
              />
            </div>

            {/* Custom Booking Link & Custom Branding */}
            <div className="create-plan-row">
              <Select
                label="Custom Booking Link"
                name="customBookingLink"
                options={['Yes', 'No']}
                value={formData.customBookingLink}
                onChange={(value) => handleSelectChange('customBookingLink', value)}
                placeholder="Select an option"
              />
              <Select
                label="Custom Branding"
                name="customBranding"
                options={['Yes', 'No']}
                value={formData.customBranding}
                onChange={(value) => handleSelectChange('customBranding', value)}
                placeholder="Select an option"
              />
            </div>

            {/* Google Calendar Integration & Remove Daywise Branding */}
            <div className="create-plan-row">
              <Select
                label="Google Calendar Integration"
                name="googleCalendarIntegration"
                options={['Yes', 'No']}
                value={formData.googleCalendarIntegration}
                onChange={(value) => handleSelectChange('googleCalendarIntegration', value)}
                placeholder="Select an option"
              />
              <Select
                label="Remove Daywise Branding"
                name="removeDaywiseBranding"
                options={['Yes', 'No']}
                value={formData.removeDaywiseBranding}
                onChange={(value) => handleSelectChange('removeDaywiseBranding', value)}
                placeholder="Select an option"
              />
            </div>

            {/* Email Support & Stripe Payment Collection */}
            <div className="create-plan-row">
              <Select
                label="Email Support"
                name="emailSupport"
                options={['Basic', 'Priority']}
                value={formData.emailSupport}
                onChange={(value) => handleSelectChange('emailSupport', value)}
                placeholder="Select an option"
              />
              <Select
                label="Stripe Payment Collection"
                name="stripePaymentCollection"
                options={['Yes', 'No']}
                value={formData.stripePaymentCollection}
                onChange={(value) => handleSelectChange('stripePaymentCollection', value)}
                placeholder="Select an option"
              />
            </div>

            {/* Trial Period */}
            <Input
              label="Trial Period"
              name="trialPeriod"
              type="number"
              value={formData.trialPeriod}
              onChange={(e) => handleNumberChange('trialPeriod', e)}
              min="0"
            />

            {/* Action Buttons */}
            <div className="create-plan-actions">
              <button type="button" className="create-plan-cancel-btn" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" className="create-plan-submit-btn" disabled={isSubmitting}>
                {isSubmitting ? (editMode ? 'Saving...' : 'Creating...') : (editMode ? 'Save Changes' : 'Create Plan')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Plan Success Modal Component
const PlanSuccessModal = ({ onClose, priceIds }) => {
  if (!priceIds) return null;

  return (
    <div className="create-plan-modal-overlay" onClick={onClose}>
      <div className="create-plan-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="create-plan-modal-content">
          <div className="create-plan-modal-header">
            <h2>Plan Saved Successfully</h2>
            <button className="create-plan-close-btn" onClick={onClose}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M4.5 4.5L13.5 13.5M13.5 4.5L4.5 13.5" stroke="#64748B" strokeWidth="1.125" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <div style={{ padding: '1.5rem 0', borderTop: '1px solid #E2E8F0' }}>
            <p style={{ fontSize: '0.9375rem', color: '#334155', marginBottom: '1.5rem' }}>
              The plan "{priceIds.planName}" has been saved. Stripe Price IDs have been generated:
            </p>

            {priceIds.monthly && (
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '0.25rem' }}>
                  Monthly Price ID:
                </p>
                <code style={{
                  display: 'block',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  color: '#1E293B',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all'
                }}>
                  {priceIds.monthly}
                </code>
              </div>
            )}

            {priceIds.yearly && (
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '0.25rem' }}>
                  Annual Price ID:
                </p>
                <code style={{
                  display: 'block',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  color: '#1E293B',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all'
                }}>
                  {priceIds.yearly}
                </code>
              </div>
            )}

            <button
              onClick={onClose}
              style={{
                marginTop: '1.5rem',
                width: '100%',
                padding: '0.625rem 1rem',
                backgroundColor: '#0053F1',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.9375rem',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Delete Confirmation Modal Component
const DeletePlanModal = ({ onClose, onConfirm, planName, isDeleting }) => {
  return (
    <div className="create-plan-modal-overlay" onClick={onClose}>
      <div className="create-plan-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="create-plan-modal-content">
          <button
            className="create-plan-close-btn"
            onClick={onClose}
            disabled={isDeleting}
            style={{
              position: 'absolute',
              right: '13px',
              top: '13px'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4.5 4.5L13.5 13.5M13.5 4.5L4.5 13.5" stroke="#64748B" strokeWidth="1.125" strokeLinecap="round"/>
            </svg>
          </button>

          <div style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1E293B', marginBottom: '0.5rem' }}>
              Delete {planName}?
            </h4>
            <p style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '1.5rem' }}>
              This action can't be undone. Users on this plan may be affected.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={onConfirm}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '0.625rem 1rem',
                  backgroundColor: '#DC2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.9375rem',
                  fontWeight: '500',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  opacity: isDeleting ? 0.6 : 1
                }}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={onClose}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '0.625rem 1rem',
                  backgroundColor: '#F1F5F9',
                  color: '#64748B',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.9375rem',
                  fontWeight: '500',
                  cursor: isDeleting ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Edit User Modal Component
const EditUserModal = ({ user, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    status: user.status || 'Active',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const statusOptions = ['Active', 'Inactive'];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (value, field) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      // Remove plan from request body - plan is managed in ManageSubscription modal
      const { plan, ...dataToSend } = formData;
      const response = await fetch(`${apiUrl}/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      toast.success('User updated successfully');
      onSuccess();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString || dateString === 'N/A') return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch {
      return dateString;
    }
  };

  return (
    <div className="edit-user-modal-overlay" onClick={onClose}>
      <div className="edit-user-modal" onClick={(e) => e.stopPropagation()}>
        <div className="edit-user-modal-header">
          <h2>Edit User</h2>
          <button className="edit-user-close-btn" onClick={onClose} disabled={isSubmitting}>
            <FaTimes />
          </button>
        </div>

        <form className="edit-user-form" onSubmit={handleSubmit}>
          <div className="edit-user-form-content">
            {/* Name */}
            <Input
              label="Name"
              name="name"
              type="text"
              placeholder="Name here"
              value={formData.name}
              onChange={handleInputChange}
            />

            {/* Email */}
            <Input
              label="Email"
              name="email"
              type="email"
              placeholder="Email address here"
              value={formData.email}
              onChange={handleInputChange}
            />

            {/* Status */}
            <Select
              label="Status"
              name="status"
              placeholder="Status here"
              value={formData.status}
              onChange={(value) => handleSelectChange(value, 'status')}
              options={statusOptions}
            />

            {/* Joined Date & Total Bookings Row */}
            <div className="edit-user-row">
              <div className="edit-user-field-group">
                <label className="edit-user-label">Joined Date</label>
                <div className="edit-user-display-field">
                  <span>{formatDate(user.joinDate)}</span>
                  <CalendarIcon className="edit-user-calendar-icon" />
                </div>
              </div>
              <div className="edit-user-field-group">
                <label className="edit-user-label">Total Bookings</label>
                <div className="edit-user-display-field">
                  <span>{user.bookingCount || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="edit-user-actions">
            <button
              type="button"
              className="edit-user-cancel-btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="edit-user-save-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// View User Modal Component
const ViewUserModal = ({ user, onClose }) => {
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString || dateString === 'N/A') return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch {
      return dateString;
    }
  };

  return (
    <div className="view-user-modal-overlay" onClick={onClose}>
      <div className="view-user-modal" onClick={(e) => e.stopPropagation()}>
        <div className="view-user-modal-header">
          <h2>View User</h2>
          <button className="view-user-close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="view-user-content">
          <div className="view-user-form-content">
            {/* Name */}
            <div className="view-user-field-group">
              <label className="view-user-label">Name</label>
              <div className="view-user-display-field">
                <span>{user.name || 'N/A'}</span>
              </div>
            </div>

            {/* Email */}
            <div className="view-user-field-group">
              <label className="view-user-label">Email</label>
              <div className="view-user-display-field">
                <span>{user.email || 'N/A'}</span>
              </div>
            </div>

            {/* Industry */}
            <div className="view-user-field-group">
              <label className="view-user-label">Industry</label>
              <div className="view-user-display-field">
                <span>{user.industry || '<Null>'}</span>
              </div>
            </div>

            {/* Plan & Status Row */}
            <div className="view-user-row">
              <div className="view-user-field-group">
                <label className="view-user-label">Plan</label>
                <div className="view-user-display-field">
                  <span>{user.plan || 'Free'}</span>
                </div>
              </div>
              <div className="view-user-field-group">
                <label className="view-user-label">Status</label>
                <div className="view-user-display-field">
                  <span>{user.status || 'Active'}</span>
                </div>
              </div>
            </div>

            {/* Joined Date & Total Bookings Row */}
            <div className="view-user-row">
              <div className="view-user-field-group">
                <label className="view-user-label">Joined Date</label>
                <div className="view-user-display-field">
                  <span>{formatDate(user.joinDate)}</span>
                  <CalendarIcon className="view-user-calendar-icon" />
                </div>
              </div>
              <div className="view-user-field-group">
                <label className="view-user-label">Total Bookings</label>
                <div className="view-user-display-field">
                  <span>{user.bookingCount || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Manage Subscription Modal Component
const ManageSubscriptionModal = ({ user, onClose, onSuccess }) => {
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState('Free');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchSubscriptionData = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/admin/users/${user.id}/subscription`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setSubscriptionData(data);
          // Set initial billing cycle based on user's current plan
          setBillingCycle(data.plan || user.plan || 'Free');
        } else {
          // If no subscription data, default to Free
          setSubscriptionData({
            plan: user.plan || 'Free',
            startDate: null,
            nextBillingDate: null,
            lifetimeSpend: 0,
          });
          setBillingCycle(user.plan || 'Free');
        }
      } catch (error) {
        console.error('Error fetching subscription data:', error);
        // Default values on error
        setSubscriptionData({
          plan: user.plan || 'Free',
          startDate: null,
          nextBillingDate: null,
          lifetimeSpend: 0,
        });
        setBillingCycle(user.plan || 'Free');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptionData();
  }, [user]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '$0.00';
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      if (billingCycle === 'ProTrial') {
        // Create trial subscription
        const response = await fetch(`${apiUrl}/api/admin/users/${user.id}/trial`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            trialDuration: 30, // 30 seconds
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create trial subscription');
        }

        toast.success('Trial subscription activated (expires in 30 seconds)');
      } else {
        // Regular subscription update
        const response = await fetch(`${apiUrl}/api/admin/users/${user.id}/subscription`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            plan: billingCycle,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update subscription');
        }

        toast.success('Subscription updated successfully');
      }

      onSuccess();
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast.error('Failed to update subscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="manage-subscription-modal-overlay" onClick={onClose}>
        <div className="manage-subscription-modal" onClick={(e) => e.stopPropagation()}>
          <div className="manage-subscription-loading">Loading...</div>
        </div>
      </div>
    );
  }

  const currentPlan = subscriptionData?.plan || user.plan || 'Free';
  const startDate = subscriptionData?.startDate || subscriptionData?.subscriptionStartDate;
  const nextBillingDate = subscriptionData?.nextBillingDate || subscriptionData?.nextBilling;
  const lifetimeSpend = subscriptionData?.lifetimeSpend || subscriptionData?.totalSpend || 0;

  return (
    <div className="manage-subscription-modal-overlay" onClick={onClose}>
      <div className="manage-subscription-modal" onClick={(e) => e.stopPropagation()}>
        <div className="manage-subscription-modal-header">
          <h2>Manage Subscription</h2>
          <button className="manage-subscription-close-btn" onClick={onClose} disabled={isSubmitting}>
            <FaTimes />
          </button>
        </div>

        <form className="manage-subscription-form" onSubmit={handleSubmit}>
          <div className="manage-subscription-form-content">
            {/* Current Plan */}
            <div className="manage-subscription-field-group">
              <label className="manage-subscription-label">Current Plan</label>
              <div className="manage-subscription-display-field">
                <span>{currentPlan}</span>
              </div>
            </div>

            {/* Billing Cycle */}
            <div className="manage-subscription-field-group">
              <label className="manage-subscription-label">Billing Cycle</label>
              <div className="manage-subscription-radio-group">
                <label className="manage-subscription-radio-option">
                  <input
                    type="radio"
                    name="billingCycle"
                    value="Free"
                    checked={billingCycle === 'Free'}
                    onChange={(e) => setBillingCycle(e.target.value)}
                  />
                  <span className="manage-subscription-radio-custom"></span>
                  <span className="manage-subscription-radio-label">Free</span>
                </label>
                <label className="manage-subscription-radio-option">
                  <input
                    type="radio"
                    name="billingCycle"
                    value="Pro"
                    checked={billingCycle === 'Pro'}
                    onChange={(e) => setBillingCycle(e.target.value)}
                  />
                  <span className="manage-subscription-radio-custom"></span>
                  <span className="manage-subscription-radio-label">Pro</span>
                </label>
                <label className="manage-subscription-radio-option">
                  <input
                    type="radio"
                    name="billingCycle"
                    value="ProTrial"
                    checked={billingCycle === 'ProTrial'}
                    onChange={(e) => setBillingCycle(e.target.value)}
                  />
                  <span className="manage-subscription-radio-custom"></span>
                  <span className="manage-subscription-radio-label">Pro (30 sec)</span>
                </label>
              </div>
            </div>

            {/* Subscription Start Date */}
            <div className="manage-subscription-field-group">
              <label className="manage-subscription-label">Subscription Start Date</label>
              <div className="manage-subscription-display-field">
                <span>{formatDate(startDate)}</span>
              </div>
            </div>

            {/* Next Billing Date */}
            <div className="manage-subscription-field-group">
              <label className="manage-subscription-label">Next Billing Date</label>
              <div className="manage-subscription-display-field">
                <span>{formatDate(nextBillingDate)}</span>
              </div>
            </div>

            {/* Lifetime Spend */}
            <div className="manage-subscription-field-group">
              <label className="manage-subscription-label">Lifetime Spend</label>
              <div className="manage-subscription-display-field">
                <span>{formatCurrency(lifetimeSpend)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="manage-subscription-actions">
            <button
              type="button"
              className="manage-subscription-cancel-btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="manage-subscription-save-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Suspend/Deactivate Account Modal Component
const SuspendAccountModal = ({ user, onClose, onSuccess }) => {
  const [suspensionReason, setSuspensionReason] = useState('');
  const [suspendTemporarily, setSuspendTemporarily] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/admin/users/${user.id}/suspend`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          suspended: true,
          reason: suspensionReason,
          temporary: suspendTemporarily,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to suspend account');
      }

      toast.success('Account suspended successfully');
      onSuccess();
    } catch (error) {
      console.error('Error suspending account:', error);
      toast.error('Failed to suspend account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    setIsDeactivating(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/admin/users/${user.id}/deactivate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          deactivated: true,
          reason: suspensionReason,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to deactivate account');
      }

      toast.success('Account deactivated successfully');
      onSuccess();
    } catch (error) {
      console.error('Error deactivating account:', error);
      toast.error('Failed to deactivate account');
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <div className="suspend-account-modal-overlay" onClick={onClose}>
      <div className="suspend-account-modal" onClick={(e) => e.stopPropagation()}>
        <div className="suspend-account-modal-header">
          <h2>Suspend/Deactivate Account</h2>
          <button className="suspend-account-close-btn" onClick={onClose} disabled={isSubmitting || isDeactivating}>
            <FaTimes />
          </button>
        </div>

        <form className="suspend-account-form" onSubmit={handleSubmit}>
          <div className="suspend-account-form-content">
            {/* Informational Text */}
            <p className="suspend-account-info-text">
              Suspending this account will prevent the user from logging in or making new bookings. Existing data will remain intact.
            </p>

            {/* Suspension Reason */}
            <div className="suspend-account-field-group">
              <label className="suspend-account-label">Suspension Reason (optional)</label>
              <Input
                name="suspensionReason"
                type="text"
                placeholder="Enter reason"
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
              />
            </div>

            {/* Action */}
            <div className="suspend-account-field-group">
              <label className="suspend-account-label">Action</label>
              <div className="suspend-account-checkbox-group">
                <label className="suspend-account-checkbox-option">
                  <input
                    type="checkbox"
                    checked={suspendTemporarily}
                    onChange={(e) => setSuspendTemporarily(e.target.checked)}
                  />
                  <span className="suspend-account-checkbox-custom"></span>
                  <span className="suspend-account-checkbox-label">Suspend temporarily</span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="suspend-account-actions">
            <button
              type="button"
              className="suspend-account-deactivate-btn"
              onClick={handleDeactivate}
              disabled={isSubmitting || isDeactivating}
            >
              {isDeactivating ? 'Deactivating...' : 'Deactivate Account'}
            </button>
            <div className="suspend-account-actions-right">
              <button
                type="button"
                className="suspend-account-cancel-btn"
                onClick={onClose}
                disabled={isSubmitting || isDeactivating}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="suspend-account-save-btn"
                disabled={isSubmitting || isDeactivating}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminDashboard;
