import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Circle } from 'react-leaflet';
import { QRCodeCanvas } from "qrcode.react"
import QRScanner from "../../components/QRScanner"
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Volume2, Navigation, MapPin, Search, ChevronUp, ChevronDown, X, Download, Bot, Send } from 'lucide-react';
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

const ACCEPT_LANG = {
    "vi": 'vi-VN',
    "en": 'en-US',
    "kr": 'ko-KR', // Mã chuẩn của tiếng Hàn là ko-KR
    "fr": 'fr-FR'
};

const TouristExplore = () => {
    const [pois, setPois] = useState([]);
    const [nearbyPois, setNearbyPois] = useState([]);
    const [userLoc, setUserLoc] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedPoi, setSelectedPoi] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isQRModalOpen, setIsQRModalOpen] = useState(false);
    const [question, setQuestion] = useState("");
    const [displayQuestion, setDisplayQuestion] = useState("");
    const [aiResponse, setAiResponse] = useState("");
    const [currentLang, setCurrentLang] = useState(localStorage.getItem('language').toLowerCase() || 'vi');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null)
    const audioRef = useRef(null);
    const lastPlayedPoiId = useRef(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    const getDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3; // Bán kính trái đất tính bằng mét
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const downloadQRCode = () => {
        const canvas = document.getElementById("qr-gen");
        if (canvas) {
            // Tạo một link ảo để tải
            const link = document.createElement('a');
            link.download = `QR_${selectedPoi.name.replace(/\s+/g, '_')}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        }
    };

    const prepareAIVoice = async (text) => {
        try {
            const res = await api.get("/pois/ai/tts", { params: { text } });
            if (res.data.success && res.data.audio_base64) {
                const audioSrc = `data:audio/mp3;base64,${res.data.audio_base64}`;
                const audio = new Audio(audioSrc);
                
                // Trả về một Promise hoàn thành khi audio đã tải xong dữ liệu
                return new Promise((resolve) => {
                    audio.oncanplaythrough = () => resolve(audio);
                    audio.onerror = () => resolve(null);
                });
            }
        } catch (error) {
            console.error("Lỗi chuẩn bị TTS:", error);
        }
        return null;
    };

    const handleAskAI = useCallback(async (overrideQuestion = null) => {
        const currentQuestion = overrideQuestion || question;
    
        if (!currentQuestion.trim()) return;

        setDisplayQuestion(currentQuestion); 
        setQuestion("");
        setIsAiLoading(true);
        setAiResponse(""); 

        try {
            const chatRes = await api.get("/pois/ai/chat", {
                params: { poi_id: selectedPoi.id, question: currentQuestion }
            });

            if (chatRes.data.success) {
                const answer = chatRes.data.data.answer;
                const readyAudio = await prepareAIVoice(answer);
                setAiResponse(answer); 
                if (readyAudio) {
                    readyAudio.play().catch(e => console.error(e));
                }
            }
        } catch (err) {
            setAiResponse("Trợ lý đang gặp chút sự cố, bạn thử lại nhé!");
        } finally {
            setIsAiLoading(false);
            setQuestion(""); // Xóa input sau khi gửi
        }
    }, [question, selectedPoi, prepareAIVoice])

    // Theo dõi vị trí và tải dữ liệu ban đầu
    useEffect(() => {

        fetchPois();

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                setUserLoc({ lat: latitude, lng: longitude });
            }
        );

        const handleLangChange = () => {
            const newLang = localStorage.getItem('language') || 'vi';
            setCurrentLang(newLang);
            fetchPois();
            setNearbyPois([])
            setIsExpanded(false)
        };

        const moveStep = 0.0001; // Độ nhạy di chuyển
        const handleKeyDown = (e) => {
            const key = e.key.toLowerCase();
            setUserLoc(prev => {
                if (!prev) return prev;
                if (key === 'w') return { ...prev, lat: prev.lat + moveStep };
                if (key === 's') return { ...prev, lat: prev.lat - moveStep };
                if (key === 'a') return { ...prev, lng: prev.lng - moveStep };
                if (key === 'd') return { ...prev, lng: prev.lng + moveStep };
                return prev;
            });
        };

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('languageChange', handleLangChange);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('languageChange', handleLangChange);
        };
    }, []);

    // Dùng useMemo để tính toán POI ở gần (giảm tải cho render)
    const poisInAccessRange = useMemo(() => {
        if (!userLoc || pois.length === 0) return [];
        return pois.filter(poi => {
            const dist = getDistance(userLoc.lat, userLoc.lng, poi.latitude, poi.longitude);
            return dist <= (poi.access_range || 10);
        });
    }, [userLoc, pois]);

    // Tách biệt logic cập nhật danh sách Nearby (chỉ chạy khi danh sách lọc được thay đổi)
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

    // Tách biệt logic phát Audio tự động
    useEffect(() => {
        if (!userLoc || pois.length === 0) return;

        let closestPoi = null;
        let minDistance = Infinity;

        pois.forEach(poi => {
            const dist = getDistance(userLoc.lat, userLoc.lng, poi.latitude, poi.longitude);
            if (dist <= poi.audio_range && dist < minDistance) {
                minDistance = dist;
                closestPoi = poi;
            }
        });

        if (closestPoi && lastPlayedPoiId.current !== closestPoi.id) {
            playAudio(closestPoi.audio_url);
            lastPlayedPoiId.current = closestPoi.id;
            toast.success(`Đang nghe giới thiệu về ${closestPoi.name}`, { icon: '🎧' });
        } else if (!closestPoi) {
            lastPlayedPoiId.current = null;
        }
    }, [userLoc]);

    useEffect(() => {
        // Kiểm tra trình duyệt có hỗ trợ không
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = ACCEPT_LANG[currentLang] || 'vi-VN';

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setIsListening(false);
            setQuestion(transcript); 
            handleAskAI(transcript); 
        };

        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);

        recognitionRef.current = recognition;

        // Cleanup khi component unmount
        return () => {
            if (recognitionRef.current) recognitionRef.current.stop();
        };
    }, [currentLang, handleAskAI]);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            toast.error("Trình duyệt của bạn không hỗ trợ nhận diện giọng nói");
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            setQuestion(""); // Xóa câu cũ trước khi nói câu mới
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

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

    const handleViewDetail = async (poi) => {
        setSelectedPoi(poi); 
        setIsQRModalOpen(true);
    };

    const handleScanSuccess = async () => {
        if (!selectedPoi) return;

        setLoading(true);
        try {
            // Lúc này mới thực sự gọi API để lấy full description, banner, v.v.
            const res = await api.get(`/pois/get-poi-by-id/${selectedPoi.id}`);
            
            if (res.data.success) {
                setSelectedPoi(res.data.data); // Cập nhật dữ liệu đầy đủ vào state
                setIsQRModalOpen(false);       // Đóng QR
                setQuestion("")
                setIsModalOpen(true);         // Mở Modal chi tiết
            }
        } catch (err) {
            toast.error("Không thể xác thực thông tin địa điểm");
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

            return updatedList;
        });

        // Luôn mở rộng thanh danh sách khi người dùng tương tác
        setIsExpanded(true);
    };

    // const playAudio = (url) => {
    //     if (audioRef.current && url) {
    //         audioRef.current.src = `${API_URL}${url}`;
    //         audioRef.current.play();
    //         // audioRef.current.onended = () => {
    //         //     lastPlayedPoiId.current = null;
    //         // };
    //     }
    // };

    const playAudio = async (url) => {
        if (audioRef.current && url) {
            try {
                audioRef.current.src = `${API_URL}${url}`;
                // Play trả về một Promise, chúng ta nên await nó
                await audioRef.current.play();
            } catch (error) {
                console.warn("Autoplay bị chặn bởi trình duyệt. Đang chờ người dùng tương tác...");
                // Bạn có thể hiện một cái Toast hoặc Icon "Bấm để nghe" ở đây
            }
        }
    };

    return (
            <div className="fixed inset-0 md:ml-64 ml-0 pt-16 bg-white z-10 overflow-hidden flex flex-col">
                {loading && <FullPageLoading />}
                <audio ref={audioRef} hidden />

                {/* THANH TÌM KIẾM NỔI */}
                <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-lg px-4">
                    <Card className="!p-0 border rounded-lg shadow-2xl"> 
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
                            <React.Fragment key={poi.id}>
                                <Marker 
                                    key={poi.id} 
                                    position={[poi.latitude, poi.longitude]}
                                    eventHandlers={{ click: () => addToNearby(poi) }}
                                />
                                <Circle 
                                    center={[poi.latitude, poi.longitude]} // Tâm của vòng tròn trùng với Marker
                                    radius={poi.audio_range}
                                />
                                <Circle 
                                    center={[poi.latitude, poi.longitude]} 
                                    radius={poi.access_range || 10}
                                    pathOptions={{ 
                                        color: '#3b82f6',       // Blue-500
                                        fillColor: '#93c5fd',   // Blue-300
                                        fillOpacity: 0.2,
                                        dashArray: '5, 10'
                                    }}
                                />

                            </React.Fragment>
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

            {/* MODAL QR */}
            <Modal 
                isOpen={isQRModalOpen} 
                onClose={() => setIsQRModalOpen(false)}
                extraClasses="!max-w-xl !p-8 text-center"
                showCloseButton={false}
            >
                {selectedPoi && (
                    <div className="flex flex-col items-center gap-6">
                        <h3 className="text-2xl font-black text-gray-900 uppercase">
                            Xác thực tại {selectedPoi.name}
                        </h3>
                        
                        <div className="flex flex-col md:flex-row gap-6 items-center w-full">
                            
                            {/* CỘT TRÁI: CAMERA QUÉT THẬT (Html5Qrcode) */}
                            <div className="flex-1 w-full border-4 border-blue-600 rounded-3xl overflow-hidden shadow-2xl bg-black">
                                {isQRModalOpen && (
                                        <QRScanner
                                            key={selectedPoi.id}
                                            expectedId={selectedPoi.id} 
                                            onScanSuccess={handleScanSuccess} 
                                        />
                                    )}
                            </div>

                            {/* CỘT PHẢI: MÃ QR MẪU ĐỂ TEST (QRCodeSVG) */}
                            <div className="w-full md:w-[220px] p-6 bg-white border-2 border-dashed border-gray-200 rounded-3xl shadow-inner flex flex-col items-center gap-4">
                                <div className="p-2 bg-white border-2 border-gray-100 rounded-xl relative group">
                                    {/* Dùng QRCodeCanvas và đặt ID để hàm download có thể tìm thấy */}
                                    <QRCodeCanvas 
                                        id="qr-gen"
                                        value={String(selectedPoi.id)} 
                                        size={512}
                                        style={{ 
                                            width: '160px', 
                                            height: '160px',
                                            padding: '10px',
                                            backgroundColor: 'white' 
                                        }} 
                                        marginSize={4}
                                        level="H"
                                    />
                                </div>
                                
                                <div className="text-center w-full">
                                    {/* NÚT TẢI QR */}
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={downloadQRCode}
                                        className="w-full mb-3 flex items-center justify-center gap-2 !text-[10px] !py-1.5"
                                    >
                                        <Download size={12} /> Tải mã về máy
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Nút bấm dành cho demo */}
                        <button 
                            onClick={handleScanSuccess}
                            className="text-xs text-blue-300 underline hover:text-blue-500 mt-2"
                        >
                            (Xác nhận ảo nếu camera lỗi)
                        </button>
                    </div>
                )}
            </Modal>

            <Modal 
                isOpen={isModalOpen}    
                onClose={() => {setIsModalOpen(false); setAiResponse(""); setDisplayQuestion("")}}
                showCloseButton={false}
                extraClasses="!max-w-6xl h-[90vh] !p-0 overflow-hidden !rounded-2xl"
            >
                {selectedPoi && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 h-full bg-white">
                        
                        {/* CỘT TRÁI: THÔNG TIN CHI TIẾT (Cuộn độc lập) */}
                        <div className="flex flex-col h-full border-r border-gray-100 overflow-y-auto">
                            <div className="relative h-[240px] w-full shrink-0">
                                <img src={`${API_URL}${selectedPoi.banner}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                                <h2 className="absolute bottom-6 left-8 text-2xl font-black text-white uppercase">
                                    {selectedPoi.name}
                                </h2>
                            </div>
                            
                            <div className="p-8">
                                <div className="flex items-center gap-2 mb-4 text-blue-600 font-bold text-xs uppercase">
                                    <div className="w-6 h-[2px] bg-blue-600" /> Giới thiệu
                                </div>
                                <p className="text-gray-600 leading-relaxed text-lg text-justify">
                                    {selectedPoi.description}
                                </p>
                            </div>
                        </div>

                        {/* CỘT PHẢI: TRỢ LÝ AI (Hỏi đáp) */}
                        <div className="flex flex-col h-full bg-gray-50/50">
                            {/* Header AI */}
                            <div className="p-6 bg-white border-b border-gray-100 flex items-center gap-3">
                                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-500">
                                    <Bot size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900">Trợ lý ảo FoodTour</h4>
                                    <p className="text-[10px] text-green-500 flex items-center gap-1">
                                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Đang trực tuyến
                                    </p>
                                </div>
                            </div>

                            {/* Nội dung Chat */}
                            <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
                                {/* Câu chào mặc định */}
                                <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 max-w-[85%]">
                                    <p className="text-sm text-gray-800">
                                        Xin chào! Mình là Laura, trợ lý ảo của <b>{selectedPoi.name}</b>. Bạn có thông tin nào muốn biết về quán, cứ hỏi mình nhé!
                                    </p>
                                </div>

                                {/* Hộp thoại */}
                                {displayQuestion && (
                                    <div className="bg-blue-500 p-4 rounded-2xl rounded-tr-none shadow-md text-white max-w-[85%] self-end transition-all duration-2000 animate-in fade-in slide-in-from-left-1">
                                        <p className="text-sm leading-relaxed">{displayQuestion}</p>
                                    </div>
                                )}
                                {aiResponse && (
                                    <div className="bg-orange-500 p-4 rounded-2xl rounded-tl-none shadow-md text-white max-w-[85%] self-start transition-all duration-2000 animate-in fade-in slide-in-from-left-1">
                                        <p className="text-sm leading-relaxed">{aiResponse}</p>
                                    </div>
                                )}

                                {isAiLoading && (
                                    <div className="flex gap-2 p-2">
                                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" />
                                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-white border-t border-gray-100">
                                <div className="flex items-center gap-2">
                                    <div className="flex-1">
                                        <input 
                                            type="text"
                                            value={question}
                                            onChange={(e) => setQuestion(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                                            placeholder={isListening ? "Đang lắng nghe..." : "Hỏi về món ăn, giá cả..."}
                                            className={`w-full pl-4 pr-4 py-3 bg-gray-100 border-none rounded-xl text-sm transition-all ${
                                                isListening ? "ring-2 ring-red-400 bg-red-50" : "focus:ring-2 focus:ring-orange-500"
                                            }`}
                                        />
                                    </div>
                                    <button 
                                        onClick={toggleListening}
                                        disabled={isAiLoading}
                                        className={`p-3 rounded-lg transition-colors flex-shrink-0 ${
                                            isListening ? "text-red-500 animate-pulse bg-red-100" : "text-gray-400 hover:bg-gray-200"
                                        }`}
                                        title="Nói để đặt câu hỏi"
                                    >
                                        <div className="relative">
                                            <Volume2 size={20} />
                                            {isListening && (
                                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                                            )}
                                        </div>
                                    </button>
                                    <button 
                                        onClick={() => handleAskAI()}
                                        disabled={isAiLoading || !question.trim() || isListening}
                                        className="p-3 bg-orange-500 text-white rounded-xl disabled:opacity-30 hover:bg-orange-600 transition-all shadow-sm flex-shrink-0"
                                    >
                                        <Send size={20} />
                                    </button>
                                </div>
                                
                                {/* Hiển thị dòng text đang nghe (nếu có) để user check */}
                                {isListening && (
                                    <p className="mt-2 text-[10px] text-red-500 font-bold animate-pulse text-center">
                                        Mời bạn nói, Laura đang nghe...
                                    </p>
                                )}
                                
                                <p className="mt-2 font-bold text-sm text-blue-400 text-center">
                                    Hạn chế sử dụng các kí tự đặc biệt *, -, %, @,...
                                </p>
                                <p className="mt-2 text-[10px] text-gray-400 text-center">
                                    AI có thể trả lời sai, hãy xác thực lại thông tin với chủ quán.
                                </p>
                            </div>
                        </div>

                    </div>
                )}
            </Modal>

        </div>
    );
};

export default TouristExplore;