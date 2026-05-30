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

    // Auto-detect and convert date strings to native Excel date cells
    if (worksheet['!ref']) {
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cell_address = { c: C, r: R };
                const cell_ref = XLSX.utils.encode_cell(cell_address);
                const cell = worksheet[cell_ref];
                if (cell && cell.t === 's') {
                    const val = cell.v;
                    let d: Date | null = null;
                    
                    if (typeof val === 'string') {
                        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
                            d = new Date(val);
                        } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val)) {
                            const parts = val.split('/');
                            d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                        }
                    }

                    if (d && !isNaN(d.getTime())) {
                        cell.t = 'd';
                        cell.v = d;
                        cell.z = 'dd/mm/yyyy'; // Native Excel date format
                    }
                }
            }
        }
    }

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
