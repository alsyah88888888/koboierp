"use server";

/**

 * Mendapatkan daftar semua pengguna (Hanya Admin)
 */
export async function getUsersAction() {
  const { getPrisma } = require("@/lib/prisma");
  const prisma = getPrisma();
  const { getAuthOptions } = require("@/lib/auth");
  const { getServerSession } = require("next-auth");
  
  const session = await getServerSession(getAuthOptions()) as any;
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Hanya Admin yang bisa mengakses data ini.");
  }


  return await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      permissions: true,
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
  permissions?: string[];
}) {
  const { getPrisma } = require("@/lib/prisma");
  const prisma = getPrisma();
  const { getAuthOptions } = require("@/lib/auth");
  const { getServerSession } = require("next-auth");
  const bcrypt = require("bcryptjs");
  const { revalidatePath } = require("next/cache");

  const session = await getServerSession(getAuthOptions()) as any;
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
      permissions: JSON.stringify(data.permissions || []),
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
  permissions?: string[];
}) {
  const { getPrisma } = require("@/lib/prisma");
  const prisma = getPrisma();
  const { getAuthOptions } = require("@/lib/auth");
  const { getServerSession } = require("next-auth");
  const { revalidatePath } = require("next/cache");

  const session = await getServerSession(getAuthOptions()) as any;
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }


  await prisma.user.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email,
      role: data.role.toUpperCase(),
      permissions: JSON.stringify(data.permissions || []),
    },
  });

  revalidatePath("/settings/users");
  return { success: true };
}

/**
 * Reset Password Pengguna (Hanya Admin)
 */
export async function resetPasswordAction(id: string, newPassword: string) {
  const { getPrisma } = require("@/lib/prisma");
  const prisma = getPrisma();
  const { getAuthOptions } = require("@/lib/auth");
  const { getServerSession } = require("next-auth");
  const bcrypt = require("bcryptjs");

  const session = await getServerSession(getAuthOptions()) as any;
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
  const { getPrisma } = require("@/lib/prisma");
  const prisma = getPrisma();
  const { getAuthOptions } = require("@/lib/auth");
  const { getServerSession } = require("next-auth");
  const { revalidatePath } = require("next/cache");

  const session = await getServerSession(getAuthOptions()) as any;
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }


  if (session.user.id === id) {
    throw new Error("Gagal: Anda tidak bisa menghapus akun Anda sendiri.");
  }

  const userId = id;

  // Dissociate all references to avoid Prisma / PostgreSQL foreign key constraints
  await prisma.customer.updateMany({ where: { createdById: userId }, data: { createdById: null } });
  await prisma.financeTransaction.updateMany({ where: { createdById: userId }, data: { createdById: null } });
  await prisma.goodsReceipt.updateMany({ where: { createdById: userId }, data: { createdById: null } });
  await prisma.journalEntry.updateMany({ where: { createdById: userId }, data: { createdById: null } });
  await prisma.notification.updateMany({ where: { authorId: userId }, data: { authorId: null } });
  await prisma.product.updateMany({ where: { createdById: userId }, data: { createdById: null } });
  await prisma.purchaseRequest.updateMany({ where: { approvedById: userId }, data: { approvedById: null } });
  await prisma.purchaseRequest.updateMany({ where: { verifiedById: userId }, data: { verifiedById: null } });
  await prisma.purchaseRequest.updateMany({ where: { requestedById: userId }, data: { requestedById: session.user.id } }); // Transfer required field to the performing Admin
  await prisma.purchaseReturn.updateMany({ where: { createdById: userId }, data: { createdById: null } });
  await prisma.salesDelivery.updateMany({ where: { createdById: userId }, data: { createdById: null } });
  await prisma.salesOrder.updateMany({ where: { createdById: userId }, data: { createdById: null } });
  await prisma.salesReturn.updateMany({ where: { createdById: userId }, data: { createdById: null } });
  await prisma.vendor.updateMany({ where: { createdById: userId }, data: { createdById: null } });
  await prisma.auditLog.updateMany({ where: { userId }, data: { userId: null } });

  // Delete all nextauth accounts and sessions associated with the user
  await prisma.account.deleteMany({ where: { userId } });
  await prisma.session.deleteMany({ where: { userId } });

  // Now safely delete the user from database
  await prisma.user.delete({ where: { id: userId } });

  revalidatePath("/settings/users");
  return { success: true };
}
