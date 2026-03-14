import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import banner from "../assets/pho-am-thuc-vinh-khanh-banner.jpg";

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("tourist"); // Mặc định là du khách

  const handleSignup = async (e) => {
    e.preventDefault();

    // Kiểm tra mật khẩu khớp nhau
    if (password !== confirmPassword) {
      alert("Mật khẩu nhập lại không trùng!");
      return;
    }

    const res = await fetch("http://localhost:8000/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });

    const data = await res.json();
    alert(data.message);
  };

  return (
    <div 
      className="min-h-screen w-screen flex items-center justify-center bg-cover bg-center p-4"
      style={{ backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('${banner}')` }}
    >
      <form
        onSubmit={handleSignup}
        className="backdrop-blur-xl bg-white/10 p-8 rounded-3xl border border-white/20 shadow-2xl w-full max-w-md"
      >
        <h2 className="text-3xl font-bold mb-2 text-center text-white italic">Phố ẩm thực Vĩnh Khánh</h2>
        <p className="text-gray-300 text-center mb-6 text-sm">Tạo tài khoản để khám phá ẩm thực</p>

        <div className="space-y-4">
          {/* Họ và tên */}
          <input
            type="text"
            placeholder="Họ và tên"
            required
            className="w-full bg-white/5 border border-white/20 p-3 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 transition-all"
            onChange={(e) => setName(e.target.value)}
          />

          {/* Email */}
          <input
            type="email"
            placeholder="Email"
            required
            className="w-full bg-white/5 border border-white/20 p-3 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 transition-all"
            onChange={(e) => setEmail(e.target.value)}
          />

          {/* Chọn vai trò (Dropdown) */}
          <div className="relative">
            <label className="text-base text-gray-400 ml-2 mb-1 mr-2 flex">Bạn là:</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-gray-800/50 border border-white/20 p-3 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-400 appearance-none cursor-pointer"
            >
              <option value="tourist" className="bg-gray-800">Du khách</option>
              <option value="vendor" className="bg-gray-800">Chủ gian hàng</option>
            </select>
            {/* Icon mũi tên xuống cho dropdown */}
            <div className="absolute right-4 bottom-4 pointer-events-none text-white/50">
              ▼
            </div>
          </div>

          {/* Mật khẩu */}
          <input
            type="password"
            placeholder="Mật khẩu"
            required
            className="w-full bg-white/5 border border-white/20 p-3 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 transition-all"
            onChange={(e) => setPassword(e.target.value)}
          />

          {/* Nhập lại mật khẩu */}
          <input
            type="password"
            placeholder="Nhập lại mật khẩu"
            required
            className={`w-full bg-white/5 border p-3 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
              confirmPassword && password !== confirmPassword 
                ? "border-red-500 focus:ring-red-500" 
                : "border-white/20 focus:ring-green-400"
            }`}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="w-full bg-green-500 !text-white font-bold py-3 rounded-xl mt-8 hover:bg-green-600 shadow-lg shadow-green-500/30 transition-all active:scale-95"
        >
          Đăng ký ngay
        </button>

        <p className="mt-6 text-sm text-center text-gray-300">
          Đã có tài khoản?
          <Link to="/login" className="!text-blue-400 font-semibold ml-2 hover:underline">
            Đăng nhập
          </Link>
        </p>
      </form>
    </div>
  );
}

export default Signup;