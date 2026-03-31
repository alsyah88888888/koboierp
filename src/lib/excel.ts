import * as XLSX from 'xlsx';

/**
 * Exports an array of objects to an Excel file.
 * @param data Array of objects to export
 * @param fileName Name of the file (without extension)
 * @param sheetName Name of the worksheet
 */
export function exportToExcel(data: any[], fileName: string, sheetName: string = 'Sheet1') {
    if (!data || data.length === 0) {
        alert('Tidak ada data untuk di-export');
        return;
    }

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate buffer
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    // Create Blob and download
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}
