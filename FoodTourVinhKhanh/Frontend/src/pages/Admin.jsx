import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Admin(){
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        alert("Đăng xuất thành công!");
        navigate("/login");
    }
    return (
        <>
            <h1>
                This is admin page!
            </h1>
            <button onClick={handleLogout}>Logout</button>
        </>
    )
}