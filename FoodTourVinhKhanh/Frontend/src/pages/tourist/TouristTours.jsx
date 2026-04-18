import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Circle, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../../utils/api";
import { toast } from "react-hot-toast";
import Card from "../../components/common/Card";
import FullPageLoading from "../../components/common/FullPageLoading";
import { MapPin, Navigation, Clock, Ruler } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Fit map vào tour — chỉ chạy khi đổi tour (dùng tourId làm key)
const FitBounds = ({ points, tourId }) => {
    const map = useMap();
    useEffect(() => {
        if (!points || points.length === 0) return;
        if (points.length === 1) {
            map.setView([points[0].latitude, points[0].longitude], 16);
        } else {
            map.fitBounds(points.map(p => [p.latitude, p.longitude]), { padding: [60, 60] });
        }
    }, [tourId]); // Chỉ trigger khi đổi tour, không trigger khi userLoc thay đổi
    return null;
};

// Khi user click → pan mượt đến vị trí user (không zoom)
const PanToUser = ({ userLoc }) => {
    const map = useMap();
    useEffect(() => {
        if (userLoc) {
            map.panTo([userLoc.lat, userLoc.lng], { animate: true, duration: 0.5 });
        }
    }, [userLoc]);
    return null;
};

// Click map để di chuyển vị trí tourist
const MapClickHandler = ({ onMapClick }) => {
    useMapEvents({
        click(e) {
            onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
    });
    return null;
};

const TouristTours = () => {
    const [tours, setTours] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedTour, setSelectedTour] = useState(null);
    const [userLoc, setUserLoc] = useState(null);
    const [routeCoords, setRouteCoords] = useState([]); // Đường đi thực tế từ OSRM
    const [routeInfo, setRouteInfo] = useState(null);   // {distance_km, duration_min}
    const lastPlayedPoiId = useRef(null);
    const audioRef = useRef(null);

    useEffect(() => {
        fetchTours();
        // Lấy vị trí GPS hiện tại
        navigator.geolocation.getCurrentPosition(
            (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => {}
        );
    }, []);

    // Gọi OSRM mỗi khi đổi tour
    useEffect(() => {
        if (!selectedTour) { setRouteCoords([]); setRouteInfo(null); return; }
        const validPoints = (selectedTour.points || []).filter(p => p.latitude && p.longitude);
        if (validPoints.length < 2) { setRouteCoords([]); setRouteInfo(null); return; }
        fetchOsrmRoute(validPoints);
    }, [selectedTour]);

    // Khi tourist di chuyển → kiểm tra vào gần POI nào không
    useEffect(() => {
        if (!userLoc || !selectedTour) return;
        for (const point of selectedTour.points) {
            if (!point.latitude || !point.longitude) continue;
            const dist = getDistance(userLoc.lat, userLoc.lng, point.latitude, point.longitude);
            const range = point.audio_range || 30;
            if (dist <= range && lastPlayedPoiId.current !== point.poi_id) {
                lastPlayedPoiId.current = point.poi_id;
                toast.success(`Bạn đang ở gần: ${point.name}`, { icon: "📍" });
                playAudio(point.audio_url);
                break;
            }
        }
    }, [userLoc]);

    const fetchTours = async () => {
        setLoading(true);
        try {
            const res = await api.get("/tours/");
            if (res.data.success) setTours(res.data.data);
        } catch {
            toast.error("Không thể tải danh sách tour");
        } finally {
            setLoading(false);
        }
    };

    const fetchOsrmRoute = async (points) => {
        try {
            const coords = points.map(p => `${p.longitude},${p.latitude}`).join(";");
            const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                setRouteCoords(route.geometry.coordinates.map(c => [c[1], c[0]]));
                setRouteInfo({
                    distance_km: (route.distance / 1000).toFixed(1),
                    duration_min: Math.round(route.duration / 60)
                });
            }
        } catch {
            // Fallback đường thẳng
            setRouteCoords(points.map(p => [p.latitude, p.longitude]));
            setRouteInfo(null);
        }
    };

    const handleSelectTour = (tour) => {
        setSelectedTour(tour);
        lastPlayedPoiId.current = null;
    };

    const playAudio = async (url) => {
        if (audioRef.current && url) {
            try {
                audioRef.current.src = `${API_URL}${url}`;
                await audioRef.current.play();
            } catch {}
        }
    };

    const getDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const validPoints = selectedTour?.points?.filter(p => p.latitude && p.longitude) || [];

    return (
        <div className="flex h-full">
            {loading && <FullPageLoading />}
            <audio ref={audioRef} hidden />

            {/* DANH SÁCH TOUR - Bên trái */}
            <div className="w-72 shrink-0 overflow-y-auto border-r border-gray-200 p-4 flex flex-col gap-3 bg-white text-gray-800">
                <h2 className="text-lg font-bold text-gray-800">Danh sách Tour</h2>
                {tours.length === 0 && !loading && (
                    <p className="text-sm text-gray-400">Chưa có tour nào</p>
                )}
                {tours.map(tour => (
                    <div
                        key={tour.id}
                        onClick={() => handleSelectTour(tour)}
                        className={`cursor-pointer rounded-2xl p-4 border-2 transition-all hover:shadow-md ${
                            selectedTour?.id === tour.id
                                ? "border-orange-500 bg-orange-50"
                                : "border-gray-100 bg-white hover:border-orange-200"
                        }`}
                    >
                        <h3 className="font-bold text-sm text-gray-800">{tour.name}</h3>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <MapPin size={12} /> {tour.points?.length || 0} điểm dừng
                        </p>
                    </div>
                ))}
            </div>

            {/* BẢN ĐỒ - Bên phải */}
            <div className="flex-1 relative">
                {/* Overlay khi chưa chọn tour */}
                {!selectedTour && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-50/80">
                        <div className="text-center text-gray-400">
                            <Navigation size={48} className="mx-auto mb-3 opacity-30" />
                            <p className="font-medium">Chọn một tour để xem lộ trình</p>
                        </div>
                    </div>
                )}

                {/* Hint click */}
                {selectedTour && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-black/60 text-white text-xs px-3 py-1 rounded-full pointer-events-none">
                        Click trên bản đồ để di chuyển vị trí của bạn
                    </div>
                )}

                <MapContainer center={[10.7589, 106.7076]} zoom={13} className="h-full w-full">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                    <MapClickHandler onMapClick={(loc) => setUserLoc(loc)} />

                    {/* Fit map vào các điểm khi đổi tour */}
                    {validPoints.length > 0 && <FitBounds points={validPoints} tourId={selectedTour?.id} />}

                    {/* Pan camera theo user khi click */}
                    <PanToUser userLoc={userLoc} />

                    {/* Vị trí tourist */}
                    {userLoc && (
                        <Marker
                            position={[userLoc.lat, userLoc.lng]}
                            icon={L.divIcon({
                                className: "",
                                html: `<div style="position:relative;width:20px;height:20px">
                                    <div style="position:absolute;inset:-4px;background:rgba(59,130,246,0.3);border-radius:50%;animation:ping 1s infinite"></div>
                                    <div style="background:#2563eb;width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);margin:2px"></div>
                                </div>`,
                                iconSize: [20, 20],
                                iconAnchor: [10, 10]
                            })}
                        />
                    )}

                    {/* Đường đi thực tế (OSRM) */}
                    {routeCoords.length > 1 && (
                        <Polyline positions={routeCoords} color="#f97316" weight={4} />
                    )}

                    {/* Marker và vòng audio từng điểm */}
                    {validPoints.map((point, index) => (
                        <React.Fragment key={point.poi_id}>
                            <Marker
                                position={[point.latitude, point.longitude]}
                                icon={L.divIcon({
                                    className: "",
                                    html: `<div style="background:#f97316;color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${index + 1}</div>`,
                                    iconSize: [28, 28],
                                    iconAnchor: [14, 14]
                                })}
                            >
                                <Popup><b>#{index + 1} {point.name || `Điểm ${index + 1}`}</b></Popup>
                            </Marker>
                            <Circle
                                center={[point.latitude, point.longitude]}
                                radius={point.audio_range || 30}
                                pathOptions={{ color: "#f97316", fillColor: "#f97316", fillOpacity: 0.1, weight: 1 }}
                            />
                        </React.Fragment>
                    ))}
                </MapContainer>

                {/* Thanh thông tin tour bên dưới */}
                {selectedTour && (
                    <div className="absolute bottom-4 left-4 right-4 bg-white rounded-2xl shadow-xl p-4 z-[1000] text-gray-800">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-sm text-gray-800">{selectedTour.name}</h3>
                            {routeInfo && (
                                <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-1 text-xs font-bold text-blue-600">
                                        <Ruler size={12} /> {routeInfo.distance_km} km
                                    </span>
                                    <span className="flex items-center gap-1 text-xs font-bold text-purple-600">
                                        <Clock size={12} />
                                        {Math.floor(routeInfo.duration_min / 60) > 0
                                            ? `${Math.floor(routeInfo.duration_min / 60)}h ${routeInfo.duration_min % 60}p`
                                            : `${routeInfo.duration_min} phút`}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {selectedTour.points.map((point, index) => (
                                <div key={point.poi_id} className="flex items-center gap-1 shrink-0 bg-orange-50 rounded-full px-3 py-1">
                                    <span className="w-5 h-5 bg-orange-500 text-white rounded-full text-xs flex items-center justify-center font-bold">{index + 1}</span>
                                    <span className="text-xs font-medium text-gray-700">{point.name || `Điểm ${index + 1}`}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TouristTours;
