import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/auth";
import { SettingsDashboard } from "./SettingsDashboard";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
    const session = await getServerSession(getAuthOptions()) as any;
    if (!session) {
        redirect("/login");
    }
    return <SettingsDashboard />;
}
