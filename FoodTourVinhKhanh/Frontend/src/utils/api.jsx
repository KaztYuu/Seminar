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
            window.location.href = "/unauthorized";

        } else {
            toast.error(message);
        }

        return Promise.reject(error);
    }
);

export default api;