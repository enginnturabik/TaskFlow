import { useState } from "react";
import { fieldError } from "../api.js";

// =====================================================================
// AddTaskForm — Yeni görev formu.
// API'yi DOĞRUDAN çağırmaz; "onAdd" ile üst bileşene iletir.
// Böylece görev listesinin tek sahibi TasksPage olur (single source of truth).
// =====================================================================
export default function AddTaskForm({ onAdd }) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(""); // <input type="date"> "2026-11-20" biçiminde verir
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      // Boş tarih "" yerine null gönderilir; backend'de DueDate nullable (DateTime?).
      await onAdd({ title, status: "Yapılacak", dueDate: dueDate || null });
      setTitle(""); // Başarılıysa formu temizle. Controlled input olduğu için bu kadar basit.
      setDueDate("");
    } catch (err) {
      setError(err); // Hata olursa yazılanı silmiyoruz; kullanıcı düzeltip tekrar denesin.
    } finally {
      setIsSaving(false);
    }
  }

  const titleError = fieldError(error, "Title");

  return (
    <form onSubmit={handleSubmit} noValidate className="add-form">
      <div className="add-row">
        <input
          aria-label="Görev başlığı"
          placeholder="Yeni görev ekle..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          aria-label="Son tarih"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <button type="submit" className="primary" disabled={isSaving}>
          {isSaving ? "Ekleniyor..." : "Ekle"}
        </button>
      </div>
      {/* Mesaj, backend'deki SaveTaskDto.cs içindeki [Required] kuralından geliyor. */}
      {titleError && <p className="field-error">{titleError}</p>}
      {error && !titleError && <p className="alert">{error.message}</p>}
    </form>
  );
}
