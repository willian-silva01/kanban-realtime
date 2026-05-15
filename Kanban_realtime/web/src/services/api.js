import axios from "axios";

// ─── Instância base ──────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: "http://localhost:3000/api",
  timeout: 10000, // evita requisições penduradas indefinidamente
});

// ─── Interceptor de REQUEST ──────────────────────────────────────────────────
// Injeta o token JWT em TODA requisição automaticamente.
// O interceptor é global — qualquer chamada api.get/post/patch/delete passa aqui.
// Não é necessário checar token nos componentes: se não houver token, a requisição
// sai sem Authorization header e o backend retorna 401, devidamente tratado abaixo.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("@Kanban:token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Interceptor de RESPONSE ─────────────────────────────────────────────────
// Centraliza o tratamento de erros HTTP globalmente.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      // Token ausente, inválido ou expirado — encerra a sessão
      localStorage.removeItem("@Kanban:token");
      localStorage.removeItem("@Kanban:user");

      // Comunica ao AuthContext via evento customizado do DOM.
      // Padrão correto para desacoplar Axios (sem acesso ao React) do contexto.
      window.dispatchEvent(new CustomEvent("auth:logout"));
    }

    // Rejeitamos SEMPRE — o componente decide como tratar o erro
    return Promise.reject(error);
  }
);

export default api;
