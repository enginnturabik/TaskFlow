using System.ComponentModel.DataAnnotations;

namespace TaskFlow.Api.Dtos;

// Görev ekleme ve güncelleme için istemcinin gönderebileceği alanlar
public class SaveTaskDto
{
    [Required(ErrorMessage = "Başlık zorunludur.")]
    [StringLength(100, ErrorMessage = "Başlık en fazla 100 karakter olabilir.")]
    public string Title { get; set; } = string.Empty;

    [AllowedValues("Yapılacak", "Devam ediyor", "Bitti",
        ErrorMessage = "Durum 'Yapılacak', 'Devam ediyor' veya 'Bitti' olmalıdır.")]
    public string Status { get; set; } = "Yapılacak";

    public DateTime? DueDate { get; set; }
}