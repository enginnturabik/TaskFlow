import { useState } from "react";
import { authApi, fieldError } from "../api.js";

// =====================================================================
// AuthForm — Giriş ve kayıt ekranı.
// Tek bileşen iki işi yapar; "mode" state'i hangisinin gösterileceğini seçer.
// Başarılı girişte token'ı kendisi saklamaz; üst bileşene (App) haber verir.
// Veri yukarıda yaşar, olaylar yukarı çıkar (tek yönlü veri akışı).
// =====================================================================
export default function AuthForm({ onLoggedIn }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");     // CONTROLLED INPUT: değer state'te yaşar
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLogin = mode === "login";

  async function handleSubmit(e) {
    e.preventDefault(); // Formun varsayılan davranışı sayfayı yenilemektir; React state'i silinirdi.
    setError(null);
    setIsSubmitting(true); // Butonu kilitle: çift tıklamada iki istek gitmesin.

    try {
      if (!isLogin) {
        // Kayıt başarılıysa kullanıcıyı ayrıca giriş yaptırmayalım; hemen login isteği atıyoruz.
        await authApi.register(email, password);
      }
      const { token } = await authApi.login(email, password);
      onLoggedIn(token);
    } catch (err) {
      setError(err);
    } finally {
      setIsSubmitting(false); // Başarılı da olsa hatalı da olsa kilidi aç.
    }
  }

  function switchMode() {
    setMode(isLogin ? "register" : "login");
    setError(null);
  }

  // Alan bazlı mesajlar backend'in DTO kurallarından gelir (AuthDto.cs).
  const emailError = fieldError(error, "Email");
  const passwordError = fieldError(error, "Password");
  const generalError = error && !emailError && !passwordError ? error.message : null;

  return (
    <section className="card auth-card">
      <h1 className="brand">TaskFlow</h1>
      <p className="muted">{isLogin ? "Hesabına giriş yap" : "Yeni hesap oluştur"}</p>

      {/* noValidate: Tarayıcının kendi doğrulamasını kapatıyoruz ki backend'in mesajlarını görelim.
          Gerçek projede ikisi de olur: frontend kontrolü kullanıcı deneyimi, backend kontrolü güvenlik içindir. */}
      <form onSubmit={handleSubmit} noValidate className="stack">
        {/* label + htmlFor: Etikete tıklayınca input'a odaklanır, ekran okuyucu alanı tanır. */}
        <label htmlFor="email">E-posta</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {emailError && <p className="field-error">{emailError}</p>}

        <label htmlFor="password">Şifre</label>
        <input
          id="password"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {passwordError && <p className="field-error">{passwordError}</p>}

        {generalError && <p className="alert">{generalError}</p>}

        <button type="submit" className="primary" disabled={isSubmitting}>
          {isSubmitting ? "Bekleyin..." : isLogin ? "Giriş yap" : "Kayıt ol"}
        </button>
      </form>

      {/* type="button": Form içinde olmasa da alışkanlık; aksi halde form'u gönderebilirdi. */}
      <button type="button" className="link" onClick={switchMode}>
        {isLogin ? "Hesabın yok mu? Kayıt ol" : "Zaten hesabın var mı? Giriş yap"}
      </button>
    </section>
  );
}
