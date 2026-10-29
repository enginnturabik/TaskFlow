namespace TaskFlow.Api.Models;

public class TaskItem
{
    public int Id { get; set; }                       // Primary key (EF Core "Id" adını otomatik tanır)
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = "Yapılacak";
    public DateTime? DueDate { get; set; }            // ? = boş bırakılabilir
}