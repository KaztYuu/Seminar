import axios from "axios";
import { toast } from "react-hot-toast";

const SUPPORTED_LANGUAGES = ["VI", "EN", "KR", "FR"];

const api = axios.create({
  baseURL: "https://ilse-unmasticated-toney.ngrok-free.dev",
  withCredentials: true, // Gửi cookie với mỗi request
});

api.interceptors.request.use((config) => {
  const rawLang = localStorage.getItem("language");
  const validLang =
    rawLang && SUPPORTED_LANGUAGES.includes(rawLang.toUpperCase())
      ? rawLang.toLowerCase()
      : "vi";

  config.headers["X-Language-Code"] = validLang;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || "Có lỗi xảy ra";
    const isAuthPage = ["/login", "/", "/signup"].includes(
      window.location.pathname,
    );

    if (error.response?.status === 401) {
      // Chỉ show toast nếu NOT trên trang login/signup
      if (!isAuthPage) {
        toast.error(message);
      }

      if (!isAuthPage) {
        window.location.href = "/login";
      }
    } else if (error.response?.status === 403) {
      if (
        error.response.data.detail &&
        error.response.data.detail.errorCode === "SUBSCRIPTION_EXPIRED"
      ) {
        toast.error(
          "Tính năng yêu cầu gói dịch vụ còn hạn! Đang chuyển hướng đến trang thanh toán...",
        );
        setTimeout(() => {
          window.location.href = "/packages";
        }, 1500);
      } else {
        toast.error(message);
        setTimeout(() => {
          window.location.href = "/unauthorized";
        }, 1000);
      }
    } else if (error.response?.status == 400) {
      toast.error(message);
    } else if (error.response?.status == 402) {
      toast.error(
        "Tính năng yêu cầu gói dịch vụ còn hạn! Đang chuyển hướng đến trang thanh toán...",
      );
      setTimeout(() => {
        window.location.href = "/packages";
      }, 1500);
    } else {
      toast.error(message);
    }

    return Promise.reject(error);
  },
);

export default api;
