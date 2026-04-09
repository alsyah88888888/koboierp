
import { format } from "date-fns";

export function generateCoretaxXML(deliveries: any[], companySettings: any) {
    const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<TaxInvoiceBulk xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="TaxInvoice.xsd">
  <TIN>${(companySettings?.taxId || "0000000000000000").replace(/[^0-9]/g, "")}</TIN>
  <ListOfTaxInvoice>`;

    const xmlFooter = `
  </ListOfTaxInvoice>
</TaxInvoiceBulk>`;

    const invoiceItems = deliveries.map(d => {
        const date = format(new Date(d.date || d.createdAt), "yyyy-MM-dd");
        const itemsXML = d.items.map((item: any) => {
            const price = Number(item.salesPrice || 0);
            const qty = Number(item.quantity || 0);
            const discount = Number(item.discount || 0);
            const taxBase = (price * qty) - discount;
            const vat = Math.floor(taxBase * (Number(d.taxRate || 0.11)));
            
            return `
        <GoodService>
          <Opt>A</Opt>
          <Code>${item.product?.sku || "000000"}</Code>
          <Name>${escapeXML(item.product?.name || "Barang")}</Name>
          <Unit>${item.uom || item.product?.uom || "UM.0001"}</Unit>
          <Price>${price}</Price>
          <Qty>${qty}</Qty>
          <TotalDiscount>${discount}</TotalDiscount>
          <TaxBase>${taxBase}</TaxBase>
          <OtherTaxBase>${taxBase}</OtherTaxBase>
          <VATRate>${(Number(d.taxRate || 0.11) * 100).toFixed(0)}</VATRate>
          <VAT>${vat}</VAT>
          <STLGRate>0</STLGRate>
          <STLG>0</STLG>
        </GoodService>`;
        }).join("");

        return `
    <TaxInvoice>
      <TaxInvoiceDate>${date}</TaxInvoiceDate>
      <TaxInvoiceOpt>Normal</TaxInvoiceOpt>
      <TrxCode>01</TrxCode>
      <AddInfo />
      <CustomDoc />
      <RefDesc>${escapeXML(d.deliveryNumber)}</RefDesc>
      <FacilityStamp />
      <SellerIDTKU>${(companySettings?.taxId || "0000000000000000").replace(/[^0-9]/g, "")}</SellerIDTKU>
      <BuyerTin>${(d.buyerNpwp || "0000000000000000").replace(/[^0-9]/g, "")}</BuyerTin>
      <BuyerDocument>TIN</BuyerDocument>
      <BuyerCountry>IND</BuyerCountry>
      <BuyerDocumentNumber />
      <BuyerName>${escapeXML(d.buyerName || "")}</BuyerName>
      <BuyerAdress>${escapeXML(d.recipient || "")}</BuyerAdress>
      <BuyerEmail />
      <BuyerIDTKU>${(d.buyerNpwp || "0000000000000000").replace(/[^0-9]/g, "")}</BuyerIDTKU>
      <ListOfGoodService>${itemsXML}
      </ListOfGoodService>
    </TaxInvoice>`;
    }).join("");

    return xmlHeader + invoiceItems + xmlFooter;
}

function escapeXML(str: string) {
    if (!str) return "";
    return str.replace(/[<>&"']/g, function (m) {
        switch (m) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '"': return '&quot;';
            case "'": return '&apos;';
            default: return m;
        }
    });
}
