"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Mendapatkan daftar semua pengguna (Hanya Admin)
 */
export async function getUsersAction() {
  const session = await getServerSession(authOptions) as any;
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Hanya Admin yang bisa mengakses data ini.");
  }

  return await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Membuat pengguna baru (Hanya Admin)
 */
export async function createUserAction(data: {
  name: string;
  email: string;
  role: string;
  password: string;
}) {
  const session = await getServerSession(authOptions) as any;
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Anda tidak memiliki akses.");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const newUser = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: data.role.toUpperCase(),
      password: hashedPassword,
    },
  });

  revalidatePath("/settings/users");
  return { success: true, user: { id: newUser.id, name: newUser.name } };
}

/**
 * Update data pengguna (Hanya Admin)
 */
export async function updateUserAction(id: string, data: {
  name: string;
  email: string;
  role: string;
}) {
  const session = await getServerSession(authOptions) as any;
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  await prisma.user.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email,
      role: data.role.toUpperCase(),
    },
  });

  revalidatePath("/settings/users");
  return { success: true };
}

/**
 * Reset Password Pengguna (Hanya Admin)
 */
export async function resetPasswordAction(id: string, newPassword: string) {
  const session = await getServerSession(authOptions) as any;
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id },
    data: { password: hashedPassword },
  });

  return { success: true };
}

/**
 * Hapus Pengguna (Hanya Admin)
 * Catatan: Pastikan tidak menghapus diri sendiri.
 */
export async function deleteUserAction(id: string) {
  const session = await getServerSession(authOptions) as any;
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  if (session.user.id === id) {
    throw new Error("Gagal: Anda tidak bisa menghapus akun Anda sendiri.");
  }

  await prisma.user.delete({ where: { id } });

  revalidatePath("/settings/users");
  return { success: true };
}
