import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { toast } from 'react-hot-toast';
import { Image as ImageIcon, Camera } from 'lucide-react';

const QRScannerZXing = ({ expectedId, onScanSuccess }) => {
    const videoRef = useRef(null);
    const fileInputRef = useRef(null);
    const codeReader = useRef(new BrowserMultiFormatReader());
    const [isCameraReady, setIsCameraReady] = useState(false);

    // 1. Khởi tạo Camera
    useEffect(() => {
        let isMounted = true;
        let isScanning = false; // Biến cờ để kiểm soát trạng thái quét

        const startScanner = async () => {
            // Nếu đang quét rồi thì không khởi động thêm cái mới
            if (isScanning) return; 

            try {
                // Đảm bảo dừng mọi luồng cũ trước khi bắt đầu
                await codeReader.current.reset();
                
                if (isMounted && videoRef.current) {
                    isScanning = true; // Đánh dấu bắt đầu quét
                    
                    await codeReader.current.decodeFromVideoDevice(
                        null, 
                        videoRef.current, 
                        (result, err) => {
                            if (result && isMounted) {
                                handleVerify(result.getText());
                            }
                        }
                    );
                    setIsCameraReady(true);
                }
            } catch (error) {
                // Chặn lỗi "already playing" không cho hiện console nếu nó vô hại
                if (error.name !== 'NotReadableError' && !error.message?.includes('already playing')) {
                    console.error("Camera Error:", error);
                }
            }
        };

        startScanner();

        return () => {
            isMounted = false;
            isScanning = false;
            // Dừng camera ngay lập tức khi component bị gỡ bỏ
            codeReader.current.reset(); 
        };
    }, []);

    // 2. Xử lý file ảnh upload
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const loadingToast = toast.loading("Đang đọc mã QR từ ảnh...");
        try {
            const imageUrl = URL.createObjectURL(file);
            const img = new Image();
            img.src = imageUrl;
            
            img.onload = async () => {
                try {
                    const result = await codeReader.current.decodeFromImageElement(img);
                    toast.dismiss(loadingToast);
                    handleVerify(result.getText());
                } catch (err) {
                    toast.dismiss(loadingToast);
                    toast.error("Không tìm thấy mã QR hợp lệ trong ảnh!");
                } finally {
                    URL.revokeObjectURL(imageUrl);
                }
            };
        } catch (err) {
            toast.dismiss(loadingToast);
            toast.error("Lỗi khi xử lý ảnh!");
        }
        // Reset input để có thể chọn lại cùng 1 file
        e.target.value = null;
    };

    // 3. Hàm xác thực
    const handleVerify = (scannedContent) => {
        // Nếu có yêu cầu ID cụ thể thì mới so khớp, không thì cứ quét trúng là trả về
        if (!expectedId || scannedContent === String(expectedId)) {
            toast.success("Xác thực thành công!");
            codeReader.current.reset();
            onScanSuccess(scannedContent); // Truyền nội dung quét được vào đây
        } else {
            toast.error("Mã QR không khớp với địa điểm!");
        }
    };

    return (
        <div className="w-full flex flex-col gap-6 p-2">
            {/* Vùng Camera */}
            <div className="relative w-full aspect-square bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-gray-800">
                <video 
                    ref={videoRef} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                
                {/* Overlay giả lập khung quét */}
                <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                    <div className="w-full h-full border-2 border-blue-500/50 rounded-sm relative">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-500"></div>
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-500"></div>
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-500"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-500"></div>
                        
                        {/* Thanh laser chạy */}
                        <div className="w-full h-1 bg-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-scan"></div>
                    </div>
                </div>

                {!isCameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-gray-400">
                        <Camera className="animate-pulse mr-2" />
                        <span>Đang kết nối camera...</span>
                    </div>
                )}
            </div>

            {/* Nút Upload - Đảm bảo luôn hiển thị */}
            <div className="flex flex-col items-center gap-3">
                <input 
                    type="file" 
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden" 
                    onChange={handleFileUpload}
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full max-w-xs flex items-center justify-center z-[100] gap-3 px-6 py-4 bg-white text-gray-900 rounded-2xl hover:bg-gray-100 active:scale-95 transition-all shadow-lg border border-gray-200"
                >
                    <ImageIcon className="text-blue-600" size={24} />
                    <span className="text-blue-600">Tải ảnh QR từ máy</span>
                </button>
                <p className="text-xs text-gray-500 italic">
                    Nếu du khách đã lưu ảnh trong thiết bị
                </p>
            </div>

            <style>{`
                @keyframes scan {
                    0% { transform: translateY(0); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateY(250px); opacity: 0; }
                }
                .animate-scan {
                    animation: scan 2.5s infinite linear;
                }
            `}</style>
        </div>
    );
};

export default QRScannerZXing;