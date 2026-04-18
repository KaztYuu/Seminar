import React, { useState, useEffect } from "react";
import api from "../../utils/api";
import { toast } from "react-hot-toast";
import { QRCodeCanvas } from "qrcode.react";
import Swal from "sweetalert2";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import Modal from "../../components/common/Modal";
import Table from "../../components/common/Table";
import FullPageLoading from "../../components/common/FullPageLoading";
import SearchBar from "../../components/common/SearchBar";
import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet";
import MapPicker from "../../components/common/MapPicker";
import {
  Camera,
  Plus,
  Trash2,
  Undo2,
  SquarePen,
  Download,
  CheckCircle,
} from "lucide-react";

const POIAdminManager = () => {
  const [pois, setPois] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMapShowing, setIsMapShowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const getUserCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setFormData((prev) => ({
            ...prev,
            position: { ...prev.position, latitude, longitude },
          }));
          toast.success("Đã xác định vị trí hiện tại của bạn!");
        },
        () => {
          toast.error(
            "Không thể lấy vị trí, vui lòng chọn thủ công trên bản đồ.",
          );
        },
      );
    }
  };

  const downloadQRCode = (poi_id) => {
    const canvas = document.getElementById("qr-gen");
    if (canvas) {
      // Tạo một link ảo để tải
      const link = document.createElement("a");
      link.download = `QR_poiId_${poi_id}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    }
  };

  const setMapPosition = (coords) => {
    setFormData((prev) => ({
      ...prev,
      position: { ...prev.position, ...coords },
    }));
  };

  const initialForm = {
    thumbnail: "",
    banner: "",
    is_active: true,
    position: {
      latitude: 10.7589,
      longitude: 106.7076,
      audio_range: 30,
      access_range: 10,
    },
    localized: { lang_code: "vi", name: "", description: "" },
    knowledge: [{ category: "menu", content: "" }],
  };

  const [formData, setFormData] = useState(initialForm);

  const addKnowledgeField = () => {
    setFormData((prev) => ({
      ...prev,
      knowledge: [...prev.knowledge, { category: "menu", content: "" }],
    }));
  };

  const removeKnowledgeField = (index) => {
    const newKnowledge = formData.knowledge.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, knowledge: newKnowledge }));
  };

  const updateKnowledgeField = (index, field, value) => {
    const newKnowledge = [...formData.knowledge];
    newKnowledge[index][field] = value;
    setFormData((prev) => ({ ...prev, knowledge: newKnowledge }));
  };

  useEffect(() => {
    fetchPois();
  }, []);

  const fetchPois = async (searchTxt = "") => {
    setLoading(true);
    try {
      const res = await api.get(`/pois/get-pois?search=${searchTxt}`);
      if (res.data.success) setPois(res.data.data);
    } catch {
      toast.error("Không thể tải danh sách địa điểm");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchQuery(value);
    fetchPois(value);
  };

  // Mở modal để Sửa
  const handleEdit = async (row) => {
    setLoading(true);
    try {
      const res = await api.get(`/pois/get-poi-by-id/${row.id}`);
      if (res.data.success) {
        const fullData = res.data.data;

        setEditingId(fullData.id);
        setFormData({
          thumbnail: fullData.thumbnail,
          banner: fullData.banner,
          is_active: Boolean(fullData.is_Active),
          position: {
            latitude: fullData.latitude,
            longitude: fullData.longitude,
            audio_range: fullData.audio_range,
            access_range: fullData.access_range,
          },
          localized: {
            lang_code: "vi",
            name: fullData.name,
            description: fullData.description,
          },
          knowledge:
            fullData.knowledge && fullData.knowledge.length > 0
              ? fullData.knowledge
              : [{ category: "menu", content: "" }],
        });
        setIsModalOpen(true);
      }
    } catch {
      toast.error("Không thể lấy thông tin chi tiết địa điểm");
    } finally {
      setLoading(false);
    }
  };

  // Reset form khi đóng modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(initialForm);
  };

  const handleActivate = async () => {
    const result = await Swal.fire({
      title: "Xác nhận duyệt hàng loạt?",
      text: "Hệ thống sẽ kích hoạt tất cả POIs của các Vendor còn hạn sử dụng!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Đồng ý!",
    });

    if (result.isConfirmed) {
      try {
        const response = await api.put("/pois/activate");

        if (response.data.success) {
          Swal.fire("Thành công!", response.data.message, "success");
          fetchPois(searchQuery);
        }
      } catch (error) {
        console.error("Lỗi khi activate:", error);
        Swal.fire(
          "Thất bại",
          error.response?.data?.detail || "Có lỗi xảy ra khi kết nối server",
          "error",
        );
      }
    }
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, [field]: reader.result }));
    };
    if (file) reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    // Validate cơ bản
    if (!formData.thumbnail || !formData.banner)
      return toast.error("Vui lòng chọn ảnh!");
    if (
      !formData.localized.name.trim() ||
      !formData.localized.description.trim()
    ) {
      return toast.error("Vui lòng điền đầy đủ thông tin!");
    }

    if (formData.localized.description.trim().length < 10) {
      return toast.error("Mô tả nên chi tiết một chút, ít nhất 10 ký tự!");
    }

    const cleanedKnowledge = formData.knowledge.filter(
      (item) => item.content.trim() !== "",
    );

    if (cleanedKnowledge.length === 0) {
      return toast.error(
        "Vui lòng thêm ít nhất một nội dung kiến thức (Menu, lịch sử...)!",
      );
    }

    // Tạo object data cuối cùng để gửi đi
    const finalData = {
      ...formData,
      knowledge: cleanedKnowledge, // Gửi mảng đã lọc sạch dòng trống
    };

    setLoading(true);
    try {
      let res;
      if (editingId) {
        res = await api.put(`/pois/admin/update/${editingId}`, finalData);
      } else {
        res = await api.post("/pois/admin/create", finalData);
      }

      if (res.data.success) {
        toast.success(
          editingId ? "Cập nhật thành công!" : "Tạo mới thành công!",
        );
        handleCloseModal();
        fetchPois(searchQuery);
      }
    } catch (err) {
      const serverError = err.response?.data?.detail;
      toast.error(
        typeof serverError === "string" ? serverError : "Lỗi hệ thống!",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (poi_id) => {
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa POI này không? poi_id: ${poi_id}`,
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      let res;
      res = await api.delete(`/pois/delete/${poi_id}`);
      if (res.data.success) {
        toast.success("Xóa POI thành công");
        fetchPois(searchQuery);
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.detail || "Không thể xóa địa điểm này!";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePOI = async (poi_id) => {
    setLoading(true);
    try {
      const res = await api.put(`/pois/admin/approve/${poi_id}`);
      if (res.data.success) {
        toast.success("Duyệt POI thành công");
        fetchPois(searchQuery);
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.detail || "Không thể duyệt POI này!";
      toast.error(errorMessage);
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
      ),
    },
    { header: "Tên địa điểm", accessor: "name" },
    {
      header: "Tình trạng dịch vụ",
      render: (row) => (
        <span
          className={`px-2 py-1 rounded text-xs font-bold ${row.is_Expired ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>
          {row.is_Expired ? "Hết hạn / Chưa mua" : "Đã thanh toán"}
        </span>
      ),
    },
    {
      header: "Trạng thái",
      render: (row) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${row.is_Active ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"}`}>
          {row.is_Active ? "Hoạt động" : "Chờ duyệt"}
        </span>
      ),
    },
    {
      header: "Hành động",
      render: (row) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={row.is_Active ? "disabled" : "success"}
            disabled={row.is_Active}
            title={row.is_Active ? "POI đã được duyệt" : "Duyệt POI"}
            onClick={() => handleApprovePOI(row.id)}>
            <CheckCircle size={15} />
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleEdit(row)}>
            <SquarePen size={15} />
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDelete(row.id)}>
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      {loading && <FullPageLoading message="Đang xử lý dữ liệu..." />}

      {/* BẢN ĐỒ */}
      {isMapShowing && (
        <div className="fixed inset-0 md:ml-64 ml-0 pt-16 bg-white z-99 overflow-hidden flex flex-col">
          <div className="absolute top-20 right-4 z-[1000]">
            <Button
              className="hover:text-blue-600"
              onClick={() => setIsMapShowing(false)}>
              <Undo2 size={24} /> <span className="ml-2">Quay lại</span>
            </Button>
          </div>

          <div className="flex-1 w-full h-full relative z-10">
            <MapContainer
              center={[10.7589, 106.7076]}
              zoom={15}
              maxZoom={18}
              className="h-full w-full">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {pois.map((poi) => (
                <React.Fragment key={poi.id}>
                  <Marker
                    key={poi.id}
                    position={[poi.latitude, poi.longitude]}
                    eventHandlers={{ click: () => handleEdit(poi) }}
                  />
                  <Circle
                    center={[poi.latitude, poi.longitude]} // Tâm của vòng tròn trùng với Marker
                    radius={poi.audio_range}
                  />
                  <Circle
                    center={[poi.latitude, poi.longitude]}
                    radius={poi.access_range || 10}
                    pathOptions={{
                      color: "#de2d2d",
                      fillColor: "#93c5fd",
                      fillOpacity: 0.2,
                      dashArray: "5, 15",
                    }}
                  />
                </React.Fragment>
              ))}
            </MapContainer>
          </div>
        </div>
      )}

      <div className="p-5 max-w-7xl mx-auto space-y-3">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-400">
              Quản lý POIs
            </h1>
            <p className="text-slate-400 mt-1">
              Cập nhật thông tin thực tế cho du khách
            </p>
          </div>
        </div>

        <div className="flex justify-between items-end">
          <SearchBar
            placeholder="Tìm theo tên..."
            onSearch={handleSearch}
            className="w-full md:w-1/3"
          />
          <div className="space-x-5">
            <Button onClick={() => setIsMapShowing(true)}>Xem bản đồ</Button>
            <Button onClick={() => handleActivate()}>Duyệt toàn bộ</Button>
            <Button onClick={() => setIsModalOpen(true)} size="lg">
              + Thêm địa điểm
            </Button>
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
          extraClasses="!w-3xl rounded-xl">
          <form onSubmit={handleSubmit} className="space-y-3 mt-4">
            <div className="space-y-4">
              {/* Banner Preview */}
              <div className="space-y-1">
                <label className="text-xs font-black text-gray-400 uppercase ml-1">
                  Ảnh Banner
                </label>
                <div className="relative h-32 w-full bg-gray-100 rounded-2xl overflow-hidden border border-dashed border-gray-300">
                  {formData.banner ? (
                    <img
                      src={
                        typeof formData.banner === "string" &&
                        formData.banner.startsWith("data:")
                          ? formData.banner
                          : `${API_URL}${formData.banner}`
                      }
                      className="w-full h-full object-cover"
                      alt="Banner"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm italic">
                      Chưa có banner
                    </div>
                  )}

                  {/* Overlay chọn file */}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <label className="cursor-pointer bg-white/90 px-4 py-2 rounded-xl text-xs font-bold shadow-xl">
                      <Camera size={14} className="inline mr-1 text-blue-600" />{" "}
                      {editingId ? "Đổi Banner" : "Chọn Banner"}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, "banner")}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Thumbnail Preview */}
              <div className="space-y-1">
                <label className="text-xs font-black text-gray-400 uppercase ml-1">
                  Ảnh đại diện (Thumbnail)
                </label>
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border shrink-0">
                    {formData.thumbnail ? (
                      <img
                        src={
                          typeof formData.thumbnail === "string" &&
                          formData.thumbnail.startsWith("data:")
                            ? formData.thumbnail
                            : `${API_URL}${formData.thumbnail}`
                        }
                        className="w-full h-full object-cover"
                        alt="Thumb"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <Camera size={16} className="text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      onChange={(e) => handleFileChange(e, "thumbnail")}
                      className="text-xs w-full file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      accept="image/*"
                    />
                    {editingId &&
                      typeof formData.thumbnail === "string" &&
                      formData.thumbnail.startsWith("/") && (
                        <p className="text-[10px] text-blue-500 mt-1 ml-1 font-medium">
                          ✨ Đang sử dụng ảnh từ hệ thống
                        </p>
                      )}
                  </div>
                </div>
              </div>
            </div>

            <Input
              label="Tên địa điểm"
              value={formData.localized.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  localized: { ...formData.localized, name: e.target.value },
                })
              }
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 ml-1">
                Mô tả
              </label>
              <textarea
                className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm"
                rows="3"
                value={formData.localized.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    localized: {
                      ...formData.localized,
                      description: e.target.value,
                    },
                  })
                }
              />
            </div>

            <div className="space-y-2 border-t pt-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black text-blue-600 uppercase ml-1">
                  Thông tin bổ sung (Thông tin được cung cấp cho AI chatbot)
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addKnowledgeField}>
                  <Plus size={14} className="mr-1" /> Thêm
                </Button>
              </div>

              <div className="space-y-3">
                {formData.knowledge.map((item, index) => (
                  <div
                    key={index}
                    className="flex gap-2 items-start bg-gray-50 p-2 rounded-xl border border-gray-100">
                    <select
                      className="text-xs bg-white border rounded-lg p-2 outline-none"
                      value={item.category}
                      onChange={(e) =>
                        updateKnowledgeField(index, "category", e.target.value)
                      }>
                      <option value="menu">Thực đơn</option>
                      <option value="history">Lịch sử</option>
                      <option value="promotion">Khuyến mãi</option>
                      <option value="other">Khác</option>
                    </select>

                    <textarea
                      placeholder="Ví dụ: Ốc hương xào tỏi - 50k"
                      className="flex-1 text-sm p-2 rounded-lg border outline-none focus:border-blue-400 min-h-[40px]"
                      value={item.content}
                      onChange={(e) =>
                        updateKnowledgeField(index, "content", e.target.value)
                      }
                      rows="1"
                    />

                    <button
                      type="button"
                      onClick={() => removeKnowledgeField(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Position Section */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Vị trí địa điểm (Click vào bản đồ để chọn)
              </label>
              <div className="h-64 w-full rounded-xl overflow-hidden border border-blue-100 shadow-inner z-0">
                <MapPicker
                  position={formData.position}
                  setPosition={setMapPosition}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50/50 rounded-2xl border border-blue-100">
                <div className="text-xs text-gray-500">
                  <span className="font-bold">Vĩ độ:</span>{" "}
                  {formData.position.latitude.toFixed(6)}
                </div>
                <div className="text-xs text-gray-500">
                  <span className="font-bold">Kinh độ:</span>{" "}
                  {formData.position.longitude.toFixed(6)}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="col-span-2 bg-white"
                  size="sm"
                  onClick={getUserCurrentLocation}>
                  📍 Lấy vị trí hiện tại
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Bán kính audio"
                type="number"
                value={formData.position.audio_range}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    position: {
                      ...formData.position,
                      audio_range: parseInt(e.target.value),
                    },
                  })
                }
              />
              <Input
                label="Bán kính access"
                type="number"
                value={formData.position.access_range}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    position: {
                      ...formData.position,
                      access_range: parseInt(e.target.value),
                    },
                  })
                }
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 ml-1">
                  Trạng thái
                </label>
                <select
                  className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm"
                  value={formData.is_active}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      is_active: e.target.value === "true",
                    })
                  }>
                  <option value="true">Hoạt động</option>
                  <option value="false">Tạm ẩn</option>
                </select>
              </div>
            </div>

            {editingId && (
              <div className="w-full md:w-full p-6 bg-white border-2 border-dashed border-gray-200 rounded-3xl shadow-inner flex flex-col items-center gap-4">
                <label className="text-sm font-bold text-gray-700 ml-1">
                  Mã QR của POI
                </label>
                <div className="p-2 bg-white border-2 border-gray-100 rounded-xl relative group">
                  <QRCodeCanvas
                    id="qr-gen"
                    value={String(editingId)}
                    size={512}
                    style={{
                      width: "220px",
                      height: "220px",
                      padding: "10px",
                      backgroundColor: "white",
                    }}
                    marginSize={4}
                    level="H"
                  />
                </div>

                <div className="text-center w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadQRCode(editingId)}
                    className="w-1/3 mb-2 flex items-center justify-center gap-2 !text-[10px] !py-1.5">
                    <Download size={20} /> Tải mã về máy
                  </Button>
                </div>
              </div>
            )}

            <div className="pt-2 flex gap-3">
              <Button className="flex-[2]" type="submit" disabled={loading}>
                {loading
                  ? "Đang xử lý..."
                  : editingId
                    ? "Lưu thay đổi"
                    : "Xác nhận thêm"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </>
  );
};

export default POIAdminManager;
