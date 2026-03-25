import { useState, useEffect } from "react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";

// Dữ liệu mẫu giả lập từ Backend
const MOCK_PACKAGES = [
  { 
    id: 1, 
    name: "Gói Khám Phá", 
    duration: "1 tháng", 
    price: "99.000", 
    image: "https://cdn-icons-png.flaticon.com/512/1165/1165629.png",
    description: "Phù hợp cho khách du lịch trải nghiệm ngắn hạn."
  },
  { 
    id: 2, 
    name: "Gói Sành Ăn", 
    duration: "6 tháng", 
    price: "499.000", 
    image: "https://cdn-icons-png.flaticon.com/512/706/706164.png",
    description: "Ưu đãi đặc biệt cho các tín đồ ẩm thực đường phố."
  },
  { 
    id: 3, 
    name: "Gói Đối Tác", 
    duration: "12 tháng", 
    price: "899.000", 
    image: "https://cdn-icons-png.flaticon.com/512/3144/3144467.png",
    description: "Dành riêng cho chủ gian hàng tại Vinh Khanh FoodTour."
  },
  { 
    id: 4, 
    name: "Gói Premium", 
    duration: "24 tháng", 
    price: "1.500.000", 
    image: "https://cdn-icons-png.flaticon.com/512/2583/2583344.png",
    description: "Đầy đủ quyền lợi cao cấp và hỗ trợ marketing 24/7."
  }
];

const SubscriptionPackage = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsPerPage = 3;

  // Giả lập gọi API từ Backend
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Giả lập delay 1.2s
      await new Promise(resolve => setTimeout(resolve, 1200));
      setPackages(MOCK_PACKAGES);
      setLoading(false);
    };
    fetchData();
  }, []);

  const nextSlide = () => {
    if (currentIndex + itemsPerPage < packages.length) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  if (loading) {
    return (
      <div className="!max-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-500 font-medium animate-pulse">Đang tải danh sách dịch vụ...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-50 via-white to-gray-50 py-5 px-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="text-center mb-7 space-y-4">
          <h1 className="text-4xl md:text-6xl font-black text-gray-400 tracking-tight">
            Nâng Cấp <span className="text-blue-600">Trải Nghiệm</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Khám phá các gói dịch vụ được thiết kế riêng cho hành trình ẩm thực tại phố ẩm thực Vĩnh Khánh.
          </p>
        </div>

        {/* Carousel Container */}
        <div className="relative px-12">
          {/* Navigation Buttons */}
          <div className="absolute top-1/2 -translate-y-1/2 left-0 z-10">
            <button 
              onClick={prevSlide}
              disabled={currentIndex === 0}
              className="p-4 bg-white rounded-full shadow-xl border border-gray-100 text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          </div>

          <div className="absolute top-1/2 -translate-y-1/2 right-0 z-10">
            <button 
              onClick={nextSlide}
              disabled={currentIndex + itemsPerPage >= packages.length}
              className="p-4 bg-white rounded-full shadow-xl border border-gray-100 text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          {/* Packages Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 overflow-hidden py-4">
            {packages.slice(currentIndex, currentIndex + itemsPerPage).map((pkg) => (
              <Card key={pkg.id} className="group relative flex flex-col items-center p-10 hover:ring-2 hover:ring-blue-500 transition-all duration-500 hover:-translate-y-2">
                
                {/* Image Holder */}
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-blue-100 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                  <img 
                    src={pkg.image} 
                    alt={pkg.name} 
                    className="w-32 h-32 object-contain relative z-10 group-hover:scale-110 transition-transform duration-500"
                  />
                </div>

                {/* Content */}
                <div className="text-center space-y-3 mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 leading-tight">{pkg.name}</h3>
                  <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wider">
                    {pkg.duration}
                  </div>
                  <p className="text-gray-500 text-sm line-clamp-2 italic">
                    "{pkg.description}"
                  </p>
                </div>

                {/* Pricing & Action */}
                <div className="w-full mt-auto pt-8 border-t border-gray-100 text-center">
                  <div className="mb-6">
                    <span className="text-4xl font-black text-gray-900">{pkg.price}</span>
                    <span className="text-gray-400 font-medium ml-1">VNĐ</span>
                  </div>
                  <Button 
                    variant={"outline"} 
                    className="w-full py-4 text-base"
                    onClick={() => console.log(`Đăng ký gói: ${pkg.name}`)}
                  >
                    Đăng Ký Ngay
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPackage;

// import { useState, useEffect } from "react";
// import Card from "../components/common/Card";
// import Button from "../components/common/Button";

// const MOCK_PACKAGES = [
//   { id: 1, name: "Gói Khám Phá", duration: "1 tháng", price: "99.000", image: "https://cdn-icons-png.flaticon.com/512/1165/1165629.png" },
//   { id: 2, name: "Gói Sành Ăn", duration: "6 tháng", price: "499.000", image: "https://cdn-icons-png.flaticon.com/512/706/706164.png" },
//   { id: 3, name: "Gói Đối Tác", duration: "12 tháng", price: "899.000", image: "https://cdn-icons-png.flaticon.com/512/3144/3144467.png" },
//   { id: 4, name: "Gói Premium", duration: "24 tháng", price: "1.500.000", image: "https://cdn-icons-png.flaticon.com/512/2583/2583344.png" }
// ];

// const SubscriptionPackage = () => {
//   const [packages, setPackages] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [currentIndex, setCurrentIndex] = useState(0);
//   const itemsPerPage = 3;

//   useEffect(() => {
//     const fetchData = async () => {
//       setLoading(true);
//       await new Promise(resolve => setTimeout(resolve, 800));
//       setPackages(MOCK_PACKAGES);
//       setLoading(false);
//     };
//     fetchData();
//   }, []);

//   const nextSlide = () => {
//     if (currentIndex + itemsPerPage < packages.length) setCurrentIndex(prev => prev + 1);
//   };

//   const prevSlide = () => {
//     if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
//   };

//   if (loading) return <div className="min-h-screen flex items-center justify-center bg-white text-blue-600 font-medium">Đang tải...</div>;

//   return (
//     <div className="h-screen w-screen bg-gray-50 flex items-center justify-center p-4">
//       <div className="max-w-6xl w-full bg-white rounded-[32px] shadow-2xl shadow-gray-200/50 p-8 border border-gray-100">
        
//         {/* Header - Thu gọn lại thành 1 dòng */}
//         <div className="flex justify-between items-center mb-8">
//           <div>
//             <h1 className="text-2xl font-bold text-gray-900">Gói Dịch Vụ</h1>
//             <p className="text-sm text-gray-500">Chọn giải pháp tối ưu cho trải nghiệm của bạn.</p>
//           </div>
          
//           <div className="flex gap-2">
//             <button onClick={prevSlide} disabled={currentIndex === 0} className="p-2.5 rounded-full border hover:bg-gray-50 disabled:opacity-20 transition-all">
//               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
//             </button>
//             <button onClick={nextSlide} disabled={currentIndex + itemsPerPage >= packages.length} className="p-2.5 rounded-full border hover:bg-gray-50 disabled:opacity-20 transition-all">
//               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
//             </button>
//           </div>
//         </div>

//         {/* Grid - Giảm gap và padding nội bộ */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//           {packages.slice(currentIndex, currentIndex + itemsPerPage).map((pkg) => (
//             <Card key={pkg.id} className="p-6 flex flex-col items-center border-none shadow-none bg-gray-50/50 hover:bg-white hover:shadow-xl transition-all duration-300">
              
//               <img src={pkg.image} alt={pkg.name} className="w-16 h-16 mb-4 object-contain group-hover:scale-110 transition-transform" />

//               <div className="text-center mb-6">
//                 <h3 className="font-bold text-gray-900 mb-1">{pkg.name}</h3>
//                 <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">
//                   {pkg.duration}
//                 </span>
//               </div>

//               <div className="w-full mt-auto text-center">
//                 <div className="mb-4">
//                   <span className="text-2xl font-black text-gray-900">{pkg.price}</span>
//                   <span className="text-[10px] text-gray-400 font-bold ml-1 uppercase">VNĐ</span>
//                 </div>
//                 <Button variant={pkg.id === 2 ? "primary" : "outline"} size="sm" className="w-full rounded-lg">
//                   Chọn Gói
//                 </Button>
//               </div>
//             </Card>
//           ))}
//         </div>

//         {/* Dots nhỏ xinh ở dưới */}
//         <div className="flex justify-center gap-1.5 mt-8">
//           {Array.from({ length: packages.length - itemsPerPage + 1 }).map((_, i) => (
//             <div key={i} className={`h-1.5 rounded-full transition-all ${currentIndex === i ? 'w-6 bg-blue-500' : 'w-1.5 bg-gray-200'}`} />
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default SubscriptionPackage;