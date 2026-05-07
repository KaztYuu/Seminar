import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Circle,
    MapContainer,
    Marker,
    TileLayer,
    useMap,
    useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Globe,
    MapPin,
    Pause,
    Play,
    Volume2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import Button from "../../components/common/Button";
import FullPageLoading from "../../components/common/FullPageLoading";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

const DEFAULT_CENTER = [10.7589, 106.7076];
const LANGUAGE_OPTIONS = [
    { code: "vi", label: "VI" },
    { code: "en", label: "EN" },
    { code: "fr", label: "FR" },
    { code: "kr", label: "KR" },
];

const RecenterAutomatically = ({ lat, lng }) => {
    const map = useMap();
    const hasCentered = useRef(false);

    useEffect(() => {
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || hasCentered.current) {
            return;
        }

        map.setView([lat, lng], map.getZoom(), { animate: true });
        hasCentered.current = true;
    }, [lat, lng, map]);

    return null;
};

const FocusSelectedPoi = ({ poi }) => {
    const map = useMap();

    useEffect(() => {
        if (!poi) {
            return;
        }

        map.setView([poi.latitude, poi.longitude], 17, { animate: true });
    }, [map, poi]);

    return null;
};

const ClearSelectionOnMapClick = ({ onClear }) => {
    useMapEvents({
        click() {
            onClear();
        },
    });

    return null;
};

const normalizePoi = (poi) => {
    const latitude = Number(poi?.latitude);
    const longitude = Number(poi?.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
    }

    return {
        ...poi,
        latitude,
        longitude,
        audio_range: Number(poi?.audio_range) || 0,
        access_range: Number(poi?.access_range) || 10,
        address:
            poi?.address ||
            `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        poi_type: poi?.poi_type || poi?.type || "POI",
    };
};

const TouristMapPublic = () => {
    const navigate = useNavigate();
    const [pois, setPois] = useState([]);
    const [userLoc, setUserLoc] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedPoi, setSelectedPoi] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);
    const [currentLang, setCurrentLang] = useState(
        (localStorage.getItem("language") || "vi").toLowerCase(),
    );
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const audioRef = useRef(null);

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

    const getDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const normalizedPois = useMemo(() => {
        if (!Array.isArray(pois)) {
            return [];
        }

        return pois.map(normalizePoi).filter(Boolean);
    }, [pois]);

    useEffect(() => {
        fetchPois();

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setUserLoc({ lat: latitude, lng: longitude });
                },
                () => {
                    setUserLoc(null);
                },
            );
        }

        const handleLangChange = () => {
            const nextLang = (localStorage.getItem("language") || "vi").toLowerCase();
            setCurrentLang(nextLang);
            fetchPois();
        };

        window.addEventListener("languageChange", handleLangChange);

        return () => {
            window.removeEventListener("languageChange", handleLangChange);
        };
    }, []);

    const relatedPois = useMemo(() => {
        if (!selectedPoi) {
            return normalizedPois;
        }

        return normalizedPois.filter((poi) => {
            if (poi.id === selectedPoi.id) {
                return false;
            }

            const distance = getDistance(
                selectedPoi.latitude,
                selectedPoi.longitude,
                poi.latitude,
                poi.longitude,
            );

            return distance <= selectedPoi.access_range;
        });
    }, [normalizedPois, selectedPoi]);

    const drawerTitle = selectedPoi
        ? `POI gần ${selectedPoi.name || "địa điểm đã chọn"}`
        : "Tất cả địa điểm";

    const hasNearbyPois = selectedPoi ? relatedPois.length > 0 : normalizedPois.length > 0;

    useEffect(() => {
        if (!selectedPoi) {
            return;
        }

        setIsSidebarOpen(true);
        setIsDrawerExpanded(relatedPois.length > 0);
    }, [relatedPois.length, selectedPoi]);

    useEffect(() => {
        if (!audioRef.current) {
            return undefined;
        }

        const audioElement = audioRef.current;
        const handlePlay = () => setIsAudioPlaying(true);
        const handlePause = () => setIsAudioPlaying(false);
        const handleEnded = () => setIsAudioPlaying(false);

        audioElement.addEventListener("play", handlePlay);
        audioElement.addEventListener("pause", handlePause);
        audioElement.addEventListener("ended", handleEnded);

        return () => {
            audioElement.removeEventListener("play", handlePlay);
            audioElement.removeEventListener("pause", handlePause);
            audioElement.removeEventListener("ended", handleEnded);
        };
    }, []);

    const playAudio = async (url) => {
        if (!audioRef.current || !url) {
            return;
        }

        try {
            audioRef.current.src = `${API_URL}${url}`;
            await audioRef.current.play();
        } catch (error) {
            console.warn("Autoplay blocked:", error);
        }
    };

    const toggleAudioPlayback = async () => {
        if (!audioRef.current || !selectedPoi?.audio_url) {
            return;
        }

        if (isAudioPlaying) {
            audioRef.current.pause();
            return;
        }

        if (audioRef.current.src !== `${API_URL}${selectedPoi.audio_url}`) {
            audioRef.current.src = `${API_URL}${selectedPoi.audio_url}`;
        }

        try {
            await audioRef.current.play();
        } catch (error) {
            console.warn("Autoplay blocked:", error);
        }
    };

    const fetchPois = async () => {
        setLoading(true);

        try {
            const res = await api.get("/pois/get-pois");
            const data = res?.data?.data;
            const safePois = Array.isArray(data) ? data : [];

            setPois(safePois);
            setSelectedPoi((prev) => {
                const nextSelected = safePois
                    .map(normalizePoi)
                    .filter(Boolean)
                    .find((poi) => poi.id === prev?.id);

                return nextSelected || null;
            });
        } catch (error) {
            console.error(error);
            setPois([]);
            setSelectedPoi(null);
            toast.error("Không thể tải danh sách địa điểm");
        } finally {
            setLoading(false);
        }
    };

    const handleLanguageToggle = (languageCode) => {
        const nextLang = languageCode.toLowerCase();
        if (nextLang === currentLang) {
            return;
        }

        localStorage.setItem("language", nextLang);
        setCurrentLang(nextLang);
        window.dispatchEvent(new Event("languageChange"));
    };

    const handleSelectPoi = (poi) => {
        setSelectedPoi(poi);
        setIsSidebarOpen(true);
    };

    const handleClearSelection = () => {
        if (audioRef.current) {
            audioRef.current.pause();
        }

        setSelectedPoi(null);
        setIsSidebarOpen(false);
    };

    return (
        <div className="fixed inset-0 bg-white overflow-hidden">
            {loading && <FullPageLoading />}
            <audio ref={audioRef} hidden />

            <div className="relative h-full w-full bg-slate-100">
                <div className="absolute right-4 top-4 z-[1100] md:right-6 md:top-6">
                    <Button
                        variant="outline"
                        size="sm"
                        className="bg-white/95 shadow-lg backdrop-blur-sm"
                        onClick={() => navigate("/login")}
                    >
                        Quay lại đăng nhập
                    </Button>
                </div>

                {selectedPoi && (
                    <button
                        type="button"
                        aria-label={isSidebarOpen ? "Thu gọn sidebar" : "Mở sidebar"}
                        title={isSidebarOpen ? "Thu gọn sidebar" : "Mở sidebar"}
                        className={`absolute z-[1200] hidden items-center justify-center border border-slate-300 bg-white text-slate-700 shadow-xl ring-1 ring-black/5 transition-all duration-300 hover:bg-slate-50 hover:text-slate-900 md:flex ${
                            isSidebarOpen
                                ? "left-[360px] top-1/2 h-20 w-10 -translate-y-1/2 rounded-r-2xl border-l-0"
                                : "left-0 top-1/2 h-20 w-10 -translate-y-1/2 rounded-r-2xl"
                        }`}
                        onClick={() => setIsSidebarOpen((prev) => !prev)}
                    >
                        {isSidebarOpen ? (
                            <ChevronLeft size={20} strokeWidth={2.75} />
                        ) : (
                            <ChevronRight size={20} strokeWidth={2.75} />
                        )}
                    </button>
                )}

                <aside
                    className={`absolute inset-x-0 top-0 z-[1000] h-[44vh] border-b border-slate-200 bg-white transition-transform duration-300 md:inset-y-0 md:left-0 md:h-full md:w-[360px] md:border-b-0 md:border-r ${
                        selectedPoi && isSidebarOpen
                            ? "translate-y-0 md:translate-x-0"
                            : "-translate-y-full md:-translate-x-full md:translate-y-0"
                    }`}
                >
                    {selectedPoi && (
                        <div className="flex h-full flex-col">
                            <div className="border-b border-slate-200 px-5 py-4">
                                <div className="flex items-start gap-3">
                                    <div className="min-w-0 flex-1">
                                        <h2 className="truncate text-[24px] font-semibold leading-tight text-slate-900">
                                            {selectedPoi.name}
                                        </h2>
                                        <p className="mt-2 text-sm text-slate-500">
                                            {selectedPoi.poi_type}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-5 py-5">
                                <div className="space-y-5">
                                    <div className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
                                        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">
                                            <div className="h-[2px] w-5 bg-cyan-700" />
                                            Mô tả
                                        </div>
                                        <p className="text-[15px] leading-7 text-slate-700">
                                            {selectedPoi.description ||
                                                "Địa điểm này hiện chưa có mô tả chi tiết."}
                                        </p>
                                    </div>

                                    <div className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                                                <MapPin size={20} />
                                            </div>
                                            <div>
                                                <p className="text-base font-semibold text-slate-900">
                                                    Địa chỉ
                                                </p>
                                                <p className="mt-2 text-[15px] leading-7 text-slate-600">
                                                    {selectedPoi.address}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
                                        <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">
                                            <Globe size={14} />
                                            Ngôn ngữ hiển thị
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {LANGUAGE_OPTIONS.map((language) => (
                                                <button
                                                    key={language.code}
                                                    type="button"
                                                    className={`rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                                                        currentLang === language.code
                                                            ? "border-cyan-700 bg-cyan-700 text-white"
                                                            : "border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:text-cyan-700"
                                                    }`}
                                                    onClick={() =>
                                                        handleLanguageToggle(language.code)
                                                    }
                                                >
                                                    {language.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {relatedPois.length === 0 && (
                                        <div className="rounded-3xl border border-dashed border-cyan-200 bg-cyan-50/70 px-5 py-4 text-sm leading-7 text-cyan-800">
                                            Không có POI nào nằm trong `access_range` của địa điểm
                                            này, nên thanh dưới sẽ ưu tiên giữ phần info ở sidebar.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="border-t border-slate-200 bg-white px-5 py-4">
                                <div className="flex items-center gap-3">
                                    <Button
                                        className="flex-1"
                                        onClick={() => playAudio(selectedPoi.audio_url)}
                                    >
                                        <Volume2 size={16} className="mr-2" />
                                        Thuyết minh
                                    </Button>

                                    <Button
                                        variant="outline"
                                        className="min-w-[128px] bg-white"
                                        onClick={toggleAudioPlayback}
                                    >
                                        {isAudioPlaying ? (
                                            <Pause size={16} className="mr-2" />
                                        ) : (
                                            <Play size={16} className="mr-2" />
                                        )}
                                        {isAudioPlaying ? "Tạm dừng" : "Phát audio"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </aside>

                <div
                    className={`h-full transition-[padding,margin] duration-300 ${
                        selectedPoi && isSidebarOpen
                            ? "pt-[44vh] md:ml-[360px] md:pt-0"
                            : "pt-0 md:ml-0"
                    }`}
                >
                    <MapContainer
                        center={DEFAULT_CENTER}
                        zoom={15}
                        maxZoom={18}
                        className="h-full w-full z-0"
                    >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                        {userLoc && (
                            <RecenterAutomatically lat={userLoc.lat} lng={userLoc.lng} />
                        )}

                        {selectedPoi && <FocusSelectedPoi poi={selectedPoi} />}
                        <ClearSelectionOnMapClick onClear={handleClearSelection} />

                        {userLoc && (
                            <Marker
                                position={[userLoc.lat, userLoc.lng]}
                                icon={L.divIcon({
                                    className: "user-marker",
                                    html: `
                                        <div class="relative">
                                            <div class="absolute -inset-2 bg-blue-500/30 rounded-full animate-ping"></div>
                                            <div class="relative bg-blue-600 w-4 h-4 rounded-full border-2 border-white shadow-lg"></div>
                                        </div>
                                    `,
                                    iconSize: [20, 20],
                                })}
                            />
                        )}

                        {normalizedPois.map((poi) => (
                            <React.Fragment key={poi.id}>
                                <Marker
                                    position={[poi.latitude, poi.longitude]}
                                    eventHandlers={{
                                        click: () => handleSelectPoi(poi),
                                    }}
                                />

                                {poi.audio_range > 0 && (
                                    <Circle
                                        center={[poi.latitude, poi.longitude]}
                                        radius={poi.audio_range}
                                        pathOptions={{
                                            color: "#f59e0b",
                                            fillColor: "#fcd34d",
                                            fillOpacity: selectedPoi?.id === poi.id ? 0.15 : 0.08,
                                        }}
                                    />
                                )}

                                <Circle
                                    center={[poi.latitude, poi.longitude]}
                                    radius={poi.access_range}
                                    pathOptions={{
                                        color:
                                            selectedPoi?.id === poi.id ? "#1d4ed8" : "#3b82f6",
                                        fillColor: "#93c5fd",
                                        fillOpacity: selectedPoi?.id === poi.id ? 0.28 : 0.16,
                                        dashArray: "5, 10",
                                    }}
                                />
                            </React.Fragment>
                        ))}
                    </MapContainer>
                </div>

                <div
                    className={`pointer-events-none absolute bottom-0 left-0 right-0 z-[1000] transition-[left] duration-300 ${
                        selectedPoi && isSidebarOpen ? "md:left-[360px]" : "md:left-0"
                    }`}
                >
                    <div
                        className={`pointer-events-auto mx-2 mb-2 overflow-hidden rounded-t-[28px] border border-slate-200 bg-white/95 shadow-[0_-18px_40px_-22px_rgba(15,23,42,0.45)] backdrop-blur-md transition-all duration-300 md:mx-4 ${
                            isDrawerExpanded ? "h-[295px]" : "h-[66px]"
                        }`}
                    >
                        <button
                            type="button"
                            className="flex w-full items-center justify-between px-4 py-3 text-left"
                            onClick={() => setIsDrawerExpanded((prev) => !prev)}
                        >
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600">
                                    Danh sách POI
                                </p>
                                <div className="mt-1 flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-900">
                                        {drawerTitle}
                                    </span>
                                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">
                                        {selectedPoi ? relatedPois.length : normalizedPois.length}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">
                                    {selectedPoi
                                        ? "Đang lọc theo access_range của POI được chọn."
                                        : "Chưa chọn POI nào, danh sách dưới đang chứa toàn bộ POI."}
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                {!hasNearbyPois && selectedPoi && (
                                    <span className="hidden rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-600 sm:inline-flex">
                                        Không có POI lân cận
                                    </span>
                                )}

                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                    {isDrawerExpanded ? (
                                        <ChevronDown size={16} />
                                    ) : (
                                        <ChevronUp size={16} />
                                    )}
                                </div>
                            </div>
                        </button>

                        <div
                            className={`h-[229px] overflow-y-auto border-t border-slate-100 px-3 py-3 transition-opacity duration-200 ${
                                isDrawerExpanded ? "opacity-100" : "opacity-0"
                            }`}
                        >
                            {selectedPoi && relatedPois.length === 0 ? (
                                <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 text-center text-sm text-slate-500">
                                    Không tìm thấy POI nào nằm trong phạm vi `access_range` của
                                    địa điểm này. Hãy xem chi tiết ở sidebar bên trái.
                                </div>
                            ) : (
                                <div className="flex gap-4 overflow-x-auto pb-3">
                                    {(selectedPoi ? relatedPois : normalizedPois).map((poi) => (
                                        <div
                                            key={poi.id}
                                            className={`w-72 shrink-0 cursor-pointer overflow-hidden rounded-[24px] border bg-white transition-all ${
                                                selectedPoi?.id === poi.id
                                                    ? "border-blue-500 shadow-lg shadow-blue-100"
                                                    : "border-slate-100 hover:border-blue-200 hover:shadow-md"
                                            }`}
                                            onClick={() => handleSelectPoi(poi)}
                                        >
                                            <div className="flex h-full gap-3 p-3">
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="line-clamp-2 text-sm font-bold text-slate-900">
                                                        {poi.name}
                                                    </h3>
                                                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                                                        {poi.description ||
                                                            "Địa điểm này hiện chưa có mô tả."}
                                                    </p>

                                                    <div className="mt-3 flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                                            <MapPin size={12} />
                                                            <span>Access {poi.access_range}m</span>
                                                        </div>

                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="!px-2.5"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                playAudio(poi.audio_url);
                                                            }}
                                                        >
                                                            <Volume2 size={14} />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TouristMapPublic;
