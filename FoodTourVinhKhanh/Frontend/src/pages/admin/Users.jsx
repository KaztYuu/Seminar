import { useState } from "react";
import Card from "../../components/common/Card";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import Input from "../../components/common/Input";

const Users = () => {
  const [open, setOpen] = useState(false);

  // Dữ liệu mẫu
  const users = [
    { id: 1, name: "Nguyễn Văn A", role: "Admin", email: "vana@gmail.com" },
    { id: 2, name: "Trần Thị B", role: "Vendor", email: "thib@gmail.com" },
    { id: 3, name: "Lê Văn C", role: "Tourist", email: "vanc@gmail.com" },
  ];

  const columns = [
    { 
      header: "Người dùng", 
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900">{row.name}</span>
          <span className="text-xs text-gray-400">{row.email}</span>
        </div>
      )
    },
    { 
      header: "Vai trò", 
      render: (row) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
          row.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
        }`}>
          {row.role}
        </span>
      )
    },
    {
      header: "Thao tác",
      render: (row) => (
        <div className="flex gap-3">
          <Button variant="outline" size="sm">Sửa</Button>
          <Button variant="danger" size="sm">Xóa</Button>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Quản lý người dùng</h1>
          <p className="text-gray-500 mt-1">Danh sách các tài khoản đang hoạt động trên hệ thống.</p>
        </div>
        <Button onClick={() => setOpen(true)} size="lg" className="shadow-blue-200">
          <span className="mr-2 text-xl">+</span> Thêm thành viên
        </Button>
      </div>

      {/* Main Content */}
      <Card className="p-0 overflow-hidden"> {/* Để Table bo góc mượt, Card nên để p-0 */}
        <Table columns={columns} data={users} />
      </Card>

      {/* Add User Modal */}
      <Modal 
        isOpen={open} 
        onClose={() => setOpen(false)} 
        title="Thêm người dùng mới"
        extraClasses="!w-2xl"
      >
        <div className="space-y-5">
          <Input 
            label="Họ và tên" 
            placeholder="VD: Nguyễn Văn A" 
          />
          <Input 
            label="Vai trò" 
            placeholder="Chọn vai trò (Admin, Vendor...)" 
          />
          <div className="pt-4 flex flex-col gap-2">
            <Button size="lg" className="w-full">Xác nhận thêm</Button>
            <Button variant="outline" onClick={() => setOpen(false)} className="w-full">Hủy bỏ</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Users;