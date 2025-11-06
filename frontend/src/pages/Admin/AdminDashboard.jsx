import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { FaUsers, FaUserCheck, FaDollarSign, FaPercent, FaPlus, FaEllipsisV } from "react-icons/fa";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ViewIcon, EditIconAdmin, ManageSubscriptionIcon, SuspendIcon, UserGrowthIcon, BookingTrendsIcon, DeleteIcon } from "../../components/SVGICONS/Svg";
import { Input } from "../../components/index";
import Select from "../../components/ui/Input/Select";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const [showUserMenu, setShowUserMenu] = useState(null);
  const [showPlanMenu, setShowPlanMenu] = useState(null);
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && 
          !event.target.closest('.action-menu-btn')) {
        setShowUserMenu(null);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

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
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="#EF4444"
                    strokeWidth={2}
                    dot={{ fill: '#EF4444', r: 4 }}
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
                  <Tooltip />
                  <Bar
                    dataKey="bookings"
                    fill="#EF4444"
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
                          className="action-menu-btn"
                          onClick={() => setShowUserMenu(showUserMenu === user.id ? null : user.id)}
                        >
                          <FaEllipsisV />
                        </button>
                        {showUserMenu === user.id && (
                          <div 
                            ref={dropdownRef}
                            className="action-menu-dropdown"
                          >
                            <button className="action-menu-item">
                              <span className="action-menu-icon"><ViewIcon /></span>
                              <span>View</span>
                            </button>
                            <button className="action-menu-item">
                              <span className="action-menu-icon"><EditIconAdmin /></span>
                              <span>Edit</span>
                            </button>
                            <button className="action-menu-item">
                              <span className="action-menu-icon"><ManageSubscriptionIcon /></span>
                              <span>Manage Subscription</span>
                            </button>
                            <button className="action-menu-item">
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
                          <div className="plan-menu-dropdown">
                            <button className="plan-menu-item">
                              <span className="plan-menu-icon"><EditIconAdmin /></span>
                              <span>Edit</span>
                            </button>
                            <button className="plan-menu-item">
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
        />
      )}
    </div>
  );
};

// Create Plan Modal Component
const CreatePlanModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
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
    trialPeriod: 0,
    stripeProductIdMonthly: '',
    stripeProductIdAnnual: ''
  });

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
    // TODO: Implement API call to create plan
    console.log('Form data:', formData);
    toast.success('Plan created successfully!');
    onSuccess();
  };

  return (
    <div className="create-plan-modal-overlay" onClick={onClose}>
      <div className="create-plan-modal" onClick={(e) => e.stopPropagation()}>
        <div className="create-plan-modal-content">
          <div className="create-plan-modal-header">
            <h2>Create Subscription Plan</h2>
            <button className="create-plan-close-btn" onClick={onClose}>
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

            {/* Stripe Product IDs */}
            <div className="create-plan-row">
              <Input
                label="Stripe Product ID (Monthly)"
                name="stripeProductIdMonthly"
                type="text"
                placeholder="ID goes here"
                value={formData.stripeProductIdMonthly}
                onChange={(e) => handleInputChange('stripeProductIdMonthly', e)}
              />
              <Input
                label="Stripe Product ID (Annual)"
                name="stripeProductIdAnnual"
                type="text"
                placeholder="ID goes here"
                value={formData.stripeProductIdAnnual}
                onChange={(e) => handleInputChange('stripeProductIdAnnual', e)}
              />
            </div>

            {/* Action Buttons */}
            <div className="create-plan-actions">
              <button type="button" className="create-plan-cancel-btn" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="create-plan-submit-btn">
                Create Plan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
