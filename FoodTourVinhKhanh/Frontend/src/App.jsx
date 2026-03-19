import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Toaster } from "react-hot-toast"
import "./App.css"

import Home from "./pages/Home.jsx"
import Login from "./pages/Login.jsx"
import Signup from "./pages/Signup.jsx"
import Admin from "./pages/Admin.jsx"
import Tourist from "./pages/Tourist.jsx"
import Vendor from "./pages/Vendor.jsx"
import ProtectedRoute from "./components/ProtectedRoute.jsx"
import Unauthorized from "./pages/Unauthorized.jsx"

function App() {

  return (
    <BrowserRouter>
      <Toaster position="top-middle" toastOptions={{ duration: 3000 }} />

      <Routes>

        <Route 
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <Admin />
            </ProtectedRoute>
          }
        />

        <Route 
          path="/tourist"
          element={
            <ProtectedRoute role="tourist">
              <Tourist />
            </ProtectedRoute>
          }
        />

        <Route 
          path="/vendor"
          element={
            <ProtectedRoute role="vendor">
              <Vendor />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Home />} />

        <Route path="/login" element={<Login />} />

        <Route path="/signup" element={<Signup />} />

        <Route path="/unauthorized" element={<Unauthorized />} />

      </Routes>

    </BrowserRouter>
  )
}

export default App