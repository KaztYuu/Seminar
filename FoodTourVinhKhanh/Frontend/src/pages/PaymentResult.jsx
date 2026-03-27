import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Button from "../components/common/Button";
import { useAuth } from "../context/AuthContext";

const PaymentResult = () => {
    const [searchParams] = useSearchParams();
    const { user, fetchUser } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);

    const status = searchParams.get("status");

    useEffect(() => {
        const loadUser = async () => {
            await fetchUser();   // 🔥 đợi fetch xong
            setLoading(false);
        };

        loadUser();
    }, []);

    // 🔥 loading UI
    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <p className="text-gray-500 animate-pulse">
                    Đang tải thông tin người dùng...
                </p>
            </div>
        );
    }

    const getContent = () => {
        switch (status) {
            case "success":
                return {
                    icon: "✅",
                    title: "Thanh toán thành công",
                    desc: "Gói dịch vụ của bạn đã được kích hoạt.",
                    color: "text-green-600"
                };
            case "failed":
                return {
                    icon: "❌",
                    title: "Thanh toán thất bại",
                    desc: "Đã xảy ra lỗi khi thanh toán.",
                    color: "text-red-600"
                };
            default:
                return {
                    icon: "⚠️",
                    title: "Không hợp lệ",
                    desc: "Không thể xác minh giao dịch.",
                    color: "text-yellow-600"
                };
        }
    };

    const content = getContent();

    const handleNavigateHome = () => {
        if (!user) {
            navigate("/login");
            return;
        }

        navigate(user.role === "tourist" ? "/tourist" : "/vendor");
    };

    return (
        <div className="h-full w-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">

                <div className="text-6xl mb-4">{content.icon}</div>

                <h2 className={`text-2xl font-bold mb-2 ${content.color}`}>
                    {content.title}
                </h2>

                <p className="text-gray-500 mb-8">{content.desc}</p>

                <div className="space-y-3">
                    <Button className="w-full" onClick={handleNavigateHome}>
                        Về Trang Chủ
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default PaymentResult;