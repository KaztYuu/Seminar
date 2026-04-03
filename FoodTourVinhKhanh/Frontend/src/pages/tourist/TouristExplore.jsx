import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Volume2, Navigation, MapPin, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../utils/api';

// Common Components
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import SearchBar from '../../components/common/SearchBar';
import FullPageLoading from '../../components/common/FullPageLoading';

// --- HÀM HỖ TRỢ ĐIỀU KHIỂN BẢN ĐỒ ---
const RecenterAutomatically = ({ lat, lng }) => {
    const map = useMap();
    // Sử dụng useRef để lưu trạng thái đã bay về vị trí hay chưa
    const hasCentered = useRef(false);

    useEffect(() => {
        // Chỉ thực hiện flyTo nếu có vị trí VÀ chưa từng centered lần nào
        if (lat && lng && !hasCentered.current) {
            map.flyTo([lat, lng], 16, { animate: true });
            hasCentered.current = true; // Đánh dấu là đã thực hiện xong
        }
    }, [lat, lng]); // Vẫn lắng nghe lat/lng nhưng bị chặn bởi ref

    return null;
};

const TouristExplore = () => {
    const [pois, setPois] = useState([]);
    const [nearbyPois, setNearbyPois] = useState([]);
    const [userLoc, setUserLoc] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedPoi, setSelectedPoi] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const audioRef = useRef(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    // 1. Theo dõi vị trí và tải dữ liệu ban đầu
    useEffect(() => {
        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                setUserLoc({ lat: latitude, lng: longitude });
            },
            () => toast.error("Vui lòng bật định vị để trải nghiệm tốt nhất"),
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );

        fetchPois();

        const handleLangChange = () => {
            fetchPois();
            setNearbyPois([])
            setIsExpanded(false)
        };

        window.addEventListener('languageChange', handleLangChange);

        return () => {
            navigator.geolocation.clearWatch(watchId);
            window.removeEventListener('languageChange', handleLangChange);
        };
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
        setNearbyPois([])
        setIsExpanded(false)
        fetchPois(value);
    };

    const handleViewDetail = async (poiId) => {
        setLoading(true);
        try {
            const res = await api.get(`/pois/get-poi-by-id/${poiId}`);
            setSelectedPoi(res.data.data);
            setIsModalOpen(true);
        } catch (err) {
            toast.error("Không thể tải thông tin");
        } finally {
            setLoading(false);
        }
    };

    const addToNearby = (poi) => {
        setNearbyPois(prev => {
            const isExisted = prev.find(p => p.id === poi.id);

            const updatedList = [
                poi, 
                ...prev.filter(p => p.id !== poi.id)
            ];

            // if (!isExisted) {
            //     toast.success(`Khám phá mới: ${poi.name}`, { icon: '📍' });
            // }

            return updatedList;
        });

        // Luôn mở rộng thanh danh sách khi người dùng tương tác
        setIsExpanded(true);
    };

    const playAudio = (url) => {
        if (audioRef.current && url) {
            audioRef.current.src = `${API_URL}${url}`;
            audioRef.current.play();
        }
    };

    return (
            <div className="fixed inset-0 md:ml-64 ml-0 pt-16 bg-white z-10 overflow-hidden flex flex-col">
                {loading && <FullPageLoading />}
                <audio ref={audioRef} hidden />

                {/* THANH TÌM KIẾM NỔI */}
                <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-lg px-4">
                    <Card className="!p-0 border-none shadow-2xl"> 
                        <SearchBar 
                            placeholder="Bạn muốn đi đâu hôm nay?" 
                            onSearch={handleSearch}
                            className="w-full text-black"
                        />
                    </Card>
                </div>

                {/* BẢN ĐỒ */}
                <div className="flex-1 w-full h-full relative z-0">
                    <MapContainer 
                        center={[10.7589, 106.7076]} 
                        zoom={15}
                        maxZoom={18}
                        className="h-full w-full"
                    >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        
                        {userLoc && <RecenterAutomatically lat={userLoc.lat} lng={userLoc.lng} />}

                        {userLoc && (
                            <Marker 
                                position={[userLoc.lat, userLoc.lng]} 
                                icon={L.divIcon({
                                className: 'user-marker',
                                html: `
                                    <div class="relative">
                                    <div class="absolute -inset-2 bg-blue-500/30 rounded-full animate-ping"></div>
                                    <div class="relative bg-blue-600 w-4 h-4 rounded-full border-2 border-white shadow-lg"></div>
                                    </div>
                                `,
                                iconSize: [20, 20]
                                })}
                            />
                        )}

                        {pois.map(poi => (
                            <Marker 
                                key={poi.id} 
                                position={[poi.latitude, poi.longitude]}
                                eventHandlers={{ click: () => addToNearby(poi) }}
                            />
                        ))}
                    </MapContainer>
                </div>

                {/* DANH SÁCH PHÍA DƯỚI - BỊ ẨN NẾU nearbyPois.length === 0 */}
                {nearbyPois.length > 0 && (
                    <div 
                        className={`absolute bottom-0 left-0 right-0 bg-orange-50/90 backdrop-blur-xl border-t border-gray-100 z-[100] shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom duration-500 transition-all ease-in-out ${
                            isExpanded ? "h-[270px]" : "h-[25px]"
                        }`}
                    >
                        {/* Handle bar - Click vào đây để kéo lên/xuống */}
                        <div 
                            className="w-full py-3 cursor-pointer hover:bg-gray-200 flex flex-col items-center"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            <div className="w-12 h-1.5 bg-gray-300 rounded-full mb-2" />
                            <div className="flex items-center gap-2">
                                <Navigation size={14} className="text-blue-600" />
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                                    Địa điểm khám phá ({nearbyPois.length})
                                </span>
                                {isExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronUp size={14} className="text-gray-400" />}
                            </div>
                        </div>

                        {/* Nội dung danh sách - Chỉ hiện đầy đủ khi mở rộng */}
                        <div className={`max-w-7xl mx-auto px-4 transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                            <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar">
                                {nearbyPois.map(poi => (
                                    <div 
                                        key={poi.id} 
                                        className="flex-shrink-0 w-44 bg-white rounded-sm border border-gray-100 p-2 mt-2 flex flex-col gap-2 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                                        onClick={() => handleViewDetail(poi.id)}
                                    >
                                        <div className="relative overflow-hidden rounded-xl w-full h-28">
                                            <img 
                                                src={`${API_URL}${poi.thumbnail}`} 
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                                alt={poi.name} 
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <h4 className="font-bold text-gray-900 text-xs line-clamp-1 group-hover:text-blue-600 transition-colors">
                                                {poi.name}
                                            </h4>
                                            <div className="flex justify-between items-center">
                                                <p className="text-[10px] text-gray-400 flex items-center gap-1">
                                                    <MapPin size={10} /> {poi.range_meter}m
                                                </p>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="!p-1.5 rounded-full border-blue-50 h-7 w-15"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        playAudio(poi.audio_url);
                                                    }}
                                                >
                                                    <Volume2 size={14} className="text-blue-600" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            {/* MODAL CHI TIẾT */}
            <Modal 
                isOpen={isModalOpen}    
                onClose={() => setIsModalOpen(false)}
                showCloseButton={false}
                extraClasses="!max-w-4xl h-[95vh] !p-0 overflow-hidden !rounded-[10px]"
            >
                {selectedPoi && (
                    <div className="flex flex-col bg-white">
                        <div className="relative h-[280px] w-full group">
                            <img src={`${API_URL}${selectedPoi.banner}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                            <div className="absolute bottom-6 left-8 right-8">
                                <h2 className="text-3xl font-black text-white uppercase tracking-tight leading-none">
                                    {selectedPoi.name}
                                </h2>
                            </div>
                        </div>
                        <div className="p-10 lg:p-12">
                            <div className="flex items-center gap-2 mb-6 text-blue-600 font-bold text-sm tracking-wide">
                                <div className="w-8 h-[2px] bg-blue-600" />
                                GIỚI THIỆU CHI TIẾT
                            </div>
                            
                            <div className="prose prose-blue max-w-none">
                                <p className="text-gray-700 leading-[1.8] text-xl font-medium text-justify first-letter:text-5xl first-letter:font-black first-letter:mr-3 first-letter:float-left first-letter:text-blue-600">
                                    {selectedPoi.description}
                                </p>
                            </div>

                            {/* Bottom Decor */}
                            <div className="mt-25 pt-5 border-t border-gray-100 flex items-center justify-between">
                                <p className="text-xs text-gray-400 italic">© Khám phá ẩm thực Vĩnh Khánh</p>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default TouristExplore;