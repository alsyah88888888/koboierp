import UsersDashboard from "./UsersDashboard";

export const metadata = {
  title: "Manajemen Karyawan | Kola Borasi ERP",
  description: "Kelola akun dan hak akses tim harian.",
};

export default function UsersPage() {
  return (
    <div className="p-4 md:p-10">
      <UsersDashboard />
    </div>
  );
}
