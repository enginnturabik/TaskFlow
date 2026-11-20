using Microsoft.EntityFrameworkCore;
using TaskFlow.Api.Models;

namespace TaskFlow.Api.Data;

// DbContext: Kod ile veritabanı arasındaki köprü (ORM'in kalbi).
// C# nesneleriyle çalışırız; EF Core bunları SQL'e çevirir.
public class AppDbContext : DbContext
{
    // Hangi veritabanına bağlanacağını KENDİSİ bilmez, dışarıdan alır (Dependency Injection).
    // Böylece geliştirmede SQLite, canlıda PostgreSQL, testte bellek içi DB kullanılabilir.
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // Her DbSet bir tablodur. _db.Tasks.Where(...) yazdığımızda bu tabloya SQL sorgusu gider.
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
    public DbSet<User> Users => Set<User>();

    // Uygulama açılırken EF Core bu metodu bir kez çağırır ve veritabanı modelini kurar.
    // İsimlendirme kurallarıyla anlatılamayan kuralları burada "Fluent API" ile yazarız.
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // UNIQUE INDEX: Aynı e-postayla iki kullanıcı olamaz.
        // Kontrolü kodda da yapıyoruz ama asıl garanti veritabanında:
        // aynı anda gelen iki kayıt isteği (race condition) kod kontrolünü atlatabilir, index atlatamaz.
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        // BİRE-ÇOK (one-to-many) İLİŞKİ: Bir kullanıcının çok görevi, her görevin tek sahibi var.
        // CASCADE DELETE: Kullanıcı silinirse görevleri de silinir; sahibi olmayan görevin anlamı yok.
        // (Alternatifler: Restrict = silmeyi engelle, SetNull = sahibi boşalt.)
        modelBuilder.Entity<TaskItem>()
            .HasOne<User>()
            .WithMany()
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
