// import { useEffect, useRef, useState } from 'react';
// import { Html5Qrcode } from 'html5-qrcode';
// import { Upload } from 'lucide-react'; // Thêm icon để làm nút chọn file

// const QRScanner = ({ onScanSuccess, expectedId }) => {
//     const scannerRef = useRef(null);
//     const isLock = useRef(false);
//     const [isCameraActive, setIsCameraActive] = useState(true);

//     useEffect(() => {
//         if (isLock.current) return;
//         isLock.current = true;

//         const html5QrCode = new Html5Qrcode("reader");
//         scannerRef.current = html5QrCode;

//         const startScanning = async () => {
//             try {
//                 await html5QrCode.start(
//                     { facingMode: "environment" },
//                     { fps: 10, qrbox: { width: 250, height: 250 } },
//                     (decodedText) => {
//                         if (decodedText.includes(String(expectedId))) {
//                             handleStop().then(() => onScanSuccess());
//                         }
//                     },
//                     () => {}
//                 );
//             } catch (err) {
//                 console.error("Camera error:", err);
//                 setIsCameraActive(false); // Nếu lỗi camera thì ẩn khung video
//                 isLock.current = false;
//             }
//         };

//         startScanning();

//         return () => {
//             isLock.current = false;
//             if (scannerRef.current && scannerRef.current.isScanning) {
//                 scannerRef.current.stop().catch(() => {}); 
//             }
//         };
//     }, [expectedId]);

//     const handleStop = async () => {
//         // Chỉ dừng nếu scanner đang thực sự chạy (isScanning)
//         if (scannerRef.current && scannerRef.current.isScanning) {
//             try {
//                 await scannerRef.current.stop();
//                 // Xóa nội dung trong div để tránh rác DOM
//                 const container = document.getElementById("reader");
//                 if (container) container.innerHTML = "";
//             } catch (err) {
//                 // Không log lỗi nếu nó chỉ là lỗi "không tìm thấy Node để xóa"
//                 if (!err.includes("removeChild")) {
//                     console.warn("Dừng scanner thất bại:", err);
//                 }
//             }
//         }
//     };

//     // HÀM XỬ LÝ KHI NGƯỜI DÙNG CHỌN FILE ẢNH
//     const handleFileChange = async (e) => {
//         const file = e.target.files[0];
//         if (!file || !scannerRef.current) return;

//         try {
//             // Quét file bằng một instance tạm thời để không đụng chạm vào Camera đang chạy
//             const temporaryScanner = new Html5Qrcode("reader");
//             const decodedText = await temporaryScanner.scanFile(file, true);
            
//             if (decodedText.includes(String(expectedId))) {
//                 // 1. Dừng camera trước
//                 await handleStop();
//                 // 2. Chờ một nhịp nhỏ (vài ms) để DOM ổn định
//                 setTimeout(() => {
//                     onScanSuccess(); // 3. Lúc này mới đóng Modal
//                 }, 100);
//             } else {
//                 alert(`Mã này không đúng địa điểm! (Mã: ${decodedText})`);
//             }
//         } catch (err) {
//             alert("Không tìm thấy mã QR trong ảnh. Bạn hãy thử chụp lại hoặc tải lại mã nhé!");
//         } finally {
//             e.target.value = ""; // Reset input file
//         }
//     };

//     return (
//         <div className="w-full relative bg-black aspect-[3/4] flex flex-col items-center justify-center overflow-hidden group">
//             <div id="reader" className="w-full h-full"></div>

//             {/* NÚT TẢI ẢNH LÊN (Nằm đè lên khung camera) */}
//             <div className="absolute bottom-4 left-0 right-0 flex justify-center px-4">
//                 <label className="flex items-center gap-2 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white text-xs font-medium py-2 px-4 rounded-full cursor-pointer transition-all border border-white/30 shadow-lg">
//                     <Upload size={14} />
//                     Quét từ ảnh trong máy
//                     <input 
//                         type="file" 
//                         accept="image/*" 
//                         className="hidden" 
//                         onChange={handleFileChange} 
//                     />
//                 </label>
//             </div>

//             <style>{`
//                 #reader video {
//                     width: 100% !important;
//                     height: 100% !important;
//                     object-fit: cover !important;
//                 }
//                 #reader { border: none !important; }
//             `}</style>
//         </div>
//     );
// };

// export default QRScanner;

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
            // Cleanup cực mạnh khi unmount
            if (scannerRef.current) {
                if (scannerRef.current.isScanning) {
                    scannerRef.current.stop().catch(() => {});
                }
            }
        };
    }, [expectedId]);

    // Hàm dừng cưỡng chế để không bị lỗi Transition
    const forceStopAndSuccess = async () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            try {
                await scannerRef.current.stop();
            } catch (e) {
                // Kệ nó nếu nó báo lỗi transition, ta chỉ cần nó dừng lại
            }
        }
        onScanSuccess();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Tạo một instance RIÊNG BIỆT chỉ để quét file, không dùng chung với scannerRef
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
            fileScanner.clear(); // Dọn dẹp instance tạm
            e.target.value = "";
        }
    };

    return (
        <div className="w-full relative bg-black aspect-[3/4] flex flex-col items-center justify-center overflow-hidden">
            {/* Khung quét camera chính */}
            <div id="reader" className="w-full h-full"></div>
            
            {/* Div ẩn để xử lý quét file, tránh xung đột với id="reader" */}
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