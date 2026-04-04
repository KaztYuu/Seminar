import React, { useState } from 'react';
import api from '../utils/api';
import { useAuth } from "../context/AuthContext"

const SUPPORTED_LANGUAGES = ['VI', 'EN', 'KR', 'FR'];
const DEFAULT_LANG = 'VI';

const Navbar = ({ userName, profileImg }) => {

  const getValidLang = (lang) => {
    return SUPPORTED_LANGUAGES.includes(lang) ? lang : DEFAULT_LANG;
  };

  const [lang, setLang] = useState(getValidLang(localStorage.getItem('language')));
  
  const { user } = useAuth()

  const changeLanguage = (newLang) => {
    const validLang = getValidLang(newLang);
  
    setLang(validLang);
    localStorage.setItem('language', validLang);

    api.defaults.headers.common['X-Language-Code'] = validLang;
    
    window.dispatchEvent(new Event('languageChange'));
  };

  return (
    <nav className="fixed top-0 left-0 right-0 w-full bg-orange-600 text-white h-16 flex items-center justify-between px-6 z-[100] shadow-md">
      <div className="text-xl font-bold tracking-tight">Vinh Khanh FoodTour</div>

      <div className="flex items-center gap-6">
        {/* Dropdown Ngôn ngữ */}
        { user.role == 'tourist' && (

            <div className="relative group py-4">
              <button className="flex items-center gap-1 bg-orange-700 px-3 py-1 rounded-md hover:bg-orange-800 transition">
                🌐 {lang}
              </button>

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

          )
        }

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