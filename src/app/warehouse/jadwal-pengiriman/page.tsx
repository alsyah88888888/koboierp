import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/auth";
import { getDailyShippingScheduleAction } from "@/actions/warehouse";
import { format } from "date-fns";
import { serializeDecimal } from "@/lib/utils";
import ShippingScheduleDashboard from "./ShippingScheduleDashboard";

export const dynamic = 'force-dynamic';

export default async function JadwalPengirimanPage({ searchParams }: { searchParams: any }) {
    await headers();
    const session = await getServerSession(getAuthOptions()) as any;

    if (!session) {
        redirect("/login");
    }

    const params = await searchParams;
    let rawDate = params?.date;
    if (Array.isArray(rawDate)) rawDate = rawDate[0];

    // Default to current date (e.g. 2026-10-02 or today)
    const selectedDateStr = rawDate || format(new Date(), 'yyyy-MM-dd');

    const initialDeliveries = await getDailyShippingScheduleAction(selectedDateStr).catch(() => []);

    return (
        <ShippingScheduleDashboard
            initialDate={selectedDateStr}
            initialDeliveries={serializeDecimal(initialDeliveries)}
            currentUser={session.user}
        />
    );
}
