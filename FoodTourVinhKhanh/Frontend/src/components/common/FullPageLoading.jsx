import React from 'react';

const FullPageLoading = ({ message = "Hệ thống đang xử lý..." }) => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gray-900/60 backdrop-blur-md transition-all duration-300">
      <div className="relative flex flex-col items-center p-10 bg-white/90 rounded-3xl shadow-2xl border border-white/20">
        {/* Spinner animation xịn hơn */}
        <div className="relative w-20 h-20">
            <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
        
        <h2 className="mt-6 text-xl font-bold text-gray-900 tracking-tight">{message}</h2>
        <p className="mt-2 text-sm text-gray-500">Vui lòng không đóng trình duyệt hoặc tải lại trang</p>
        
        {/* Thanh progress giả lập cho sinh động */}
        <div className="mt-6 w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 animate-pulse w-full"></div>
        </div>
      </div>
    </div>
  );
};

export default FullPageLoading;