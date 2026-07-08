const desc = "Payment for PR: KB-PR-20260423-005 - MUAT EMERON DI BLIBLI KIRIM KE RAJA IMPEX LANJUT KIRIM EMERON SISAAN KE MRS RII\\n- RAHMAT & IMAM";
const prMatch = desc.match(/(KB-PR-\\d{8}-\\d{3})/);
console.log(prMatch ? prMatch[1] : "NO MATCH");
