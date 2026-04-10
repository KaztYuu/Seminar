import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const QRScanner = ({ onScanSuccess, expectedId }) => {
    const scannerRef = useRef(null);
    const isLock = useRef(false);

    useEffect(() => {
        if (isLock.current) return;
        isLock.current = true;

        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        const startScanning = async () => {
            try {
                await html5QrCode.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (decodedText) => {
                        if (decodedText.includes(String(expectedId))) {
                            forceStopAndSuccess();
                        }
                    },
                    () => {}
                );
            } catch (err) {
                console.error("Camera error:", err);
                isLock.current = false;
            }
        };

        startScanning();

        return () => {
            isLock.current = false;
            if (scannerRef.current) {
                if (scannerRef.current.isScanning) {
                    scannerRef.current.stop().catch(() => {});
                }
            }
        };
    }, [expectedId]);

    const forceStopAndSuccess = async () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            try {
                await scannerRef.current.stop();
            } catch (e) {
            }
        }
        onScanSuccess();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const fileScanner = new Html5Qrcode("file-scanner-temp");
        
        try {
            const decodedText = await fileScanner.scanFile(file, true);
            if (decodedText.includes(String(expectedId))) {
                await forceStopAndSuccess();
            } else {
                alert(`Mã này không phải của ${expectedId}`);
            }
        } catch (err) {
            alert("Không tìm thấy mã QR trong ảnh!");
        } finally {
            fileScanner.clear();
            e.target.value = "";
        }
    };

    return (
        <div className="w-full relative bg-black aspect-[3/4] flex flex-col items-center justify-center overflow-hidden">
            {/* Khung quét camera chính */}
            <div id="reader" className="w-full h-full"></div>
            
            {/* Div ẩn để xử lý quét file */}
            <div id="file-scanner-temp" className="hidden"></div>

            <div className="absolute bottom-4 left-0 right-0 flex justify-center px-4">
                <label className="flex items-center gap-2 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white text-xs font-medium py-2 px-4 rounded-full cursor-pointer transition-all border border-white/30 shadow-lg">
                    Quét từ ảnh trong máy
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
            </div>

            <style>{`
                #reader video { width: 100% !important; height: 100% !important; object-fit: cover !important; }
            `}</style>
        </div>
    );
};

export default QRScanner;