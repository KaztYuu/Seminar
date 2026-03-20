import { useState } from "react";
import { Link } from "react-router-dom";
import banner from "../assets/pho-am-thuc-vinh-khanh-banner.jpg";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    const res = await fetch("http://localhost:8000/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.detail || data.message);
      return;
    }

    alert("Đăng nhập thành công!");
  };

  return (
    <div 
      className="min-h-screen w-screen flex items-center justify-center bg-cover bg-center p-4"
      style={{ backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('${banner}')` }}
    >
      <form
        onSubmit={handleLogin}
        className="backdrop-blur-xl bg-white/10 p-8 rounded-2xl border border-white/20 shadow-2xl w-full max-w-md"
      >
        <h2 className="text-3xl font-bold mb-2 text-center text-white">Chào mừng trở lại</h2>
        <p className="text-gray-300 text-center mb-8 text-sm">Vui lòng nhập thông tin để tiếp tục hành trình</p>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            required
            className="w-full bg-white/5 border border-white/20 p-3 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Mật khẩu"
            required
            className="w-full bg-white/5 border border-white/20 p-3 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-500 !text-white font-bold py-3 rounded-xl mt-8 hover:bg-blue-600 shadow-lg shadow-blue-500/30 transition-all active:scale-95"
        >
          Đăng nhập
        </button>

        <p className="mt-6 text-sm text-center text-gray-300">
          Chưa có tài khoản?
          <Link to="/signup" className="!text-green-400 font-semibold ml-2 hover:underline">
            Đăng ký ngay
          </Link>
        </p>
      </form>
    </div>
  );
}

export default Login;