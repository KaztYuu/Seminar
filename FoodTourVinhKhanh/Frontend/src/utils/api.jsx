import axios from "axios";
import { toast } from "react-hot-toast";

const api = axios.create({
  baseURL: "http://localhost:8000",
  withCredentials: true, // Gửi cookie với mỗi request
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
        const message = error.response?.data?.detail || "Có lỗi xảy ra";

        if (error.response?.status === 401) {
            toast.error(message);
            
            if (window.location.pathname !== "/login" && window.location.pathname !== "/" && window.location.pathname !== "/signup") {
                window.location.href = "/login";
            }
        
        } else if (error.response?.status === 403) {
            toast.error(message);
              setTimeout(() => {
                    window.location.href = "/unauthorized";
                }, 1000); // 1 giây

        } else if (error.response?.status == 400) {
            toast.error(message);
        } else {
            toast.error(message);
        }

        return Promise.reject(error);
    }
);

export default api;