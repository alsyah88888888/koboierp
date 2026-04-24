
"use client";

import React from 'react';

interface DotMatrixLayoutProps {
  children: React.ReactNode;
  title: string;
  documentNumber: string;
  systemSettings?: {
    companyName: string;
    address: string;
  };
}

export const DotMatrixLayout: React.FC<DotMatrixLayoutProps> = ({ children, title, documentNumber, systemSettings }) => {
  const companyName = systemSettings?.companyName || "PT. KOLA BORASI INDONESIA";
  const companyAddress = systemSettings?.address || "Jl. Arjuna IV Green Kartika Residence Blok EE NO.2, CIBINONG";
  return (
    <div className="dot-matrix-container">
      <style jsx global>{`
        @media print {
          @page {
            size: 215mm 140mm; /* Panjang 21.5cm, Lebar 14cm */
            margin: 0;
          }
          body {
            background: white;
            margin: 0;
            padding: 0;
            color: black;
            font-family: 'Courier New', Courier, monospace;
            font-size: 10pt;
          }
          .no-print {
            display: none !important;
          }
        }

        .dot-matrix-paper {
          width: 215mm;
          height: 140mm;
          padding: 8mm 10mm;
          margin: 0 auto;
          background: white;
          font-family: 'Courier New', Courier, monospace;
          color: black;
          border: 1px dashed #ccc;
          position: relative;
          box-sizing: border-box;
          overflow: hidden;
        }

        .dot-matrix-header {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid black;
          padding-bottom: 2mm;
          margin-bottom: 3mm;
        }

        .company-info h1 {
          font-size: 14pt;
          font-weight: bold;
          margin: 0;
        }

        .document-title {
          text-align: right;
        }

        .document-title h2 {
          font-size: 16pt;
          font-weight: bold;
          margin: 0;
          text-transform: uppercase;
        }

        .dot-matrix-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 5mm;
        }

        .dot-matrix-table th {
          border-top: 1px solid black;
          border-bottom: 1px solid black;
          text-align: left;
          padding: 2mm 1mm;
          font-size: 9pt;
          text-transform: uppercase;
        }

        .dot-matrix-footer {
          margin-top: 4mm;
          display: flex;
          justify-content: flex-end;
          gap: 12mm;
          text-align: center;
        }

        .footer-col {
          width: 35mm;
        }

        .signature-box {
          height: 8mm;
          border-bottom: 1px solid black;
          margin-bottom: 1mm;
        }
      `}</style>

      <div className="dot-matrix-paper">
        {/* Tombol Cetak (Hanya muncul di layar) */}
        <div className="no-print mb-4 flex justify-end">
          <button 
            onClick={() => window.print()}
            className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-800 transition-all shadow-lg"
          >
            CETAK SEKARANG (LX-310)
          </button>
        </div>

        <div className="dot-matrix-header">
          <div className="company-info">
            <h1>{companyName}</h1>
            <p style={{ fontSize: '7.5pt', maxWidth: '400px' }}>{companyAddress}</p>
          </div>
          <div className="document-title">
            <h2>{title}</h2>
            <p className="font-bold mt-1">NO: {documentNumber}</p>
          </div>
        </div>

        <div className="dot-matrix-content">
          {children}
        </div>

        <div className="dot-matrix-footer">
          <div className="footer-col">
            <p className="text-[8pt] mb-8">Penerima,</p>
            <div className="signature-box"></div>
            <p className="text-[8pt]">( ................ )</p>
          </div>
          <div className="footer-col">
            <p className="text-[8pt] mb-8">Sopir,</p>
            <div className="signature-box"></div>
            <p className="text-[8pt]">( ................ )</p>
          </div>
          <div className="footer-col">
            <p className="text-[8pt] mb-8">Hormat Kami,</p>
            <div className="signature-box"></div>
            <p className="text-[8pt]">( ................ )</p>
          </div>
        </div>
        
        <div className="mt-4 text-[7pt] italic text-slate-400">
          * Cetak otomatis sistem ERP - {new Date().toLocaleString('id-ID')}
        </div>
      </div>
    </div>
  );
};
