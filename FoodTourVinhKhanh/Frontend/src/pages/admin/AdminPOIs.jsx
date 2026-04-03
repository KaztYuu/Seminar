import React, { useState, useEffect } from 'react';
import api from '../../utils/api'; 
import { toast } from 'react-hot-toast';
import Swal from 'sweetalert2'
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Table from '../../components/common/Table';
import FullPageLoading from '../../components/common/FullPageLoading';
import SearchBar from '../../components/common/SearchBar';
import MapPicker from '../../components/common/MapPicker';


const POIAdminManager = () => {
  const [pois, setPois] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const getUserCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setFormData(prev => ({
            ...prev,
            position: { ...prev.position, latitude, longitude }
          }));
          toast.success("Đã xác định vị trí hiện tại của bạn!");
        },
        () => {
          toast.error("Không thể lấy vị trí, vui lòng chọn thủ công trên bản đồ.");
        }
      );
    }
  };

  useEffect(() => {
    if (isModalOpen && !editingId) {
        getUserCurrentLocation();
    }
  }, [isModalOpen, editingId]);

  const setMapPosition = (coords) => {
    setFormData(prev => ({
      ...prev,
      position: { ...prev.position, ...coords }
    }));
  };

  const initialForm = {
    thumbnail: "",
    banner: "",
    is_active: true,
    position: { latitude: 10.7589, longitude: 106.7076, range_meter: 50 },
    localized: { lang_code: "vi", name: "", description: "" }
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    fetchPois();
  }, []);

  const fetchPois = async (searchTxt = "") => {
    setLoading(true)
    try {
      const res = await api.get(`/pois/get-pois?search=${searchTxt}`);
      if (res.data.success) setPois(res.data.data);
    } catch (err) {
      toast.error("Không thể tải danh sách địa điểm");
    } finally {
      setLoading(false)
    }
  };

  const handleSearch = (value) => {
    setSearchQuery(value);
    fetchPois(value);
  };

  // Mở modal để Sửa
  const handleEdit = (row) => {
    setEditingId(row.id);
    setFormData({
      thumbnail: row.thumbnail,
      banner: row.banner,
      is_active: Boolean(row.is_Active),
      position: { 
        latitude: row.latitude, 
        longitude: row.longitude, 
        range_meter: row.range_meter 
      },
      localized: { 
        lang_code: "vi", 
        name: row.name, 
        description: row.description 
      }
    });
    setIsModalOpen(true);
  };

  // Reset form khi đóng modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(initialForm);
  };

  const handleActivate = async () => {
    const result = await Swal.fire({
      title: 'Xác nhận duyệt hàng loạt?',
      text: "Hệ thống sẽ kích hoạt tất cả POIs của các Vendor còn hạn sử dụng!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Đồng ý!'
    });

    if (result.isConfirmed) {
      try {
        const response = await api.put('/pois/activate')

        if (response.data.success) {
          Swal.fire(
              'Thành công!',
              response.data.message,
              'success'
          );
          fetchPois(searchQuery)
        }
      } catch (error) {
        console.error("Lỗi khi activate:", error);
        Swal.fire(
          'Thất bại',
          error.response?.data?.detail || 'Có lỗi xảy ra khi kết nối server',
          'error'
        );
      }
    }
  }

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
    if (loading) return;

    // Validate cơ bản
    if (!formData.thumbnail || !formData.banner) return toast.error("Vui lòng chọn ảnh!");
    if (!formData.localized.name.trim() || !formData.localized.description.trim()) {
      return toast.error("Vui lòng điền đầy đủ thông tin!");
    }

    if (formData.localized.description.trim().length < 10) {
      return toast.error("Mô tả nên chi tiết một chút, ít nhất 10 ký tự!");
    }

    setLoading(true);
    try {
      let res;
      if (editingId) {

        res = await api.put(`/pois/admin/update/${editingId}`, formData);
      } else {

        res = await api.post('/pois/admin/create', formData);
      }

      if (res.data.success) {
        toast.success(editingId ? "Cập nhật thành công!" : "Tạo mới thành công!");
        handleCloseModal();
        fetchPois(searchQuery);
      }
    } catch (err) {
      const serverError = err.response?.data?.detail;
      toast.error(typeof serverError === 'string' ? serverError : "Lỗi hệ thống!");
    } finally {
      setLoading(false);
    }
  };
  

  const handleDelete = async (poi_id) => {
    
    if (!window.confirm(`Bạn có chắc chắn muốn xóa POI này không? poi_id: ${poi_id}`)){
      return;
    }

    setLoading(true);
    try {
      let res;
      res = await api.delete(`/pois/delete/${poi_id}`)
      if(res.data.success){
        toast.success("Xóa POI thành công");
        fetchPois(searchQuery)
      }
    } catch (err){
      const errorMessage = err.response?.data?.detail || "Không thể xóa địa điểm này!";
      toast.error(errorMessage);
    } finally {
      setLoading(false)
    }
  }

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
          <Button size="sm" variant="outline" onClick={() => handleEdit(row)}>Sửa</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(row.id)}>Xóa</Button>
        </div>
      )
    }
  ];

  return (
    <>
      {loading && <FullPageLoading message="Đang xử lý dữ liệu..." />}
      <div className="p-5 max-w-7xl mx-auto space-y-3">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Quản lý POIs</h1>
            <p className="text-gray-500 mt-1">Cập nhật thông tin thực tế cho du khách</p>
          </div>
        </div>

        <div className="flex justify-between items-end">
          <SearchBar 
            placeholder="Tìm theo tên..." 
            onSearch={handleSearch}
            className="w-full md:w-1/3"
          />
          <div className="space-x-5">
            <Button onClick={() => handleActivate()}>Duyệt toàn bộ</Button>
            <Button onClick={() => setIsModalOpen(true)} size="lg">+ Thêm địa điểm</Button>
          </div>
        </div>

        <Card className="h-[55vh] overflow-auto shadow-sm border-gray-100">
          {pois.length > 0 ? (
            <Table columns={columns} data={pois} />
          ) : (
            <div className="p-10 text-center text-gray-400">
              Không tìm thấy địa điểm nào khớp với từ khóa.
            </div>
          )}
        </Card>

        <Modal 
          isOpen={isModalOpen} 
          onClose={handleCloseModal}
          title={editingId ? "Cập nhật địa điểm" : "Thêm địa điểm mới"}
          showCloseButton={false}
          extraClasses='!w-3xl rounded-xl'
        >
          <form onSubmit={handleSubmit} className="space-y-3 mt-4">
            {/* FILE UPLOADS: Hiển thị preview nếu là Edit */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Ảnh đại diện</label>
                  <input type="file" onChange={(e) => handleFileChange(e, 'thumbnail')} className="text-xs w-full" />
                  {editingId && typeof formData.thumbnail === 'string' && formData.thumbnail.startsWith('/') && 
                    <p className="text-[10px] text-blue-500">Đã có ảnh cũ</p>
                  }
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Ảnh Banner</label>
                  <input type="file" onChange={(e) => handleFileChange(e, 'banner')} className="text-xs w-full" />
                  {editingId && typeof formData.banner === 'string' && formData.banner.startsWith('/') && 
                    <p className="text-[10px] text-blue-500">Đã có ảnh cũ</p>
                  }
                </div>
            </div>

            <Input 
                label="Tên địa điểm"
                value={formData.localized.name}
                onChange={(e) => setFormData({...formData, localized: {...formData.localized, name: e.target.value}})}
            />

            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 ml-1">Mô tả</label>
                <textarea 
                  className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm"
                  rows="3"
                  value={formData.localized.description}
                  onChange={(e) => setFormData({...formData, localized: {...formData.localized, description: e.target.value}})}
                />
            </div>

            {/* Position Section */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Vị trí địa điểm (Click vào bản đồ để chọn)</label>
                <div className="h-64 w-full rounded-xl overflow-hidden border border-blue-100 shadow-inner z-0">
                    <MapPicker position={formData.position} setPosition={setMapPosition} />
                </div>
                
                <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50/50 rounded-2xl border border-blue-100">
                    <div className="text-xs text-gray-500">
                        <span className="font-bold">Vĩ độ:</span> {formData.position.latitude.toFixed(6)}
                    </div>
                    <div className="text-xs text-gray-500">
                        <span className="font-bold">Kinh độ:</span> {formData.position.longitude.toFixed(6)}
                    </div>
                    <Button type="button" variant="outline" className="col-span-2 bg-white" size="sm" onClick={getUserCurrentLocation}>
                        📍 Lấy vị trí hiện tại
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Input 
                    label="Bán kính" 
                    type="number"
                    value={formData.position.range_meter}
                    onChange={(e) => setFormData({...formData, position: {...formData.position, range_meter: parseInt(e.target.value)}})}
                />
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-700 ml-1">Trạng thái</label>
                    <select 
                        className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm"
                        value={formData.is_active}
                        onChange={(e) => setFormData({...formData, is_active: e.target.value === "true"})}
                    >
                        <option value="true">Hoạt động</option>
                        <option value="false">Tạm ẩn</option>
                    </select>
                </div>
            </div>

            <div className="pt-2 flex gap-3">
                <Button className="flex-[2]" type="submit" disabled={loading}>
                  {loading ? "Đang xử lý..." : editingId ? "Lưu thay đổi" : "Xác nhận thêm"}
                </Button>
            </div>
          </form>
        </Modal>
      </div>
    </>
  );
};

export default POIAdminManager;