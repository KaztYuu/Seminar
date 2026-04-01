// import React, { useState, useEffect } from 'react';
// import api from '../../utils/api'; 
// import { toast } from 'react-hot-toast';
// import Button from '../../components/common/Button';
// import Card from '../../components/common/Card';
// import Input from '../../components/common/Input';
// import Modal from '../../components/common/Modal';
// import Table from '../../components/common/Table';

// const POIAdminManager = () => {
//   const [pois, setPois] = useState([]);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [loading, setLoading] = useState(false);

//   // Hàm sinh tọa độ ngẫu nhiên quanh khu vực Vĩnh Khánh, Q4 để test
//   const generateRandomCoords = () => ({
//     latitude: (10.7580 + Math.random() * 0.005).toFixed(6),
//     longitude: (106.7050 + Math.random() * 0.005).toFixed(6)
//   });

//   const [formData, setFormData] = useState({
//     thumbnail: "",
//     banner: "",
//     is_Active: true,
//     position: { 
//         latitude: 10.7589, 
//         longitude: 106.7076, 
//         range_meter: 50 
//     },
//     localized: { lang_code: "vi", name: "", description: "" }
//   });

//   useEffect(() => {
//     fetchPois();
//   }, []);

//   const fetchPois = async () => {
//     try {
//       const res = await api.get('/pois/get-pois');
//       if (res.data.success) setPois(res.data.data);
//     } catch (err) {
//       toast.error("Không thể tải danh sách địa điểm");
//     }
//   };

//   const handleFileChange = (e, field) => {
//     const file = e.target.files[0];
//     const reader = new FileReader();
//     reader.onloadend = () => {
//       setFormData(prev => ({ ...prev, [field]: reader.result }));
//     };
//     if (file) reader.readAsDataURL(file);
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     try {
//       // Gọi API create (Sử dụng POICreateAdmin schema)
//       const res = await api.post('/pois/admin/create', formData);
//       if (res.data.success) {
//         toast.success("Tạo POI và giọng đọc AI thành công!");
//         setIsModalOpen(false);
//         fetchPois();
//         // Reset form và sinh tọa độ mới cho lần sau
//         const newCoords = generateRandomCoords();
//         setFormData({
//           thumbnail: "", banner: "", is_Active: true,
//           position: { ...newCoords, range_meter: 50 },
//           localized: { lang_code: "vi", name: "", description: "" }
//         });
//       }
//     } catch (err) {
//       toast.error(err.response?.data?.detail || "Lỗi hệ thống");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Cấu hình các cột cho Component Table
//   const columns = [
//     {
//       header: "Hình ảnh",
//       render: (row) => (
//         <img 
//           src={`http://localhost:8000${row.thumbnail}`} 
//           alt="thumb" 
//           className="w-12 h-12 rounded-xl object-cover border border-gray-100"
//         />
//       )
//     },
//     { header: "Tên địa điểm", accessor: "name" },
//     { 
//       header: "Tọa độ", 
//       render: (row) => <span className="font-mono text-xs text-gray-500">{row.latitude}, {row.longitude}</span> 
//     },
//     {
//       header: "Trạng thái",
//       render: (row) => (
//         <span className={`px-3 py-1 rounded-full text-xs font-medium ${row.is_Active ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
//           {row.is_Active ? "Hoạt động" : "Chờ duyệt"}
//         </span>
//       )
//     },
//     {
//       header: "Hành động",
//       render: (row) => (
//         <div className="flex gap-2">
//           <Button size="sm" variant="outline">Sửa</Button>
//           <Button size="sm" variant="danger">Xóa</Button>
//         </div>
//       )
//     }
//   ];

//   return (
//     <div className="p-8 max-w-7xl mx-auto space-y-8">
//       <div className="flex justify-between items-end">
//         <div>
//           <h1 className="text-3xl font-extrabold text-gray-900">Quản lý POIs</h1>
//           <p className="text-gray-500 mt-1">Quản lý các điểm ẩm thực trên bản đồ FoodTour</p>
//         </div>
//         <Button onClick={() => setIsModalOpen(true)} size="lg">
//           + Thêm địa điểm
//         </Button>
//       </div>

//       <Card>
//         <Table columns={columns} data={pois} />
//       </Card>

//       <Modal 
//         isOpen={isModalOpen} 
//         onClose={() => setIsModalOpen(false)} 
//         title="Thêm địa điểm mới"
//       >
//         <form onSubmit={handleSubmit} className="space-y-5 mt-4">
//           <div className="grid grid-cols-2 gap-4">
//             <div className="space-y-1">
//                <label className="text-xs font-bold text-gray-400 uppercase">Ảnh đại diện</label>
//                <input type="file" onChange={(e) => handleFileChange(e, 'thumbnail')} className="text-xs w-full" />
//             </div>
//             <div className="space-y-1">
//                <label className="text-xs font-bold text-gray-400 uppercase">Ảnh Banner</label>
//                <input type="file" onChange={(e) => handleFileChange(e, 'banner')} className="text-xs w-full" />
//             </div>
//           </div>

//           <Input 
//             label="Tên địa điểm (VN)" 
//             placeholder="Nhập tên quán..."
//             value={formData.localized.name}
//             onChange={(e) => setFormData({...formData, localized: {...formData.localized, name: e.target.value}})}
//           />

//           <div className="flex flex-col gap-1.5">
//             <label className="text-sm font-medium text-gray-700 ml-1">Mô tả món ăn</label>
//             <textarea 
//               className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm"
//               rows="3"
//               placeholder="Mô tả đặc điểm, giá cả..."
//               value={formData.localized.description}
//               onChange={(e) => setFormData({...formData, localized: {...formData.localized, description: e.target.value}})}
//             />
//           </div>

//           <div className="grid grid-cols-2 gap-4">
//             <Input 
//                 label="Kinh độ (Auto)" 
//                 value={formData.position.latitude} 
//                 disabled 
//             />
//             <Input 
//                 label="Vĩ độ (Auto)" 
//                 value={formData.position.longitude} 
//                 disabled 
//             />
//           </div>

//           <div className="pt-2">
//             <Button 
//               className="w-full" 
//               type="submit" 
//               disabled={loading}
//             >
//               {loading ? "Đang xử lý AI & Dịch thuật..." : "Xác nhận thêm"}
//             </Button>
//           </div>
//         </form>
//       </Modal>
//     </div>
//   );
// };

// export default POIAdminManager;

import React, { useState, useEffect } from 'react';
import api from '../../utils/api'; 
import { toast } from 'react-hot-toast';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Table from '../../components/common/Table';
import FullPageLoading from '../../components/common/FullPageLoading';

const POIAdminManager = () => {

  const [pois, setPois] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const generateRandomCoords = () => ({
    latitude: (10.7580 + Math.random() * 0.005).toFixed(6),
    longitude: (106.7050 + Math.random() * 0.005).toFixed(6)
  });

  const [formData, setFormData] = useState({
    thumbnail: "",
    banner: "",
    is_Active: true,
    position: { 
        latitude: 10.7589, 
        longitude: 106.7076, 
        range_meter: 50 
    },
    localized: { lang_code: "vi", name: "", description: "" }
  });

  useEffect(() => {
    fetchPois();
  }, []);

  const fetchPois = async () => {
    try {
      const res = await api.get('/pois/get-pois');
      if (res.data.success) setPois(res.data.data);
    } catch (err) {
      toast.error("Không thể tải danh sách địa điểm");
    }
  };

  const handleGetLocation = () => {
    const coords = generateRandomCoords();
    setFormData(prev => ({
      ...prev,
      position: { ...prev.position, ...coords }
    }));
    toast.success("Đã lấy tọa độ giả lập mới!");
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, [field]: reader.result }));
    };
    if (file) reader.readAsDataURL(file);
  };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const { thumbnail, banner, localized } = formData;
        
        if (!thumbnail) return toast.error("Vui lòng chọn ảnh đại diện!");
        if (!banner) return toast.error("Vui lòng chọn ảnh banner!");
        
        if (!localized.name.trim()) {
        return toast.error("Tên địa điểm không được để trống!");
        }
        
        if (!localized.description.trim()) {
        return toast.error("Mô tả không được để trống!");
        }
        if (localized.description.trim().length < 10) {
        return toast.error("Mô tả nên chi tiết một chút, ít nhất 10 ký tự!");
        }

        if (loading) return;
        setLoading(true);

        try {
            const res = await api.post('/pois/admin/create', formData);

            if (res.data.success) {
                toast.success("Tạo POI và bản dịch AI thành công!");
                setIsModalOpen(false);
                fetchPois();

                const newCoords = generateRandomCoords();
                setFormData({
                thumbnail: "", 
                banner: "", 
                is_Active: true,
                position: { ...newCoords, range_meter: 50 },
                localized: { lang_code: "vi", name: "", description: "" }
                });
            }
        } catch (err) {

            const serverError = err.response?.data?.detail;
            if (Array.isArray(serverError)) {
                toast.error(serverError[0].msg);
            } else {
                toast.error(serverError || "Không thể kết nối server!");
            }
        } finally {
            setLoading(false);
        }
    };

  const columns = [
    {
      header: "Hình ảnh",
      render: (row) => (
        <img 
          src={`http://localhost:8000${row.thumbnail}`} 
          alt="thumb" 
          className="w-12 h-12 rounded-xl object-cover border border-gray-100"
        />
      )
    },
    { header: "Tên địa điểm", accessor: "name" },
    { 
      header: "Tọa độ", 
      render: (row) => <span className="font-mono text-xs text-gray-500">{row.latitude}, {row.longitude}</span> 
    },
    {
        header: "Bán kính",
        render: (row) => <span className="text-gray-600">{row.range_meter}m</span>
    },
    {
      header: "Trạng thái",
      render: (row) => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${row.is_Active ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
          {row.is_Active ? "Hoạt động" : "Chờ duyệt"}
        </span>
      )
    },
    {
      header: "Hành động",
      render: (row) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline">Sửa</Button>
          <Button size="sm" variant="danger">Xóa</Button>
        </div>
      )
    }
  ];

  return (
    <>
        {loading && <FullPageLoading message="Đang xử lý dữ liệu và dịch thuật..." />}
        <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-end">
            <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Quản lý POIs</h1>
            <p className="text-gray-500 mt-1">Quản lý các điểm ẩm thực trên bản đồ FoodTour</p>
            </div>
            <Button onClick={() => setIsModalOpen(true)} size="lg">
            + Thêm địa điểm
            </Button>
        </div>

        <Card>
            <Table columns={columns} data={pois} />
        </Card>

        <Modal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            title="Thêm địa điểm mới"
            showCloseButton={false}
            extraClasses='!w-3xl'
        >
            <form onSubmit={handleSubmit} className="space-y-3 mt-4">
            {/* File Uploads */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Ảnh đại diện</label>
                <input type="file" onChange={(e) => handleFileChange(e, 'thumbnail')} className="text-xs w-full" />
                </div>
                <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Ảnh Banner</label>
                <input type="file" onChange={(e) => handleFileChange(e, 'banner')} className="text-xs w-full" />
                </div>
            </div>

            <Input 
                label="Tên địa điểm" 
                placeholder="Nhập tên quán..."
                value={formData.localized.name}
                onChange={(e) => setFormData({...formData, localized: {...formData.localized, name: e.target.value}})}
            />

            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 ml-1">Mô tả</label>
                <textarea 
                className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm"
                rows="3"
                placeholder="Mô tả đặc điểm, giá cả..."
                value={formData.localized.description}
                onChange={(e) => setFormData({...formData, localized: {...formData.localized, description: e.target.value}})}
                />
            </div>

            {/* Position Section */}
            <div className="space-y-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                <div className="grid grid-cols-2 gap-4">
                    <Input label="Vĩ độ" value={formData.position.latitude} disabled />
                    <Input label="Kinh độ" value={formData.position.longitude} disabled />
                </div>
                <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full bg-white text-blue-600 border-blue-200 hover:bg-blue-50" 
                    size="sm"
                    onClick={handleGetLocation}
                >
                    📍 Lấy tọa độ hiện tại
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Input 
                    label="Bán kính hiển thị (m)" 
                    type="number"
                    value={formData.position.range_meter}
                    onChange={(e) => setFormData({...formData, position: {...formData.position, range_meter: parseInt(e.target.value)}})}
                />
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-700 ml-1">Trạng thái</label>
                    <select 
                        className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm"
                        value={formData.is_Active}
                        onChange={(e) => setFormData({...formData, is_Active: e.target.value === "true"})}
                    >
                        <option value="true">Hoạt động (Active)</option>
                        <option value="false">Tạm ẩn (Inactive)</option>
                    </select>
                </div>
            </div>

            <div className="pt-2 flex gap-3">
                <Button 
                className="flex-[2]" 
                type="submit" 
                disabled={loading}
                >
                {loading ? "Đang xử lý..." : "Xác nhận thêm"}
                </Button>
            </div>
            </form>
        </Modal>
        </div>
    </>
  );
};

export default POIAdminManager;