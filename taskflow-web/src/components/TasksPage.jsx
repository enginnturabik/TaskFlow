import { useEffect, useState } from "react";
import { tasksApi } from "../api.js";
import { DONE, STATUSES } from "../statuses.js";
import AddTaskForm from "./AddTaskForm.jsx";
import TaskCard from "./TaskCard.jsx";

// =====================================================================
// TasksPage — Görev listesinin SAHİBİ.
// Görevler state'i burada yaşar; alt bileşenler sadece gösterir ve haber verir.
//
//            TasksPage  (state: tasks)
//            /        \
//   AddTaskForm      TaskCard x N
//   (onAdd ↑)        (onStatusChange ↑, onDelete ↑)
// =====================================================================
export default function TasksPage({ email, onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [busyId, setBusyId] = useState(null); // İşlem süren görevin Id'si (butonlarını kilitlemek için)
  const [filter, setFilter] = useState("Tümü");

  // ------------------------------------------------------------------
  // VERİYİ YÜKLEME: useEffect
  // Bileşen gövdesinde doğrudan fetch yapsaydık: fetch -> setTasks -> yeniden çizim -> fetch...
  // sonsuz döngü olurdu. useEffect "çizimden SONRA, sadece bağımlılıklar değişince çalış" der.
  // [] = hiçbir bağımlılık yok -> bileşen ekrana ilk geldiğinde bir kez çalışır.
  // ------------------------------------------------------------------
  useEffect(() => {
    // CLEANUP DESENİ: Bileşen ekrandan kalkarsa (ör. çıkış yapıldı) cevap geç gelse bile
    // state'e yazmayalım. Ayrıca geliştirmede StrictMode efektleri bilerek iki kez çalıştırır;
    // bu bayrak ilk (iptal edilen) çağrının sonucunu yok sayar.
    let ignore = false;

    async function load() {
      try {
        const data = await tasksApi.list();
        if (!ignore) setTasks(data);
      } catch (err) {
        if (!ignore) setLoadError(err.message);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    load();
    return () => {
      ignore = true; // cleanup fonksiyonu
    };
  }, []);

  // ------------------------------------------------------------------
  // EKLEME: AddTaskForm bu fonksiyonu çağırır.
  // Hata fırlatırsa AddTaskForm yakalar ve alan hatalarını gösterir.
  // ------------------------------------------------------------------
  async function handleAdd(newTask) {
    const created = await tasksApi.create(newTask); // Sunucu Id'yi verip görevi geri döndürür
    // FONKSİYONEL GÜNCELLEME: setTasks(prev => ...) en GÜNCEL state'i kullanır.
    // await'ten sonra "tasks" değişkeni eskimiş olabilir; prev her zaman doğrudur.
    // IMMUTABILITY: Diziyi değiştirmek (push) yerine YENİ dizi üretiyoruz; React değişikliği böyle fark eder.
    setTasks((prev) => [...prev, created]);
  }

  // ------------------------------------------------------------------
  // DURUM DEĞİŞTİRME: Pessimistic update
  // Önce sunucuya kaydet, başarılı olursa ekranı güncelle. Ekran asla kaydedilmemiş bir şey göstermez.
  // (Optimistic update ise önce ekranı değiştirip hata olursa geri alırdı; daha hızlı hissettirir, daha karmaşıktır.)
  // ------------------------------------------------------------------
  async function handleStatusChange(task, status) {
    setActionError(null);
    setBusyId(task.id);
    try {
      // PUT tüm kaynağı günceller; DTO'nun beklediği alanları eksiksiz gönderiyoruz.
      const body = { title: task.title, status, dueDate: task.dueDate };
      await tasksApi.update(task.id, body);
      // map ile yeni dizi; değişen görev için { ...t, status } ile yeni nesne (spread operatörü).
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)));
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(task) {
    // Geri alınamayan işlemden önce onay: küçük ama önemli bir kullanıcı deneyimi kuralı.
    if (!window.confirm(`"${task.title}" silinsin mi?`)) return;

    setActionError(null);
    setBusyId(task.id);
    try {
      await tasksApi.remove(task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  // ------------------------------------------------------------------
  // TÜRETİLMİŞ VERİ: Ayrı state DEĞİL, her çizimde tasks'tan hesaplanır.
  // Kural: Mevcut state'ten hesaplanabilen bir şeyi ayrı state yapma; iki kopya birbirini tutmaz hale gelir.
  // ------------------------------------------------------------------
  const remaining = tasks.filter((t) => t.status !== DONE).length;
  const visibleTasks = filter === "Tümü" ? tasks : tasks.filter((t) => t.status === filter);

  return (
    <section className="card">
      <header className="page-header">
        <div>
          <h1 className="brand">TaskFlow</h1>
          <p className="muted">{email}</p>
        </div>
        <button type="button" className="ghost" onClick={onLogout}>
          Çıkış yap
        </button>
      </header>

      <AddTaskForm onAdd={handleAdd} />

      {/* Veri çeken her ekranın 4 hali vardır: yükleniyor, hata, boş, dolu.
          Junior'lar genelde sadece "dolu" halini yazar; kullanıcı da boş beyaz bir sayfa görür. */}
      {isLoading && <p className="muted">Yükleniyor...</p>}
      {loadError && <p className="alert">{loadError}</p>}

      {!isLoading && !loadError && (
        <>
          <div className="toolbar">
            <span className="muted">
              {remaining === 0 ? "Hepsi bitti!" : `${remaining} görev kaldı`}
            </span>
            {/* Filtre butonları: tıklanınca sadece "filter" state'i değişir, liste kendiliğinden yeniden hesaplanır. */}
            <div className="filters" role="group" aria-label="Duruma göre filtrele">
              {["Tümü", ...STATUSES].map((f) => (
                <button
                  key={f}
                  type="button"
                  className={f === filter ? "chip chip--active" : "chip"}
                  aria-pressed={f === filter}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {actionError && <p className="alert">{actionError}</p>}

          {tasks.length === 0 ? (
            <p className="empty">Henüz görevin yok. İlkini yukarıdan ekle.</p>
          ) : visibleTasks.length === 0 ? (
            <p className="empty">Bu filtrede görev yok.</p>
          ) : (
            <ul className="task-list">
              {/* key: React liste değişince hangi elemanın eklendiğini/silindiğini bununla anlar.
                  Dizi index'i değil, kalıcı ve benzersiz Id kullanılır (veritabanındaki primary key gibi). */}
              {visibleTasks.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  isBusy={busyId === t.id}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
