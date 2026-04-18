import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, MapPin, Camera, Undo2, Download } from 'lucide-react';
import { QRCodeCanvas } from "qrcode.react"
import api from '../../utils/api';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import FullPageLoading from '../../components/common/FullPageLoading';
import SearchBar from '../../components/common/SearchBar';
import MapPicker from '../../components/common/MapPicker';
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';


const VendorPOIs = () => {
    const [pois, setPois] = useState([]);
    const [quota, setQuota] = useState({ current_total: 0, max_pois: 1, remaining: 1 });
    const [loading, setLoading] = useState(true);
    const [isMapShowing, setIsMapShowing] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const API_URL = import.meta.env.VITE_API_URL || 'https://ilse-unmasticated-toney.ngrok-free.dev';

    const initialForm = {
        localized: { lang_code: "vi", name: "", description: "" },
        position: { latitude: 10.762622, longitude: 106.660172 },
        knowledge: [
            { category: "menu", content: "" }
            ],
        thumbnail: "",
        banner: ""
    };

    const [formData, setFormData] = useState(initialForm);

    const addKnowledgeField = () => {
        setFormData(prev => ({
        ...prev,
        knowledge: [...prev.knowledge, { category: "menu", content: "" }]
        }));
    };

    const removeKnowledgeField = (index) => {
        const newKnowledge = formData.knowledge.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, knowledge: newKnowledge }));
    };

    const updateKnowledgeField = (index, field, value) => {
        const newKnowledge = [...formData.knowledge];
        newKnowledge[index][field] = value;
        setFormData(prev => ({ ...prev, knowledge: newKnowledge }));
    };

    useEffect(() => {
        fetchPOIs();
        fetchQuota();
    }, []);

    const fetchPOIs = async (searchTxt="") => {
        try {
            const res = await api.get(`/pois/get-pois?search=${searchTxt}`);
            if (res.data.success) setPois(res.data.data);
        } catch {
            toast.error("Không thể tải danh sách địa điểm");
        } finally {
            setLoading(false);
        }
    };

    const fetchQuota = async () => {
        try {
            const res = await api.get("/pois/vendor/quota");
            if (res.data.success) {
                setQuota(res.data.data);
            }
        } catch {
            setQuota({ current_total: 0, max_pois: 1, remaining: 1 });
        }
    };

    const downloadQRCode = (poi_id) => {
        const canvas = document.getElementById("qr-gen");
        if (canvas) {
            // Tạo một link ảo để tải
            const link = document.createElement('a');
            link.download = `QR_poiId_${poi_id}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        }
    };

    const handleSearch = (value) => {
        setSearchQuery(value);
        fetchPOIs(value);
    };

    const handleOpenModal = async (poi_id = null) => {
        if (poi_id) {
            setLoading(true);
            try {
                const res = await api.get(`/pois/get-poi-by-id/${poi_id}`);
                if (res.data.success) {
                    const poi = res.data.data;
                    setEditingId(poi_id);
                    setFormData({
                        localized: { 
                            name: poi.name || "", 
                            description: poi.description || "" 
                        },
                        position: { 
                            latitude: poi.latitude, 
                            longitude: poi.longitude, 
                        },
                        knowledge: poi.knowledge && poi.knowledge.length > 0 
                            ? poi.knowledge 
                            : [{ category: "menu", content: "" }],
                        thumbnail: poi.thumbnail,
                        banner: poi.banner
                    });
                    setIsModalOpen(true);
                }
            } catch {
                toast.error("Không thể lấy thông tin chi tiết!");
            } finally {
                setLoading(false);
            }
        } else {
            setEditingId(null);
            setFormData(initialForm);
            setIsModalOpen(true);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData(initialForm);
    };

    const handleFileChange = (e, field) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData(prev => ({ ...prev, [field]: reader.result }));
        };
        reader.readAsDataURL(file);
    };

    const setMapPosition = (pos) => {
        setFormData({ ...formData, position: { ...formData.position, ...pos } });
    };

    const getUserCurrentLocation = () => {
        navigator.geolocation.getCurrentPosition((pos) => {
            setMapPosition({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude
            });
            toast.success("Đã lấy vị trí hiện tại");
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        if (!formData.thumbnail || !formData.banner) return toast.error("Vui lòng chọn ảnh!");
        if (!formData.localized.name.trim()) return toast.error("Vui lòng điền tên địa điểm!");
        if (!formData.localized.description.trim()) return toast.error("Vui lòng viết mô tả")

        const payload = {
            thumbnail: formData.thumbnail,
            banner: formData.banner,
            position: {
                latitude: parseFloat(formData.position.latitude),
                longitude: parseFloat(formData.position.longitude)
            },
            localized: {
                lang_code: "vi",
                name: formData.localized.name,
                description: formData.localized.description
            },
            knowledge: formData.knowledge
        };

        setLoading(true);
        try {
            let res;
            if (editingId) {
                res = await api.put(`/pois/vendor/update/${editingId}`, payload);
            } else {
                res = await api.post('/pois/vendor/create', payload);
            }

            if (res.data.success) {
                toast.success("Thành công!");
                handleCloseModal();
                fetchPOIs();
                fetchQuota();
            }
        } catch (err) {
            console.log("Chi tiết lỗi 422:", err.response?.data?.detail);
            const serverError = err.response?.data?.detail;
            toast.error(typeof serverError === 'string' ? serverError : serverError?.message || "Lỗi hệ thống!");
        } finally {
            setLoading(false);
        }
    };

    const filteredPois = pois.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (loading && pois.length === 0) return <FullPageLoading />;

    return (
        <div className="h-full bg-white-200 relative">
        {loading && <FullPageLoading message="Đang xử lý dữ liệu..." />}

        {/* BẢN ĐỒ */}
        {isMapShowing && (
            <div className="fixed inset-0 md:ml-64 ml-0 pt-16 bg-white z-99 overflow-hidden flex flex-col">

            <div className="absolute top-20 right-4 z-[1000]">
                <Button
                className='hover:text-blue-600'
                onClick={() => setIsMapShowing(false)}
                >
                <Undo2 size={24}/> <span className='ml-2'>Quay lại</span>
                </Button>
            </div>

            <div className="flex-1 w-full h-full relative z-10">
                <MapContainer 
                    center={[10.7589, 106.7076]} 
                    zoom={15}
                    maxZoom={18}
                    className="h-full w-full"
                >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                    {pois.map(poi => (
                        <React.Fragment key={poi.id}>
                            <Marker 
                                key={poi.id} 
                                position={[poi.latitude, poi.longitude]}
                                eventHandlers={{ click: () => handleOpenModal(poi.id) }}
                            />
                            <Circle 
                                center={[poi.latitude, poi.longitude]} // Tâm của vòng tròn trùng với Marker
                                radius={poi.audio_range}
                            />
                            <Circle 
                                center={[poi.latitude, poi.longitude]} 
                                radius={poi.access_range || 10}
                                pathOptions={{ 
                                    color: '#de2d2d',
                                    fillColor: '#93c5fd',
                                    fillOpacity: 0.2,
                                    dashArray: '5, 15'
                                }}
                            />

                        </React.Fragment>
                    ))}
                </MapContainer>
            </div>
            </div>
        )}

            <div className="min-h-full bg-white/70 p-6">
                <div className="max-w-6xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="!text-4xl font-black text-gray-900 uppercase">Quản lý <span className="text-blue-600">Địa điểm</span> Của bạn ({quota.current_total}/{quota.max_pois})</h1>
                            <p className="mt-2 text-sm text-gray-500">Gói hiện tại còn có thể tạo thêm {quota.remaining} POI.</p>
                        </div>
                        <div className="space-x-5">
                            <Button onClick={() => setIsMapShowing(true)} className="shadow-lg">
                                Bản đồ
                            </Button>
                            <Button onClick={() => handleOpenModal()} className="shadow-lg" disabled={quota.remaining <= 0}>
                                <Plus size={12} className="mr-2" /> Thêm địa điểm mới
                            </Button>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="bg-white rounded-lg shadow-sm">
                        <SearchBar 
                            placeholder="Tìm kiếm tên địa điểm..." 
                            onSearch={handleSearch}
                            className="text-black"
                        />
                    </div>

                    {/* Grid List */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPois.map(poi => (
                            <div 
                                key={poi.id}
                                className={`group bg-white rounded-3xl overflow-hidden border transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 cursor-pointer ${
                                    poi.is_Active ? "border-gray-100" : "border-red-100 opacity-80"
                                }`}
                                onClick={() => handleOpenModal(poi.id)}
                            >
                                <div className="relative h-44 overflow-hidden">
                                    <img 
                                        src={`${API_URL}${poi.thumbnail}`} 
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                        alt={poi.name} 
                                    />
                                    <div className="absolute top-4 right-4">
                                        <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${
                                            poi.is_Active ? "bg-green-500 text-white" : "bg-red-500 text-white"
                                        }`}>
                                            {poi.is_Active ? "Đã được duyệt" : "Đang chờ duyệt"}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-5">
                                    <h3 className="font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">{poi.name}</h3>
                                    <div className="mt-4 pt-4 border-t border-gray-50 flex justify-end items-center">
                                        <div className="flex space-x-2 items-center">
                                            <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center text-blue-600">
                                                <Edit3 size={14} />
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Chỉnh sửa chi tiết</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Modal Edit/Create */}
                    <Modal 
                        isOpen={isModalOpen} 
                        onClose={handleCloseModal}
                        title={editingId ? "Cập nhật địa điểm" : "Thêm địa điểm mới"}
                        showCloseButton={false}
                        extraClasses='!max-w-3xl rounded-xl'
                    >
                        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                            {/* Banner Preview */}
                            <div className="relative h-32 w-full bg-gray-100 rounded-2xl overflow-hidden border border-dashed border-gray-300">
                                {formData.banner ? (
                                    <img 
                                        src={(typeof formData.banner === 'string' && formData.banner.startsWith('data:')) 
                                            ? formData.banner 
                                            : `${API_URL}${formData.banner}`} 
                                        className="w-full h-full object-cover" 
                                        alt="Banner"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400 text-sm italic">Chưa có banner</div>
                                )}
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                    <label className="cursor-pointer bg-white/90 px-4 py-2 rounded-xl text-xs font-bold shadow-xl">
                                        <Camera size={14} className="inline mr-1" /> {editingId ? "Đổi Banner" : "Chọn Banner"}
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'banner')} />
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-gray-400 uppercase ml-1">Ảnh đại diện (Thumbnail)</label>
                                    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border">
                                        {formData.thumbnail && (
                                                <img 
                                                    src={(typeof formData.thumbnail === 'string' && formData.thumbnail.startsWith('data:')) 
                                                        ? formData.thumbnail 
                                                        : `${API_URL}${formData.thumbnail}`} 
                                                    className="w-full h-full object-cover" 
                                                    alt="Thumb"
                                                />
                                            )}
                                        </div>
                                        <input type="file" onChange={(e) => handleFileChange(e, 'thumbnail')} className="text-xs flex-1" />
                                    </div>
                                </div>
                                <Input 
                                    label="Tên địa điểm"
                                    placeholder="VD: Quán bún mắm 44 Vĩnh Khánh"
                                    value={formData.localized.name}
                                    onChange={(e) => setFormData({...formData, localized: {...formData.localized, name: e.target.value}})}
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-bold text-gray-700 ml-1">Mô tả địa điểm</label>
                                <textarea 
                                    className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm min-h-[100px]"
                                    placeholder="Mô tả ngắn gọn về quán ăn (dịch vụ, món ăn,...)"
                                    value={formData.localized.description}
                                    onChange={(e) => setFormData({...formData, localized: {...formData.localized, description: e.target.value}})}
                                />
                            </div>

                            <div className="space-y-2 border-t pt-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-black text-blue-600 uppercase ml-1">Thông tin bổ sung (Thông tin được cung cấp cho AI chatbot)</label>
                                    <Button type="button" size="sm" variant="outline" onClick={addKnowledgeField}>
                                    <Plus size={14} className="mr-1" /> Thêm
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {formData.knowledge.map((item, index) => (
                                    <div key={index} className="flex gap-2 items-start bg-gray-50 p-2 rounded-xl border border-gray-100">
                                        <select 
                                        className="text-xs bg-white border rounded-lg p-2 outline-none"
                                        value={item.category}
                                        onChange={(e) => updateKnowledgeField(index, 'category', e.target.value)}
                                        >
                                        <option value="menu">Thực đơn</option>
                                        <option value="history">Lịch sử</option>
                                        <option value="promotion">Khuyến mãi</option>
                                        <option value="other">Khác</option>
                                        </select>
                                        
                                        <textarea 
                                        placeholder="Ví dụ: Ốc hương xào tỏi - 50k"
                                        className="flex-1 text-sm p-2 rounded-lg border outline-none focus:border-blue-400 min-h-[40px]"
                                        value={item.content}
                                        onChange={(e) => updateKnowledgeField(index, 'content', e.target.value)}
                                        rows="1"
                                        />

                                        <button 
                                        type="button"
                                        onClick={() => removeKnowledgeField(index)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                        <Trash2 size={16} />
                                        </button>
                                    </div>
                                    ))}
                                </div>
                            </div>

                            {/* Map Section */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 ml-1 flex items-center gap-2">
                                    <MapPin size={16} className="text-red-500" /> Xác định vị trí trên bản đồ
                                </label>
                                <div className="h-64 w-full rounded-2xl overflow-hidden border-4 border-white shadow-lg z-0 relative">
                                    <div className="absolute inset-0 bg-gray-200 flex items-center justify-center text-gray-400 italic">
                                        <MapPicker position={formData.position} setPosition={setMapPosition} />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="p-3 bg-blue-50 rounded-xl text-center">
                                        <p className="text-[10px] font-bold text-blue-400 uppercase">Vĩ độ</p>
                                        <p className="text-sm font-mono font-bold text-blue-700">{formData.position.latitude.toFixed(6)}</p>
                                    </div>
                                    <div className="p-3 bg-blue-50 rounded-xl text-center">
                                        <p className="text-[10px] font-bold text-blue-400 uppercase">Kinh độ</p>
                                        <p className="text-sm font-mono font-bold text-blue-700">{formData.position.longitude.toFixed(6)}</p>
                                    </div>
                                    <Button type="button" variant="outline" className="h-full bg-white border-blue-100 text-blue-600" size="sm" onClick={getUserCurrentLocation}>
                                        📍 Lấy vị trí hiện tại
                                    </Button>
                                </div>
                            </div>

                            {editingId && (
                                <div className="w-full md:w-full p-6 bg-white border-2 border-dashed border-gray-200 rounded-3xl shadow-inner flex flex-col items-center gap-4">
                                    <label className="text-sm font-bold text-gray-700 ml-1">Mã QR của bạn</label>
                                    <div className="p-2 bg-white border-2 border-gray-100 rounded-xl relative group">
                                        <QRCodeCanvas 
                                            id="qr-gen"
                                            value={String(editingId)} 
                                            size={512}
                                            style={{ 
                                                width: '220px', 
                                                height: '220px',
                                                padding: '10px',
                                                backgroundColor: 'white' 
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
                                            className="w-1/3 mb-2 flex items-center justify-center gap-2 !text-[10px] !py-1.5"
                                        >
                                            <Download size={20} /> Tải mã về máy
                                        </Button>
                                    </div>
                                </div>
                            )}
                            <div className="pt-4">
                                <Button className="w-full py-4 text-lg shadow-xl shadow-blue-100" type="submit" disabled={loading}>
                                    {loading ? "Đang xử lý..." : editingId ? "Cập nhật dữ liệu" : "Thêm địa điểm"}
                                </Button>
                            </div>
                        </form>
                    </Modal>
                </div>
            </div>
        </div>
    );
};

export default VendorPOIs;
