import { format } from "date-fns";

export interface CortexSalesData {
    deliveryNumber: string;
    createdAt: Date | string;
    buyerName: string;
    items: {
        product: {
            sku: string;
            name: string;
            uom: string;
        };
        quantity: number;
        salesPrice: number;
        discount: number;
    }[];
    taxRate: number;
    totalDiscount: number;
}

function escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

function formatDate(date: Date | string): string {
    return format(new Date(date), "dd/MM/yyyy");
}

export function generateCortexXml(sales: CortexSalesData[]): string {
    let xml = `<?xml version="1.0" encoding="utf-8"?>\n`;
    xml += `<TaxInvoiceBulk xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="TaxInvoice.xsd">\n`;
    xml += `  <TIN>0658597273403000</TIN>\n`;
    xml += `  <ListOfTaxInvoice>\n`;

    sales.forEach(sale => {
        const invoiceDate = format(new Date(sale.createdAt), "yyyy-MM-dd");

        xml += `    <TaxInvoice>\n`;
        xml += `      <TaxInvoiceDate>${invoiceDate}</TaxInvoiceDate>\n`;
        xml += `      <TaxInvoiceOpt>Normal</TaxInvoiceOpt>\n`;
        xml += `      <TrxCode>01</TrxCode>\n`;
        xml += `      <AddInfo />\n`;
        xml += `      <CustomDoc />\n`;
        xml += `      <RefDesc>${escapeXml(sale.deliveryNumber)}</RefDesc>\n`;
        xml += `      <FacilityStamp />\n`;
        xml += `      <SellerIDTKU>0658597273403000</SellerIDTKU>\n`;
        xml += `      <BuyerTin>0000000000000000</BuyerTin>\n`;
        xml += `      <BuyerDocument>TIN</BuyerDocument>\n`;
        xml += `      <BuyerCountry>IDN</BuyerCountry>\n`;
        xml += `      <BuyerDocumentNumber />\n`;
        xml += `      <BuyerName>${escapeXml(sale.buyerName)}</BuyerName>\n`;
        xml += `      <BuyerAdress>-</BuyerAdress>\n`;
        xml += `      <BuyerEmail />\n`;
        xml += `      <BuyerIDTKU>0000000000000000</BuyerIDTKU>\n`;
        xml += `      <ListOfGoodService>\n`;

        sale.items.forEach(item => {
            const qty = Number(item.quantity) || 0;
            const price = Number(item.salesPrice) || 0;
            const itemDiscountPercent = Number(item.discount) || 0;

            const grossItemBase = qty * price;
            const nominalItemDiscount = grossItemBase * (itemDiscountPercent / 100);
            const netItemBase = grossItemBase - nominalItemDiscount;

            const globalDiscountRatio = Number(sale.totalDiscount || 0) / 100;
            const finalTaxBase = netItemBase * (1 - globalDiscountRatio);

            const vatRate = Number(sale.taxRate || 0);
            const vatAmount = finalTaxBase * (vatRate / 100);
            const totalDiscountForLine = nominalItemDiscount + (netItemBase * globalDiscountRatio);

            xml += `        <GoodService>\n`;
            xml += `          <Opt>A</Opt>\n`;
            xml += `          <Code>${escapeXml(item.product.sku || '000000')}</Code>\n`;
            xml += `          <Name>${escapeXml(item.product.name)}</Name>\n`;
            xml += `          <Unit>${escapeXml(item.product.uom || 'UM.0001')}</Unit>\n`;
            xml += `          <Price>${price}</Price>\n`;
            xml += `          <Qty>${qty}</Qty>\n`;
            xml += `          <TotalDiscount>${totalDiscountForLine.toFixed(0)}</TotalDiscount>\n`;
            xml += `          <TaxBase>${finalTaxBase.toFixed(0)}</TaxBase>\n`;
            xml += `          <OtherTaxBase>${finalTaxBase.toFixed(0)}</OtherTaxBase>\n`;
            xml += `          <VATRate>${vatRate}</VATRate>\n`;
            xml += `          <VAT>${vatAmount.toFixed(0)}</VAT>\n`;
            xml += `          <STLGRate>0</STLGRate>\n`;
            xml += `          <STLG>0</STLG>\n`;
            xml += `        </GoodService>\n`;
        });

        xml += `      </ListOfGoodService>\n`;
        xml += `    </TaxInvoice>\n`;
    });

    xml += `  </ListOfTaxInvoice>\n`;
    xml += `</TaxInvoiceBulk>`;
    return xml;
}
