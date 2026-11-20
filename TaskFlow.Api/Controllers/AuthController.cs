using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using TaskFlow.Api.Data;
using TaskFlow.Api.Dtos;
using TaskFlow.Api.Models;

namespace TaskFlow.Api.Controllers;

// Kayıt ve giriş. Buradaki endpoint'lerde [Authorize] YOK; çünkü token almak için
// zaten token'ın olmaması gereken yer burası.
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    // PasswordHasher: Şifreyi tek yönlü ve "tuzlu" (salt) olarak hash'ler (PBKDF2, binlerce tur).
    // TEK YÖNLÜ: Hash'ten şifre geri hesaplanamaz. Veritabanı sızsa bile şifreler sızmaz.
    // TUZ (salt): Her hash'e rastgele bir değer eklenir; aynı şifreye sahip iki kullanıcının
    // hash'i farklı olur ve önceden hesaplanmış tablolarla (rainbow table) kırılamaz.
    // YAVAŞ OLMASI BİR ÖZELLİK: Kaba kuvvet (brute force) denemelerini pahalı hale getirir.
    private readonly PasswordHasher<User> _hasher = new();

    public AuthController(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    // POST /api/auth/register
    [HttpPost("register")]
    public async Task<IActionResult> Register(AuthDto dto)
    {
        // E-postayı normalize et: "Engin@Test.com" ile "engin@test.com" aynı kişi.
        var email = dto.Email.Trim().ToLowerInvariant();

        if (await _db.Users.AnyAsync(u => u.Email == email))
            return Conflict(new { message = "Bu e-posta zaten kayıtlı." }); // 409 Conflict

        var user = new User { Email = email };
        user.PasswordHash = _hasher.HashPassword(user, dto.Password); // ASLA düz şifre saklanmaz

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return StatusCode(201); // 201 Created
    }

    // POST /api/auth/login
    [HttpPost("login")]
    public async Task<IActionResult> Login(AuthDto dto)
    {
        var email = dto.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);

        // "E-posta yok" ve "şifre yanlış" için AYNI cevap.
        // Farklı cevap verseydik saldırgan hangi e-postaların kayıtlı olduğunu öğrenirdi (user enumeration).
        if (user == null ||
            _hasher.VerifyHashedPassword(user, user.PasswordHash, dto.Password) == PasswordVerificationResult.Failed)
        {
            return Unauthorized(new { message = "E-posta veya şifre hatalı." }); // 401
        }

        return Ok(new { token = CreateToken(user), email = user.Email }); // 200
    }

    // JWT üretimi. Yapısı: HEADER.PAYLOAD.SIGNATURE (her biri Base64URL)
    //   HEADER   : hangi algoritmayla imzalandı (HS256)
    //   PAYLOAD  : claim'ler (sub, email, exp...). ŞİFRELİ DEĞİL, herkes okuyabilir! Sır koyma.
    //   SIGNATURE: HMAC-SHA256(header + payload, gizli anahtar). Payload'ı değiştiren imzayı tutturamaz.
    private string CreateToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));

        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()), // kim
                new Claim(JwtRegisteredClaimNames.Email, user.Email)
            }),
            Expires = DateTime.UtcNow.AddHours(2),   // ne zamana kadar geçerli (exp)
            Issuer = _config["Jwt:Issuer"],          // kim üretti (iss)
            Audience = _config["Jwt:Audience"],      // kimin için (aud)
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
        };

        return new JsonWebTokenHandler().CreateToken(descriptor);
    }
}
