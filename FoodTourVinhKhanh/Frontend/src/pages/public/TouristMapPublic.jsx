// import React, { useEffect, useMemo, useRef, useState } from "react";
// import {
//   Circle,
//   MapContainer,
//   Marker,
//   TileLayer,
//   useMap,
//   useMapEvents,
//   ZoomControl,
// } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";
// import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
// import markerIcon from "leaflet/dist/images/marker-icon.png";
// import markerShadow from "leaflet/dist/images/marker-shadow.png";
// import {
//   ChevronDown,
//   ChevronLeft,
//   ChevronRight,
//   ChevronUp,
//   Globe,
//   MapPin,
//   Pause,
//   Volume2,
//   Languages,
//   ArrowRightLeft,
//   X,
// } from "lucide-react";

// import { toast } from "react-hot-toast";
// import { useNavigate } from "react-router-dom";
// import api from "../../utils/api";
// import Button from "../../components/common/Button";
// import FullPageLoading from "../../components/common/FullPageLoading";
// import { QRCodeCanvas } from "qrcode.react"

// delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: markerIcon2x,
//   iconUrl: markerIcon,
//   shadowUrl: markerShadow,
// });

// const DEFAULT_CENTER = [10.7589, 106.7076];

// const RecenterAutomatically = ({ lat, lng }) => {
//   const map = useMap();
//   const hasCentered = useRef(false);

//   useEffect(() => {
//     if (!Number.isFinite(lat) || !Number.isFinite(lng) || hasCentered.current) {
//       return;
//     }

//     map.setView([lat, lng], map.getZoom(), { animate: true });
//     hasCentered.current = true;
//   }, [lat, lng, map]);

//   return null;
// };

// const FocusSelectedPoi = ({ poi }) => {
//   const map = useMap();

//   useEffect(() => {
//     if (!poi) {
//       return;
//     }

//     map.setView([poi.latitude, poi.longitude], 17, { animate: true });
//   }, [map, poi]);

//   return null;
// };

// const ClearSelectionOnMapClick = ({ onClear }) => {
//   useMapEvents({
//     click() {
//       onClear();
//     },
//   });

//   return null;
// };

// const normalizePoi = (poi) => {
//   const latitude = Number(poi?.latitude);
//   const longitude = Number(poi?.longitude);

//   if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
//     return null;
//   }

//   return {
//     ...poi,
//     latitude,
//     longitude,

//     audio_range: Number(poi?.audio_range) || 0,
//     access_range: Number(poi?.access_range) || 10,
//     address: poi?.address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
//     original_description: poi.original_description || poi.description || "",
//     original_language: poi.original_language || poi.language || "vi",
//   };
// };

// const TouristMapPublic = () => {
//   const navigate = useNavigate();
//   const [pois, setPois] = useState([]);
//   const [userLoc, setUserLoc] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [selectedPoi, setSelectedPoi] = useState(null);
//   const [isSidebarOpen, setIsSidebarOpen] = useState(false);
//   const [activeNarrationLanguage, setActiveNarrationLanguage] = useState("vi");
//   const [searchKeyword, setSearchKeyword] = useState("");
//   const [isSearchOpen, setIsSearchOpen] = useState(false);
//   const [isQrModalOpen, setIsQrModalOpen] = useState(false);
//   const [playingSource, setPlayingSource] = useState(null);

//   const sidebarAudioRef = useRef(null);
//   const sourceAudioRef = useRef(null);
//   const translatedAudioRef = useRef(null);
//   const [translatedText, setTranslatedText] = useState("");
//   const [targetLanguage, setTargetLanguage] = useState(null);
//   const TRANSLATE_LANGUAGES = [
//     { code: "en", label: "EN" },
//     { code: "ko", label: "KR" },
//     { code: "fr", label: "FR" },
//   ];
//   const [isTranslateModalOpen, setIsTranslateModalOpen] = useState(false);

//   const [isTranslating, setIsTranslating] = useState(false);

//   const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

//   const normalizedPois = useMemo(() => {
//     if (!Array.isArray(pois)) {
//       return [];
//     }

//     return pois.map(normalizePoi).filter(Boolean);
//   }, [pois]);

//   const filteredPois = useMemo(() => {
//     if (!searchKeyword.trim()) {
//       return normalizedPois;
//     }

//     const keyword = searchKeyword.toLowerCase();

//     return normalizedPois.filter((poi) =>
//       poi.name?.toLowerCase().includes(keyword),
//     );
//   }, [normalizedPois, searchKeyword]);

//   useEffect(() => {
//     setTargetLanguage(null);
//     setTranslatedText("");
//   }, [selectedPoi]);
//   useEffect(() => {
//     fetchPois();

//     if (navigator.geolocation) {
//       navigator.geolocation.getCurrentPosition(
//         (pos) => {
//           const { latitude, longitude } = pos.coords;
//           setUserLoc({ lat: latitude, lng: longitude });
//         },
//         () => {
//           setUserLoc(null);
//         },
//       );
//     }

//     const handleLangChange = () => {
//       fetchPois();
//     };

//     window.addEventListener("languageChange", handleLangChange);

//     return () => {
//       window.removeEventListener("languageChange", handleLangChange);
//     };
//   }, []);

//   useEffect(() => {
//     stopAllAudio();
//   }, [selectedPoi?.id]);

//   const stopAllAudio = () => {
//     [sidebarAudioRef, sourceAudioRef, translatedAudioRef].forEach((ref) => {
//       if (ref.current) {
//         ref.current.pause();
//         ref.current.currentTime = 0;
//       }
//     });

//     setPlayingSource(null);
//   };

//   // const handlePlayAudio = async ({ source, ref, audioUrl }) => {
//   //   if (!ref?.current || !audioUrl) {
//   //     return;
//   //   }

//   //   // nếu đang play chính source này -> pause
//   //   if (playingSource === source) {
//   //     ref.current.pause();
//   //     setPlayingSource(null);
//   //     return;
//   //   }

//   //   // stop toàn bộ audio khác
//   //   stopAllAudio();

//   //   try {
//   //     if (ref.current.src !== audioUrl) {
//   //       ref.current.src = audioUrl;
//   //     }

//   //     await ref.current.play();

//   //     setPlayingSource(source);

//   //     ref.current.onended = () => {
//   //       setPlayingSource(null);
//   //     };
//   //   } catch (error) {
//   //     console.warn(error);
//   //     setPlayingSource(null);
//   //   }
//   // };

//   const handleDownloadQr = async () => {
//     if (!selectedPoi?.qr_code) {
//       return;
//     }

//     try {
//       const imageUrl = `${API_URL}${selectedPoi.qr_code}`;

//       const response = await fetch(imageUrl);
//       const blob = await response.blob();

//       const blobUrl = window.URL.createObjectURL(blob);

//       const link = document.createElement("a");
//       link.href = blobUrl;
//       link.download = `${selectedPoi.name || "poi"}-qr.png`;

//       document.body.appendChild(link);
//       link.click();
//       link.remove();

//       window.URL.revokeObjectURL(blobUrl);
//     } catch (error) {
//       console.error(error);
//       toast.error("Không thể tải QR");
//     }
//   };

//   const fetchPois = async () => {
//     setLoading(true);

//     try {
//       const res = await api.get("/pois/get-pois");
//       const data = res?.data?.data;
//       const safePois = Array.isArray(data) ? data : [];

//       setPois(safePois);
//       setSelectedPoi((prev) => {
//         const nextSelected = safePois
//           .map(normalizePoi)
//           .filter(Boolean)
//           .find((poi) => poi.id === prev?.id);

//         return nextSelected || null;
//       });
//     } catch (error) {
//       console.error(error);
//       setPois([]);
//       setSelectedPoi(null);
//       toast.error("Không thể tải danh sách địa điểm");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSelectPoi = (poi) => {
//     const detectedLanguage = poi.original_language || poi.language || "vi";

//     setSelectedPoi(poi);
//     setActiveNarrationLanguage(detectedLanguage);
//     setIsSidebarOpen(true);
//     setSearchKeyword(poi.name || "");
//   };

//   const handleClearSelection = () => {
//     stopAllAudio();

//     setIsSearchOpen(false);
//     setSelectedPoi(null);
//     setActiveNarrationLanguage("vi");
//     setIsSidebarOpen(false);
//   };

//   const handleTranslate = async (langCode) => {
//     console.log("selectedPoi:", selectedPoi);
//     if (!selectedPoi) return;

//     const name = selectedPoi.name || "";
//     const description =
//       selectedPoi.original_description || selectedPoi.description || "";

//     // Kiểm tra trước khi gửi
//     if (!name.trim() || !description.trim()) {
//       toast.error("POI chưa có tên hoặc mô tả để dịch");
//       return;
//     }

//     setTargetLanguage(langCode);
//     setTranslatedText("");
//     setIsTranslating(true);

//     try {
//       const res = await api.post(`/pois/suggestions/translate/${langCode}`, {
//         name: name.trim(),
//         description: description.trim(),
//       });

//       const data = res?.data?.data;
//       setTranslatedText(data?.description || "Không có bản dịch.");
//     } catch (err) {
//       const message =
//         err?.response?.data?.detail ||
//         err?.message ||
//         "Không thể dịch nội dung";
//       toast.error(
//         typeof message === "string" ? message : "Không thể dịch nội dung",
//       );
//       setTranslatedText("");
//     } finally {
//       setIsTranslating(false);
//     }
//   };

//   const handleTTS = (text, langCode) => {
//     if (!text) return;

//     window.speechSynthesis.cancel();

//     const utterance = new SpeechSynthesisUtterance(text);
//     utterance.lang =
//       langCode === "ko"
//         ? "ko-KR"
//         : langCode === "fr"
//           ? "fr-FR"
//           : langCode === "en"
//             ? "en-US"
//             : "vi-VN";

//     utterance.rate = 0.9;
//     utterance.onend = () => setPlayingSource(null);

//     setPlayingSource("translated");
//     window.speechSynthesis.speak(utterance);
//   };

//   return (
//     <div className="fixed inset-0 bg-white overflow-hidden">
//       {loading && <FullPageLoading />}

//       <audio ref={sidebarAudioRef} hidden />
//       <audio ref={sourceAudioRef} hidden />
//       <audio ref={translatedAudioRef} hidden />

//       <div className="relative h-full w-full bg-slate-100">
//         <div className="absolute right-4 top-4 z-[1100] md:right-6 md:top-6">
//           <Button
//             variant="outline"
//             size="sm"
//             className="bg-white/95 shadow-lg backdrop-blur-sm"
//             onClick={() => navigate("/login")}>
//             Quay lại đăng nhập
//           </Button>
//         </div>

//         {selectedPoi && (
//           <button
//             type="button"
//             aria-label={isSidebarOpen ? "Thu gọn sidebar" : "Mở sidebar"}
//             title={isSidebarOpen ? "Thu gọn sidebar" : "Mở sidebar"}
//             className={`absolute z-[1400] hidden md:flex items-center justify-center border border-slate-300 bg-white text-slate-700 shadow-xl transition-all duration-300 hover:bg-slate-50
//             ${
//               isSidebarOpen
//                 ? "left-[460px] top-1/2 -translate-y-1/2 border-l-0 rounded-r-2xl h-20 w-10"
//                 : "left-0 top-1/2 -translate-y-1/2 rounded-r-2xl h-20 w-10"
//             }`}
//             onClick={() => setIsSidebarOpen((prev) => !prev)}>
//             {isSidebarOpen ? (
//               <ChevronLeft size={20} strokeWidth={2.75} />
//             ) : (
//               <ChevronRight size={20} strokeWidth={2.75} />
//             )}
//           </button>
//         )}

//         <aside
//           className={`absolute inset-y-0 left-0 z-[1300]
//             flex flex-col
//             w-[460px]
//             border-r border-slate-200
//             bg-white shadow-2xl
//             transition-transform duration-300
//           ${selectedPoi && isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
//           {selectedPoi && (
//             <div className="flex h-full min-h-0 flex-col">
//               {/* SCROLL AREA */}
//               <div className="flex-1 overflow-y-auto min-h-0">
//                 {/* BANNER */}
//                 <div className="border-b border-slate-200 bg-white">
//                   <div className="relative h-[300px] overflow-hidden">
//                     <img
//                       src={`${API_URL}${selectedPoi.banner || ""}`}
//                       alt={selectedPoi.name || "POI banner"}
//                       className="h-full w-full object-cover"
//                     />
//                   </div>
//                 </div>
//                 {/* CONTENT SCROLL */}
//                 <div className="flex-1 overflow-y-auto px-5 py-5 min-h-0">
//                   <div className="space-y-5">
//                     <div className="rounded-3xl border border-white/30 bg-white/90 backdrop-blur-xl px-5 py-5 shadow-sm">
//                       <div className="mb-4 flex items-center justify-between">
//                         <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">
//                           <div className="h-[2px] w-5 bg-cyan-700" />
//                           Nội dung thuyết minh
//                         </div>

//                         <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">
//                           {activeNarrationLanguage}
//                         </div>
//                       </div>

//                       <p className="break-words whitespace-pre-line text-[15px] leading-7 text-slate-700">
//                         {selectedPoi.original_description ||
//                           selectedPoi.description ||
//                           "Địa điểm này hiện chưa có mô tả chi tiết."}
//                       </p>
//                     </div>

//                     <div className="rounded-3xl border border-white/30 bg-white/90 backdrop-blur-xl px-5 py-5 shadow-sm">
//                       <div className="mt-4 flex items-start justify-between gap-4">
//                         {/* LEFT */}
//                         <div className="flex min-w-0 flex-1 flex-col">
//                           <p className="text-base font-semibold text-slate-900">
//                             Địa chỉ
//                           </p>

//                           <div className="mt-5 flex gap-4">
//                             {/* ICON */}
//                             <div className="mt-1 shrink-0">
//                               <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
//                                 <MapPin size={22} />
//                               </div>
//                             </div>

//                             {/* CONTENT */}
//                             <div className="min-w-0 flex-1">
//                               <p className="break-words text-[17px] font-medium leading-7 text-slate-800">
//                                 {selectedPoi.address}
//                               </p>

//                               <p className="mt-3 text-sm leading-6 text-slate-400">
//                                 {selectedPoi.latitude}, {selectedPoi.longitude}
//                               </p>
//                             </div>
//                           </div>
//                         </div>
//                         {/* RIGHT */}
//                         <button
//                           type="button"
//                           onClick={() => setIsQrModalOpen(true)}
//                           className="
//                           flex w-[120px] shrink-0 flex-col items-center justify-center
//                           rounded-3xl border border-slate-200 bg-slate-50
//                           px-4 py-4 text-center transition
//                           hover:bg-slate-100
//                         ">
//                           <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
//                             <svg
//                               xmlns="http://www.w3.org/2000/svg"
//                               className="h-6 w-6 text-slate-700"
//                               fill="none"
//                               viewBox="0 0 24 24"
//                               stroke="currentColor"
//                               strokeWidth={2}>
//                               <path
//                                 strokeLinecap="round"
//                                 strokeLinejoin="round"
//                                 d="M4 4h5v5H4V4zm11 0h5v5h-5V4zM4 15h5v5H4v-5zm13 2h3m-3 3h3m-8-8h8v8h-8v-8z"
//                               />
//                             </svg>
//                           </div>

//                           <p className="mt-3 text-sm font-semibold text-slate-800">
//                             Chia sẻ
//                           </p>

//                           <p className="mt-1 text-xs leading-5 text-slate-500">
//                             Mở QR Code
//                           </p>
//                         </button>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//               {/* FOOTER FIXED */}
//               <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-4">
//                 <div className="flex items-center gap-3">
//                   <Button
//                     variant="outline"
//                     className="shrink-0 px-4"
//                     onClick={() => {
//                       stopAllAudio();
//                       setIsTranslateModalOpen(true);
//                     }}>
//                     <Languages size={16} className="mr-2" />
//                     Dịch
//                   </Button>

//                   <Button
//                     className="w-full"
//                     disabled={!!playingSource && playingSource !== "sidebar"}
//                     onClick={() => {
//                       if (playingSource === "sidebar") {
//                         window.speechSynthesis.cancel();
//                         setPlayingSource(null);
//                       } else {
//                         const text =
//                           selectedPoi.original_description ||
//                           selectedPoi.description ||
//                           "";
//                         window.speechSynthesis.cancel();
//                         const utterance = new SpeechSynthesisUtterance(text);
//                         utterance.lang = "vi-VN";
//                         utterance.rate = 0.9;
//                         utterance.onend = () => setPlayingSource(null);
//                         setPlayingSource("sidebar");
//                         window.speechSynthesis.speak(utterance);
//                       }
//                     }}>
//                     {playingSource === "sidebar" ? (
//                       <>
//                         <Pause size={16} className="mr-2" />
//                         Tạm dừng
//                       </>
//                     ) : (
//                       <>
//                         <Volume2 size={16} className="mr-2" />
//                         Thuyết minh
//                       </>
//                     )}
//                   </Button>
//                 </div>
//               </div>
//             </div>
//           )}
//         </aside>
//         <div
//           className={`absolute top-5 md:top-8 z-[1400] flex items-center gap-3 transition-all duration-300
//           ${selectedPoi && isSidebarOpen ? "left-5 w-[420px]" : "left-6"}
//           `}>
//           {/* SEARCH */}
//           <div className="relative w-[300px] md:w-[360px]">
//             <div
//               className={`flex h-14 items-center rounded-2xl border border-white/30 bg-white/90 backdrop-blur-xl px-4 shadow-xl transition-all ${
//                 isSearchOpen ? "ring-2 ring-cyan-500" : "hover:border-slate-300"
//               }`}>
//               <input
//                 type="text"
//                 value={searchKeyword}
//                 onFocus={() => setIsSearchOpen(true)}
//                 onChange={(e) => {
//                   setSearchKeyword(e.target.value);
//                   setIsSearchOpen(true);
//                 }}
//                 placeholder="Tìm kiếm địa điểm..."
//                 className="w-full bg-transparent text-[15px] text-slate-700 outline-none"
//               />

//               {searchKeyword && (
//                 <button
//                   type="button"
//                   onClick={() => {
//                     handleClearSelection();
//                     setSearchKeyword("");
//                   }}
//                   className="ml-2 text-slate-400 hover:text-slate-600">
//                   <X size={18} />
//                 </button>
//               )}
//             </div>

//             {/* DROPDOWN */}
//             {isSearchOpen && (
//               <div className="absolute z-[1500] mt-3  max-h-[420px] w-full overflow-y-auto rounded-3xl border border-white/30 bg-white/90 backdrop-blur-xl py-3 shadow-2xl">
//                 {filteredPois.length === 0 ? (
//                   <div className="px-5 py-4 text-sm text-slate-500">
//                     Không tìm thấy địa điểm.
//                   </div>
//                 ) : (
//                   filteredPois.map((poi) => (
//                     <button
//                       key={poi.id}
//                       type="button"
//                       onClick={() => {
//                         handleSelectPoi(poi);

//                         setSearchKeyword(poi.name);

//                         setIsSearchOpen(false);
//                       }}
//                       className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50">
//                       <div>
//                         <p className="text-sm font-semibold text-slate-900">
//                           {poi.name}
//                         </p>

//                         <p className="mt-1 text-xs text-slate-500 line-clamp-1">
//                           {poi.address}
//                         </p>
//                       </div>

//                       <MapPin size={16} className="shrink-0 text-slate-400" />
//                     </button>
//                   ))
//                 )}
//               </div>
//             )}
//           </div>
//           {/* QR BUTTON */}
//           <button
//             type="button"
//             className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/30 bg-white/90 backdrop-blur-xl shadow-xl transition hover:bg-slate-50">
//             {/* icon QR */}
//             <svg
//               xmlns="http://www.w3.org/2000/svg"
//               className="h-6 w-6 text-slate-700"
//               fill="none"
//               viewBox="0 0 24 24"
//               stroke="currentColor"
//               strokeWidth={2}>
//               <path
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 d="M4 4h5v5H4V4zm11 0h5v5h-5V4zM4 15h5v5H4v-5zm13 2h3m-3 3h3m-8-8h8v8h-8v-8z"
//               />
//             </svg>
//           </button>
//         </div>

//         {isTranslateModalOpen && selectedPoi && (
//           <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
//             <div className="relative flex h-[78vh] w-full max-w-7xl overflow-hidden rounded-[32px] bg-white shadow-2xl">
//               <button
//                 type="button"
//                 onClick={() => {
//                   stopAllAudio();
//                   setIsTranslateModalOpen(false);
//                   setTargetLanguage(null);
//                   setTranslatedText("");
//                 }}
//                 className="absolute right-6 top-6 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md text-slate-500 transition hover:bg-slate-100">
//                 <X size={18} />
//               </button>

//               <div className="grid h-full w-full grid-cols-[1fr_140px_1fr]">
//                 {/* LEFT */}
//                 <div className="flex h-full flex-col border-r border-slate-200">
//                   {/* HEADER */}
//                   <div className="border-b border-slate-200 px-6 py-5">
//                     <div className="flex items-center gap-2">
//                       <Globe size={18} className="text-slate-600" />
//                       <p className="text-sm font-semibold text-slate-700">
//                         Ngôn ngữ gốc (
//                         {(selectedPoi.original_language || "vi").toUpperCase()})
//                       </p>
//                     </div>
//                   </div>

//                   {/* CONTENT */}
//                   <div className="flex-1 overflow-y-auto px-6 py-6">
//                     <p className="whitespace-pre-line text-[15px] leading-8 text-slate-700">
//                       {selectedPoi.original_description ||
//                         "Không có nội dung gốc."}
//                     </p>
//                   </div>

//                   {/* FOOTER */}
//                   <div className="border-t border-slate-200 px-6 py-4">
//                     <Button
//                       className="w-full"
//                       variant="outline"
//                       disabled={!!playingSource && playingSource !== "source"}
//                       onClick={() => {
//                         if (playingSource === "source") {
//                           window.speechSynthesis.cancel();
//                           setPlayingSource(null);
//                         } else {
//                           const text =
//                             selectedPoi.original_description ||
//                             selectedPoi.description ||
//                             "";
//                           const lang = selectedPoi.original_language || "vi";
//                           window.speechSynthesis.cancel();
//                           const utterance = new SpeechSynthesisUtterance(text);
//                           utterance.lang = lang === "vi" ? "vi-VN" : lang;
//                           utterance.rate = 0.9;
//                           utterance.onend = () => setPlayingSource(null);
//                           setPlayingSource("source");
//                           window.speechSynthesis.speak(utterance);
//                         }
//                       }}>
//                       {playingSource === "source" ? (
//                         <>
//                           <Pause size={16} className="mr-2" />
//                           Tạm dừng
//                         </>
//                       ) : (
//                         <>
//                           <Volume2 size={16} className="mr-2" />
//                           Phát thuyết minh
//                         </>
//                       )}
//                     </Button>
//                   </div>
//                 </div>
//                 {/* CENTER */}
//                 <div className="flex flex-col items-center justify-center gap-4 bg-slate-50 px-4">
//                   <ArrowRightLeft size={26} className="text-cyan-600" />

//                   <div className="w-full space-y-3">
//                     {TRANSLATE_LANGUAGES.map((lang) => {
//                       const isActive = targetLanguage === lang.code;

//                       return (
//                         <button
//                           key={lang.code}
//                           type="button"
//                           disabled={isActive}
//                           onClick={() => handleTranslate(lang.code)}
//                           className={`w-full rounded-xl border px-3 py-2.5 text-sm font-medium transition
//             ${
//               isActive
//                 ? "bg-slate-200 text-slate-400 opacity-60"
//                 : "bg-white text-slate-700 hover:bg-slate-100"
//             }`}>
//                           Dịch sang {lang.label}
//                         </button>
//                       );
//                     })}
//                   </div>
//                 </div>
//                 {/* RIGHT */}
//                 <div className="flex h-full flex-col">
//                   {/* HEADER */}
//                   <div className="border-b border-slate-200 px-6 py-5">
//                     <div className="flex items-center gap-2">
//                       <Globe size={18} className="text-slate-600" />

//                       <p className="text-sm font-semibold text-slate-700">
//                         Bản dịch (
//                         {targetLanguage ? targetLanguage.toUpperCase() : "..."})
//                       </p>
//                     </div>
//                   </div>

//                   {/* CONTENT */}
//                   <div className="flex-1 overflow-y-auto px-6 py-6 bg-slate-50">
//                     {isTranslating ? (
//                       <div className="flex items-center gap-2 text-sm text-slate-400">
//                         <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-cyan-500" />
//                         Đang dịch...
//                       </div>
//                     ) : (
//                       <p className="whitespace-pre-line text-[15px] leading-8 text-slate-700">
//                         {translatedText || "Chưa có bản dịch."}
//                       </p>
//                     )}
//                   </div>

//                   {/* FOOTER */}
//                   <div className="border-t border-slate-200 px-6 py-4">
//                     <Button
//                       className="w-full"
//                       variant="outline"
//                       disabled={
//                         !translatedText ||
//                         (playingSource && playingSource !== "translated")
//                       }
//                       onClick={() => {
//                         if (playingSource === "translated") {
//                           window.speechSynthesis.cancel();
//                           setPlayingSource(null);
//                         } else {
//                           handleTTS(translatedText, targetLanguage);
//                         }
//                       }}>
//                       {playingSource === "translated" ? (
//                         <>
//                           <Pause size={16} className="mr-2" />
//                           Tạm dừng
//                         </>
//                       ) : (
//                         <>
//                           <Volume2 size={16} className="mr-2" />
//                           Phát bản dịch
//                         </>
//                       )}
//                     </Button>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}

//         <div className="h-full w-full">
//           <MapContainer
//             center={DEFAULT_CENTER}
//             zoom={15}
//             maxZoom={18}
//             zoomControl={false}
//             className="h-full w-full z-0">
//             <ZoomControl position="bottomright" />
//             <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
//             {isQrModalOpen && selectedPoi && (
//               <div className="absolute inset-0 z-[2100]">
//                 {/* OVERLAY */}
//                 <div
//                   className="absolute inset-0 bg-black/60 backdrop-blur-[3px]"
//                   onClick={() => setIsQrModalOpen(false)}
//                 />

//                 {/* MODAL */}
//                 <div className="relative flex h-full items-center justify-center px-4">
//                   <div className="relative w-full max-w-sm rounded-[32px] bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
//                     <button
//                       type="button"
//                       onClick={() => setIsQrModalOpen(false)}
//                       className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200">
//                       <X size={18} />
//                     </button>

//                     <div className="flex flex-col items-center text-center">
//                       <p className="text-xl font-semibold text-slate-900">
//                         Chia sẻ địa điểm
//                       </p>

//                       <p className="mt-2 text-sm leading-6 text-slate-500">
//                         Quét QR để mở nhanh POI này trên thiết bị khác
//                       </p>

//                       {/* <div className="mt-6 rounded-[28px] border border-white/30 bg-white/90 backdrop-blur-xl p-5 shadow-sm">
//                         <img
//                           src={`${API_URL}${selectedPoi.qr_code}`}
//                           alt="QR Code"
//                           className="h-64 w-64 object-contain"
//                         />
//                       </div> */}

//                       <div className="p-2 bg-white border-2 border-gray-100 rounded-xl relative group">
//                         <QRCodeCanvas 
//                             id="qr-gen"
//                             value={String(selectedPoi.id)} 
//                             size={512}
//                             style={{ 
//                                 width: '220px', 
//                                 height: '220px',
//                                 padding: '10px',
//                                 backgroundColor: 'white' 
//                             }} 
//                             marginSize={4}
//                             level="H"
//                         />
//                       </div>

//                       <p className="mt-5 text-base font-semibold text-slate-800">
//                         {selectedPoi.name}
//                       </p>

//                       <button
//                         type="button"
//                         onClick={handleDownloadQr}
//                         className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
//                         Tải QR về máy
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             )}
//             {userLoc && (
//               <RecenterAutomatically lat={userLoc.lat} lng={userLoc.lng} />
//             )}
//             {selectedPoi && <FocusSelectedPoi poi={selectedPoi} />}
//             <ClearSelectionOnMapClick onClear={handleClearSelection} />
//             {userLoc && (
//               <Marker
//                 position={[userLoc.lat, userLoc.lng]}
//                 icon={L.divIcon({
//                   className: "user-marker",
//                   html: `
//                     <div class="relative">
//                         <div class="absolute -inset-2 bg-blue-500/30 rounded-full animate-ping"></div>
//                         <div class="relative bg-blue-600 w-4 h-4 rounded-full border-2 border-white shadow-lg"></div>
//                     </div>
//                 `,
//                   iconSize: [20, 20],
//                 })}
//               />
//             )}
//             {normalizedPois.map((poi) => (
//               <React.Fragment key={poi.id}>
//                 <Marker
//                   position={[poi.latitude, poi.longitude]}
//                   eventHandlers={{
//                     click: () => handleSelectPoi(poi),
//                   }}
//                 />

//                 {poi.audio_range > 0 && (
//                   <Circle
//                     center={[poi.latitude, poi.longitude]}
//                     radius={poi.audio_range}
//                     pathOptions={{
//                       color: "#f59e0b",
//                       fillColor: "#fcd34d",
//                       fillOpacity: selectedPoi?.id === poi.id ? 0.15 : 0.08,
//                     }}
//                   />
//                 )}

//                 <Circle
//                   center={[poi.latitude, poi.longitude]}
//                   radius={poi.access_range}
//                   pathOptions={{
//                     color: selectedPoi?.id === poi.id ? "#1d4ed8" : "#3b82f6",
//                     fillColor: "#93c5fd",
//                     fillOpacity: selectedPoi?.id === poi.id ? 0.28 : 0.16,
//                     dashArray: "5, 10",
//                   }}
//                 />
//               </React.Fragment>
//             ))}
//           </MapContainer>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default TouristMapPublic;

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
  ZoomControl,
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
  ScanLine,
  Bot,
  Send,
  Mic,
} from "lucide-react";

import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import Button from "../../components/common/Button";
import FullPageLoading from "../../components/common/FullPageLoading";
import { QRCodeCanvas } from "qrcode.react";
import QRScannerZXing from "../../components/QRScannerZXing";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER = [10.7578, 106.711];

// Helper components
const MapEvents = ({ onMove }) => {
  useMapEvents({ moveend: (e) => onMove(e.target.getCenter()) });
  return null;
};

const RecenterButton = ({ center }) => {
  const map = useMap();
  return (
    <button
      onClick={() => map.setView(center, 17, { animate: true })}
      className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/30 bg-white/90 backdrop-blur-xl shadow-xl transition hover:bg-slate-50"
    >
      <MapPin size={22} className="text-blue-600" />
    </button>
  );
};

export default function TouristMapPublic() {
  const navigate = useNavigate();

  // Core States
  const [pois, setPois] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState("vi");

  // AI & QR States
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [displayQuestion, setDisplayQuestion] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Audio States
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const synthesisRef = useRef(window.speechSynthesis);
  const recognitionRef = useRef(null);

  useEffect(() => {
    fetchPois();
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        () => toast.error("Không thể lấy vị trí hiện tại")
      );
    }
    initSpeechRecognition();
    return () => synthesisRef.current.cancel();
  }, []);

  const fetchPois = async () => {
    try {
      const res = await api.get("/pois/get-all-pois");
      if (res.data.success) setPois(res.data.data);
    } catch (err) {
      toast.error("Lỗi tải dữ liệu bản đồ");
    } finally {
      setLoading(false);
    }
  };

  // --- Logic AI Chat ---
  const handleAskAI = useCallback(async (overrideQuestion = null) => {
    const q = overrideQuestion || question;
    if (!q.trim() || !selectedPoi) return;

    setDisplayQuestion(q);
    setQuestion("");
    setIsAiLoading(true);
    setAiResponse("");

    try {
      const res = await api.get("/pois/ai/chat", {
        params: { poi_id: selectedPoi.id, question: q }
      });
      if (res.data.success) {
        const answer = res.data.data.answer;
        setAiResponse(answer);
        handleTTS(answer, currentLang);
      }
    } catch (err) {
      setAiResponse("Trợ lý Laura đang bận, bạn thử lại sau nhé!");
    } finally {
      setIsAiLoading(false);
    }
  }, [question, selectedPoi, currentLang]);

  // --- Logic Nhận diện giọng nói ---
  const initSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'vi-VN';
      recognition.continuous = false;
      
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQuestion(transcript);
        handleAskAI(transcript);
      };
      recognitionRef.current = recognition;
    }
  };

  const toggleListening = () => {
    if (isListening) recognitionRef.current?.stop();
    else recognitionRef.current?.start();
  };

  // --- Logic QR Scanner ---
  const handleScanSuccess = async (poiId) => {
    setLoading(true);
    try {
      const res = await api.get(`/pois/get-poi-by-id/${poiId}`);
      if (res.data.success) {
        handleSelectPoi(res.data.data);
        setIsQRScannerOpen(false);
        toast.success("Đã tìm thấy địa điểm!");
      }
    } catch (err) {
      toast.error("Mã QR không hợp lệ");
    } finally {
      setLoading(false);
    }
  };

  // --- Logic Thuyết minh (TTS) ---
  const handleTTS = (text, lang) => {
    synthesisRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "vi" ? "vi-VN" : "en-US";
    utterance.onstart = () => { setIsSpeaking(true); setIsPaused(false); };
    utterance.onend = () => setIsSpeaking(false);
    synthesisRef.current.speak(utterance);
  };

  const handleSelectPoi = (poi) => {
    setSelectedPoi(poi);
    setIsSidebarOpen(true);
    setAiResponse("");
    setDisplayQuestion("");
    synthesisRef.current.cancel();
  };

  const normalizedPois = useMemo(() =>
    pois.map((p) => ({
      ...p,
      latitude: parseFloat(p.latitude),
      longitude: parseFloat(p.longitude),
    })), [pois]
  );

  if (loading) return <FullPageLoading />;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-900 font-sans text-slate-900">
      {/* Search & QR Header */}
      <div className="absolute left-1/2 top-6 z-[1000] flex w-full max-w-2xl -translate-x-1/2 items-center gap-3 px-4">
        <div className="flex flex-1 items-center gap-3 rounded-[28px] border border-white/40 bg-white/80 p-2 pl-6 backdrop-blur-2xl shadow-2xl">
          <Globe className="text-blue-600" size={20} />
          <input
            type="text"
            placeholder="Tìm kiếm quán ăn, địa danh..."
            className="flex-1 bg-transparent py-2 text-sm font-medium outline-none placeholder:text-slate-500"
          />
        </div>
        <button
          onClick={() => setIsQRScannerOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/30 bg-white/90 backdrop-blur-xl shadow-xl transition hover:bg-slate-50"
        >
          <ScanLine size={24} className="text-slate-700" />
        </button>
      </div>

      {/* Floating Controls */}
      <div className="absolute bottom-10 right-6 z-[1000] flex flex-col gap-4">
        <RecenterButton center={userLocation || DEFAULT_CENTER} />
        <button
          onClick={() => navigate("/login")}
          className="group flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-4 font-bold text-white shadow-2xl transition hover:bg-slate-800 active:scale-95"
        >
          <span>Khám phá ngay</span>
          <ChevronRight size={18} className="transition group-hover:translate-x-1" />
        </button>
      </div>

      <div className="flex h-full w-full">
        {/* Sidebar Info & AI Chat */}
        <aside
          className={`relative z-[1001] flex h-full w-full flex-col bg-white transition-all duration-500 md:w-[420px] ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } shadow-[20px_0_60px_-15px_rgba(0,0,0,0.1)]`}
        >
          {selectedPoi && (
            <>
              {/* Header Image */}
              <div className="relative h-72 w-full overflow-hidden">
                <img
                  src={selectedPoi.image_url || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800"}
                  className="h-full w-full object-cover"
                  alt={selectedPoi.name}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="absolute right-4 top-4 rounded-full bg-black/20 p-2 text-white backdrop-blur-md hover:bg-black/40"
                >
                  <X size={20} />
                </button>
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <h2 className="text-2xl font-black tracking-tight">{selectedPoi.name}</h2>
                  <div className="mt-2 flex items-center gap-2 text-sm font-medium text-white/80">
                    <MapPin size={14} className="text-orange-400" />
                    <span className="truncate">{selectedPoi.address}</span>
                  </div>
                </div>
              </div>

              {/* Content Scroll Area */}
              <div className="flex-1 overflow-y-auto px-6 py-8 scrollbar-hide">
                {/* TTS Controls */}
                <div className="flex items-center justify-between rounded-3xl bg-slate-50 p-4 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${isSpeaking ? 'bg-orange-500 text-white animate-pulse' : 'bg-white text-slate-400 shadow-sm'}`}>
                      <Volume2 size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Audio Guide</p>
                      <p className="text-sm font-bold text-slate-700">{currentLang === 'vi' ? 'Tiếng Việt' : 'English'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setCurrentLang(prev => prev === 'vi' ? 'en' : 'vi')}
                      className="p-2 hover:bg-white rounded-lg transition"
                    >
                      <Languages size={18} className="text-slate-600" />
                    </button>
                    <Button
                      variant={isSpeaking ? "danger" : "primary"}
                      size="sm"
                      onClick={() => isSpeaking ? synthesisRef.current.cancel() : handleTTS(selectedPoi.description, currentLang)}
                      className="rounded-xl font-bold px-4"
                    >
                      {isSpeaking ? <Pause size={16} /> : "Nghe thuyết minh"}
                    </Button>
                  </div>
                </div>

                {/* AI Chat Laura Section */}
                <div className="mt-8 rounded-[32px] border border-orange-100 bg-orange-50/50 p-6 shadow-inner">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-orange-600 font-black text-xs uppercase tracking-tighter">
                      <div className="p-1.5 bg-orange-100 rounded-lg"><Bot size={16} /></div>
                      Trợ lý ảo Laura
                    </div>
                  </div>
                  
                  {/* Chat Box */}
                  <div className="space-y-4 min-h-[100px] mb-4">
                    {displayQuestion && (
                      <div className="flex justify-end">
                        <div className="bg-slate-800 text-white px-4 py-2 rounded-2xl rounded-tr-none text-sm shadow-md">
                          {displayQuestion}
                        </div>
                      </div>
                    )}
                    {aiResponse ? (
                      <div className="flex justify-start">
                        <div className="bg-white border border-orange-200 text-slate-700 px-4 py-3 rounded-2xl rounded-tl-none text-sm shadow-sm leading-relaxed">
                          {aiResponse}
                        </div>
                      </div>
                    ) : isAiLoading && (
                      <div className="flex gap-2 items-center text-xs text-orange-400 font-medium animate-pulse">
                        <div className="h-2 w-2 bg-orange-400 rounded-full"></div>
                        Laura đang tìm thông tin...
                      </div>
                    )}
                  </div>

                  {/* Input Chat */}
                  <div className="relative flex items-center gap-2 group">
                    <div className="relative flex-1">
                      <input 
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                        placeholder="Hỏi về món ăn, giá cả..."
                        className="w-full pl-4 pr-10 py-3.5 bg-white border border-orange-200 rounded-2xl text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      />
                      <button 
                        onClick={toggleListening}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${isListening ? 'text-red-500 animate-bounce' : 'text-slate-400 hover:text-orange-500'}`}
                      >
                        <Mic size={18} />
                      </button>
                    </div>
                    <button 
                      onClick={() => handleAskAI()}
                      disabled={isAiLoading || !question.trim()}
                      className="p-3.5 bg-orange-500 text-white rounded-2xl hover:bg-orange-600 disabled:opacity-30 transition-all shadow-lg shadow-orange-200"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>

                {/* Info Text */}
                <div className="mt-8">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Giới thiệu địa điểm</h3>
                  <p className="mt-4 text-sm leading-relaxed text-slate-600">{selectedPoi.description}</p>
                </div>
              </div>
            </>
          )}
        </aside>

        {/* Map Area */}
        <div className="relative flex-1">
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={16}
            zoomControl={false}
            className="h-full w-full"
          >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
            <ZoomControl position="bottomleft" />
            
            {userLocation && (
              <Marker
                position={userLocation}
                icon={L.divIcon({
                  className: "relative",
                  html: `
                    <div class="relative flex h-10 w-10 items-center justify-center">
                      <div class="absolute h-full w-full animate-ping rounded-full bg-blue-400 opacity-20"></div>
                      <div class="h-4 w-4 rounded-full border-2 border-white bg-blue-600 shadow-xl"></div>
                    </div>
                  `,
                })}
              />
            )}

            {normalizedPois.map((poi) => (
              <React.Fragment key={poi.id}>
                <Marker
                  position={[poi.latitude, poi.longitude]}
                  eventHandlers={{ click: () => handleSelectPoi(poi) }}
                />
                {poi.audio_range > 0 && (
                  <Circle
                    center={[poi.latitude, poi.longitude]}
                    radius={poi.audio_range}
                    pathOptions={{ color: "#f59e0b", fillColor: "#fcd34d", fillOpacity: 0.1 }}
                  />
                )}
              </React.Fragment>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* QR Scanner Modal */}
      {isQRScannerOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/90 backdrop-blur-md px-6">
          <div className="relative w-full max-w-sm">
            <button 
              onClick={() => setIsQRScannerOpen(false)}
              className="absolute -top-14 right-0 text-white/70 hover:text-white transition"
            >
              <X size={32} />
            </button>
            <div className="overflow-hidden rounded-[40px] border-4 border-white/20 bg-white shadow-2xl">
              <div className="aspect-square w-full">
                <QRScannerZXing onScanSuccess={handleScanSuccess} />
              </div>
            </div>
            <div className="mt-8 text-center text-white">
              <h3 className="text-xl font-bold">Quét mã QR</h3>
              <p className="mt-2 text-sm text-white/60">Di chuyển camera đến mã QR tại cửa hàng để xem thông tin thuyết minh</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}