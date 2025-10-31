import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { FaUsers, FaUserCheck, FaDollarSign, FaPercent, FaPlus, FaEllipsisV } from "react-icons/fa";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
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

        const [statsResponse, usersResponse] = await Promise.all([
          fetch(`${apiUrl}/api/admin/stats`, { credentials: 'include' }),
          fetch(`${apiUrl}/api/admin/users`, { credentials: 'include' })
        ]);

        console.log('Stats response status:', statsResponse.status);
        console.log('Users response status:', usersResponse.status);

        if (!statsResponse.ok || !usersResponse.ok) {
          const statsError = await statsResponse.text();
          const usersError = await usersResponse.text();
          console.error('Stats error:', statsError);
          console.error('Users error:', usersError);
          throw new Error('Failed to fetch admin data');
        }

        const statsData = await statsResponse.json();
        const usersData = await usersResponse.json();

        console.log('Stats data:', statsData);
        console.log('Users data count:', usersData.length);

        setStats(statsData);
        setUsers(usersData);
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
              <h3>📈 User Growth Trend</h3>
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
              <h3>📊 Booking Trends</h3>
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
                        <div className="user-name">{user.businessName || 'No Name'}</div>
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
                      <div className="action-menu-wrapper">
                        <button
                          className="action-menu-btn"
                          onClick={() => setShowUserMenu(showUserMenu === user.id ? null : user.id)}
                        >
                          <FaEllipsisV />
                        </button>
                        {showUserMenu === user.id && (
                          <div className="action-menu-dropdown">
                            <button className="action-menu-item">👁️ View</button>
                            <button className="action-menu-item">✏️ Edit</button>
                            <button className="action-menu-item">🔔 Manage Subscription</button>
                            <button className="action-menu-item">💳 Suspend/Deactivate Account</button>
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
          <div className="section-header">
            <h3>Subscription Plan Management</h3>
            <button className="create-plan-btn">
              <FaPlus /> Create New Plan
            </button>
          </div>

          <div className="plans-list">
            <div className="plan-row">
              <div className="plan-row-info">
                <span className="plan-row-name">Free Plan</span>
                <span className="plan-row-badge active">Active</span>
              </div>
              <div className="plan-row-price">$0.00 <span>/month</span></div>
              <button className="plan-row-menu">
                <FaEllipsisV />
              </button>
            </div>

            <div className="plan-row">
              <div className="plan-row-info">
                <span className="plan-row-name">Pro Plan</span>
                <span className="plan-row-badge active">Active</span>
              </div>
              <div className="plan-row-price">$10.00 <span>/month</span></div>
              <button className="plan-row-menu">
                <FaEllipsisV />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
