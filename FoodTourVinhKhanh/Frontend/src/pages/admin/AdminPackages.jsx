import React, { useState, useEffect } from "react";
import api from "../../utils/api";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import Modal from "../../components/common/Modal";
import Table from "../../components/common/Table";
import FullPageLoading from "../../components/common/FullPageLoading";
import SearchBar from "../../components/common/SearchBar";
import { Plus, Trash2, Edit2 } from "lucide-react";

const AdminPackages = () => {
  const [packages, setPackages] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingFetch, setLoadingFetch] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(null); // Store the ID being deleted
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const initialForm = {
    name: "",
    price: "",
    duration_hours: "",
    target_role: "vendor",
    daily_poi_limit: 0,
    is_Active: true,
  };

  const [formData, setFormData] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    setLoadingFetch(true);
    try {
      const res = await api.get("/packages/get-all");
      if (res.data.success) {
        setPackages(res.data.data);
      }
    } catch {
      toast.error("Không thể tải danh sách gói");
    } finally {
      setLoadingFetch(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = "Tên gói không được trống";
    if (formData.price === "" || formData.price < 0)
      errors.price = "Giá phải ≥ 0 VNĐ";
    if (!formData.duration_hours || formData.duration_hours <= 0)
      errors.duration_hours = "Thời hạn phải > 0";
    if (formData.target_role === "vendor" && formData.daily_poi_limit <= 0)
      errors.daily_poi_limit = "Vendor phải có giới hạn POI lớn hơn 0";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSavePackage = async () => {
    if (!validateForm()) return;

    setLoadingSave(true);
    try {
      if (editingId) {
        // Update
        await api.put(`/packages/update/${editingId}`, formData);
        toast.success("Cập nhật gói thành công!");
      } else {
        // Create
        await api.post("/packages/create", formData);
        toast.success("Tạo gói thành công!");
      }
      fetchPackages();
      handleCloseModal();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Lỗi xử lý gói");
    } finally {
      setLoadingSave(false);
    }
  };

  const handleEdit = async (row) => {
    setEditingId(row.id);
    setFormData({
      name: row.name,
      price: row.price,
      duration_hours: row.duration_hours,
      target_role: row.target_role,
      daily_poi_limit: row.daily_poi_limit ?? 0,
      is_Active: row.is_Active,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (row) => {
    const result = await Swal.fire({
      title: "Xóa gói?",
      text: `Bạn chắc chắn muốn xóa "${row.name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#ef4444",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      setLoadingDelete(row.id);
      try {
        await api.delete(`/packages/delete/${row.id}`);
        toast.success("Xóa gói thành công!");
        fetchPackages();
      } catch {
        toast.error("Không thể xóa gói");
      } finally {
        setLoadingDelete(null);
      }
    }
  };

  const handleCloseModal = () => {
    if (!loadingSave) {
      setIsModalOpen(false);
      setEditingId(null);
      setFormData(initialForm);
      setFormErrors({});
    }
  };

  const handleOpenAddModal = () => {
    setFormData(initialForm);
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Filter packages
  const filteredPackages = packages.filter((pkg) => {
    const matchName = pkg.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchRole = !roleFilter || pkg.target_role === roleFilter;
    return matchName && matchRole;
  });

  // Table columns
  const columns = [
    {
      header: "Tên gói",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-gray-900">{row.name}</span>
          <span className="text-xs text-gray-500 mt-1">
            {row.target_role === "vendor" ? "👨‍💼 Vendor" : "👤 Tourist"}
          </span>
        </div>
      ),
    },
    {
      header: "Giá",
      render: (row) => (
        <span className="font-mono font-bold text-gray-900">
          {row.price.toLocaleString()}{" "}
          <span className="text-gray-400 text-xs">VNĐ</span>
        </span>
      ),
    },
    {
      header: "Thời hạn",
      render: (row) => {
        const days = Math.floor(row.duration_hours / 24);
        const hours = row.duration_hours % 24;
        return (
          <span className="text-sm text-gray-600">
            {days > 0 && `${days}d `}
            {hours > 0 && `${hours}h`}
          </span>
        );
      },
    },
    {
      header: "Giới hạn POI",
      render: (row) => (
        <span className="text-sm font-semibold text-gray-700">
          {row.target_role === "vendor"
            ? `${row.daily_poi_limit} POI`
            : "Không giới hạn POI"}
        </span>
      ),
    },
    {
      header: "Trạng thái",
      render: (row) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            row.is_Active
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-600"
          }`}>
          {row.is_Active ? "✓ Hoạt động" : "✗ Vô hiệu"}
        </span>
      ),
    },
    {
      header: "Hành động",
      render: (row) => (
        <div className="flex gap-3">
          <button
            onClick={() => handleEdit(row)}
            disabled={loadingSave || loadingDelete}
            className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Sửa">
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => handleDelete(row)}
            disabled={loadingSave || loadingDelete}
            className={`p-2 rounded-lg transition-colors ${
              loadingDelete === row.id
                ? "bg-red-100 text-red-600 cursor-not-allowed"
                : "hover:bg-red-50 text-red-600"
            }`}
            title="Xóa">
            {loadingDelete === row.id ? (
              <div className="w-4 h-4 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
          </button>
        </div>
      ),
    },
  ];

  if (loadingFetch && packages.length === 0) {
    return <FullPageLoading />;
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 py-8 px-4 md:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
              Quản Lý <span className="text-blue-600">Gói Dịch Vụ</span>
            </h1>
          </div>
          <Button
            onClick={handleOpenAddModal}
            disabled={loadingSave || loadingDelete}
            className="flex items-center gap-2">
            <Plus size={20} /> {loadingSave ? "Đang xử lý..." : "Thêm Gói"}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 bg-white/95 shadow-lg border-2 border-gray-400/80 rounded-2xl ring-1 ring-gray-300/60 p-1 hover:shadow-xl hover:border-gray-500 focus-within:shadow-2xl focus-within:border-blue-500 focus-within:ring-2 ring-blue-400/50">
            <SearchBar
              placeholder="Tìm kiếm gói..."
              className="shadow-none border-0 ring-0 rounded-xl bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2.5 bg-white shadow-sm border-2 border-gray-400 ring-1 ring-gray-300/50 rounded-2xl hover:shadow-md hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-900 [&_option]:bg-white [&_option]:text-gray-900 [&_optgroup]:bg-white [&_optgroup]:text-gray-900 min-w-[160px]">
            <option value="">Tất cả loại</option>
            <option value="vendor">👨‍💼 Vendor</option>
            <option value="tourist">👤 Tourist</option>
          </select>
        </div>

        {/* Table */}
        <Card className="p-0 border-none shadow-xl shadow-gray-200/50">
          {filteredPackages.length > 0 ? (
            <Table columns={columns} data={filteredPackages} />
          ) : (
            <div className="p-20 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={40} className="text-gray-300" />
              </div>
              <h3 className="text-gray-900 font-bold text-lg">
                Không tìm thấy gói nào
              </h3>
              <p className="text-gray-500 text-sm">Hãy thêm gói dịch vụ mới</p>
            </div>
          )}
        </Card>
      </div>

      {/* Modal Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingId ? "Cập Nhật Gói" : "Thêm Gói Mới"}
        showCloseButton={!loadingSave}>
        <div className="space-y-4 min-w-96">
          <Input
            label="Tên gói"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={formErrors.name}
            disabled={loadingSave}
          />

          <Input
            label="Giá (VNĐ)"
            type="number"
            value={formData.price}
            onChange={(e) =>
              setFormData({ ...formData, price: Number(e.target.value) })
            }
            error={formErrors.price}
            disabled={loadingSave}
          />

          <Input
            label="Thời hạn (giờ)"
            type="number"
            value={formData.duration_hours}
            onChange={(e) =>
              setFormData({
                ...formData,
                duration_hours: Number(e.target.value),
              })
            }
            error={formErrors.duration_hours}
            disabled={loadingSave}
          />

          <Input
            label="Giới hạn tổng POI"
            type="number"
            value={formData.daily_poi_limit}
            onChange={(e) =>
              setFormData({
                ...formData,
                daily_poi_limit: Number(e.target.value),
              })
            }
            error={formErrors.daily_poi_limit}
            disabled={loadingSave || formData.target_role === "tourist"}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Đối tượng áp dụng
            </label>
            <select
              value={formData.target_role}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  target_role: e.target.value,
                  daily_poi_limit:
                    e.target.value === "tourist"
                      ? 0
                      : formData.daily_poi_limit || 1,
                })
              }
              disabled={loadingSave}
              className="px-4 py-2.5 bg-gray-50 shadow-sm border-2 border-gray-300 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-400 disabled:bg-gray-100 text-gray-900 [&_option]:bg-white [&_option]:text-gray-900 [&_optgroup]:bg-white [&_optgroup]:text-gray-900">
              <option value="vendor">👨‍💼 Vendor</option>
              <option value="tourist">👤 Tourist</option>
            </select>
          </div>

          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_Active}
              onChange={(e) =>
                setFormData({ ...formData, is_Active: e.target.checked })
              }
              disabled={loadingSave}
              className="w-4 h-4 rounded cursor-pointer"
            />
            <label
              htmlFor="is_active"
              className="text-sm font-medium text-gray-700 cursor-pointer">
              Kích hoạt gói này
            </label>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={handleCloseModal}
              disabled={loadingSave}
              className="flex-1">
              Hủy
            </Button>
            <Button
              onClick={handleSavePackage}
              disabled={loadingSave}
              className="flex-1">
              {loadingSave ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminPackages;
