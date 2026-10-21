import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { warmUpServer } from './api/client';
import Login from './components/Login';
import WelcomeMagicLogin from './components/WelcomeMagicLogin';
import ChangePassword from './components/ChangePassword';
import RequireAuth from './components/RequireAuth';
import AdminRoute from './components/AdminRoute';
import CustomerRoute from './components/CustomerRoute';
import StaffRoute from './components/StaffRoute';
import SuperAdminRoute from './components/SuperAdminRoute';
import Dashboard from './components/dashboard/Dashboard';
import AllServices from './components/dashboard/AllServices';
import AllAddons from './components/dashboard/AllAddons';
import AllOrders from './components/dashboard/AllOrders';
import OrderDetails from './components/dashboard/OrderDetails';
import CreateOrder from './components/dashboard/CreateOrder';
import AllStaff from './components/dashboard/AllStaff';
import AllClients from './components/dashboard/AllClients';
import ClientDetails from './components/dashboard/ClientDetails';
import MyProfile from './components/dashboard/MyProfile';
import AllTransactions from './components/dashboard/AllTransactions';
import Reports from './components/dashboard/Reports';
import MassNotification from './components/dashboard/MassNotification';
import PickupNotifications from './components/dashboard/PickupNotifications';
import CustomerDashboard from './components/customer/CustomerDashboard';
import CustomerOrders from './components/customer/CustomerOrders';
import CustomerOrderDetails from './components/customer/CustomerOrderDetails';
import CustomerProfile from './components/customer/CustomerProfile';
import PaymentCallback from './components/PaymentCallback';

function App() {
  useEffect(() => {
    warmUpServer();
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/welcome" element={<WelcomeMagicLogin />} />
          <Route path="/payment/callback" element={<PaymentCallback />} />

          <Route
            path="/change-password"
            element={
              <RequireAuth>
                <ChangePassword />
              </RequireAuth>
            }
          />

          <Route
            path="/customer/dashboard"
            element={
              <CustomerRoute>
                <CustomerDashboard />
              </CustomerRoute>
            }
          />
          <Route
            path="/customer/orders"
            element={
              <CustomerRoute>
                <CustomerOrders />
              </CustomerRoute>
            }
          />
          <Route
            path="/customer/orders/:id"
            element={
              <CustomerRoute>
                <CustomerOrderDetails />
              </CustomerRoute>
            }
          />
          <Route
            path="/customer/profile"
            element={
              <CustomerRoute>
                <CustomerProfile />
              </CustomerRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <AdminRoute>
                <Dashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/services"
            element={
              <AdminRoute>
                <AllServices />
              </AdminRoute>
            }
          />
          <Route
            path="/addons"
            element={
              <AdminRoute>
                <AllAddons />
              </AdminRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <AdminRoute>
                <AllOrders />
              </AdminRoute>
            }
          />
          <Route
            path="/orders/new"
            element={
              <AdminRoute>
                <CreateOrder />
              </AdminRoute>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <AdminRoute>
                <OrderDetails />
              </AdminRoute>
            }
          />
          <Route
            path="/staff"
            element={
              <AdminRoute>
                <StaffRoute>
                  <AllStaff />
                </StaffRoute>
              </AdminRoute>
            }
          />
          <Route
            path="/transactions"
            element={
              <AdminRoute>
                <SuperAdminRoute>
                  <AllTransactions />
                </SuperAdminRoute>
              </AdminRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <AdminRoute>
                <SuperAdminRoute>
                  <Reports />
                </SuperAdminRoute>
              </AdminRoute>
            }
          />
          <Route
            path="/notifications/mass"
            element={
              <AdminRoute>
                <StaffRoute>
                  <MassNotification />
                </StaffRoute>
              </AdminRoute>
            }
          />
          <Route
            path="/notifications/pickups"
            element={
              <AdminRoute>
                <StaffRoute>
                  <PickupNotifications />
                </StaffRoute>
              </AdminRoute>
            }
          />
          <Route
            path="/clients"
            element={
              <AdminRoute>
                <AllClients />
              </AdminRoute>
            }
          />
          <Route
            path="/clients/:id"
            element={
              <AdminRoute>
                <ClientDetails />
              </AdminRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <AdminRoute>
                <MyProfile />
              </AdminRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
