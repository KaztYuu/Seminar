import React, { useState } from 'react';
import api from '../utils/api';

const TestRAG = () => {
    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");
    const [loading, setLoading] = useState(false);
    const [selectedPoi, setSelectedPoi] = useState(1); // Giả sử POI ID = 1

    // const speakResponse = (text, langCode = 'vi-VN') => {
    //     // Kiểm tra trình duyệt có hỗ trợ không
    //     if (!window.speechSynthesis) {
    //         console.error("Trình duyệt không hỗ trợ TTS");
    //         return;
    //     }

    //     // Hủy các câu đang đọc dở để tránh chồng chéo
    //     window.speechSynthesis.cancel();

    //     const utterance = new SpeechSynthesisUtterance(text);
        
    //     // Thiết lập ngôn ngữ (vi-VN, en-US, fr-FR, ko-KR)
    //     utterance.lang = langCode;
    //     utterance.pitch = 1.5; // Độ cao giọng
    //     utterance.rate = 1;  // Tốc độ đọc

    //     window.speechSynthesis.speak(utterance);
    // };

    const playGeminiVoice = async (text) => {
        try {
            const res = await api.get("/pois/ai/tts", { params: { text } });
            
            if (res.data.success && res.data.audio_base64) {
                const base64Audio = res.data.audio_base64;
                
                // THAY ĐỔI QUAN TRỌNG: 
                // Ép kiểu audio/mp3 ngay tại chuỗi Data URI để trình duyệt không nhận diện nhầm
                const audioSrc = `data:audio/mp3;base64,${base64Audio}`;
                const audio = new Audio(audioSrc);
                
                // Thêm sự kiện kiểm tra lỗi
                audio.onerror = (e) => {
                    console.error("Trình duyệt không thể giải mã file audio này:", e);
                };

                await audio.play();
            }
        } catch (error) {
            console.error("Lỗi kết nối API TTS:", error);
        }
    };

    const handleAsk = async () => {
        if (!question.trim()) return;
        setLoading(true);
        try {
            const res = await api.get("/pois/ai/chat", {
            params: {
                poi_id: selectedPoi,
                question: question
            }
            });

            if (res.data.success) {
                const aiResponse = res.data.data.answer
                
                setAnswer(aiResponse);
                await playGeminiVoice(aiResponse);
            }
        } catch (err) {
            console.error("Lỗi API AI:", err);
            setAnswer("Có lỗi xảy ra khi kết nối với trí tuệ nhân tạo.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Test AI Voice Talk (RAG Mode)</h1>
        
        <div className="mb-4">
            <label className="block mb-2">Chọn ID quán để test (Dữ liệu mẫu):</label>
            <input 
            type="number" 
            value={selectedPoi} 
            onChange={(e) => setSelectedPoi(e.target.value)}
            className="border p-2 rounded w-full"
            />
        </div>

        <textarea 
            className="w-full border p-4 rounded-lg shadow-sm"
            rows="4"
            placeholder="Hỏi AI: Quán có món gì ngon? Giá bao nhiêu?..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
        />

        <button 
            onClick={handleAsk}
            disabled={loading}
            className="mt-4 bg-orange-500 text-white px-6 py-2 rounded-full hover:bg-orange-600 disabled:bg-gray-400"
        >
            {loading ? "AI đang đọc menu..." : "Gửi câu hỏi"}
        </button>

        {answer && (
            <div className="mt-8 p-4 bg-gray-100 text-black rounded-lg border-l-4 border-orange-500">
            <p className="font-bold mb-2">🤖 Trợ lý trả lời:</p>
            <p>{answer}</p>
            </div>
        )}
        </div>
    );
};

export default TestRAG;