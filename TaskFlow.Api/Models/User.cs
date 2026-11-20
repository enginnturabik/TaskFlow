namespace TaskFlow.Api.Models;

// ENTITY: Veritabanındaki "Users" tablosu.
public class User
{
    public int Id { get; set; }

    // Kayıtta küçük harfe çevrilir; AppDbContext'teki UNIQUE index aynı e-postanın iki kez kaydını engeller.
    public string Email { get; set; } = string.Empty;

    // Şifrenin KENDİSİ değil, tek yönlü "tuzlu" hash'i. Veritabanı sızsa bile şifreler okunamaz.
    public string PasswordHash { get; set; } = string.Empty;
}
