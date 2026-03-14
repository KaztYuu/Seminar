import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Toaster } from "react-hot-toast"
import "./App.css"

import Home from "./pages/Home.jsx"
import Login from "./pages/Login.jsx"
import Signup from "./pages/Signup.jsx"

function App() {

  return (
    <BrowserRouter>
      <Toaster position="top-middle" toastOptions={{ duration: 3000 }} />

      <Routes>

        <Route path="/" element={<Home />} />

        <Route path="/login" element={<Login />} />

        <Route path="/signup" element={<Signup />} />

      </Routes>

    </BrowserRouter>
  )
}

export default App