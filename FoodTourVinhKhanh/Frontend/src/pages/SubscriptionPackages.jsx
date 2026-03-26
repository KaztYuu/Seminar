import { useState, useEffect } from "react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import api from "../utils/api";
import toast from "react-hot-toast";

const images = [
  "https://cdn-icons-png.flaticon.com/512/1165/1165629.png",
  "https://cdn-icons-png.flaticon.com/512/706/706164.png",
  "https://cdn-icons-png.flaticon.com/512/3144/3144467.png",
  "https://cdn-icons-png.flaticon.com/512/2583/2583344.png"
];

// Danh sách cổng thanh toán
const PAYMENT_METHODS = [
  { id: "vnpay", name: "VNPay", icon: "https://vnpay.vn/s1/statics.vnpay.vn/2023/6/0oxhzjmdfn0y1686545866048.png" },
  { id: "vietqr", name: "VietQR / Chuyển khoản", icon: "https://pay.google.com/about/static/images/logos/google-pay-logo.svg" },
  { id: "momo", name: "Ví MoMo", icon: "https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png" }
];

const SubscriptionPackage = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsPerPage = 3;

  // State cho Modal thanh toán
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const res = await api.get("/packages");
        const dataWithImages = res.data.data.map(pkg => ({
          ...pkg,
          image: images[Math.floor(Math.random() * images.length)]
        }));
        setPackages(dataWithImages);
      } catch (error) {
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

  const handlePayment = async (methodId) => {
    setIsProcessing(true);
    try {
      // Giả lập gọi API tạo link thanh toán
      // const res = await api.post("/payment/create", { packageId: selectedPackage.id, method: methodId });
      // window.location.href = res.data.paymentUrl;
      
      toast.success(`Đang kết nối với cổng ${methodId.toUpperCase()}...`);
      console.log(`Thanh toán gói ${selectedPackage.name} qua ${methodId}`);
    } catch (error) {
      toast.error("Lỗi khởi tạo thanh toán");
    } finally {
      setIsProcessing(false);
    }
  };

  const nextSlide = () => {
    if (currentIndex + itemsPerPage < packages.length) setCurrentIndex(prev => prev + 1);
  };

  const prevSlide = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-500 font-medium animate-pulse">Đang tải dịch vụ...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-50 via-white to-gray-50 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10 space-y-4">
          <h1 className="text-4xl md:text-6xl font-black text-gray-400 tracking-tight">
            Nâng Cấp <span className="text-blue-600">Trải Nghiệm</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-4xl mx-auto">
            Khám phá các gói dịch vụ được thiết kế riêng cho hành trình ẩm thực tại phố ẩm thực Vĩnh Khánh.
          </p>
        </div>

        <div className="relative px-12">
          <button onClick={prevSlide} disabled={currentIndex === 0} className="absolute top-1/2 -left-4 -translate-y-1/2 z-10 p-4 bg-white rounded-full shadow-lg disabled:opacity-30">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>

          <button onClick={nextSlide} disabled={currentIndex + itemsPerPage >= packages.length} className="absolute top-1/2 -right-4 -translate-y-1/2 z-10 p-4 bg-white rounded-full shadow-lg disabled:opacity-30">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </button>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {packages.slice(currentIndex, currentIndex + itemsPerPage).map((pkg) => (
              <Card key={pkg.id} className="group flex flex-col items-center p-8 hover:-translate-y-2 transition-all duration-500">
                <img src={pkg.image} alt="" className="w-24 h-24 mb-6 object-contain" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
                <div className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full mb-6">
                   {pkg.duration_hours < 24 ? `${pkg.duration_hours} giờ` : Math.floor(pkg.duration_hours / 24) + " ngày" + (pkg.duration_hours % 24 > 0 ? ` ${pkg.duration_hours % 24} giờ` : "")}
                </div>
                <div className="mt-auto w-full text-center border-t pt-6">
                  <div className="mb-6">
                    <span className="text-3xl font-black text-gray-900">{pkg.price.toLocaleString()}</span>
                    <span className="text-gray-400 text-sm ml-1">VNĐ</span>
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => handleOpenPayment(pkg)}>
                    Đăng Ký Ngay
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* --- POPUP CHỌN PHƯƠNG THỨC THANH TOÁN --- */}
      <Modal isOpen={isModalOpen} onClose={() => !isProcessing && setIsModalOpen(false)}>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Thanh toán</h2>
          <p className="text-sm text-gray-500 mb-6">
            Bạn đang mua <span className="font-bold text-blue-600">{selectedPackage?.name}</span>
          </p>

          <div className="space-y-3">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method.id}
                disabled={isProcessing}
                onClick={() => handlePayment(method.id)}
                className="w-full flex items-center justify-between p-4 border-2 border-gray-100 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all group active:scale-[0.98]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl p-2 shadow-sm border border-gray-50">
                    <img src={method.icon} alt={method.name} className="w-full h-full object-contain" />
                  </div>
                  <span className="font-semibold text-gray-700 group-hover:text-blue-700">{method.name}</span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-300 group-hover:text-blue-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            ))}
          </div>

          <p className="mt-6 text-[11px] text-gray-400">
            Bằng việc nhấn vào phương thức thanh toán, bạn đồng ý với Điều khoản dịch vụ của chúng tôi.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default SubscriptionPackage;