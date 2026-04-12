import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  Map,
  Package,
  PackageOpen,
  MousePointer2,
  Pointer,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";

const TouristDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { user } = useAuth();
  const [myPackage, setMyPackage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Chạy đồng hồ hệ thống
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    const fetchMyPackage = async () => {
      try {
        const res = await api.get("/packages/get-my-package");
        if (res.data.success) {
          setMyPackage(res.data.data);
        }
      } catch {
        if (err.response?.status !== 404) {
          toast.error("Không thể lấy thông tin gói dịch vụ");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMyPackage();

    return () => clearInterval(timer);
  }, []);

  const getSessionDuration = () => {
    if (!user?.login_time) return "";

    const start = new Date(user.login_time);
    const diff = currentTime - start;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff / (1000 * 60)) % 60);

    return `${hours} giờ ${minutes} phút`;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Banner lời chào */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-orange-500 to-red-600 p-8 rounded-3xl text-white shadow-xl">
        <div>
          <h1 className="text-3xl font-bold">
            Chào buổi chiều, {user.name.split(" ").pop()}! 👋
          </h1>
          <p className="opacity-90 mt-2 text-lg">
            Hôm nay bạn đã sẵn sàng khám phá món ngon Vĩnh Khánh chưa?
          </p>
        </div>
        <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl text-center min-w-[160px]">
          <p className="text-sm font-medium uppercase tracking-wider">
            Giờ hệ thống
          </p>
          <p className="text-2xl font-mono font-bold">
            {currentTime.toLocaleTimeString("vi-VN")}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
          <div className="p-3 bg-blue-50 rounded-xl">
            <Clock className="text-lime-600" size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">
              Thời gian trải nghiệm
            </p>
            <p className="text-xl font-bold text-gray-800">
              {getSessionDuration()}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
          <div className="p-3 bg-orange-50 rounded-xl">
            <Package className="text-red-600" size={24} />
          </div>
          <div className="flex flex-col items-start">
            <p className="text-sm text-gray-500 font-medium">
              Gói dịch vụ hiện tại
            </p>
            <p className="text-xl font-bold text-gray-800">
              {loading ? (
                <span className="text-gray-400 animate-pulse text-base">
                  Đang kiểm tra...
                </span>
              ) : myPackage ? (
                myPackage.name
              ) : (
                "Chưa mua gói dịch vụ"
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
          <div className="p-3 bg-blue-50 rounded-xl">
            <Map className="text-blue-600" size={24} />
          </div>
          <div className="flex flex-col items-start">
            <p className="text-sm text-gray-500 font-medium">Trải nghiệm</p>
            <p className="text-xl font-bold text-gray-800 hover:text-blue-600 hover:cursor-pointer">
              <Link
                to="/tourist/explore"
                className="flex !text-xl !font-bold !text-gray-800 hover:!text-blue-600 !hover:cursor-pointer">
                Khám phá phố ẩm thực{" "}
                <MousePointer2 size={24} className="mt-1 ml-2 text-blue-600" />
              </Link>
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
          <div className="p-3 bg-orange-50 rounded-xl">
            <PackageOpen className="text-orange-600" size={24} />
          </div>
          <div className="flex flex-col items-start">
            <p className="text-sm text-gray-500 font-medium">Dịch vụ</p>
            <p className="text-xl font-bold text-gray-800">
              <Link
                to="/packages"
                className="flex !text-xl !font-bold !text-gray-800 hover:!text-yellow-600 !hover:cursor-pointer">
                Gia hạn hoặc nâng cao trải nghiệm{" "}
                <Pointer size={24} className="mt-1 ml-2 text-yellow-600" />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TouristDashboard;
