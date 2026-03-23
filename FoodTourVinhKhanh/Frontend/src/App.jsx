import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Toaster } from "react-hot-toast"
import "./App.css"
import { useAuth } from "./context/AuthContext" 
import Home from "./pages/Home.jsx"
import Login from "./pages/auth/Login.jsx"
import Signup from "./pages/auth/Signup.jsx"
import DashBoardLayout from "./layouts/DashboardLayout.jsx"
import TouristDashboard from "./pages/tourist/TouristDashboard.jsx"
import ProtectedRoute from "./components/ProtectedRoute.jsx"
import Unauthorized from "./pages/auth/Unauthorized.jsx"
import profileImg from "./assets/ProfileImage.png";
import { touristMenu, vendorMenu, adminMenu } from "./components/MenuConstants.jsx";


function App() {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />

      <Routes>

        {/* <Route 
          path="/admin"
          element={
            <ProtectedRoute role="admin">
            </ProtectedRoute>
          }
        /> */}

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
        </Route>

        {/* <Route 
          path="/vendor"
          element={
            <ProtectedRoute role="vendor">
            </ProtectedRoute>
          }
        /> */}

        <Route path="/" element={<Home />} />

        <Route path="/login" element={<Login />} />

        <Route path="/signup" element={<Signup />} />

        <Route path="/unauthorized" element={<Unauthorized />} />

      </Routes>

    </BrowserRouter>
  )
}

export default App