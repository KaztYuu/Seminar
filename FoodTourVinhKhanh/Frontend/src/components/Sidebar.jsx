// import { NavLink } from 'react-router-dom'; // Import NavLink

// const Sidebar = ({ menuItems }) => {
//   return (
//     <aside className="w-64 bg-white h-screen border-r border-gray-200 fixed left-0 top-0 pt-20 shadow-sm">
//       <nav className="px-4 space-y-2">
//         {menuItems.map((item, index) => (
//           <NavLink
//             key={index}
//             to={item.path}
//             className={({ isActive }) => 
//               `flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${
//                 isActive 
//                 ? "bg-orange-100 text-orange-600 shadow-sm"
//                 : "text-gray-600 hover:bg-gray-50 hover:text-orange-500"
//               }`
//             }
//             end={item.path === '/tourist'} 
//           >
//             <span className="text-xl">{item.icon}</span>
//             <span className="text-sm tracking-wide">{item.label}</span>
//           </NavLink>
//         ))}
//       </nav>
//     </aside>
//   );
// };

// export default Sidebar;

import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ menuItems }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      toast.success(result.message);
      navigate('/login');
    } else {
      toast.error(result.message);
    }
  };

  return (
    <aside className="w-64 bg-white h-screen border-r border-gray-200 fixed left-0 top-0 pt-20 shadow-sm flex flex-col">
      <nav className="px-4 space-y-2 flex-1">
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
            end={item.path === '/tourist' || item.path === '/vendor' || item.path === '/admin'} 
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-sm tracking-wide">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all font-medium group"
        >
          <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
          <span className="text-sm tracking-wide">Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;