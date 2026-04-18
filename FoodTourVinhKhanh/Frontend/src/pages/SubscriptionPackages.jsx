import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import api from "../utils/api";
import toast from "react-hot-toast";
import vnpayIcon from "../assets/vnpay-logo.png";
import vietqrIcon from "../assets/vietqr-logo.png";
import { useAuth } from "../context/AuthContext";

const images = [
  "https://cdn-icons-png.flaticon.com/512/1165/1165629.png",
  "https://cdn-icons-png.flaticon.com/512/706/706164.png",
  "https://cdn-icons-png.flaticon.com/512/3144/3144467.png",
  "https://cdn-icons-png.flaticon.com/512/2583/2583344.png",
];

// Danh sách cổng thanh toán
const PAYMENT_METHODS = [
  { id: "vnpay", name: "VNPay", icon: vnpayIcon },
  { id: "vietqr", name: "VietQR / Chuyển khoản", icon: vietqrIcon },
  {
    id: "momo",
    name: "Ví MoMo",
    icon: "https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png",
  },
];

const SubscriptionPackage = () => {
  const { user } = useAuth();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsPerPage = 3;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const res = await api.get("/packages/get-packages");
        const dataWithImages = res.data.data.map((pkg) => ({
          ...pkg,
          image: images[Math.floor(Math.random() * images.length)],
        }));
        setPackages(dataWithImages);
      } catch {
        toast.error("Không thể tải danh sách gói dịch vụ");
      } finally {
        setLoading(false);
      }
    };
    fetchPackages();
  }, []);

  const handleOpenPayment = (pkg) => {
    setSelectedPackage(pkg);
    setIsModalOpen(true);
  };

  const handlePayment = async (pkg, methodId) => {
    setIsProcessing(true);
    try {
      const res = await api.post("/payments/create", {
        package_id: pkg.id,
        payment_method: methodId,
      });

      // Nếu gói FREE, res.data.is_free sẽ là true
      if (res.data.is_free) {
        toast.success("Kích hoạt gói miễn phí thành công!");
        setIsModalOpen(false);
        // Refresh page hoặc redirect
        setTimeout(() => window.location.reload(), 1500);
      } else {
        // Chuyển hướng đến trang thanh toán VNPay
        window.location.href = res.data.payment_url;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi khởi tạo thanh toán");
    } finally {
      setIsProcessing(false);
    }
  };

  const nextSlide = () => {
    if (currentIndex + itemsPerPage < packages.length)
      setCurrentIndex((prev) => prev + 1);
  };

  const prevSlide = () => {
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-500 font-medium animate-pulse">
          Đang tải dịch vụ...
        </p>
      </div>
    );
  }

  const isTourist = user?.role === "tourist";

  return (
    <div className="min-h-screen w-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-50 via-white to-gray-50 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10 space-y-4">
          <h1 className="text-4xl md:text-6xl font-black text-gray-400 tracking-tight">
            Nâng Cấp <span className="text-blue-600">Trải Nghiệm</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-4xl mx-auto">
            Khám phá các gói dịch vụ được thiết kế riêng cho hành trình ẩm thực
            tại phố ẩm thực Vĩnh Khánh.
          </p>
        </div>

        {isTourist && (
          <Card className="mb-8 border-blue-100 bg-blue-50/60">
            <h2 className="text-2xl font-black text-gray-900">
              Tài khoản du khách đang dùng gói Free
            </h2>
            <p className="mt-2 text-gray-600">
              Hiện tại du khách được cấp sẵn gói miễn phí khi đăng ký và chưa có
              gói nâng cấp trả phí.
            </p>
          </Card>
        )}

        {!isTourist && (
          <div className="relative px-12">
            <button
              onClick={prevSlide}
              disabled={currentIndex === 0}
              className="absolute top-1/2 -left-4 -translate-y-1/2 z-10 p-4 bg-white rounded-full shadow-lg disabled:opacity-30">
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={nextSlide}
              disabled={currentIndex + itemsPerPage >= packages.length}
              className="absolute top-1/2 -right-4 -translate-y-1/2 z-10 p-4 bg-white rounded-full shadow-lg disabled:opacity-30">
              <ChevronRight className="w-6 h-6" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {packages
                .slice(currentIndex, currentIndex + itemsPerPage)
                .map((pkg) => (
                  <Card
                    key={pkg.id}
                    className="group flex flex-col items-center p-8 hover:-translate-y-2 transition-all duration-500">
                    <img
                      src={pkg.image}
                      alt=""
                      className="w-24 h-24 mb-6 object-contain"
                    />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {pkg.name}
                    </h3>
                    <div className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full mb-6">
                      {pkg.name} · tối đa {pkg.daily_poi_limit} POI
                    </div>
                    <div className="mt-auto w-full text-center border-t pt-6">
                      <div className="mb-6">
                        <span className="text-3xl font-black text-gray-900">
                          {pkg.price.toLocaleString()}
                        </span>
                        <span className="text-gray-400 text-sm ml-1">VNĐ</span>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleOpenPayment(pkg)}>
                        Đăng Ký Ngay
                      </Button>
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        )}

        {!isTourist && packages.length === 0 && (
          <Card className="text-center">
            <h3 className="text-xl font-black text-gray-900">
              Chưa có gói nâng cấp khả dụng
            </h3>
            <p className="mt-2 text-gray-500">
              Vendor hiện đang dùng gói Free mặc định. Khi admin mở gói Basic
              hoặc VIP, chúng sẽ xuất hiện tại đây.
            </p>
          </Card>
        )}
      </div>

      {/* --- POPUP CHỌN PHƯƠNG THỨC THANH TOÁN --- */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isProcessing && setIsModalOpen(false)}>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Thanh toán</h2>
          <p className="text-sm text-gray-500 mb-6">
            Bạn đang mua{" "}
            <span className="font-bold text-blue-600">
              {selectedPackage?.name}
            </span>
          </p>

          <div className="space-y-3">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method.id}
                disabled={isProcessing}
                onClick={() => handlePayment(selectedPackage, method.id)}
                className="w-full flex items-center justify-between p-4 border-2 border-gray-100 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all group active:scale-[0.98]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl p-2 shadow-sm border border-gray-50">
                    <img
                      src={method.icon}
                      alt={method.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="font-semibold text-gray-700 group-hover:text-blue-700">
                    {method.name}
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500" />
              </button>
            ))}
          </div>

          <p className="mt-6 text-[11px] text-gray-400">
            Bằng việc nhấn vào phương thức thanh toán, bạn đồng ý với Điều khoản
            dịch vụ của chúng tôi.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default SubscriptionPackage;
