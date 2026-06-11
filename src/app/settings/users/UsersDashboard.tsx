"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Plus, 
  Pencil, 
  Trash2, 
  Key, 
  X, 
  CheckCircle2, 
  AlertCircle,
  UserPlus,
  ArrowLeft,
  Search,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { callAction } from "@/proxy";


const AVAILABLE_PERMISSIONS = [
  { key: "DASHBOARD", label: "Dashboard Utama" },
  { key: "FINANCE", label: "Keuangan (Bank/Coa)" },
  { key: "PURCHASE", label: "Pembelian (PO/LPB)" },
  { key: "PURCHASE_REQUEST", label: "Pengajuan Permintaan" },
  { key: "SALES", label: "Penjualan (SJ/Order)" },
  { key: "TRACKING", label: "Tracking Item / Lot" },
  { key: "OPERATIONAL", label: "Operasional (Biaya)" },
  { key: "WAREHOUSE", label: "Gudang (Stok/Checker)" },
  { key: "ACCOUNTING", label: "Akuntansi (Jurnal)" },
  { key: "REPORTS", label: "Laporan (Closing/Laba Rugi)" },
  { key: "TAX", label: "Perpajakan (PPN/Faktur)" },
  { key: "MASTER", label: "Master Data (Barang/Supplier)" },
  { key: "SETTINGS", label: "Pengaturan (User/System)" },
];

export default function UsersDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal states
  const [showModal, setShowModal] = useState<"create" | "edit" | "reset" | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Form states
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "USER",
    password: "",
    permissions: [] as string[],
  });

  const handleRoleChange = (role: string) => {
    let defaultPerms: string[] = ["DASHBOARD"];
    const r = role.toUpperCase();
    if (r === "ADMIN") {
      defaultPerms = AVAILABLE_PERMISSIONS.map(p => p.key);
    } else if (r === "FINANCE") {
      defaultPerms = ["DASHBOARD", "FINANCE", "OPERATIONAL", "ACCOUNTING", "REPORTS", "TAX", "TRACKING"];
    } else if (r === "PURCHASE") {
      defaultPerms = ["DASHBOARD", "PURCHASE", "PURCHASE_REQUEST", "WAREHOUSE", "MASTER", "TRACKING"];
    } else if (r === "SALES") {
      defaultPerms = ["DASHBOARD", "SALES", "PURCHASE", "OPERATIONAL", "TRACKING"];
    } else if (r === "WAREHOUSE") {
      defaultPerms = ["DASHBOARD", "WAREHOUSE", "TRACKING"];
    }
    setForm(prev => ({ ...prev, role, permissions: defaultPerms }));
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await callAction("getUsers");
      setUsers(data);

    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await callAction("createUser", form);
      alert("Pengguna berhasil dibuat!");

      setShowModal(null);
      setForm({ name: "", email: "", role: "USER", password: "", permissions: ["DASHBOARD"] });
      loadUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await callAction("updateUser", currentUser.id, {
        name: form.name,
        email: form.email,
        role: form.role,
        permissions: form.permissions,
      });

      alert("Data berhasil diperbarui!");
      setShowModal(null);
      loadUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await callAction("resetPassword", currentUser.id, form.password);
      alert(`Password untuk ${currentUser.name} berhasil direset!`);

      setShowModal(null);
      setForm({ ...form, password: "" });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus pengguna ${name}? Tindakan ini permanen.`)) return;
    try {
      await callAction("deleteUser", id);
      alert("Pengguna berhasil dihapus.");

      loadUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-[95%] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 px-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/settings" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="h-4 w-4 text-slate-500" />
            </Link>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">Manajemen Karyawan</h1>
          </div>
          <p className="text-slate-500 font-bold text-[10px] md:text-sm uppercase tracking-widest opacity-70 ml-10">Kelola akun, akses, dan keamanan tim</p>
        </div>
        
        <button 
          onClick={() => {
            setForm({ name: "", email: "", role: "USER", password: "password123", permissions: ["DASHBOARD"] });
            setShowModal("create");
          }}
          className="bg-primary text-white pl-4 pr-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 flex items-center gap-2"
        >
          <UserPlus className="h-5 w-5" />
          <span>Tambah Pegawai</span>
        </button>
      </div>

      {/* Stats & Search */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <label htmlFor="user-search" className="sr-only">Cari Pegawai</label>
          <input 
            id="user-search"
            name="search"
            type="text"
            placeholder="Cari berdasarkan nama atau email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border-2 border-slate-200 pl-12 pr-4 py-4 rounded-3xl focus:border-primary outline-none transition-all font-semibold text-slate-700 shadow-sm"
          />
        </div>
        <div className="bg-slate-900 text-white rounded-3xl p-4 flex items-center justify-between shadow-lg">
          <div className="pl-2">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Total User</p>
            <h3 className="text-2xl font-black">{users.length}</h3>
          </div>
          <div className="bg-white/10 p-3 rounded-2xl">
            <Users className="h-6 w-6 text-primary" />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border-2 border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-50">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Pegawai</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Hak Akses</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-8 py-20 text-center text-slate-400 font-bold italic animate-pulse">Menghubungkan ke pusat data...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-8 py-20 text-center text-slate-400 font-bold italic">Tidak ada pegawai yang ditemukan.</td>
                </tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-400 uppercase tracking-tighter">
                        {user.name?.substring(0, 2) || "??"}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{user.name || "Tanpa Nama"}</div>
                        <div className="text-xs font-medium text-slate-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase border-2 ${
                      user.role === 'ADMIN' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' :
                      user.role === 'FINANCE' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                      user.role === 'PURCHASE' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                      'bg-slate-50 border-slate-100 text-slate-600'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button 
                        onClick={() => {
                          setCurrentUser(user);
                          setForm({ ...form, password: "password123" });
                          setShowModal("reset");
                        }}
                        className="p-2 hover:bg-orange-100 text-orange-500 rounded-lg transition-all"
                        title="Reset Password"
                      >
                        <Key className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => {
                          let parsedPerms = [];
                          try {
                            parsedPerms = user.permissions ? JSON.parse(user.permissions) : [];
                          } catch (e) {
                            parsedPerms = [];
                          }
                          setCurrentUser(user);
                          setForm({ 
                            name: user.name || "", 
                            email: user.email, 
                            role: user.role, 
                            password: "", 
                            permissions: parsedPerms 
                          });
                          setShowModal("edit");
                        }}
                        className="p-2 hover:bg-blue-100 text-blue-500 rounded-lg transition-all"
                        title="Edit Data"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(user.id, user.name)}
                        className="p-2 hover:bg-red-100 text-red-500 rounded-lg transition-all"
                        title="Hapus Pegawai"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Backdrop */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-10 w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-200 border-2 border-white/20">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">
                  {showModal === 'create' ? 'Tambah Pegawai' : showModal === 'edit' ? 'Edit Pegawai' : 'Reset Password'}
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                  {showModal === 'reset' ? `Akun: ${currentUser?.name}` : 'Otoritas Admin Diperlukan'}
                </p>
              </div>
              <button onClick={() => setShowModal(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={showModal === 'create' ? handleCreate : showModal === 'edit' ? handleUpdate : handleReset} className="space-y-6">
              {(showModal === 'create' || showModal === 'edit') && (
                <>
                  <div className="space-y-2">
                    <label htmlFor="user-full-name" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 cursor-pointer">Nama Lengkap</label>
                    <input 
                      id="user-full-name"
                      name="name"
                      value={form.name}
                      onChange={e => setForm({...form, name: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-4 rounded-2xl outline-none focus:border-primary font-bold text-slate-800 transition-all"
                      placeholder="Masukkan nama pegawai..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="user-email-id" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 cursor-pointer">Email (Login ID)</label>
                    <input 
                      id="user-email-id"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={e => setForm({...form, email: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-4 rounded-2xl outline-none focus:border-primary font-bold text-slate-800 transition-all"
                      placeholder="pegawai@kolaborasi.id"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="user-role-select" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 cursor-pointer">Hak Akses (Role)</label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                      <select 
                        id="user-role-select"
                        name="role"
                        value={form.role}
                        onChange={e => handleRoleChange(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-100 pl-12 pr-5 py-4 rounded-2xl outline-none focus:border-primary font-bold text-slate-800 transition-all appearance-none"
                        required
                      >
                        <option value="USER">USER (DEFAULT)</option>
                        <option value="ADMIN">ADMINISTRATOR</option>
                        <option value="FINANCE">FINANCE MANAGER</option>
                        <option value="PURCHASE">PURCHASE OFFICER</option>
                        <option value="SALES">SALES PERSON</option>
                        <option value="WAREHOUSE">GUDANG / WH</option>
                      </select>
                    </div>
                  </div>

                  {/* Granular Permissions Section */}
                  <div className="space-y-3 bg-slate-50 p-6 rounded-3xl border-2 border-slate-100 max-h-60 overflow-y-auto custom-scrollbar">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Akses Menu Khusus (Granular)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                      {AVAILABLE_PERMISSIONS.map((perm) => {
                        const isChecked = form.permissions?.includes(perm.key);
                        return (
                          <label key={perm.key} className="flex items-center gap-3 p-2 hover:bg-white rounded-xl cursor-pointer transition-colors border border-transparent hover:border-slate-100">
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setForm(prev => {
                                  const list = prev.permissions || [];
                                  const updated = checked 
                                    ? [...list, perm.key]
                                    : list.filter(k => k !== perm.key);
                                  return { ...prev, permissions: updated };
                                });
                              }}
                              className="rounded text-primary focus:ring-primary h-4 w-4 border-slate-300"
                            />
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-tight leading-none">{perm.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {(showModal === 'create' || showModal === 'reset') && (
                <div className="space-y-2">
                  <label htmlFor="user-password-input" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 cursor-pointer">Password</label>
                  <input 
                    id="user-password-input"
                    name="password"
                    type="text"
                    value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                    className="w-full bg-amber-50 border-2 border-amber-100 px-5 py-4 rounded-2xl outline-none focus:border-amber-500 font-mono font-bold text-amber-800 transition-all"
                    placeholder="Masukkan password baru..."
                    required
                  />
                  <p className="text-[10px] font-medium text-amber-600 pl-1 italic">Ingat: Simpan password ini di tempat yang aman!</p>
                </div>
              )}

              <button className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest mt-8 shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                <span>
                  {showModal === 'create' ? 'Daftarkan Pegawai' : showModal === 'edit' ? 'Update Data' : 'Simpan Password Baru'}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
