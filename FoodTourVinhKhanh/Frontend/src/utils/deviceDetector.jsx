export const getDeviceMetadata = () => {
  return {
    userAgent: navigator.userAgent.split(' ').slice(-3).join(' '), // Trình duyệt
    platform: navigator.platform, // Hệ điều hành
    screenRes: `${window.screen.width}x${window.screen.height}`, // Độ phân giải
    cores: navigator.hardwareConcurrency || "N/A", // Số nhân CPU
    memory: navigator.deviceMemory ? `${navigator.deviceMemory} GB` : "N/A", // RAM
    language: navigator.language // Ngôn ngữ
  };
};