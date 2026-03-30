// import { useState } from "react";
// import { Store, Mail, Phone, MapPin, Lock, Save, Eye, EyeOff, Globe } from "lucide-react";
// import Card from "../../components/common/Card";
// import Button from "../../components/common/Button";
// import Input from "../../components/common/Input";
// import { useAuth } from "../../context/AuthContext";

// const VendorProfile = () => {
//   const { user } = useAuth();

//   const [profileForm, setProfileForm] = useState({
//     name: user?.name || "Trần Thị B",
//     shopName: "Quán Ăn Vinh Khánh",
//     phone: "0987 654 321",
//     address: "An Giang, Việt Nam",
//     website: "",
//   });

//   const [passwordForm, setPasswordForm] = useState({
//     current: "",
//     newPass: "",
//     confirm: "",
//   });

//   const [showPass, setShowPass] = useState({ current: false, newPass: false, confirm: false });
//   const [passwordError, setPasswordError] = useState("");
//   const [profileSaved, setProfileSaved] = useState(false);
//   const [passwordSaved, setPasswordSaved] = useState(false);

//   const initials = (profileForm.name || "?")
//     .split(" ")
//     .map((w) => w[0])
//     .slice(-2)
//     .join("")
//     .toUpperCase();

//   const handleProfileSave = () => {
//     setProfileSaved(true);
//     setTimeout(() => setProfileSaved(false), 2000);
//   };

//   const handlePasswordSave = () => {
//     setPasswordError("");
//     if (!passwordForm.current) return setPasswordError("Vui lòng nhập mật khẩu hiện tại.");
//     if (passwordForm.newPass.length < 6) return setPasswordError("Mật khẩu mới phải có ít nhất 6 ký tự.");
//     if (passwordForm.newPass !== passwordForm.confirm) return setPasswordError("Mật khẩu xác nhận không khớp.");
//     setPasswordSaved(true);
//     setPasswordForm({ current: "", newPass: "", confirm: "" });
//     setTimeout(() => setPasswordSaved(false), 2000);
//   };

//   const toggleShow = (field) =>
//     setShowPass((prev) => ({ ...prev, [field]: !prev[field] }));

//   return (
//     <div className="max-w-4xl mx-auto p-8 space-y-8 animate-in fade-in duration-500">
//       {/* Header */}
//       <div>
//         <h1 className="text-3xl font-extrabold text-white tracking-tight">Hồ sơ cá nhân</h1>
//         <p className="text-gray-300 mt-1">Xem và chỉnh sửa thông tin tài khoản của bạn.</p>
//       </div>

//       {/* Identity Card */}
//       <Card>
//         <div className="flex items-center gap-6">
//           <div className="w-20 h-20 rounded-full bg-orange-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-orange-200 flex-shrink-0">
//             {initials}
//           </div>
//           <div className="flex-1 min-w-0">
//             <h2 className="text-xl font-bold text-gray-900 truncate">{profileForm.name}</h2>
//             <div className="flex items-center gap-2 mt-1">
//               <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
//                 Vendor
//               </span>
//             </div>
//             <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
//               <Mail size={14} />
//               <span className="truncate">{user?.email || "vendor@example.com"}</span>
//             </div>
//             <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
//               <Store size={14} />
//               <span className="truncate">{profileForm.shopName}</span>
//             </div>
//           </div>
//         </div>
//       </Card>

//       {/* Edit Profile */}
//       <Card>
//         <div className="flex items-center gap-3 mb-6">
//           <div className="p-2.5 bg-orange-50 rounded-xl">
//             <Store size={18} className="text-orange-500" />
//           </div>
//           <div>
//             <h3 className="font-semibold text-gray-900">Thông tin cá nhân</h3>
//             <p className="text-xs text-gray-400">Cập nhật thông tin hiển thị của bạn</p>
//           </div>
//         </div>

//         <div className="space-y-4">
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <Input
//               label="Họ và tên"
//               placeholder="Nhập họ và tên"
//               value={profileForm.name}
//               onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
//             />
//             <Input
//               label="Tên gian hàng"
//               placeholder="Tên quán / nhà hàng"
//               value={profileForm.shopName}
//               onChange={(e) => setProfileForm({ ...profileForm, shopName: e.target.value })}
//             />
//           </div>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <Input
//               label="Email"
//               placeholder="Email"
//               value={user?.email || "vendor@example.com"}
//               disabled
//               className="opacity-60 cursor-not-allowed"
//             />
//             <Input
//               label="Số điện thoại"
//               placeholder="VD: 0987 654 321"
//               value={profileForm.phone}
//               onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
//             />
//           </div>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <Input
//               label="Địa chỉ"
//               placeholder="VD: An Giang, Việt Nam"
//               value={profileForm.address}
//               onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
//             />
//             <Input
//               label="Website (tuỳ chọn)"
//               placeholder="VD: https://quancua.vn"
//               value={profileForm.website}
//               onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
//             />
//           </div>
//         </div>

//         <div className="mt-6 flex items-center gap-3">
//           <Button onClick={handleProfileSave} size="md" variant="primary" className="bg-orange-500 shadow-orange-200 hover:bg-orange-600">
//             <Save size={15} className="mr-2" />
//             {profileSaved ? "Đã lưu!" : "Lưu thay đổi"}
//           </Button>
//           {profileSaved && (
//             <span className="text-sm text-green-600 font-medium">✓ Cập nhật thành công</span>
//           )}
//         </div>
//       </Card>

//       {/* Change Password */}
//       <Card>
//         <div className="flex items-center gap-3 mb-6">
//           <div className="p-2.5 bg-orange-50 rounded-xl">
//             <Lock size={18} className="text-orange-500" />
//           </div>
//           <div>
//             <h3 className="font-semibold text-gray-900">Bảo mật tài khoản</h3>
//             <p className="text-xs text-gray-400">Đổi mật khẩu để bảo vệ tài khoản</p>
//           </div>
//         </div>

//         <div className="space-y-4">
//           {[
//             { field: "current", label: "Mật khẩu hiện tại", placeholder: "Nhập mật khẩu hiện tại" },
//             { field: "newPass", label: "Mật khẩu mới", placeholder: "Ít nhất 6 ký tự" },
//             { field: "confirm", label: "Xác nhận mật khẩu mới", placeholder: "Nhập lại mật khẩu mới" },
//           ].map(({ field, label, placeholder }) => (
//             <div key={field} className="relative">
//               <Input
//                 label={label}
//                 type={showPass[field] ? "text" : "password"}
//                 placeholder={placeholder}
//                 value={passwordForm[field]}
//                 onChange={(e) => setPasswordForm({ ...passwordForm, [field]: e.target.value })}
//                 error={field === "confirm" ? passwordError : ""}
//               />
//               <button
//                 type="button"
//                 onClick={() => toggleShow(field)}
//                 style={{ background: 'none', border: 'none', padding: '4px' }}
//                 className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
//               >
//                 {showPass[field] ? <EyeOff size={16} /> : <Eye size={16} />}
//               </button>
//             </div>
//           ))}
//         </div>

//         {passwordError && !passwordForm.confirm && (
//           <p className="text-sm text-red-500 mt-2">{passwordError}</p>
//         )}

//         <div className="mt-6 flex items-center gap-3">
//           <Button onClick={handlePasswordSave} size="md" variant="primary" className="bg-orange-500 shadow-orange-200 hover:bg-orange-600">
//             <Lock size={15} className="mr-2" />
//             {passwordSaved ? "Đã đổi!" : "Đổi mật khẩu"}
//           </Button>
//           {passwordSaved && (
//             <span className="text-sm text-green-600 font-medium">✓ Mật khẩu đã cập nhật</span>
//           )}
//         </div>
//       </Card>
//     </div>
//   );
// };

// export default VendorProfile;

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

  // 🔥 sync user vào form
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

      await fetchUser(); // 🔥 sync lại global user

      toast.success("Cập nhật thông tin thành công");

      setSaveStatus((prev) => ({ ...prev, profile: true }));

      setTimeout(() => {
        setSaveStatus((prev) => ({ ...prev, profile: false }));
      }, 2000);
    } catch (err) {
      // interceptor đã handle
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
            className="bg-orange-500 hover:bg-orange-600"
          >
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
                className="absolute right-0 top-6.5 text-gray-400 hover:text-orange-500 transition-colors"
              >
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
            className="bg-slate-800 text-white"
          >
            <ShieldCheck size={18} className="mr-2" />
            {loading.password
              ? "Đang xử lý..."
              : "Cập nhật mật khẩu"}
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