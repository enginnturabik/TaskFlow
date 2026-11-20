using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TaskFlow.Api.Data;

// =====================================================================
// Program.cs = uygulamanın giriş noktası (C'deki main() gibi).
// İki aşaması var:
//   1) KURULUM: builder.Services ile ihtiyaç duyulan servisleri kaydet (DI container).
//   2) ÇALIŞMA: app.Use... ile her isteğin geçeceği middleware hattını diz.
// =====================================================================

var builder = WebApplication.CreateBuilder(args);

// ---------------------------------------------------------------------
// 1) SERVİSLER (Dependency Injection kayıtları)
// ---------------------------------------------------------------------

// Controller sınıflarını bul ve kullanıma hazırla.
builder.Services.AddControllers();

// VERİTABANI: Bağlantı adresi koda gömülmez, appsettings.json'dan okunur.
// Böylece aynı kod farklı ortamlarda (dev / prod) farklı veritabanına bağlanabilir.
// AddDbContext varsayılan olarak SCOPED kaydeder: her HTTP isteğine yeni bir DbContext.
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("Default")));

// CORS: Tarayıcı, farklı origin'e (protokol + host + port) yapılan isteklerin
// cevabını JavaScript'e vermez. API burada "5173'teki React uygulamasına güveniyorum" der.
// AllowAnyOrigin() KULLANMIYORUZ: o, her siteye kapıyı açmak olurdu.
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()   // Content-Type, Authorization gibi header'lara izin ver
              .AllowAnyMethod()); // GET, POST, PUT, DELETE
});

// KİMLİK DOĞRULAMA (Authentication): Her istekteki JWT'yi kontrol et.
var jwt = builder.Configuration.GetSection("Jwt");
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // .NET varsayılan olarak "sub" gibi claim adlarını uzun XML adlarına çevirir.
        // Kapatıyoruz ki token'da ne yazıyorsa kodda da o adla okuyalım.
        options.MapInboundClaims = false;

        options.TokenValidationParameters = new TokenValidationParameters
        {
            // İMZA: Token'ın payload'ı değiştirilmiş mi? (ör. sub:1 -> sub:2 yapıp başkası olmak)
            // Sunucu, kendi gizli anahtarıyla HMAC-SHA256 imzasını yeniden hesaplar ve karşılaştırır.
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!)),

            // SÜRE: Süresi dolmuş (çalınmış olabilecek) token reddedilir.
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1), // sunucu saatleri arasındaki küçük farklara tolerans

            // KİM ÜRETTİ: Başka bir sistemin ürettiği token kabul edilmez.
            ValidateIssuer = true,
            ValidIssuer = jwt["Issuer"],

            // KİM İÇİN ÜRETİLDİ: Başka bir API için üretilmiş token burada kullanılamaz.
            ValidateAudience = true,
            ValidAudience = jwt["Audience"]
        };

        // İMZASI GEÇERLİ AMA SAHİBİ YOK: Token doğru anahtarla imzalanmış olabilir ama
        // içindeki kullanıcı artık veritabanında olmayabilir (silindi veya veritabanı sıfırlandı).
        // JWT stateless olduğu için sunucu bunu kendiliğinden bilemez; burada biz kontrol ediyoruz.
        // Kontrol etmeseydik: görev eklerken foreign key hatası -> 500. Şimdi: temiz bir 401.
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var sub = context.Principal?.FindFirst("sub")?.Value;
                var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();

                if (!int.TryParse(sub, out var userId) || !await db.Users.AnyAsync(u => u.Id == userId))
                {
                    context.Fail("Token'daki kullanıcı bulunamadı.");
                }
            }
        };
    });

// YETKİLENDİRME (Authorization): [Authorize] gibi kuralları uygulayan servis.
builder.Services.AddAuthorization();

// API'nin otomatik dokümantasyonu (hangi endpoint var, ne alır, ne döner).
builder.Services.AddOpenApi();

var app = builder.Build();

// ---------------------------------------------------------------------
// 2) MIDDLEWARE HATTI: Her istek bunlardan YUKARIDAN AŞAĞI sırayla geçer.
//    Sıra önemlidir: her biri isteği durdurabilir veya sonrakine iletebilir.
// ---------------------------------------------------------------------

if (app.Environment.IsDevelopment())
{
    // Dokümantasyonu sadece geliştirme ortamında yayınla: /openapi/v1.json
    app.MapOpenApi();
}

// CORS en başlarda olmalı: hata dönen cevaplara da CORS header'ı eklensin ki
// tarayıcı gerçek hatayı (401, 400...) görebilsin, yanıltıcı bir CORS hatası değil.
app.UseCors("Frontend");

// "Sen kimsin?" -> Token'ı okur, doğrularsa isteğe User (ClaimsPrincipal) ekler.
app.UseAuthentication();

// "Buna yetkin var mı?" -> [Authorize] olan yerlere kimliksiz gelen isteği 401 ile keser.
// Authentication'dan SONRA gelmek zorunda: kim olduğunu bilmeden yetki kontrol edilemez.
app.UseAuthorization();

// ROUTING: "Bu adres + metod hangi controller metoduna gidiyor?"
app.MapControllers();

// Sunucuyu başlat ve istekleri dinlemeye başla.
app.Run();
