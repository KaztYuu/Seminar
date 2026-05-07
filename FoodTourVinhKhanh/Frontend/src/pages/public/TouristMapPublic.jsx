import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Search, ChevronUp, ChevronDown, X, Volume2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../utils/api';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import SearchBar from '../../components/common/SearchBar';
import FullPageLoading from '../../components/common/FullPageLoading';

const RecenterAutomatically = ({ lat, lng }) => {
    const map = useMap();
    const hasCentered = useRef(false);

    useEffect(() => {
        if (lat && lng && !hasCentered.current) {
            map.panTo([lat, lng], 16, { animate: true });
            hasCentered.current = true;
        }
    }, [lat, lng]);

    return null;
};

const TouristMapPublic = () => {
    const [pois, setPois] = useState([]);
    const [nearbyPois, setNearbyPois] = useState([]);
    const [userLoc, setUserLoc] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedPoi, setSelectedPoi] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const audioRef = useRef(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    const getDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    useEffect(() => {
        fetchPois();

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                setUserLoc({ lat: latitude, lng: longitude });
            }
        );
    }, []);

    const poisInAccessRange = useMemo(() => {
        if (!userLoc || pois.length === 0) return [];
        return pois.filter(poi => {
            const dist = getDistance(userLoc.lat, userLoc.lng, poi.latitude, poi.longitude);
            return dist <= (poi.access_range || 10);
        });
    }, [userLoc, pois]);

    useEffect(() => {
        if (poisInAccessRange.length > 0) {
            setNearbyPois(prev => {
                const newOnes = poisInAccessRange.filter(
                    p => !prev.some(existing => existing.id === p.id)
                );
                if (newOnes.length > 0) {
                    setIsExpanded(true);
                    return [...newOnes, ...prev];
                }
                return prev;
            });
        }
    }, [poisInAccessRange]);

    const playAudio = async (url) => {
        if (audioRef.current && url) {
            try {
                audioRef.current.src = `${API_URL}${url}`;
                await audioRef.current.play();
            } catch (error) {
                console.warn("Autoplay blocked:", error);
            }
        }
    };

    const fetchPois = async (searchTxt = "") => {
        setLoading(true);
        try {
            const res = await api.get(`/pois/get-pois?search=${searchTxt}`);
            if (res.data.success) setPois(res.data.data);
        } catch (error) {
            console.error(error);
            toast.error("Không thể tải danh sách địa điểm");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (value) => {
        setNearbyPois([]);
        setIsExpanded(false);
        fetchPois(value);
    };

    const handleViewDetail = (poi) => {
        setSelectedPoi(poi);
        setIsModalOpen(true);
    };

    const addToNearby = (poi) => {
        setNearbyPois(prev => {
            const updatedList = [poi, ...prev.filter(p => p.id !== poi.id)];
            return updatedList;
        });
        setIsExpanded(true);
    };

    return (
        <div className="fixed inset-0 pt-16 bg-white z-10 overflow-hidden flex flex-col">
            {loading && <FullPageLoading />}
            <audio ref={audioRef} hidden />

            {/* SEARCH BAR */}
            <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-lg px-4">
                <div className='flex items-center w-full space-x-2'>
                    <Card className="flex-1 !p-0 border rounded-lg shadow-2xl">
                        <SearchBar
                            placeholder="Bạn muốn đi đâu hôm nay?"
                            onSearch={handleSearch}
                            className="w-full text-black"
                        />
                    </Card>
                </div>
            </div>

            {/* MAP */}
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
                        <React.Fragment key={poi.id}>
                            <Marker
                                position={[poi.latitude, poi.longitude]}
                                eventHandlers={{ click: () => addToNearby(poi) }}
                            />
                            <Circle
                                center={[poi.latitude, poi.longitude]}
                                radius={poi.audio_range}
                            />
                            <Circle
                                center={[poi.latitude, poi.longitude]}
                                radius={poi.access_range || 10}
                                pathOptions={{
                                    color: '#3b82f6',
                                    fillColor: '#93c5fd',
                                    fillOpacity: 0.2,
                                    dashArray: '5, 10'
                                }}
                            />
                        </React.Fragment>
                    ))}
                </MapContainer>
            </div>

            {/* NEARBY LIST */}
            {nearbyPois.length > 0 && (
                <div
                    className={`absolute bottom-0 left-0 right-0 bg-orange-50/90 backdrop-blur-xl border-t border-gray-100 z-[100] shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom duration-500 transition-all ease-in-out ${
                        isExpanded ? "h-[270px]" : "h-[25px]"
                    }`}
                >
                    <div
                        className="w-full py-3 cursor-pointer hover:bg-gray-200 flex flex-col items-center"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <div className="w-12 h-1.5 bg-gray-300 rounded-full mb-2" />
                        <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-blue-600" />
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                                Địa điểm khám phá ({nearbyPois.length})
                            </span>
                            {isExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronUp size={14} className="text-gray-400" />}
                        </div>
                    </div>

                    <div className={`max-w-7xl mx-auto px-4 transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                        <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar">
                            {nearbyPois.map(poi => (
                                <div
                                    key={poi.id}
                                    className="relative flex-shrink-0 w-44 bg-white rounded-sm border border-gray-100 p-2 mt-2 flex flex-col gap-2 shadow-sm hover:shadow-md transition-all cursor-pointer group/item"
                                    onClick={() => handleViewDetail(poi)}
                                >
                                    <div className="absolute top-1 right-1 z-10 mt-1 opacity-80 group-hover/item:opacity-100 transition-opacity">
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            className="!p-1 !rounded-full w-6 h-6 shadow-sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setNearbyPois(prev => prev.filter(item => item.id !== poi.id));
                                            }}
                                        >
                                            <X size={12} strokeWidth={3} />
                                        </Button>
                                    </div>

                                    <div className="relative overflow-hidden rounded-xl w-full h-28 mt-1">
                                        <img
                                            src={`${API_URL}${poi.thumbnail}`}
                                            className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500"
                                            alt={poi.name}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <h4 className="font-bold text-gray-900 text-xs line-clamp-1 group-hover/item:text-blue-600 transition-colors">
                                            {poi.name}
                                        </h4>
                                        <div className="flex justify-between items-center">
                                            <p className="text-[10px] text-gray-400 flex items-center gap-1">
                                                <MapPin size={10} /> {poi.audio_range}m
                                            </p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="!p-1.5 !rounded-full border-gray-100 hover:border-blue-500 h-8 w-8"
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

            {/* POI DETAIL MODAL - VIEW ONLY */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                showCloseButton={true}
                extraClasses="!max-w-2xl h-auto max-h-[90vh] !p-6"
            >
                {selectedPoi && (
                    <div className="flex flex-col">
                        <div className="relative h-[200px] w-full shrink-0 -mx-6 -mt-6 rounded-t-2xl overflow-hidden">
                            <img src={`${API_URL}${selectedPoi.banner}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                            <h2 className="absolute bottom-6 left-6 text-2xl font-black text-white uppercase">
                                {selectedPoi.name}
                            </h2>
                        </div>

                        <div className="mt-6">
                            <div className="flex items-center gap-2 mb-4 text-blue-600 font-bold text-xs uppercase">
                                <div className="w-6 h-[2px] bg-blue-600" /> Giới thiệu
                            </div>
                            <p className="text-gray-600 mb-3 leading-relaxed text-justify">
                                {selectedPoi.description}
                            </p>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default TouristMapPublic;
