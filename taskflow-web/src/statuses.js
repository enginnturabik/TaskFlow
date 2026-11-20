// Görev durumları. Backend'deki SaveTaskDto'nun [AllowedValues] listesiyle BİREBİR aynı olmalı;
// yoksa sunucu 400 döner. İki tarafın aynı "sözleşmeyi" paylaşması gerekir.
export const STATUSES = ["Yapılacak", "Devam ediyor", "Bitti"];

export const DONE = "Bitti";
