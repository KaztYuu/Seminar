import React, { useState, useEffect } from 'react';
import { Clock, Zap } from 'lucide-react';
import banner from '../../assets/pho-am-thuc-vinh-khanh-banner.jpg';

const TouristDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const userData = {
    name: "Nguyễn Văn A",
    joinDate: "2026-03-20T10:00:00",
  };

  const getSessionDuration = () => {
    const start = new Date(userData.joinDate);
    const diff = Math.abs(currentTime - start);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    return `${hours} giờ ${minutes} phút`;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Banner lời chào */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-orange-500 to-red-600 p-8 rounded-3xl text-white shadow-xl">
        <div>
          <h1 className="text-3xl font-bold">Chào buổi chiều, {userData.name.split(' ').pop()}! 👋</h1>
          <p className="opacity-90 mt-2 text-lg">Hôm nay bạn đã sẵn sàng khám phá món ngon Vĩnh Khánh chưa?</p>
        </div>
        <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl text-center min-w-[160px]">
          <p className="text-sm font-medium uppercase tracking-wider">Giờ hệ thống</p>
          <p className="text-2xl font-mono font-bold">{currentTime.toLocaleTimeString('vi-VN')}</p>
        </div>
      </div>

      {/* Thẻ thống kê */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
          <div className="p-3 bg-blue-50 rounded-xl"><Clock className="text-blue-600" size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Thời gian trải nghiệm</p>
            <p className="text-xl font-bold text-gray-800">{getSessionDuration()}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
          <div className="p-3 bg-orange-50 rounded-xl"><Zap className="text-orange-600" size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Gói dịch vụ hiện tại</p>
            <p className="text-xl font-bold text-gray-800">Premium 24h</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TouristDashboard;