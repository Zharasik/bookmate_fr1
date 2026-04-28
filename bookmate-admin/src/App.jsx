import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminLayout from './components/AdminLayout';
import BizLayout from './components/BizLayout';

// Admin pages
import Dashboard from './pages/admin/Dashboard';
import Venues from './pages/admin/Venues';
import Users from './pages/admin/Users';
import AdminBookings from './pages/admin/Bookings';
import Applications from './pages/admin/Applications';
import Reviews from './pages/admin/Reviews';

// Business pages
import BizDashboard from './pages/business/BizDashboard';
import BizVenues from './pages/business/BizVenues';
import BizSlots from './pages/business/BizSlots';
import BizBookings from './pages/business/BizBookings';
import BizServices from './pages/business/BizServices';

function getUser() {
  try { return JSON.parse(localStorage.getItem('admin_user') || 'null'); } catch { return null; }
}

function RequireAuth({ children, role }) {
  const token = localStorage.getItem('admin_token');
  const user = getUser();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    // Admin can access admin routes, business_owner can access biz routes
    if (role === 'admin' && user.role !== 'admin') return <Navigate to="/biz/dashboard" replace />;
    if (role === 'business_owner' && user.role !== 'business_owner') return <Navigate to="/admin/dashboard" replace />;
  }
  return children;
}

function RootRedirect() {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'business_owner') return <Navigate to="/biz/dashboard" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RootRedirect />} />

        {/* Admin routes */}
        <Route path="/admin" element={<RequireAuth role="admin"><AdminLayout /></RequireAuth>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard"    element={<Dashboard />} />
          <Route path="venues"       element={<Venues />} />
          <Route path="users"        element={<Users />} />
          <Route path="bookings"     element={<AdminBookings />} />
          <Route path="applications" element={<Applications />} />
          <Route path="reviews"      element={<Reviews />} />
        </Route>

        {/* Business routes */}
        <Route path="/biz" element={<RequireAuth role="business_owner"><BizLayout /></RequireAuth>}>
          <Route index element={<Navigate to="/biz/dashboard" replace />} />
          <Route path="dashboard" element={<BizDashboard />} />
          <Route path="venues"    element={<BizVenues />} />
          <Route path="slots"     element={<BizSlots />} />
          <Route path="bookings"  element={<BizBookings />} />
          <Route path="services"  element={<BizServices />} />
        </Route>

        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
