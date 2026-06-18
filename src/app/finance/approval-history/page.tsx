import React from 'react';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ApprovalHistoryDashboard from '@/app/finance/approval-history/ApprovalHistoryDashboard';

export const metadata = {
    title: 'Riwayat Approval Hutang & Piutang - Finance',
};

export default async function ApprovalHistoryPage() {
    const session = await getServerSession(getAuthOptions());

    if (!session) {
        redirect('/login');
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <ApprovalHistoryDashboard />
        </div>
    );
}
