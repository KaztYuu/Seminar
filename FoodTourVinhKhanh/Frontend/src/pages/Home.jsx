import { Link } from "react-router-dom"
import banner from "../assets/pho-am-thuc-vinh-khanh-banner.jpg";

export default function Home() {
  return (
    <div 
      className="min-h-screen w-screen flex flex-col items-center justify-center bg-cover bg-center bg-no-repeat p-4"
      style={{ 
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('${banner}')` 
      }}
    >
      {/* Container chính với hiệu ứng kính mờ (Glassmorphism) */}
      <div className="backdrop-blur-md bg-white/10 p-8 md:p-12 rounded-2xl border border-white/20 shadow-2xl max-w-4xl w-full text-center">
        
        <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">
          <span className="text-yellow-400">PHỐ ẨM THỰC VĨNH KHÁNH</span>
        </h1>

        <p className="text-lg md:text-xl text-gray-100 mb-10 leading-relaxed">
          Khám phá thiên đường ẩm thực đường phố Quận 4 với bản đồ tương tác, 
          mô tả chi tiết các gian hàng và hướng dẫn dành cho khách du lịch.
        </p>

        {/* Khu vực điều hướng phụ */}
        <div className="border-t border-white/20 pt-6">
          <p className="text-gray-300 text-sm mb-2">Bạn đã sẵn sàng thưởng thức?</p>
          <div className="flex justify-center items-center gap-2 text-base font-medium">
            <Link 
              to="/login" 
              className="text-blue-400 hover:text-blue-300 transition-colors underline-offset-4 hover:underline"
            >
              Đăng nhập
            </Link>
            <span className="text-gray-500">|</span>
            <Link 
              to="/signup" 
              className="!text-green-400 hover:text-green-300 transition-colors underline-offset-4 hover:underline"
            >
              Đăng ký tài khoản mới
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}