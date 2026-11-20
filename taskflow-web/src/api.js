// =====================================================================
// api.js — Frontend ile backend arasındaki TEK kapı.
//
// Neden ayrı bir dosya? Bileşenler (component) "nasıl görünür"le ilgilenir;
// "sunucuyla nasıl konuşulur" bilgisi tek bir yerde durur. Token eklemek,
// hata okumak, 401'i yakalamak gibi işler her bileşende tekrar yazılmaz.
// Buna "separation of concerns" (sorumlulukların ayrılması) denir.
// =====================================================================

const API_BASE = "http://localhost:5000/api";
const TOKEN_KEY = "taskflow_token";

// ---------------------------------------------------------------------
// TOKEN SAKLAMA
// localStorage: tarayıcıda, sayfa yenilense de kalan anahtar-değer deposu.
// Bilinçli bir tercih (trade-off): Kolay ama sayfada çalışan her JavaScript
// okuyabilir; bu yüzden XSS açığı token'ın çalınması demektir. Büyük
// projelerde token çoğu zaman JavaScript'in okuyamadığı "HttpOnly cookie"de tutulur.
// try/catch: Gizli pencere gibi durumlarda localStorage hata fırlatabilir.
// ---------------------------------------------------------------------
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Depolanamazsa oturum sadece bu sekme açıkken sürer; uygulama yine çalışır.
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // yok say
  }
}

// ---------------------------------------------------------------------
// JWT'Yİ OKUMAK (doğrulamak DEĞİL!)
// Token'ın ortadaki parçası (payload) şifreli değil, sadece Base64URL ile kodlanmış.
// Frontend bunu e-postayı göstermek ve süresi dolmuş mu bakmak için okuyabilir.
// İmzayı doğrulayamaz (gizli anahtar sadece sunucuda); güvenlik kararı her zaman backend'de.
// ---------------------------------------------------------------------
export function readTokenPayload(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null; // bozuk token
  }
}

export function isTokenExpired(token) {
  const payload = readTokenPayload(token);
  // "exp" saniye cinsinden Unix zamanıdır; Date.now() milisaniye verir.
  return !payload || payload.exp * 1000 <= Date.now();
}

// ---------------------------------------------------------------------
// HATA TİPİ
// fetch, 404 veya 500 gelse bile hata FIRLATMAZ; sadece ağ koparsa fırlatır.
// Bu yüzden status kodunu kendimiz kontrol edip anlamlı bir hataya çeviriyoruz.
// fieldErrors: Backend'in DTO doğrulamasından gelen { Title: ["Başlık zorunludur."] } nesnesi.
// ---------------------------------------------------------------------
export class ApiError extends Error {
  constructor(status, message, fieldErrors = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

// Doğrulama hatalarından bir alanın ilk mesajını verir.
// ASP.NET Core anahtarları C# property adıyla döner ("Title"); güvenli olsun diye küçük harfe de bakıyoruz.
export function fieldError(error, field) {
  if (!(error instanceof ApiError)) return null;
  const errors = error.fieldErrors;
  const lower = field.charAt(0).toLowerCase() + field.slice(1);
  return errors[field]?.[0] ?? errors[lower]?.[0] ?? null;
}

// ---------------------------------------------------------------------
// TÜM İSTEKLERİN GEÇTİĞİ FONKSİYON
// Backend'deki middleware hattının frontend'deki küçük kardeşi gibi düşün:
// her istek buradan geçer; token eklenir, hata okunur, 401 yakalanır.
// ---------------------------------------------------------------------
async function request(path, { method = "GET", body } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  // KİMLİK: Token varsa her isteğe "Authorization: Bearer <token>" header'ı eklenir.
  // Sunucu oturum tutmaz (stateless); kimliğini her istekte bu header'la kanıtlarsın.
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(API_BASE + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // Buraya sadece ağ hatasında düşülür: sunucu kapalı, yanlış port, CORS engeli...
    throw new ApiError(0, "Sunucuya ulaşılamadı. API çalışıyor mu? (dotnet run)");
  }

  // Token'la gidip 401 aldıysak token geçersiz veya süresi dolmuş demektir.
  // Token'ı sil ve uygulamaya "oturum bitti" olayını yayınla; App.jsx bunu dinleyip giriş ekranına döner.
  if (response.status === 401 && token) {
    clearToken();
    window.dispatchEvent(new Event("auth:expired"));
  }

  if (!response.ok) {
    let data = null;
    try {
      data = await response.json();
    } catch {
      // Gövdesi boş veya JSON olmayan hata (ör. düz 404).
    }
    const message =
      data?.message ?? // bizim AuthController'ın döndürdüğü { message: "..." }
      (data?.errors ? "Lütfen formdaki hataları düzeltin." : null) ?? // 400 ProblemDetails
      `İstek başarısız oldu (${response.status}).`;
    throw new ApiError(response.status, message, data?.errors ?? {});
  }

  // 204 No Content ve 201 (register) gibi gövdesiz cevaplar.
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

// ---------------------------------------------------------------------
// ENDPOINT'LER: Backend'deki controller'ların birebir aynası.
// Bileşenler URL veya HTTP metodu bilmez; sadece "tasksApi.create(...)" der.
// ---------------------------------------------------------------------
export const authApi = {
  register: (email, password) =>
    request("/auth/register", { method: "POST", body: { email, password } }),
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: { email, password } }),
};

export const tasksApi = {
  list: () => request("/tasks"),
  create: (task) => request("/tasks", { method: "POST", body: task }),
  update: (id, task) => request(`/tasks/${id}`, { method: "PUT", body: task }),
  remove: (id) => request(`/tasks/${id}`, { method: "DELETE" }),
};
