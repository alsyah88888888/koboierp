import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/auth";
import { getAllCmsContentsForAdminAction } from "@/actions/cms";
import { CmsModuleDashboard } from "./CmsModuleDashboard";

export const dynamic = "force-dynamic";

export default async function CmsModulePage() {
    await headers();
    const session = await getServerSession(getAuthOptions()) as any;

    if (!session) {
        redirect("/login");
    }

    const items = await getAllCmsContentsForAdminAction();

    return (
        <CmsModuleDashboard 
            initialItems={items} 
            currentUser={session.user} 
        />
    );
}
