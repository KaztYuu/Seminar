// import { useState, useEffect } from "react";
// import api from "../../utils/api";
// import Swal from "sweetalert2";

// const ROLE_LABEL = { admin: "Admin", vendor: "Chủ quán", tourist: "Du khách" };
// const ROLE_COLOR = {
//   admin: "bg-purple-100 text-purple-700",
//   vendor: "bg-orange-100 text-orange-700",
//   tourist: "bg-blue-100 text-blue-700",
// };

// const emptyForm = { name: "", email: "", password: "", phoneNumber: "", role: "tourist" };

// const Users = () => {
//   const [users, setUsers] = useState([]);
//   const [search, setSearch] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [showModal, setShowModal] = useState(false);
//   const [editing, setEditing] = useState(null); // null = thêm mới, object = đang sửa
//   const [form, setForm] = useState(emptyForm);

//   // Lấy danh sách user từ API
//   const fetchUsers = async (q = "") => {
//     setLoading(true);
//     try {
//       const res = await api.get(`/users/get-users?search=${q}`);
//       setUsers(res.data.data || []);
//     } catch {
//       Swal.fire("Lỗi", "Không thể tải danh sách người dùng", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => { fetchUsers(); }, []);

//   // Mở modal thêm mới
//   const openAdd = () => {
//     setEditing(null);
//     setForm(emptyForm);
//     setShowModal(true);
//   };

//   // Mở modal chỉnh sửa
//   const openEdit = (user) => {
//     setEditing(user);
//     setForm({
//       name: user.name,
//       email: user.email,
//       password: "",
//       phoneNumber: user.phoneNumber || "",
//       role: user.role,
//       is_Blocked: user.is_Blocked,
//     });
//     setShowModal(true);
//   };

//   // Lưu (thêm mới hoặc cập nhật)
//   const handleSave = async () => {
//     try {
//       if (editing) {
//         const payload = { ...form };
//         if (!payload.password) delete payload.password; // không đổi password nếu để trống
//         await api.put(`/users/update/${editing.id}`, payload);
//         Swal.fire("Thành công!", "Cập nhật người dùng thành công.", "success");
//       } else {
//         await api.post("/users/create", form);
//         Swal.fire("Thành công!", "Thêm người dùng thành công.", "success");
//       }
//       setShowModal(false);
//       fetchUsers(search);
//     } catch (err) {
//       const detail = err.response?.data?.detail;
//       // FastAPI 422: detail là mảng object [{msg, loc, ...}]
//       const message = Array.isArray(detail)
//         ? detail.map((e) => e.msg).join(", ")
//         : (typeof detail === "string" ? detail : "Có lỗi xảy ra");
//       Swal.fire("Lỗi", message, "error");
//     }
//   };

//   // Khóa / Mở khóa tài khoản
//   const handleToggleBlock = async (user) => {
//     const action = user.is_Blocked ? "Mở khóa" : "Khóa";
//     const result = await Swal.fire({
//       title: `${action} tài khoản?`,
//       text: `${action} tài khoản của "${user.name}"?`,
//       icon: "warning",
//       showCancelButton: true,
//       confirmButtonText: action,
//       cancelButtonText: "Hủy",
//     });
//     if (!result.isConfirmed) return;
//     await api.put(`/users/update/${user.id}`, { is_Blocked: !user.is_Blocked });
//     fetchUsers(search);
//   };

//   // Xóa tài khoản (soft delete)
//   const handleDelete = async (user) => {
//     const result = await Swal.fire({
//       title: "Xóa người dùng?",
//       text: `Tài khoản "${user.name}" sẽ bị xóa khỏi hệ thống.`,
//       icon: "warning",
//       showCancelButton: true,
//       confirmButtonText: "Xóa",
//       confirmButtonColor: "#ef4444",
//       cancelButtonText: "Hủy",
//     });
//     if (!result.isConfirmed) return;
//     await api.delete(`/users/delete/${user.id}`);
//     fetchUsers(search);
//   };

//   // Helper: class chung cho input trong modal
//   const inputCls = "mt-1 w-full bg-white/50 border border-slate-200 text-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300";

//   return (
//     <div className="max-w-6xl mx-auto space-y-5">
//       {/* Card header */}
//       <div className="bg-white rounded-2xl border border-slate-200 p-6 flex justify-between items-center">
//         <div>
//           <h1 className="text-2xl font-bold text-slate-700">Quản lý người dùng</h1>
//           <p className="text-slate-400 text-sm mt-0.5">Danh sách tài khoản trên hệ thống</p>
//         </div>
//         <button
//           onClick={openAdd}
//           className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
//         >
//           + Thêm người dùng
//         </button>
//       </div>

//       {/* Card tìm kiếm + bảng */}
//       <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
//         {/* Search bar */}
//         <div className="p-4 border-b border-slate-200 flex gap-2">
//           <input
//             className="flex-1 bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder-slate-400"
//             placeholder="Tìm theo tên, email, số điện thoại..."
//             value={search}
//             autoComplete="on"
//             onChange={(e) => setSearch(e.target.value)}
//             onKeyDown={(e) => e.key === "Enter" && fetchUsers(search)}
//           />
//           <button
//             onClick={() => fetchUsers(search)}
//             className="bg-blue-100 hover:bg-blue-200 text-blue-600 text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
//           >
//             Tìm kiếm
//           </button>
//         </div>

//         {/* Bảng */}
//         {loading ? (
//           <div className="text-center py-16 text-gray-400 text-sm">Đang tải...</div>
//         ) : (
//           <table className="w-full text-sm">
//             <thead>
//               <tr className="bg-slate-100/60 text-xs text-slate-400 uppercase tracking-wider">
//                 <th className="px-5 py-3 text-left font-semibold">Người dùng</th>
//                 <th className="px-5 py-3 text-left font-semibold">Số điện thoại</th>
//                 <th className="px-5 py-3 text-left font-semibold">Vai trò</th>
//                 <th className="px-5 py-3 text-left font-semibold">Trạng thái</th>
//                 <th className="px-5 py-3 text-left font-semibold">Đăng nhập gần nhất</th>
//                 <th className="px-5 py-3 text-left font-semibold">Thao tác</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-100">
//               {users.length === 0 && (
//                 <tr>
//                   <td colSpan={6} className="text-center py-14 text-gray-400 text-sm">
//                     Không tìm thấy người dùng nào
//                   </td>
//                 </tr>
//               )}
//               {users.map((u) => (
//                 <tr key={u.id} className="hover:bg-blue-50/20 transition-colors">
//                   <td className="px-5 py-4">
//                     <div className="font-semibold text-slate-700">{u.name}</div>
//                     <div className="text-xs text-slate-400 mt-0.5">{u.email}</div>
//                   </td>
//                   <td className="px-5 py-4 text-slate-500">{u.phoneNumber || "—"}</td>
//                   <td className="px-5 py-4">
//                     <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_COLOR[u.role]}`}>
//                       {ROLE_LABEL[u.role]}
//                     </span>
//                   </td>
//                   <td className="px-5 py-4">
//                     <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
//                       u.is_Blocked ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
//                     }`}>
//                       <span className={`w-1.5 h-1.5 rounded-full ${u.is_Blocked ? "bg-red-500" : "bg-emerald-500"}`} />
//                       {u.is_Blocked ? "Đã khóa" : "Hoạt động"}
//                     </span>
//                   </td>
//                   <td className="px-5 py-4 text-slate-400 text-xs">
//                     {u.last_login
//                       ? new Date(u.last_login).toLocaleString("vi-VN")
//                       : "Chưa đăng nhập"}
//                   </td>
//                   <td className="px-5 py-4">
//                     <div className="flex gap-2">
//                       <button
//                         onClick={() => openEdit(u)}
//                         className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
//                       >
//                         Sửa
//                       </button>
//                       <button
//                         onClick={() => handleToggleBlock(u)}
//                         className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
//                           u.is_Blocked
//                             ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
//                             : "bg-amber-50 text-amber-600 hover:bg-amber-100"
//                         }`}
//                       >
//                         {u.is_Blocked ? "Mở khóa" : "Khóa"}
//                       </button>
//                       <button
//                         onClick={() => handleDelete(u)}
//                         className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
//                       >
//                         Xóa
//                       </button>
//                     </div>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         )}
//       </div>

//       {/* Modal thêm / sửa */}
//       {showModal && (
//         <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-200">
//             {/* Modal header */}
//             <div className="px-6 py-5 border-b border-slate-200">
//               <h2 className="text-lg font-bold text-slate-700">
//                 {editing ? "Chỉnh sửa người dùng" : "Thêm người dùng mới"}
//               </h2>
//               <p className="text-slate-400 text-sm mt-0.5">
//                 {editing ? `Đang sửa tài khoản: ${editing.email}` : "Điền thông tin để tạo tài khoản mới"}
//               </p>
//             </div>

//             {/* Modal body */}
//             <div className="px-6 py-5 space-y-4">
//               <div>
//                 <label className="block text-sm font-semibold text-slate-600 mb-1">Họ và tên</label>
//                 <input className={inputCls} value={form.name} autoComplete="off" onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nguyễn Văn A" />
//               </div>
//               <div>
//                 <label className="block text-sm font-semibold text-slate-600 mb-1">Email</label>
//                 <input type="email" className={inputCls} value={form.email} autoComplete="off" onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="example@email.com" />
//               </div>
//               <div>
//                 <label className="block text-sm font-semibold text-slate-600 mb-1">
//                   Mật khẩu{" "}
//                   {editing && <span className="text-slate-400 font-normal">(để trống nếu không đổi)</span>}
//                 </label>
//                 <input type="password" className={inputCls} value={form.password} autoComplete="new-password" onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editing ? "Để trống nếu không đổi" : "Tối thiểu 6 ký tự"} />
//               </div>
//               <div>
//                 <label className="block text-sm font-semibold text-slate-600 mb-1">Số điện thoại</label>
//                 <input className={inputCls} value={form.phoneNumber} autoComplete="off" onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} placeholder="09xxxxxxxx" />
//               </div>
//               <div>
//                 <label className="block text-sm font-semibold text-slate-600 mb-1">Vai trò</label>
//                 <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
//                   <option value="tourist">Du khách</option>
//                   <option value="vendor">Chủ quán</option>
//                   <option value="admin">Admin</option>
//                 </select>
//               </div>
//               {editing && (
//                 <label className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-lg cursor-pointer hover:bg-red-100 transition-colors">
//                   <input
//                     type="checkbox"
//                     checked={form.is_Blocked || false}
//                     onChange={(e) => setForm({ ...form, is_Blocked: e.target.checked })}
//                     className="w-4 h-4 accent-red-500"
//                   />
//                   <div>
//                     <p className="text-sm font-semibold text-red-600">Khóa tài khoản</p>
//                     <p className="text-xs text-red-400">Người dùng sẽ không thể đăng nhập</p>
//                   </div>
//                 </label>
//               )}
//             </div>

//             {/* Modal footer */}
//             <div className="px-6 py-4 border-t border-slate-200 flex gap-2">
//               <button
//                 onClick={handleSave}
//                 className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
//               >
//                 {editing ? "Lưu thay đổi" : "Thêm mới"}
//               </button>
//               <button
//                 onClick={() => setShowModal(false)}
//                 className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-600 text-sm font-semibold py-2.5 rounded-xl transition-colors"
//               >
//                 Hủy
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default Users;

import { useState, useEffect } from "react";
import api from "../../utils/api";
import Swal from "sweetalert2";
// Import các Common Components giống AdminPOIs
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Table from '../../components/common/Table';
import SearchBar from '../../components/common/SearchBar';
import { UserPlus, ShieldAlert, Trash2, Key, LockKeyhole, LockKeyholeOpen, SquarePen } from "lucide-react";

const ROLE_LABEL = { admin: "Admin", vendor: "Chủ quán", tourist: "Du khách" };
const ROLE_COLOR = {
  admin: "bg-purple-100 text-purple-700",
  vendor: "bg-orange-100 text-orange-700",
  tourist: "bg-blue-100 text-blue-700",
};

const emptyForm = {
  name: "",
  email: "",
  password: "",
  phoneNumber: "",
  role: "tourist",
};

const Users = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchUsers = async (q = "") => {
    setLoading(true);
    try {
      const res = await api.get(`/users/get-users?search=${q}`);
      setUsers(res.data.data || []);
    } catch {
      Swal.fire("Lỗi", "Không thể tải danh sách người dùng", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      phoneNumber: user.phoneNumber || "",
      role: user.role,
      is_Blocked: user.is_Blocked,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await api.put(`/users/update/${editing.id}`, payload);
        Swal.fire("Thành công!", "Cập nhật người dùng thành công.", "success");
      } else {
        await api.post("/users/create", form);
        Swal.fire("Thành công!", "Thêm người dùng thành công.", "success");
      }
      setShowModal(false);
      fetchUsers(search);
    } catch (err) {
      const detail = err.response?.data?.detail;
      const message = Array.isArray(detail)
        ? detail.map((e) => e.msg).join(", ")
        : detail;
      Swal.fire("Lỗi", message || "Có lỗi xảy ra", "error");
    }
  };

  const handleToggleBlock = async (user) => {
    const action = user.is_Blocked ? "Mở khóa" : "Khóa";
    const result = await Swal.fire({
      title: `${action} tài khoản?`,
      text: `${action} tài khoản của "${user.name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: action,
      cancelButtonText: "Hủy",
    });
    if (!result.isConfirmed) return;
    await api.put(`/users/update/${user.id}`, { is_Blocked: !user.is_Blocked });
    fetchUsers(search);
  };

  const handleDelete = async (user) => {
    const result = await Swal.fire({
      title: "Xóa người dùng?",
      text: `Tài khoản "${user.name}" sẽ bị xóa.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Xóa",
    });
    if (result.isConfirmed) {
      await api.delete(`/users/delete/${user.id}`);
      fetchUsers(search);
    }
  };

  // Cấu hình các cột cho Table component
  const columns = [
    {
      header: "Người dùng",
      render: (u) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-700">{u.name}</span>
          <span className="text-xs text-slate-400">{u.email}</span>
        </div>
      ),
    },
    { header: "Số điện thoại", accessor: "phoneNumber" },
    {
      header: "Vai trò",
      render: (u) => (
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${ROLE_COLOR[u.role]}`}>
          {ROLE_LABEL[u.role]}
        </span>
      ),
    },
    {
      header: "Trạng thái",
      render: (u) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            u.is_Blocked
              ? "bg-red-50 text-red-600"
              : "bg-emerald-50 text-emerald-600"
          }`}>
          <span
            className={`w-1.5 h-1.5 rounded-full ${u.is_Blocked ? "bg-red-500" : "bg-emerald-500"}`}
          />
          {u.is_Blocked ? "Đã khóa" : "Hoạt động"}
        </span>
      ),
    },
    {
      header: "Thao tác",
      render: (u) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => openEdit(u)}><SquarePen size={15} /></Button>
          <Button 
            size="sm" 
            variant={u.is_Blocked ? "primary" : "outline"} 
            className={!u.is_Blocked ? "text-amber-600 border-amber-200 hover:bg-amber-50" : ""}
            onClick={() => handleToggleBlock(u)}
          >
            {u.is_Blocked ? <LockKeyholeOpen size={15} /> : <LockKeyhole size={15} />}
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(u)}><Trash2 size={15}/></Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-5 max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-400 tracking-tight">
            Quản lý <span className="text-blue-600">Người dùng</span>
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Điều hành và phân quyền tài khoản hệ thống
          </p>
        </div>
      </div>

      {/* Filter Section */}
      <div className="flex justify-between items-center gap-4">
        <SearchBar
          placeholder="Tìm theo tên, email..."
          onSearch={(val) => {
            setSearch(val);
            fetchUsers(val);
          }}
          className="w-full md:w-1/3"
        />

        <Button onClick={openAdd} className="flex items-center gap-2 shadow-lg shadow-blue-200">
          <UserPlus size={18} /> Thêm người dùng
        </Button>

      </div>

      {/* Main Content Card */}
      <Card className="p-0 overflow-hidden shadow-sm border-slate-100">
        <Table columns={columns} data={users} loading={loading} />
        {!loading && users.length === 0 && (
          <div className="p-20 text-center text-slate-400 italic">
            Không tìm thấy người dùng nào.
          </div>
        )}
      </Card>

      {/* Modal Form */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? "Cập nhật thông tin" : "Tạo tài khoản mới"}
        extraClasses="!w-xl rounded-2xl"
        showCloseButton={false}>
        <div className="space-y-4 pt-4">
          <Input
            label="Họ và tên"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nguyễn Văn A"
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="email@example.com"
          />
          <div className="space-y-1">
            <Input
              label={editing ? "Mật khẩu (để trống nếu không đổi)" : "Mật khẩu"}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <Input
            label="Số điện thoại"
            value={form.phoneNumber}
            onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
            placeholder="09xxxxxxxx"
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-slate-700 ml-1">
              Vai trò
            </label>
            <select
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="tourist">Du khách (Tourist)</option>
              <option value="vendor">Chủ quán (Vendor)</option>
              <option value="admin">Quản trị viên (Admin)</option>
            </select>
          </div>

          {editing && (
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${form.is_Blocked ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-100"}`}>
              <div>
                <p className="text-sm font-bold text-slate-700">
                  Trạng thái tài khoản
                </p>
                <p className="text-xs text-slate-400">
                  {form.is_Blocked
                    ? "Tài khoản này đang bị khóa"
                    : "Tài khoản đang hoạt động bình thường"}
                </p>
              </div>
              <input
                type="checkbox"
                className="w-5 h-5 accent-red-500"
                checked={form.is_Blocked || false}
                onChange={(e) =>
                  setForm({ ...form, is_Blocked: e.target.checked })
                }
              />
            </div>
          )}

          <div className="pt-4">
            <Button className="w-full py-3 text-base" onClick={handleSave}>
              {editing ? "Lưu thay đổi" : "Tạo tài khoản"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Users;
