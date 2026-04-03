import React, { useState } from 'react';

const Navbar = ({ userName, profileImg }) => {
  const [lang, setLang] = useState(localStorage.getItem('language') || 'vi');

  const changeLanguage = (newLang) => {
    setLang(newLang);
    localStorage.setItem('language', newLang); // Lưu lại
    
    // Bắn ra một event để các component khác (như Map) nghe thấy và gọi lại API
    window.dispatchEvent(new Event('languageChange'));
  };

  return (
    // Thay w-screen bằng w-full, thêm left-0, right-0
    // Thay px-50 bằng px-6 hoặc px-10 để an toàn
    <nav className="fixed top-0 left-0 right-0 w-full bg-orange-600 text-white h-16 flex items-center justify-between px-6 z-[100] shadow-md">
      <div className="text-xl font-bold tracking-tight">Vinh Khanh FoodTour</div>

      <div className="flex items-center gap-6">
        {/* Dropdown Ngôn ngữ */}
        <div className="relative group py-4"> {/* Thêm py-4 ở đây để giữ vùng hover */}
          <button className="flex items-center gap-1 bg-orange-700 px-3 py-1 rounded-md hover:bg-orange-800 transition">
            🌐 {lang}
          </button>
          
          {/* Bỏ mt-2, thay bằng pt-2 để không có khoảng trống gây mất hover */}
          <div className="absolute right-0 top-full w-24 bg-white text-gray-800 rounded-md shadow-lg hidden group-hover:block border border-gray-100 overflow-hidden">
            <button 
              onClick={() => changeLanguage('VI')} 
              className="block w-full px-4 py-2 text-gray-400 hover:bg-orange-50 hover:text-orange-600 text-left transition-colors"
            >
              VN
            </button>
            <button 
              onClick={() => changeLanguage('EN')} 
              className="block w-full px-4 py-2 text-gray-400 hover:bg-orange-50 hover:text-orange-600 text-left transition-colors"
            >
              EN
            </button>
            <button 
              onClick={() => changeLanguage('KR')} 
              className="block w-full px-4 py-2 text-gray-400 hover:bg-orange-50 hover:text-orange-600 text-left transition-colors"
            >
              KR
            </button>
            <button 
              onClick={() => changeLanguage('FR')} 
              className="block w-full px-4 py-2 text-gray-400 hover:bg-orange-50 hover:text-orange-600 text-left transition-colors"
            >
              FR
            </button>
          </div>
        </div>

        {/* Profile */}
        <div className="flex items-center gap-3 border-l border-orange-500 pl-6 h-8">
          <span className="font-medium hidden sm:block">{userName}</span>
          <img 
            src={profileImg || 'https://via.placeholder.com/40'} 
            alt="profile" 
            className="w-10 h-10 rounded-full border-2 border-white object-cover bg-gray-200"
          />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;