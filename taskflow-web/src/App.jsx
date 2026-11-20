import { useEffect, useState } from "react";
import { clearToken, getToken, isTokenExpired, readTokenPayload, saveToken } from "./api.js";
import AuthForm from "./components/AuthForm.jsx";
import TasksPage from "./components/TasksPage.jsx";

// =====================================================================
// App — Uygulamanın kökü. Tek sorumluluğu: OTURUM.
// Giriş yapılmışsa görev sayfasını, yapılmamışsa giriş ekranını gösterir.
//
// React'in temel fikri:  EKRAN = f(STATE)
// DOM'a dokunmayız; sadece "session" state'ini değiştiririz, React hangi ekranın
// görüneceğini kendisi hesaplar (declarative / bildirimsel programlama).
// =====================================================================

// Sayfa açılırken localStorage'da geçerli bir token var mı? Varsa oturumu oradan başlat.
function loadInitialSession() {
  const token = getToken();
  if (!token || isTokenExpired(token)) {
    clearToken();
    return null;
  }
  return { token, email: readTokenPayload(token)?.email ?? "" };
}

export default function App() {
  // useState'e FONKSİYON veriyoruz (lazy initial state): localStorage okuması
  // her çizimde değil, sadece ilk çizimde bir kez yapılır.
  const [session, setSession] = useState(loadInitialSession);

  // api.js, token'la gidip 401 aldığında "auth:expired" olayı yayınlar.
  // Burada onu dinleyip oturumu kapatıyoruz. Dinleyiciyi cleanup'ta kaldırmazsak
  // her yeniden bağlanmada bir tane daha eklenir (memory leak).
  useEffect(() => {
    function handleExpired() {
      setSession(null);
    }
    window.addEventListener("auth:expired", handleExpired);
    return () => window.removeEventListener("auth:expired", handleExpired);
  }, []);

  function handleLoggedIn(token) {
    saveToken(token);
    setSession({ token, email: readTokenPayload(token)?.email ?? "" });
  }

  function handleLogout() {
    // JWT stateless olduğu için sunucuda "oturumu kapat" diye bir şey yok;
    // token'ı istemciden silmek yeterli. (Bu yüzden token ömürleri kısa tutulur.)
    clearToken();
    setSession(null);
  }

  return (
    <main className="app">
      {session ? (
        // key: Kullanıcı değişince TasksPage sıfırdan kurulsun, eski kullanıcının görevleri ekranda kalmasın.
        <TasksPage key={session.email} email={session.email} onLogout={handleLogout} />
      ) : (
        <AuthForm onLoggedIn={handleLoggedIn} />
      )}
    </main>
  );
}
