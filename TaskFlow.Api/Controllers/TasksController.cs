using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskFlow.Api.Data;
using TaskFlow.Api.Dtos;
using TaskFlow.Api.Models;

namespace TaskFlow.Api.Controllers;

// REST API: Adres (kaynak) sabit kalır, ne yapılacağını HTTP metodu söyler.
//   GET    /api/tasks      -> listele         (200)
//   GET    /api/tasks/5    -> tek görev       (200 / 404)
//   POST   /api/tasks      -> oluştur         (201 / 400)
//   PUT    /api/tasks/5    -> güncelle        (204 / 400 / 404)
//   DELETE /api/tasks/5    -> sil             (204 / 404)
[ApiController]          // Gelen DTO'yu otomatik doğrular, geçersizse metoda girmeden 400 döner.
[Route("api/tasks")]
[Authorize]              // DEKLARATİF GÜVENLİK: Buradaki her endpoint geçerli token ister, yoksa 401.
public class TasksController : ControllerBase
{
    private readonly AppDbContext _db;

    // Controller veritabanını kendisi oluşturmaz, framework verir (Dependency Injection).
    public TasksController(AppDbContext db)
    {
        _db = db;
    }

    // Giriş yapmış kullanıcının Id'si. Authentication middleware token'ı doğrulayıp
    // içindeki claim'leri "User" nesnesine koydu; "sub" (subject) = kullanıcı Id'si.
    // "!" güvenli: [Authorize] sayesinde buraya geçerli token'sız istek ulaşamaz.
    private int CurrentUserId => int.Parse(User.FindFirst("sub")!.Value);

    // SAHİPLİK KONTROLÜ (IDOR koruması):
    // [Authorize] sadece "giriş yapmış mı?" diye bakar, "bu görev onun mu?" diye bakmaz.
    // Bu yüzden görevi Id İLE BİRLİKTE sahibine göre ararız. Başkasının görevi -> null.
    // Tek yardımcı metot = tek doğru yer; 4 metodun her birinde ayrı ayrı unutma riski yok.
    private Task<TaskItem?> FindOwnTaskAsync(int id) =>
        _db.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.UserId == CurrentUserId);

    // GET /api/tasks -> sadece BENİM görevlerim
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        // Filtreleme VERİTABANINDA yapılır (WHERE UserId = @p).
        // Hepsini çekip C#'ta filtrelemek 10 satırda çalışır, 10 milyon satırda çöker.
        var tasks = await _db.Tasks
            .Where(t => t.UserId == CurrentUserId)
            .OrderBy(t => t.Id)
            .ToListAsync();

        return Ok(tasks); // 200
    }

    // GET /api/tasks/5
    [HttpGet("{id}")]               // Adresteki {id}, aşağıdaki int id parametresine otomatik bağlanır.
    public async Task<IActionResult> GetById(int id)
    {
        var task = await FindOwnTaskAsync(id);

        // Başkasının görevi için de 404 dönüyoruz, 403 DEĞİL.
        // 403 "var ama senin değil" demek olurdu; saldırgan Id'leri tarayarak hangilerinin var olduğunu öğrenirdi.
        if (task == null) return NotFound(); // 404

        return Ok(task); // 200
    }

    // POST /api/tasks
    // Parametre = İÇERİ GELEN veri (JSON -> SaveTaskDto). return = DIŞARI GİDEN yanıt.
    [HttpPost]
    public async Task<IActionResult> Create(SaveTaskDto dto)
    {
        // Entity'yi DTO'dan BİZ kuruyoruz; hangi alanın kopyalanacağına biz karar veriyoruz.
        var task = new TaskItem
        {
            Title = dto.Title.Trim(),
            Status = dto.Status,
            DueDate = dto.DueDate,

            // SAHİP, istek gövdesinden DEĞİL, doğrulanmış token'dan gelir.
            // DTO'da UserId alanı yok; istemci başkası adına görev oluşturamaz (overposting koruması).
            UserId = CurrentUserId
        };

        _db.Tasks.Add(task);           // Henüz veritabanına gitmedi; EF Core değişikliği takip ediyor.
        await _db.SaveChangesAsync();  // Asıl INSERT burada. Veritabanı yeni Id'yi verir, task.Id dolar.

        // 201 Created + "Location: /api/tasks/{id}" header'ı + yeni görevin JSON'ı.
        return CreatedAtAction(nameof(GetById), new { id = task.Id }, task);
    }

    // PUT /api/tasks/5
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, SaveTaskDto dto)
    {
        var task = await FindOwnTaskAsync(id);
        if (task == null) return NotFound(); // 404

        task.Title = dto.Title.Trim();
        task.Status = dto.Status;
        task.DueDate = dto.DueDate;

        // EF Core hangi alanların değiştiğini takip eder (change tracking) ve sadece onları UPDATE eder.
        await _db.SaveChangesAsync();

        return NoContent(); // 204: başarılı, gönderilecek içerik yok
    }

    // DELETE /api/tasks/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var task = await FindOwnTaskAsync(id);
        if (task == null) return NotFound(); // 404

        _db.Tasks.Remove(task);
        await _db.SaveChangesAsync(); // DELETE

        return NoContent(); // 204
    }
}
