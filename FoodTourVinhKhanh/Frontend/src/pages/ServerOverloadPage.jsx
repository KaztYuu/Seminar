import React from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function ServerOverloadPage() {
    const handleReload = () => {
        window.location.href = "/";
    };

    return (
        <div className="min-h-screen min-w-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 flex items-center justify-center px-6 text-white">
            <div className="max-w-lg w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 shadow-2xl text-center">

                {/* Icon */}
                <div className="w-24 h-24 mx-auto rounded-full bg-red-500/15 flex items-center justify-center mb-6">
                    <AlertTriangle size={50} className="text-red-400" />
                </div>

                {/* Title */}
                <h1 className="text-4xl font-bold mb-4">
                    Hệ thống đang quá tải
                </h1>

                {/* Description */}
                <p className="text-zinc-300 leading-relaxed mb-8">
                    Hiện có quá nhiều người dùng đang truy cập cùng lúc. 
                    Máy chủ đang xử lý lưu lượng cao nên phản hồi có thể bị chậm hoặc tạm thời gián đoạn.
                    <br />
                    <br />
                    Vui lòng thử lại sau ít phút.
                </p>

                {/* Status */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <span className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse"></span>
                    <span className="text-yellow-300 font-medium">
                        Server Busy
                    </span>
                </div>

                {/* Button */}
                <button
                    onClick={handleReload}
                    className="inline-flex items-center gap-2 bg-white text-black font-semibold px-6 py-3 rounded-xl hover:scale-105 transition-all duration-200"
                >
                    <RefreshCcw size={18} />
                    Thử lại
                </button>

                {/* Footer */}
                <p className="text-zinc-500 text-sm mt-8">
                    © 2026 Your System
                </p>
            </div>
        </div>
    );
}