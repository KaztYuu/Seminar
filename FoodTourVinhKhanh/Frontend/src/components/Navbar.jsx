import React from "react";
import { useAuth } from "../context/AuthContext";

const Navbar = ({ userName, profileImg }) => {
  const { user } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 w-full bg-orange-600 text-white h-16 flex items-center justify-between px-6 z-[100] shadow-md">
      <div className="text-xl font-bold tracking-tight">
        Vinh Khanh FoodTour
      </div>

      <div className="flex items-center gap-6">
        {/* Profile */}
        <div className="flex items-center gap-3 border-l border-orange-500 pl-6 h-8">
          <span className="font-medium hidden sm:block">{userName}</span>
          <img
            src={profileImg || "https://via.placeholder.com/40"}
            alt="profile"
            className="w-10 h-10 rounded-full border-2 border-white object-cover bg-gray-200"
          />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
