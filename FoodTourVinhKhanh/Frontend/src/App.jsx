import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import "./App.css";
import { useAuth } from "./context/AuthContext";
import Home from "./pages/Home.jsx";
import Login from "./pages/auth/Login.jsx";
import Signup from "./pages/auth/Signup.jsx";
import SubscriptionPackages from "./pages/SubscriptionPackages.jsx";
import PaymentResult from "./pages/PaymentResult.jsx";
import DashBoardLayout from "./layouts/DashboardLayout.jsx";
import TouristDashboard from "./pages/tourist/TouristDashboard.jsx";
import TouristProfile from "./pages/tourist/TouristProfile.jsx";
import TourisTransactions from "./pages/tourist/TouristTransactions.jsx";
import TouristExplore from "./pages/tourist/TouristExplore.jsx";
import TouristTours from "./pages/tourist/TouristTours.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminProfile from "./pages/admin/AdminProfile.jsx";
import POIAdminManager from "./pages/admin/AdminPOIs.jsx";
import AdminPackages from "./pages/admin/AdminPackages.jsx";
import AdminTransactions from "./pages/admin/AdminTransactions.jsx";
import Users from "./pages/admin/Users.jsx";
import AdminTours from "./pages/admin/AdminTours.jsx";
import VendorDashboard from "./pages/vendor/VendorDashboard.jsx";
import VendorProfile from "./pages/vendor/VendorProfile.jsx";
import VendorPOIs from "./pages/vendor/VendorPOIs.jsx";
import VendorTransactions from "./pages/vendor/VendorTransactions.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Unauthorized from "./pages/auth/Unauthorized.jsx";
import TestRAG from "./pages/ChatBot.jsx";
import profileImg from "./assets/ProfileImage.png";
import {
  touristMenu,
  vendorMenu,
  adminMenu,
} from "./components/MenuConstants.jsx";

function App() {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />

      <Routes>
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <DashBoardLayout
                userName={user ? user.name : "Admin"}
                profileImg={profileImg}
                menuItems={adminMenu}
              />
            </ProtectedRoute>
          }>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="profile" element={<AdminProfile />} />
          <Route path="pois" element={<POIAdminManager />} />{" "}
          <Route path="packages" element={<AdminPackages />} />
          <Route path="tours" element={<AdminTours />} />
          <Route path="transactions" element={<AdminTransactions />} />{" "}
        </Route>

        <Route
          path="/tourist"
          element={
            <ProtectedRoute role="tourist">
              <DashBoardLayout
                userName={user ? user.name : "Khách"}
                profileImg={profileImg}
                menuItems={touristMenu}
              />
            </ProtectedRoute>
          }>
          <Route index element={<TouristDashboard />} />
          <Route path="profile" element={<TouristProfile />} />
          <Route path="transactions" element={<TourisTransactions />} />
          <Route path="explore" element={<TouristExplore />} />
          <Route path="tours" element={<TouristTours />} />
        </Route>

        <Route
          path="/vendor"
          element={
            <ProtectedRoute role="vendor">
              <DashBoardLayout
                userName={user ? user.name : "Vendor"}
                profileImg={profileImg}
                menuItems={vendorMenu}
              />
            </ProtectedRoute>
          }>
          <Route index element={<VendorDashboard />} />
          <Route path="profile" element={<VendorProfile />} />
          <Route path="transactions" element={<VendorTransactions />} />
          <Route path="my-pois" element={<VendorPOIs />} />
        </Route>

        <Route path="/" element={<Home />} />

        <Route path="/login" element={<Login />} />

        <Route path="/signup" element={<Signup />} />

        <Route path="/packages" element={<SubscriptionPackages />} />

        <Route path="/payment-result" element={<PaymentResult />} />

        <Route path="/unauthorized" element={<Unauthorized />} />

        <Route path="/chatbot" element={<TestRAG />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
