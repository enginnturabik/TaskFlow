using System.ComponentModel.DataAnnotations;

namespace TaskFlow.Api.Dtos;

// DTO (Data Transfer Object): API'nin dış dünyayla SÖZLEŞMESİ.
// İstemci sadece bu alanları gönderebilir; kurallara uymazsa [ApiController] otomatik 400 döner.
public class AuthDto
{
    [Required(ErrorMessage = "E-posta zorunludur.")]
    [EmailAddress(ErrorMessage = "Geçerli bir e-posta girin.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Şifre zorunludur.")]
    [MinLength(6, ErrorMessage = "Şifre en az 6 karakter olmalıdır.")]
    public string Password { get; set; } = string.Empty;
}
