import React from 'react';
import { NavLink } from 'react-router-dom'; // Import NavLink

const Sidebar = ({ menuItems }) => {
  return (
    <aside className="w-64 bg-white h-screen border-r border-gray-200 fixed left-0 top-0 pt-20 shadow-sm">
      <nav className="px-4 space-y-2">
        {menuItems.map((item, index) => (
          <NavLink
            key={index}
            to={item.path}
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${
                isActive 
                ? "bg-orange-100 text-orange-600 shadow-sm"
                : "text-gray-600 hover:bg-gray-50 hover:text-orange-500"
              }`
            }
            end={item.path === '/tourist'} 
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-sm tracking-wide">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;