import { useState, useEffect } from "react";
import { Save, Eye, EyeOff, ShieldCheck } from "lucide-react";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { toast } from "react-hot-toast";

const VendorProfile = () => {
  const { user, fetchUser } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    currentPass: "",
    newPass: "",
    confirmPass: "",
  });

  const [showPass, setShowPass] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState({
    profile: false,
    password: false,
  });

  const [loading, setLoading] = useState({
    profile: false,
    password: false,
  });

  // Sync user vào form
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user.name,
        phoneNumber: user.phoneNumber || "",
      }));
    }
  }, [user]);

  const toggleShow = (field) => {
    setShowPass((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  // ================= UPDATE PROFILE =================
  const handleUpdateProfile = async () => {
    if (!formData.name.trim()) {
      toast.error("Tên không được để trống");
      return;
    }

    try {
      setLoading((prev) => ({ ...prev, profile: true }));

      await api.put("/users/me", {
        name: formData.name,
        phoneNumber: formData.phoneNumber,
      });

      await fetchUser(); // Sync lại global user

      toast.success("Cập nhật thông tin thành công");

      setSaveStatus((prev) => ({ ...prev, profile: true }));

      setTimeout(() => {
        setSaveStatus((prev) => ({ ...prev, profile: false }));
      }, 2000);
    } catch {
      /* empty */
    } finally {
      setLoading((prev) => ({ ...prev, profile: false }));
    }
  };

  // ================= CHANGE PASSWORD =================
  const handleChangePassword = async () => {
    setError("");

    if (!formData.currentPass || !formData.newPass || !formData.confirmPass) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    if (formData.newPass.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    if (formData.newPass !== formData.confirmPass) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    try {
      setLoading((prev) => ({ ...prev, password: true }));

      await api.put("/users/change-password", {
        current_password: formData.currentPass,
        new_password: formData.newPass,
      });

      toast.success("Đổi mật khẩu thành công");

      setSaveStatus((prev) => ({ ...prev, password: true }));

      // reset form
      setFormData((prev) => ({
        ...prev,
        currentPass: "",
        newPass: "",
        confirmPass: "",
      }));

      setTimeout(() => {
        setSaveStatus((prev) => ({ ...prev, password: false }));
      }, 2000);

      fetchUser();
    } catch (err) {
      setError(err.response?.data?.detail || "Lỗi đổi mật khẩu");
    } finally {
      setLoading((prev) => ({ ...prev, password: false }));
    }
  };

  const initials = (formData.name || user?.name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  return (
    <div className="max-w-5xl mx-auto p-4 pb-10 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="text-center md:text-left pt-2">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Cài đặt tài khoản
        </h1>
        <p className="text-gray-300 text-sm mt-1">
          Cập nhật thông tin cá nhân và quản lý bảo mật.
        </p>
      </div>

      {/* ===== PROFILE ===== */}
      <Card className="border-none shadow-xl bg-white p-6">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-lg font-bold shadow-md">
            {initials}
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-lg">
              {formData.name || "Người dùng"}
            </h3>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Input label="Email" value={user?.email || ""} disabled />
          <Input label="Vai trò" value={user?.role || ""} disabled />
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Input
            label="Họ và tên"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
          />

          <Input
            label="Số điện thoại"
            value={formData.phoneNumber}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, phoneNumber: e.target.value }))
            }
          />
        </div>

        <div className="flex justify-end mt-4">
          <Button
            onClick={handleUpdateProfile}
            disabled={loading.profile}
            className="bg-orange-500 hover:bg-orange-600">
            <Save size={18} className="mr-2" />
            {loading.profile
              ? "Đang lưu..."
              : saveStatus.profile
                ? "Đã lưu!"
                : "Lưu thay đổi"}
          </Button>
        </div>
      </Card>

      {/* ===== PASSWORD ===== */}
      <Card className="border-none shadow-xl bg-white p-6">
        <h3 className="font-bold text-lg mb-6">Đổi mật khẩu</h3>

        <div className="grid lg:grid-cols-3 gap-5">
          {[
            { id: "currentPass", label: "Mật khẩu hiện tại", show: "current" },
            { id: "newPass", label: "Mật khẩu mới", show: "new" },
            { id: "confirmPass", label: "Xác nhận", show: "confirm" },
          ].map((item) => (
            <div key={item.id} className="relative">
              <Input
                label={item.label}
                type={showPass[item.show] ? "text" : "password"}
                value={formData[item.id]}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    [item.id]: e.target.value,
                  }));
                  setError("");
                }}
              />
              <button
                type="button"
                onClick={() => toggleShow(item.show)}
                className="absolute right-0 top-6.5 text-gray-400 hover:text-orange-500 transition-colors">
                {showPass[item.show] ? <EyeOff /> : <Eye />}
              </button>
            </div>
          ))}
        </div>

        {error && <p className="text-red-500 mt-3 text-sm">* {error}</p>}

        <div className="mt-6 flex items-center gap-4">
          <Button
            onClick={handleChangePassword}
            disabled={loading.password}
            className="bg-slate-800 text-white">
            <ShieldCheck size={18} className="mr-2" />
            {loading.password ? "Đang xử lý..." : "Cập nhật mật khẩu"}
          </Button>

          {saveStatus.password && (
            <span className="text-green-600 text-sm">
              ✔ Mật khẩu đã cập nhật
            </span>
          )}
        </div>
      </Card>
    </div>
  );
};

export default VendorProfile;
