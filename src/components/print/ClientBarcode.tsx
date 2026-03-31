"use client";

import dynamic from "next/dynamic";

const ReactBarcode = dynamic(() => import("react-barcode"), { ssr: false });

export function ClientBarcode(props: any) {
    return <ReactBarcode {...props} />;
}
