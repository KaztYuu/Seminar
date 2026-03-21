import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Admin(){

    const { fetchUser } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async (e) => {
        e.preventDefault();

        const res = await fetch("http://localhost:8000/auth/logout", {
        method: "POST",
        credentials: "include"
        });

        const data = await res.json();

        if (!res.ok) {
        alert(data.detail || data.message);
        return;
        }

        await fetchUser();
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