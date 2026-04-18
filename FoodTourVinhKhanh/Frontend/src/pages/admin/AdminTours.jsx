import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../../utils/api";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import Table from "../../components/common/Table";
import FullPageLoading from "../../components/common/FullPageLoading";
import { Plus, Trash2, Edit2, X, MapPin } from "lucide-react";

// Tự động căn giữa map khi danh sách điểm thay đổi
const FitBounds = ({ points }) => {
    const map = useMap();
    useEffect(() => {
        if (points.length === 0) return;
        if (points.length === 1) {
            map.setView([points[0].latitude, points[0].longitude], 15);
        } else {
            const bounds = points.map(p => [p.latitude, p.longitude]);
            map.fitBounds(bounds, { padding: [40, 40] });
        }
    }, [points.length]);
    return null;
};

const AdminTours = () => {
    const [tours, setTours] = useState([]);
    const [allPois, setAllPois] = useState([]); // Danh sách POI để admin chọn
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form tạo/sửa tour
    const [tourName, setTourName] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [selectedPoints, setSelectedPoints] = useState([]); // [{poi_id, point_order, name}]
    const [selectedPoiId, setSelectedPoiId] = useState(""); // POI đang chọn trong dropdown
    const [routeCoords, setRouteCoords] = useState([]); // Tọa độ đường đi thực tế từ OSRM
    const [routeInfo, setRouteInfo] = useState(null);   // {distance_km, duration_min} trong modal
    const [tourStats, setTourStats] = useState({});      // {tour_id: {distance_km, duration_min}} cho bảng

    useEffect(() => {
        fetchTours();
        fetchPois();
    }, []);

    // Gọi OSRM mỗi khi danh sách điểm thay đổi
    useEffect(() => {
        const validPoints = selectedPoints.filter(p => p.latitude && p.longitude);
        if (validPoints.length < 2) {
            setRouteCoords([]);
            setRouteInfo(null);
            return;
        }
        fetchRoute(validPoints, true);
    }, [selectedPoints]);

    // Gọi OSRM để lấy đường đi thực tế
    // saveToModal=true: lưu vào routeCoords + routeInfo (modal)
    // saveToModal=false: chỉ trả về {distance_km, duration_min} cho bảng
    const fetchRoute = async (points, saveToModal = false) => {
        try {
            const coords = points.map(p => `${p.longitude},${p.latitude}`).join(";");
            const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const info = {
                    distance_km: (route.distance / 1000).toFixed(1),
                    duration_min: Math.round(route.duration / 60)
                };
                if (saveToModal) {
                    const latlngs = route.geometry.coordinates.map(c => [c[1], c[0]]);
                    setRouteCoords(latlngs);
                    setRouteInfo(info);
                }
                return info;
            }
        } catch {
            if (saveToModal) {
                setRouteCoords(points.map(p => [p.latitude, p.longitude]));
                setRouteInfo(null);
            }
        }
        return null;
    };

    const fetchTours = async () => {
        setLoading(true);
        try {
            const res = await api.get("/tours/admin");
            if (res.data.success) {
                setTours(res.data.data);
                // Tính khoảng cách + thời gian cho từng tour
                const stats = {};
                await Promise.all(
                    res.data.data.map(async (tour) => {
                        const validPoints = (tour.points || []).filter(p => p.latitude && p.longitude);
                        if (validPoints.length >= 2) {
                            const info = await fetchRoute(validPoints, false);
                            if (info) stats[tour.id] = info;
                        }
                    })
                );
                setTourStats(stats);
            }
        } catch {
            toast.error("Không thể tải danh sách tour");
        } finally {
            setLoading(false);
        }
    };

    const fetchPois = async () => {
        try {
            // Lấy danh sách POI để hiển thị trong dropdown
            const res = await api.get("/pois/get-pois");
            if (res.data.success) setAllPois(res.data.data);
        } catch {
            toast.error("Không thể tải danh sách POI");
        }
    };

    const openCreateModal = () => {
        setEditingId(null);
        setTourName("");
        setIsActive(true);
        setSelectedPoints([]);
        setSelectedPoiId("");
        setRouteCoords([]);
        setRouteInfo(null);
        setIsModalOpen(true);
    };

    const openEditModal = (tour) => {
        setEditingId(tour.id);
        setTourName(tour.name);
        setIsActive(tour.is_Active);
        // Chuyển points từ tour sang dạng state
        setSelectedPoints(tour.points.map(p => ({
            poi_id: p.poi_id,
            point_order: p.point_order,
            name: p.name,
            latitude: p.latitude,
            longitude: p.longitude
        })));
        setSelectedPoiId("");
        setIsModalOpen(true);
    };

    // Thêm POI vào danh sách điểm của tour
    const addPoint = () => {
        if (!selectedPoiId) return;
        const poi = allPois.find(p => p.id === parseInt(selectedPoiId));
        if (!poi) return;

        // Không thêm trùng
        if (selectedPoints.find(p => p.poi_id === poi.id)) {
            toast.error("POI này đã được thêm");
            return;
        }

        const newPoint = {
            poi_id: poi.id,
            point_order: selectedPoints.length + 1,
            name: poi.name,
            latitude: poi.latitude,
            longitude: poi.longitude
        };
        setSelectedPoints([...selectedPoints, newPoint]);
        setSelectedPoiId("");
    };

    // Xóa POI khỏi danh sách điểm
    const removePoint = (poiId) => {
        const updated = selectedPoints
            .filter(p => p.poi_id !== poiId)
            .map((p, index) => ({ ...p, point_order: index + 1 })); // Cập nhật lại thứ tự
        setSelectedPoints(updated);
    };

    const handleSave = async () => {
        if (!tourName.trim()) {
            toast.error("Tên tour không được trống");
            return;
        }
        if (selectedPoints.length === 0) {
            toast.error("Tour phải có ít nhất 1 điểm");
            return;
        }

        const body = {
            name: tourName,
            is_Active: isActive,
            points: selectedPoints.map(p => ({ poi_id: p.poi_id, point_order: p.point_order }))
        };

        try {
            if (editingId) {
                await api.put(`/tours/admin/update/${editingId}`, body);
                toast.success("Cập nhật tour thành công");
            } else {
                await api.post("/tours/admin/create", body);
                toast.success("Tạo tour thành công");
            }
            setIsModalOpen(false);
            fetchTours();
        } catch {
            toast.error("Lưu tour thất bại");
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: "Xóa tour?",
            text: "Hành động này không thể hoàn tác",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Xóa",
            cancelButtonText: "Hủy"
        });
        if (!result.isConfirmed) return;

        try {
            await api.delete(`/tours/admin/delete/${id}`);
            toast.success("Đã xóa tour");
            fetchTours();
        } catch {
            toast.error("Xóa tour thất bại");
        }
    };

    const columns = [
        { key: "id", label: "ID" },
        { key: "name", label: "Tên Tour" },
        {
            key: "points",
            label: "Số điểm",
            render: (row) => `${row.points?.length || 0} điểm`
        },
        {
            key: "distance",
            label: "Khoảng cách",
            render: (row) => tourStats[row.id]
                ? <span className="font-semibold text-blue-600">{tourStats[row.id].distance_km} km</span>
                : <span className="text-gray-300">—</span>
        },
        {
            key: "duration",
            label: "Thời gian",
            render: (row) => {
                const s = tourStats[row.id];
                if (!s) return <span className="text-gray-300">—</span>;
                const h = Math.floor(s.duration_min / 60);
                const m = s.duration_min % 60;
                return <span className="font-semibold text-purple-600">{h > 0 ? `${h}h ${m}p` : `${m} phút`}</span>;
            }
        },
        {
            key: "is_Active",
            label: "Trạng thái",
            render: (row) => (
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${row.is_Active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {row.is_Active ? "Hoạt động" : "Ẩn"}
                </span>
            )
        },
        {
            key: "actions",
            label: "Thao tác",
            render: (row) => (
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditModal(row)}>
                        <Edit2 size={14} />
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(row.id)}>
                        <Trash2 size={14} />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="p-6">
            {loading && <FullPageLoading />}

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Quản lý Tour</h1>
                <Button variant="primary" onClick={openCreateModal}>
                    <Plus size={16} className="mr-1" /> Tạo tour mới
                </Button>
            </div>

            <Card>
                <Table columns={columns} data={tours} />
            </Card>

            {/* MODAL TẠO / SỬA TOUR - Full screen split layout */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />

                    {/* Modal content */}
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex overflow-hidden">

                        {/* NÚT ĐÓNG */}
                        <button
                            className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600"
                            onClick={() => setIsModalOpen(false)}
                        >
                            <X size={20} />
                        </button>

                        {/* === PANEL TRÁI: FORM === */}
                        <div className="w-[400px] shrink-0 flex flex-col border-r border-gray-100 overflow-y-auto text-gray-800">
                            {/* Header */}
                            <div className="p-6 pb-4 border-b border-gray-100">
                                <h2 className="text-xl font-bold">{editingId ? "Sửa tour" : "Tạo tour mới"}</h2>
                                <p className="text-sm text-gray-400 mt-1">Điền thông tin và chọn các điểm POI</p>
                            </div>

                            <div className="p-6 flex flex-col gap-4 flex-1">
                                {/* Tên tour */}
                                <div>
                                    <label className="block text-sm font-semibold mb-1">Tên tour <span className="text-red-500">*</span></label>
                                    <input
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-300"
                                        value={tourName}
                                        onChange={e => setTourName(e.target.value)}
                                        placeholder="Ví dụ: Tour ẩm thực Vĩnh Khánh"
                                    />
                                </div>

                                {/* Trạng thái */}
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        checked={isActive}
                                        onChange={e => setIsActive(e.target.checked)}
                                        className="w-4 h-4 accent-orange-500"
                                    />
                                    <label htmlFor="isActive" className="text-sm font-semibold">Hiển thị tour này</label>
                                </div>

                                {/* Chọn POI thêm vào tour */}
                                <div>
                                    <label className="block text-sm font-semibold mb-1">Thêm điểm vào tour</label>
                                    <div className="flex gap-2">
                                        <select
                                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-300"
                                            value={selectedPoiId}
                                            onChange={e => setSelectedPoiId(e.target.value)}
                                        >
                                            <option value="">-- Chọn POI --</option>
                                            {allPois.map(poi => (
                                                <option key={poi.id} value={poi.id}>{poi.name}</option>
                                            ))}
                                        </select>
                                        <Button variant="primary" onClick={addPoint}>Thêm</Button>
                                    </div>
                                </div>

                                {/* Danh sách điểm đã thêm */}
                                <div className="flex-1">
                                    <label className="block text-sm font-semibold mb-2">
                                        Lộ trình <span className="text-orange-500 font-bold">({selectedPoints.length} điểm)</span>
                                    </label>
                                    {selectedPoints.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-8 text-gray-300 border-2 border-dashed rounded-xl">
                                            <MapPin size={32} />
                                            <p className="text-sm mt-2">Chưa có điểm nào</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            {selectedPoints.map((point, index) => (
                                                <div key={point.poi_id} className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 bg-orange-500 text-white rounded-full text-xs flex items-center justify-center font-bold shrink-0">
                                                            {index + 1}
                                                        </div>
                                                        <span className="text-sm font-medium">{point.name || `POI #${point.poi_id}`}</span>
                                                    </div>
                                                    <button className="text-red-400 hover:text-red-600" onClick={() => removePoint(point.poi_id)}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Nút lưu */}
                            <div className="p-6 pt-4 border-t border-gray-100 flex gap-2 justify-end">
                                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Hủy</Button>
                                <Button variant="primary" onClick={handleSave}>Lưu tour</Button>
                            </div>
                        </div>

                        {/* === PANEL PHẢI: BẢN ĐỒ === */}
                        <div className="flex-1 flex flex-col text-gray-800">
                            <div className="p-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <MapPin size={16} className="text-orange-500" />
                                    <span className="text-sm font-semibold text-gray-600">Bản đồ lộ trình</span>
                                </div>
                                {routeInfo && (
                                    <>
                                        <span className="text-gray-200">|</span>
                                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                            📏 {routeInfo.distance_km} km
                                        </span>
                                        <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                                            ⏱ {Math.floor(routeInfo.duration_min / 60) > 0
                                                ? `${Math.floor(routeInfo.duration_min / 60)}h ${routeInfo.duration_min % 60}p`
                                                : `${routeInfo.duration_min} phút`}
                                        </span>
                                    </>
                                )}
                                {selectedPoints.length > 0 && !routeInfo && (
                                    <span className="text-xs text-gray-400">— Đang tính lộ trình...</span>
                                )}
                            </div>

                            <div className="flex-1">
                                {selectedPoints.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-300 bg-gray-50">
                                        <MapPin size={48} />
                                        <p className="text-sm mt-3">Thêm điểm POI để xem lộ trình trên bản đồ</p>
                                    </div>
                                ) : (
                                    <MapContainer
                                        center={[selectedPoints[0].latitude || 10.7589, selectedPoints[0].longitude || 106.7076]}
                                        zoom={15}
                                        style={{ height: "100%", width: "100%" }}
                                    >
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                        <FitBounds points={selectedPoints.filter(p => p.latitude && p.longitude)} />

                                        {/* Đường đi thực tế từ OSRM */}
                                        {routeCoords.length > 1 && (
                                            <Polyline
                                                positions={routeCoords}
                                                color="#f97316"
                                                weight={4}
                                            />
                                        )}

                                        {/* Marker từng điểm */}
                                        {selectedPoints.filter(p => p.latitude && p.longitude).map((point, index) => (
                                            <Marker
                                                key={point.poi_id}
                                                position={[point.latitude, point.longitude]}
                                                icon={L.divIcon({
                                                    className: "",
                                                    html: `<div style="background:#f97316;color:white;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">${index + 1}</div>`,
                                                    iconSize: [30, 30],
                                                    iconAnchor: [15, 15]
                                                })}
                                            >
                                                <Popup>
                                                    <div className="text-sm">
                                                        <b>#{index + 1} {point.name || `POI #${point.poi_id}`}</b>
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        ))}
                                    </MapContainer>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminTours;
