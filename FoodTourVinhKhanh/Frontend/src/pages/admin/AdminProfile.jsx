import { useState } from "react";
import { ShieldCheck, Mail, Phone, Lock, Save, Eye, EyeOff, User } from "lucide-react";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { useAuth } from "../../context/AuthContext";

const AdminProfile = () => {
  const { user } = useAuth();

  const [profileForm, setProfileForm] = useState({
    name: user?.name || "Admin",
    phone: "0900 000 001",
    department: "Ban Quản Trị Hệ Thống",
  });

  const [passwordForm, setPasswordForm] = useState({
    current: "",
    newPass: "",
    confirm: "",
  });

  const [showPass, setShowPass] = useState({ current: false, newPass: false, confirm: false });
  const [passwordError, setPasswordError] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const initials = (profileForm.name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  const handleProfileSave = () => {
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handlePasswordSave = () => {
    setPasswordError("");
    if (!passwordForm.current) return setPasswordError("Vui lòng nhập mật khẩu hiện tại.");
    if (passwordForm.newPass.length < 6) return setPasswordError("Mật khẩu mới phải có ít nhất 6 ký tự.");
    if (passwordForm.newPass !== passwordForm.confirm) return setPasswordError("Mật khẩu xác nhận không khớp.");
    setPasswordSaved(true);
    setPasswordForm({ current: "", newPass: "", confirm: "" });
    setTimeout(() => setPasswordSaved(false), 2000);
  };

  const toggleShow = (field) =>
    setShowPass((prev) => ({ ...prev, [field]: !prev[field] }));

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Hồ sơ cá nhân</h1>
        <p className="text-gray-300 mt-1">Xem và chỉnh sửa thông tin tài khoản quản trị.</p>
      </div>

      {/* Identity Card */}
      <Card>
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-purple-200 flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 truncate">{profileForm.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                Admin
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
              <Mail size={14} />
              <span className="truncate">{user?.email || "admin@example.com"}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
              <ShieldCheck size={14} />
              <span className="truncate">{profileForm.department}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Edit Profile */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-purple-50 rounded-xl">
            <User size={18} className="text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Thông tin cá nhân</h3>
            <p className="text-xs text-gray-400">Cập nhật thông tin hiển thị của bạn</p>
          </div>
        </div>

        <div className="space-y-4">
          <Input
            label="Họ và tên"
            placeholder="Nhập họ và tên"
            value={profileForm.name}
            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email"
              placeholder="Email"
              value={user?.email || "admin@example.com"}
              disabled
              className="opacity-60 cursor-not-allowed"
            />
            <Input
              label="Số điện thoại"
              placeholder="VD: 0900 000 001"
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
            />
          </div>
          <Input
            label="Phòng ban / Bộ phận"
            placeholder="VD: Ban Quản Trị Hệ Thống"
            value={profileForm.department}
            onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
          />
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Button onClick={handleProfileSave} size="md" variant="primary" className="bg-purple-600 shadow-purple-200 hover:bg-purple-700">
            <Save size={15} className="mr-2" />
            {profileSaved ? "Đã lưu!" : "Lưu thay đổi"}
          </Button>
          {profileSaved && (
            <span className="text-sm text-green-600 font-medium">✓ Cập nhật thành công</span>
          )}
        </div>
      </Card>

      {/* Change Password */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-purple-50 rounded-xl">
            <Lock size={18} className="text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Bảo mật tài khoản</h3>
            <p className="text-xs text-gray-400">Đổi mật khẩu để bảo vệ tài khoản quản trị</p>
          </div>
        </div>

        <div className="space-y-4">
          {[
            { field: "current", label: "Mật khẩu hiện tại", placeholder: "Nhập mật khẩu hiện tại" },
            { field: "newPass", label: "Mật khẩu mới", placeholder: "Ít nhất 6 ký tự" },
            { field: "confirm", label: "Xác nhận mật khẩu mới", placeholder: "Nhập lại mật khẩu mới" },
          ].map(({ field, label, placeholder }) => (
            <div key={field} className="relative">
              <Input
                label={label}
                type={showPass[field] ? "text" : "password"}
                placeholder={placeholder}
                value={passwordForm[field]}
                onChange={(e) => setPasswordForm({ ...passwordForm, [field]: e.target.value })}
                error={field === "confirm" ? passwordError : ""}
              />
              <button
                type="button"
                onClick={() => toggleShow(field)}
                style={{ background: 'none', border: 'none', padding: '4px' }}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                {showPass[field] ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          ))}
        </div>

        {passwordError && !passwordForm.confirm && (
          <p className="text-sm text-red-500 mt-2">{passwordError}</p>
        )}

        <div className="mt-6 flex items-center gap-3">
          <Button onClick={handlePasswordSave} size="md" variant="primary" className="bg-purple-600 shadow-purple-200 hover:bg-purple-700">
            <Lock size={15} className="mr-2" />
            {passwordSaved ? "Đã đổi!" : "Đổi mật khẩu"}
          </Button>
          {passwordSaved && (
            <span className="text-sm text-green-600 font-medium">✓ Mật khẩu đã cập nhật</span>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AdminProfile;
