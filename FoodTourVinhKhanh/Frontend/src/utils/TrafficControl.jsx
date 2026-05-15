import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "./api";
import { getVisitorId } from "./visitor";

export default function TrafficControl({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Không check giới hạn tại trang báo lỗi để tránh vòng lặp vô tận
    if (location.pathname === "/server-overload") return;

    const reportVisit = async () => {
      try {
        const visitorId = getVisitorId();
        const role = localStorage.getItem('token') ? 'member' : 'guest';
        
        await api.post('/auth/track-visit', { visitor_id: visitorId, role });
      } catch (error) {
        if (error.response?.status === 503) {
          // Replace: true để người dùng không back lại được trang cũ khi đã overload
          navigate("/server-overload", { replace: true });
        }
      }
    };

    reportVisit();

    const interval = setInterval(reportVisit, 30000); // 30 giây

    return () => clearInterval(interval);
  }, [location.pathname, navigate]);

  return <>{children}</>;
}