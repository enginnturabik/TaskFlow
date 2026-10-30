using TaskFlow.Api.Dtos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskFlow.Api.Data;
using TaskFlow.Api.Models;

namespace TaskFlow.Api.Controllers;

[ApiController]
[Route("api/tasks")]
public class TasksController : ControllerBase
{
    private readonly AppDbContext _db;

    public TasksController(AppDbContext db)   // DI: veritabanını framework veriyor
    {
        _db = db;
    }

    // GET /api/tasks → tüm görevler
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var tasks = await _db.Tasks.ToListAsync();
        return Ok(tasks);                                   // 200
    }

    // GET /api/tasks/5 → tek görev
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task == null) return NotFound();                // 404
        return Ok(task);                                    // 200
    }

    [HttpPost]
    public async Task<IActionResult> Create(SaveTaskDto dto)
    {
        // DTO'dan entity'yi biz oluşturuyoruz; hangi alanın kopyalanacağına biz karar veriyoruz
        var task = new TaskItem
        {
            Title = dto.Title,
            Status = dto.Status,
            DueDate = dto.DueDate
        };

        _db.Tasks.Add(task);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = task.Id }, task);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, SaveTaskDto dto)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task == null) return NotFound();

        task.Title = dto.Title;
        task.Status = dto.Status;
        task.DueDate = dto.DueDate;
        await _db.SaveChangesAsync();
        return NoContent();
    }
    // DELETE /api/tasks/5 → görevi sil
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task == null) return NotFound();                // 404

        _db.Tasks.Remove(task);
        await _db.SaveChangesAsync();                       // DELETE
        return NoContent();                                 // 204
    }
}