import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
  ZoomControl,
  Polyline,
  Popup,
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
  Volume2,
  Languages,
  ArrowRightLeft,
  X,
} from "lucide-react";

import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import Button from "../../components/common/Button";
import FullPageLoading from "../../components/common/FullPageLoading";
<<<<<<< Updated upstream
=======
import { QRCodeCanvas } from "qrcode.react";
>>>>>>> Stashed changes

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER = [10.7589, 106.7076];

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

  // normalize tour_id (nếu API trả về field khác nhau)
  const tourId =
    poi?.tour_id ?? poi?.tourId ?? poi?.tour?.id ?? poi?.tour?.tour_id ?? null;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    ...poi,
    latitude,
    longitude,

    audio_range: Number(poi?.audio_range) || 0,
    access_range: Number(poi?.access_range) || 10,
    address: poi?.address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
    original_description: poi.original_description || poi.description || "",
    original_language: poi.original_language || poi.language || "vi",

    // dùng thống nhất ở UI
    tour_id: tourId,
  };
};

const TouristMapPublic = () => {
  const navigate = useNavigate();
  const [pois, setPois] = useState([]);
  const [userLoc, setUserLoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeNarrationLanguage, setActiveNarrationLanguage] = useState("vi");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [playingSource, setPlayingSource] = useState(null);

  const sidebarAudioRef = useRef(null);
  const sourceAudioRef = useRef(null);
  const translatedAudioRef = useRef(null);
  const [translatedText, setTranslatedText] = useState("");
  const [targetLanguage, setTargetLanguage] = useState(null);
  const TRANSLATE_LANGUAGES = [
    { code: "en", label: "EN" },
    { code: "ko", label: "KR" },
    { code: "fr", label: "FR" },
  ];
  const [isTranslateModalOpen, setIsTranslateModalOpen] = useState(false);

  const [isTranslating, setIsTranslating] = useState(false);

  // Tour dropdown (tourist-map)
  const [tours, setTours] = useState([]);
  const [selectedTourId, setSelectedTourId] = useState(null);
  const [tourPoints, setTourPoints] = useState([]);
  const [tourRouteCoords, setTourRouteCoords] = useState([]); // OSRM polyline lat/lng[]

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  useEffect(() => {
    const fetchTours = async () => {
      try {
        console.log("[TouristMapPublic] fetching /tours ...");
        const res = await api.get("/tours/public");
        console.log("[TouristMapPublic] /tours response:", res?.data);

        const payload = res?.data;
        const arr = Array.isArray(payload?.data) ? payload.data : [];

        console.log(
          "[TouristMapPublic] tours payload array length:",
          arr.length,
        );
        if (arr.length > 0) {
          setTours(arr);
        } else {
          // nếu backend trả khác shape thì vẫn log để debug
          console.warn(
            "[TouristMapPublic] no tours array found in /tours payload",
            payload,
          );
          setTours([]);
        }
      } catch (e) {
        console.error("[TouristMapPublic] fetch /tours failed:", e);
        setTours([]);
      }
    };

    fetchTours();
  }, []);

  useEffect(() => {
    if (!selectedTourId) {
      setTourPoints([]);
      setTourRouteCoords([]);
      return;
    }

    const tour = tours.find((t) => t.id === selectedTourId) || null;
    const points = (tour?.points || [])
      .filter(
        (p) => Number.isFinite(p?.latitude) && Number.isFinite(p?.longitude),
      )
      .map((p) => ({
        ...p,
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
      }));

    setTourPoints(points);
    setTourRouteCoords([]);
  }, [selectedTourId, tours]);

  const fetchRoute = async (points, saveToState = true) => {
    try {
      if (!Array.isArray(points) || points.length < 2) {
        return null;
      }

      const coords = points.map((p) => `${p.longitude},${p.latitude}`).join(";");
      const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data?.routes?.length) {
        return null;
      }

      const route = data.routes[0];
      const latlngs = route.geometry?.coordinates?.map((c) => [c[1], c[0]]);

      if (!latlngs || latlngs.length < 2) {
        return null;
      }

      if (saveToState) {
        setTourRouteCoords(latlngs);
      }

      return latlngs;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const validPoints = Array.isArray(tourPoints)
      ? tourPoints.filter(
          (p) => Number.isFinite(p?.latitude) && Number.isFinite(p?.longitude),
        )
      : [];

    if (validPoints.length < 2) {
      setTourRouteCoords([]);
      return;
    }

    let cancelled = false;

    const run = async () => {
      const result = await fetchRoute(validPoints, false);
      if (cancelled) return;

      if (result && result.length > 1) {
        setTourRouteCoords(result);
      } else {
        // fallback: nối thẳng qua các điểm như khi OSRM lỗi
        setTourRouteCoords(validPoints.map((p) => [p.latitude, p.longitude]));
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [tourPoints]);

  const FitBoundsTour = ({ points }) => {
    const map = useMap();

    useEffect(() => {
      if (!points || points.length === 0) return;
      if (points.length === 1) {
        map.setView([points[0].latitude, points[0].longitude], map.getZoom(), {
          animate: true,
        });
        return;
      }
      const bounds = points.map((p) => [p.latitude, p.longitude]);
      map.fitBounds(bounds, { padding: [60, 60] });
    }, [map, points]);

    return null;
  };

  const renderTourMarkers = () => {
    if (!tourPoints || tourPoints.length === 0) return null;

    return tourPoints.map((p, index) => (
      <React.Fragment key={p.poi_id ?? `${p.latitude}-${p.longitude}-${index}`}>
        <Marker
          position={[p.latitude, p.longitude]}
          icon={L.divIcon({
            className: "",
            html: `<div style="background:#f97316;color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">${index + 1}</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          })}>
          <Popup>
            <div className="text-sm">
              <b>
                #{index + 1} {p.name || `Điểm ${index + 1}`}
              </b>
            </div>
          </Popup>
        </Marker>

        {Number.isFinite(p.audio_range) && p.audio_range > 0 && (
          <Circle
            center={[p.latitude, p.longitude]}
            radius={p.audio_range}
            pathOptions={{
              color: "#f97316",
              fillColor: "#f59e0b",
              fillOpacity: 0.08,
            }}
          />
        )}
      </React.Fragment>
    ));
  };

  const normalizedPois = useMemo(() => {
    if (!Array.isArray(pois)) {
      return [];
    }

    return pois.map(normalizePoi).filter(Boolean);
  }, [pois]);

  const filteredPois = useMemo(() => {
    if (!searchKeyword.trim()) {
      return normalizedPois;
    }

    const keyword = searchKeyword.toLowerCase();

    return normalizedPois.filter((poi) =>
      poi.name?.toLowerCase().includes(keyword),
    );
  }, [normalizedPois, searchKeyword]);

  useEffect(() => {
    setTargetLanguage(null);
    setTranslatedText("");
  }, [selectedPoi]);
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
      fetchPois();
    };

    window.addEventListener("languageChange", handleLangChange);

    return () => {
      window.removeEventListener("languageChange", handleLangChange);
    };
  }, []);

  useEffect(() => {
    stopAllAudio();
  }, [selectedPoi?.id]);

  const stopAllAudio = () => {
    [sidebarAudioRef, sourceAudioRef, translatedAudioRef].forEach((ref) => {
      if (ref.current) {
        ref.current.pause();
        ref.current.currentTime = 0;
      }
    });

    setPlayingSource(null);
  };

  // const handlePlayAudio = async ({ source, ref, audioUrl }) => {
  //   if (!ref?.current || !audioUrl) {
  //     return;
  //   }

  //   // nếu đang play chính source này -> pause
  //   if (playingSource === source) {
  //     ref.current.pause();
  //     setPlayingSource(null);
  //     return;
  //   }

  //   // stop toàn bộ audio khác
  //   stopAllAudio();

  //   try {
  //     if (ref.current.src !== audioUrl) {
  //       ref.current.src = audioUrl;
  //     }

  //     await ref.current.play();

  //     setPlayingSource(source);

  //     ref.current.onended = () => {
  //       setPlayingSource(null);
  //     };
  //   } catch (error) {
  //     console.warn(error);
  //     setPlayingSource(null);
  //   }
  // };

  const handleDownloadQr = async () => {
    if (!selectedPoi?.qr_code) {
      return;
    }

    try {
      const imageUrl = `${API_URL}${selectedPoi.qr_code}`;

      const response = await fetch(imageUrl);
      const blob = await response.blob();

      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${selectedPoi.name || "poi"}-qr.png`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error(error);
      toast.error("Không thể tải QR");
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

  const handleSelectPoi = (poi) => {
    const detectedLanguage = poi.original_language || poi.language || "vi";

    setSelectedPoi(poi);
    setActiveNarrationLanguage(detectedLanguage);
    setIsSidebarOpen(true);
    setSearchKeyword(poi.name || "");
  };

  const handleClearSelection = () => {
    stopAllAudio();

    setIsSearchOpen(false);
    setSelectedPoi(null);
    setActiveNarrationLanguage("vi");
    setIsSidebarOpen(false);
  };

  const handleTranslate = async (langCode) => {
    console.log("selectedPoi:", selectedPoi);
    if (!selectedPoi) return;

    const name = selectedPoi.name || "";
    const description =
      selectedPoi.original_description || selectedPoi.description || "";

    // Kiểm tra trước khi gửi
    if (!name.trim() || !description.trim()) {
      toast.error("POI chưa có tên hoặc mô tả để dịch");
      return;
    }

    setTargetLanguage(langCode);
    setTranslatedText("");
    setIsTranslating(true);

    try {
      const res = await api.post(`/pois/suggestions/translate/${langCode}`, {
        name: name.trim(),
        description: description.trim(),
      });

      const data = res?.data?.data;
      setTranslatedText(data?.description || "Không có bản dịch.");
    } catch (err) {
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        "Không thể dịch nội dung";
      toast.error(
        typeof message === "string" ? message : "Không thể dịch nội dung",
      );
      setTranslatedText("");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleTTS = (text, langCode) => {
    if (!text) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang =
      langCode === "ko"
        ? "ko-KR"
        : langCode === "fr"
          ? "fr-FR"
          : langCode === "en"
            ? "en-US"
            : "vi-VN";

    utterance.rate = 0.9;
    utterance.onend = () => setPlayingSource(null);

    setPlayingSource("translated");
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="fixed inset-0 bg-white overflow-hidden">
      {loading && <FullPageLoading />}

      <audio ref={sidebarAudioRef} hidden />
      <audio ref={sourceAudioRef} hidden />
      <audio ref={translatedAudioRef} hidden />

      <div className="relative h-full w-full bg-slate-100">
        <div className="absolute right-4 top-4 z-[1100] md:right-6 md:top-6 flex flex-col items-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-white/95 shadow-lg backdrop-blur-sm"
            onClick={() => navigate("/login")}>
            Quay lại đăng nhập
          </Button>

          <div className="w-[240px]">
            <select
              className="w-full border border-slate-200 bg-white/95 shadow-lg rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none"
              value={selectedTourId ?? ""}
              disabled={!Array.isArray(tours) || tours.length === 0}
              onChange={(e) => {
                const next = e.target.value ? Number(e.target.value) : null;
                setSelectedTourId(next);
              }}>
              <option value="">
                {Array.isArray(tours) && tours.length > 0
                  ? "Chọn Tour (hiển thị điểm trên map)"
                  : "Không có tour / đang tải"}
              </option>
              {Array.isArray(tours) &&
                tours.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
        {selectedPoi && (
          <button
            type="button"
            aria-label={isSidebarOpen ? "Thu gọn sidebar" : "Mở sidebar"}
            title={isSidebarOpen ? "Thu gọn sidebar" : "Mở sidebar"}
            className={`absolute z-[1400] hidden md:flex items-center justify-center border border-slate-300 bg-white text-slate-700 shadow-xl transition-all duration-300 hover:bg-slate-50
            ${
              isSidebarOpen
                ? "left-[460px] top-1/2 -translate-y-1/2 border-l-0 rounded-r-2xl h-20 w-10"
                : "left-0 top-1/2 -translate-y-1/2 rounded-r-2xl h-20 w-10"
            }`}
            onClick={() => setIsSidebarOpen((prev) => !prev)}>
            {isSidebarOpen ? (
              <ChevronLeft size={20} strokeWidth={2.75} />
            ) : (
              <ChevronRight size={20} strokeWidth={2.75} />
            )}
          </button>
        )}

        <aside
          className={`absolute inset-y-0 left-0 z-[1300]
            flex flex-col
            w-[460px]
            border-r border-slate-200
            bg-white shadow-2xl
            transition-transform duration-300
          ${selectedPoi && isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          {selectedPoi && (
            <div className="flex h-full min-h-0 flex-col">
              {/* SCROLL AREA */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {/* BANNER */}
                <div className="border-b border-slate-200 bg-white">
                  <div className="relative h-[300px] overflow-hidden">
                    <img
                      src={`${API_URL}${selectedPoi.banner || ""}`}
                      alt={selectedPoi.name || "POI banner"}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
                {/* CONTENT SCROLL */}
                <div className="flex-1 overflow-y-auto px-5 py-5 min-h-0">
                  <div className="space-y-5">
                    <div className="rounded-3xl border border-white/30 bg-white/90 backdrop-blur-xl px-5 py-5 shadow-sm">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">
                          <div className="h-[2px] w-5 bg-cyan-700" />
                          Nội dung thuyết minh
                        </div>

                        <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                          {activeNarrationLanguage}
                        </div>
                      </div>

                      <p className="break-words whitespace-pre-line text-[15px] leading-7 text-slate-700">
                        {selectedPoi.original_description ||
                          selectedPoi.description ||
                          "Địa điểm này hiện chưa có mô tả chi tiết."}
                      </p>
                    </div>

                    <div className="rounded-3xl border border-white/30 bg-white/90 backdrop-blur-xl px-5 py-5 shadow-sm">
                      <div className="mt-4 flex items-start justify-between gap-4">
                        {/* LEFT */}
                        <div className="flex min-w-0 flex-1 flex-col">
                          <p className="text-base font-semibold text-slate-900">
                            Địa chỉ
                          </p>

                          <div className="mt-5 flex gap-4">
                            {/* ICON */}
                            <div className="mt-1 shrink-0">
                              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                                <MapPin size={22} />
                              </div>
                            </div>

                            {/* CONTENT */}
                            <div className="min-w-0 flex-1">
                              <p className="break-words text-[17px] font-medium leading-7 text-slate-800">
                                {selectedPoi.address}
                              </p>

                              <p className="mt-3 text-sm leading-6 text-slate-400">
                                {selectedPoi.latitude}, {selectedPoi.longitude}
                              </p>
                            </div>
                          </div>
                        </div>
                        {/* RIGHT */}
                        <button
                          type="button"
                          onClick={() => setIsQrModalOpen(true)}
                          className="
                          flex w-[120px] shrink-0 flex-col items-center justify-center
                          rounded-3xl border border-slate-200 bg-slate-50
                          px-4 py-4 text-center transition
                          hover:bg-slate-100
                        ">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-6 w-6 text-slate-700"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}>
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4 4h5v5H4V4zm11 0h5v5h-5V4zM4 15h5v5H4v-5zm13 2h3m-3 3h3m-8-8h8v8h-8v-8z"
                              />
                            </svg>
                          </div>

                          <p className="mt-3 text-sm font-semibold text-slate-800">
                            Chia sẻ
                          </p>

                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            Mở QR Code
                          </p>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* FOOTER FIXED */}
              <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    className="shrink-0 px-4"
                    onClick={() => {
                      stopAllAudio();
                      setIsTranslateModalOpen(true);
                    }}>
                    <Languages size={16} className="mr-2" />
                    Dịch
                  </Button>

                  <Button
                    className="w-full"
                    disabled={!!playingSource && playingSource !== "sidebar"}
                    onClick={() => {
                      if (playingSource === "sidebar") {
                        window.speechSynthesis.cancel();
                        setPlayingSource(null);
                      } else {
                        const text =
                          selectedPoi.original_description ||
                          selectedPoi.description ||
                          "";
                        window.speechSynthesis.cancel();
                        const utterance = new SpeechSynthesisUtterance(text);
                        utterance.lang = "vi-VN";
                        utterance.rate = 0.9;
                        utterance.onend = () => setPlayingSource(null);
                        setPlayingSource("sidebar");
                        window.speechSynthesis.speak(utterance);
                      }
                    }}>
                    {playingSource === "sidebar" ? (
                      <>
                        <Pause size={16} className="mr-2" />
                        Tạm dừng
                      </>
                    ) : (
                      <>
                        <Volume2 size={16} className="mr-2" />
                        Thuyết minh
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </aside>
        <div
          className={`absolute top-5 md:top-8 z-[1400] flex items-center gap-3 transition-all duration-300
          ${selectedPoi && isSidebarOpen ? "left-5 w-[420px]" : "left-6"}
          `}>
          {/* SEARCH */}
          <div className="relative w-[300px] md:w-[360px]">
            <div
              className={`flex h-14 items-center rounded-2xl border border-white/30 bg-white/90 backdrop-blur-xl px-4 shadow-xl transition-all ${
                isSearchOpen ? "ring-2 ring-cyan-500" : "hover:border-slate-300"
              }`}>
              <input
                type="text"
                value={searchKeyword}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  setIsSearchOpen(true);
                }}
                placeholder="Tìm kiếm địa điểm..."
                className="w-full bg-transparent text-[15px] text-slate-700 outline-none"
              />

              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => {
                    handleClearSelection();
                    setSearchKeyword("");
                  }}
                  className="ml-2 text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              )}
            </div>

            {/* DROPDOWN */}
            {isSearchOpen && (
              <div className="absolute z-[1500] mt-3  max-h-[420px] w-full overflow-y-auto rounded-3xl border border-white/30 bg-white/90 backdrop-blur-xl py-3 shadow-2xl">
                {filteredPois.length === 0 ? (
                  <div className="px-5 py-4 text-sm text-slate-500">
                    Không tìm thấy địa điểm.
                  </div>
                ) : (
                  filteredPois.map((poi) => (
                    <button
                      key={poi.id}
                      type="button"
                      onClick={() => {
                        handleSelectPoi(poi);

                        setSearchKeyword(poi.name);

                        setIsSearchOpen(false);
                      }}
                      className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {poi.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500 line-clamp-1">
                          {poi.address}
                        </p>
                      </div>

                      <MapPin size={16} className="shrink-0 text-slate-400" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          {/* QR BUTTON */}
          <button
            type="button"
            className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/30 bg-white/90 backdrop-blur-xl shadow-xl transition hover:bg-slate-50">
            {/* icon QR */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-slate-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4h5v5H4V4zm11 0h5v5h-5V4zM4 15h5v5H4v-5zm13 2h3m-3 3h3m-8-8h8v8h-8v-8z"
              />
            </svg>
          </button>
        </div>

        {isTranslateModalOpen && selectedPoi && (
          <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className="relative flex h-[78vh] w-full max-w-7xl overflow-hidden rounded-[32px] bg-white shadow-2xl">
              <button
                type="button"
                onClick={() => {
                  stopAllAudio();
                  setIsTranslateModalOpen(false);
                  setTargetLanguage(null);
                  setTranslatedText("");
                }}
                className="absolute right-6 top-6 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md text-slate-500 transition hover:bg-slate-100">
                <X size={18} />
              </button>

              <div className="grid h-full w-full grid-cols-[1fr_140px_1fr]">
                {/* LEFT */}
                <div className="flex h-full flex-col border-r border-slate-200">
                  {/* HEADER */}
                  <div className="border-b border-slate-200 px-6 py-5">
                    <div className="flex items-center gap-2">
                      <Globe size={18} className="text-slate-600" />
                      <p className="text-sm font-semibold text-slate-700">
                        Ngôn ngữ gốc (
                        {(selectedPoi.original_language || "vi").toUpperCase()})
                      </p>
                    </div>
                  </div>

                  {/* CONTENT */}
                  <div className="flex-1 overflow-y-auto px-6 py-6">
                    <p className="whitespace-pre-line text-[15px] leading-8 text-slate-700">
                      {selectedPoi.original_description ||
                        "Không có nội dung gốc."}
                    </p>
                  </div>

                  {/* FOOTER */}
                  <div className="border-t border-slate-200 px-6 py-4">
                    <Button
                      className="w-full"
                      variant="outline"
                      disabled={!!playingSource && playingSource !== "source"}
                      onClick={() => {
                        if (playingSource === "source") {
                          window.speechSynthesis.cancel();
                          setPlayingSource(null);
                        } else {
                          const text =
                            selectedPoi.original_description ||
                            selectedPoi.description ||
                            "";
                          const lang = selectedPoi.original_language || "vi";
                          window.speechSynthesis.cancel();
                          const utterance = new SpeechSynthesisUtterance(text);
                          utterance.lang = lang === "vi" ? "vi-VN" : lang;
                          utterance.rate = 0.9;
                          utterance.onend = () => setPlayingSource(null);
                          setPlayingSource("source");
                          window.speechSynthesis.speak(utterance);
                        }
                      }}>
                      {playingSource === "source" ? (
                        <>
                          <Pause size={16} className="mr-2" />
                          Tạm dừng
                        </>
                      ) : (
                        <>
                          <Volume2 size={16} className="mr-2" />
                          Phát thuyết minh
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                {/* CENTER */}
                <div className="flex flex-col items-center justify-center gap-4 bg-slate-50 px-4">
                  <ArrowRightLeft size={26} className="text-cyan-600" />

                  <div className="w-full space-y-3">
                    {TRANSLATE_LANGUAGES.map((lang) => {
                      const isActive = targetLanguage === lang.code;

                      return (
                        <button
                          key={lang.code}
                          type="button"
                          disabled={isActive}
                          onClick={() => handleTranslate(lang.code)}
                          className={`w-full rounded-xl border px-3 py-2.5 text-sm font-medium transition
            ${
              isActive
                ? "bg-slate-200 text-slate-400 opacity-60"
                : "bg-white text-slate-700 hover:bg-slate-100"
            }`}>
                          Dịch sang {lang.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* RIGHT */}
                <div className="flex h-full flex-col">
                  {/* HEADER */}
                  <div className="border-b border-slate-200 px-6 py-5">
                    <div className="flex items-center gap-2">
                      <Globe size={18} className="text-slate-600" />

                      <p className="text-sm font-semibold text-slate-700">
                        Bản dịch (
                        {targetLanguage ? targetLanguage.toUpperCase() : "..."})
                      </p>
                    </div>
                  </div>

                  {/* CONTENT */}
                  <div className="flex-1 overflow-y-auto px-6 py-6 bg-slate-50">
                    {isTranslating ? (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-cyan-500" />
                        Đang dịch...
                      </div>
                    ) : (
                      <p className="whitespace-pre-line text-[15px] leading-8 text-slate-700">
                        {translatedText || "Chưa có bản dịch."}
                      </p>
                    )}
                  </div>

                  {/* FOOTER */}
                  <div className="border-t border-slate-200 px-6 py-4">
                    <Button
                      className="w-full"
                      variant="outline"
                      disabled={
                        !translatedText ||
                        (playingSource && playingSource !== "translated")
                      }
                      onClick={() => {
                        if (playingSource === "translated") {
                          window.speechSynthesis.cancel();
                          setPlayingSource(null);
                        } else {
                          handleTTS(translatedText, targetLanguage);
                        }
                      }}>
                      {playingSource === "translated" ? (
                        <>
                          <Pause size={16} className="mr-2" />
                          Tạm dừng
                        </>
                      ) : (
                        <>
                          <Volume2 size={16} className="mr-2" />
                          Phát bản dịch
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="h-full w-full">
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={15}
            maxZoom={18}
            zoomControl={false}
            className="h-full w-full z-0">
            <ZoomControl position="bottomright" />
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {isQrModalOpen && selectedPoi && (
              <div className="absolute inset-0 z-[2100]">
                {/* OVERLAY */}
                <div
                  className="absolute inset-0 bg-black/60 backdrop-blur-[3px]"
                  onClick={() => setIsQrModalOpen(false)}
                />

                {/* MODAL */}
                <div className="relative flex h-full items-center justify-center px-4">
                  <div className="relative w-full max-w-sm rounded-[32px] bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                    <button
                      type="button"
                      onClick={() => setIsQrModalOpen(false)}
                      className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200">
                      <X size={18} />
                    </button>

                    <div className="flex flex-col items-center text-center">
                      <p className="text-xl font-semibold text-slate-900">
                        Chia sẻ địa điểm
                      </p>

                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        Quét QR để mở nhanh POI này trên thiết bị khác
                      </p>

                      <div className="mt-6 rounded-[28px] border border-white/30 bg-white/90 backdrop-blur-xl p-5 shadow-sm">
                        <img
                          src={`${API_URL}${selectedPoi.qr_code}`}
                          alt="QR Code"
                          className="h-64 w-64 object-contain"
                        />
<<<<<<< Updated upstream
=======
                      </div> */}

                      <div className="p-2 bg-white border-2 border-gray-100 rounded-xl relative group">
                        <QRCodeCanvas
                          id="qr-gen"
                          value={String(selectedPoi.id)}
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
>>>>>>> Stashed changes
                      </div>

                      <p className="mt-5 text-base font-semibold text-slate-800">
                        {selectedPoi.name}
                      </p>

                      <button
                        type="button"
                        onClick={handleDownloadQr}
                        className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                        Tải QR về máy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
            {/* Zoom/hiển thị Tour points */}
            {tourPoints.length > 0 && <FitBoundsTour points={tourPoints} />}

            {/* Lối đi thực tế OSRM */}
            {tourRouteCoords.length > 1 && (
              <Polyline
                positions={tourRouteCoords}
                color="#f97316"
                weight={4}
              />
            )}

            {tourPoints.length > 0
              ? renderTourMarkers()
              : normalizedPois.map((poi) => (
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
      </div>
    </div>
  );
};

export default TouristMapPublic;
