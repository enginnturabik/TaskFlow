import { DONE, STATUSES } from "../statuses.js";

// =====================================================================
// TaskCard — Tek bir görevi gösterir.
// STATE'İ YOK: Sadece props alır ve gösterir ("presentational component").
// Bir şey değişince kendisi değiştirmez; onStatusChange / onDelete ile yukarıya haber verir.
// =====================================================================

// Tarihi Türkçe biçimde gösterir: "2026-11-20T00:00:00" -> "20 Kas 2026"
function formatDate(value) {
  return new Date(value).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Son tarihi geçmiş mi? (Bugün dahil değil.)
function isOverdue(task) {
  if (!task.dueDate || task.status === DONE) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(task.dueDate) < today;
}

export default function TaskCard({ task, isBusy, onStatusChange, onDelete }) {
  // TÜRETİLMİŞ DEĞERLER: State'te SAKLANMAZ, her çizimde mevcut veriden HESAPLANIR.
  // Böylece "durum Bitti ama renk hâlâ turuncu" gibi tutarsızlık asla olamaz.
  const done = task.status === DONE;
  const overdue = isOverdue(task);

  // className'leri koşula göre birleştiriyoruz; görünüm CSS'te, karar burada.
  const classes = ["task", done && "task--done", overdue && "task--overdue", isBusy && "task--busy"]
    .filter(Boolean)
    .join(" ");

  return (
    <li className={classes}>
      <div className="task-main">
        <span className="task-title">{task.title}</span>
        {task.dueDate && (
          <span className="task-date">
            {overdue ? "Gecikti · " : "Son tarih: "}
            {formatDate(task.dueDate)}
          </span>
        )}
      </div>

      <div className="task-actions">
        {/* Bu <select> de controlled: değeri task.status'tan gelir.
            Kullanıcı seçince state'i biz değiştirmiyoruz; üst bileşen API'ye kaydedip state'i güncelliyor. */}
        <select
          aria-label={`${task.title} durumu`}
          value={task.status}
          disabled={isBusy}
          onChange={(e) => onStatusChange(task, e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="danger"
          disabled={isBusy}
          onClick={() => onDelete(task)}
          aria-label={`${task.title} görevini sil`}
        >
          Sil
        </button>
      </div>
    </li>
  );
}
