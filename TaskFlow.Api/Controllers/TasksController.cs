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

    // POST /api/tasks → yeni görev
    [HttpPost]
    public async Task<IActionResult> Create(TaskItem task)
    {
        _db.Tasks.Add(task);
        await _db.SaveChangesAsync();                       // Asıl INSERT burada olur
        return CreatedAtAction(nameof(GetById), new { id = task.Id }, task);  // 201
    }

    // PUT /api/tasks/5 → görevi güncelle
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, TaskItem updated)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task == null) return NotFound();                // 404

        task.Title = updated.Title;
        task.Status = updated.Status;
        task.DueDate = updated.DueDate;
        await _db.SaveChangesAsync();                       // UPDATE
        return NoContent();                                 // 204
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