export const getVisitorId = () => {
    // Nếu là User đã login thì lấy User ID, nếu chưa thì dùng Guest ID trong LocalStorage
    const userInfo = JSON.parse(localStorage.getItem('user_info'));
    
    let guestId = localStorage.getItem('guest_id');
    if (!guestId) {
        guestId = `guest_${Math.random().toString(36).substring(2, 11)}`;
        localStorage.setItem('guest_id', guestId);
    }
    return guestId;
};