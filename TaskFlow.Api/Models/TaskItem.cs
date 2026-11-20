namespace TaskFlow.Api.Models;

// ENTITY (varlık): Veritabanındaki "Tasks" tablosunun C# karşılığı.
// Her property bir sütuna, her nesne bir satıra karşılık gelir.
// Bu sınıf İÇERİDE kalır; dış dünyayla DTO'lar üzerinden konuşuruz.
public class TaskItem
{
    // PRIMARY KEY: "Id" adını gören EF Core bunu otomatik birincil anahtar
    // ve otomatik artan (auto-increment) yapar. Değerini veritabanı verir.
    public int Id { get; set; }

    // "= string.Empty": null yerine boş metinle başlar; NullReferenceException riskini azaltır.
    public string Title { get; set; } = string.Empty;

    // Şimdilik string; geçerli değerleri SaveTaskDto'daki [AllowedValues] kısıtlar.
    public string Status { get; set; } = "Yapılacak";

    // "?" = nullable. Her görevin son tarihi olmak zorunda değil, sütun NULL olabilir.
    public DateTime? DueDate { get; set; }

    // FOREIGN KEY (yabancı anahtar): Bu görevin sahibi olan kullanıcının Id'si.
    // "<SınıfAdı>Id" kuralına uyduğu için EF Core bunu User tablosuna bağlar.
    // Nullable DEĞİL: sahipsiz görev olamaz; bu kuralı veritabanı da zorlar.
    public int UserId { get; set; }
}
