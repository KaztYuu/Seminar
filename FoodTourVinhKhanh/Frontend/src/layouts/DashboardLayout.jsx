import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import background from '../assets/BackgrounDashBoard.jpg';

const DashBoardLayout = ({ menuItems, userName, profileImg }) => {
  return (
    <div className="flex min-h-screen w-screen" style={{ backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('${background}')` }}>
      <Navbar userName={userName} profileImg={profileImg} />
      <Sidebar menuItems={menuItems} />
      <main className="flex-1 ml-64 pt-20 p-8">
        
        <Outlet /> 
      </main>
    </div>
  );
};

export default DashBoardLayout;