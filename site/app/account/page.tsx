"use client";

import { useEffect, useState } from "react";
import CapePreview from "@/components/CapePreview";
import { deleteCape, login, me, register, setCape, type ApiError, type Cape, type UserInfo } from "@/lib/api";

const TOKEN_KEY = "easycapes_token";

export default function AccountPage() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [cape, setCapeState] = useState<Cape | null>(null);

  const [tab, setTab] = useState<"login" | "register">("login");
  const [mcName, setMcName] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const [capeUrl, setCapeUrl] = useState("");
  const [capeError, setCapeError] = useState<string | null>(null);
  const [capeOk, setCapeOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved) {
      setToken(saved);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    me(token)
      .then((res) => setUser(res.user))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      });
  }, [token]);

  async function handleAuth() {
    setAuthError(null);
    setBusy(true);
    try {
      const res = tab === "login" ? await login(mcName, password) : await register(mcName, password);
      localStorage.setItem(TOKEN_KEY, res.token);
      setToken(res.token);
      setUser(res.user);
      setPassword("");
    } catch (e) {
      setAuthError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setCapeState(null);
  }

  async function handleSetCape() {
    if (!token) return;
    setCapeError(null);
    setCapeOk(null);
    setBusy(true);
    try {
      const res = await setCape(token, capeUrl);
      setCapeState(res.cape);
      setCapeOk("Плащ установлен! Игроки с модом увидят его мгновенно.");
      setCapeUrl("");
    } catch (e) {
      setCapeError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleClearCape() {
    if (!token) return;
    setCapeError(null);
    setCapeOk(null);
    setBusy(true);
    try {
      await deleteCape(token);
      setCapeState(null);
      setCapeOk("Плащ сброшен.");
    } catch (e) {
      setCapeError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <>
        <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
          <div className="tabs">
            <button className={tab === "login" ? "active" : ""} onClick={() => setTab("login")}>
              Вход
            </button>
            <button className={tab === "register" ? "active" : ""} onClick={() => setTab("register")}>
              Регистрация
            </button>
          </div>
          <label>Ник в Minecraft</label>
          <input value={mcName} onChange={(e) => setMcName(e.target.value)} placeholder="Steve" />
          <label>Пароль {tab === "register" && "(минимум 8 символов)"}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAuth()}
          />
          {authError && <div className="msg-err">{authError}</div>}
          <div style={{ marginTop: 16 }}>
            <button onClick={handleAuth} disabled={busy || !mcName || !password}>
              {tab === "login" ? "Войти" : "Создать аккаунт"}
            </button>
          </div>
          <p className="muted" style={{ marginTop: 14 }}>
            После входа скопируй токен и введи в игре: <code>{"/cape auth <токен>"}</code>
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="card">
        <h2>Профиль</h2>
        <div className="row">
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{user?.mcName}</div>
            <div className="muted">
              {user?.authType === "premium" ? "Premium (Mojang)" : "Offline"} · роль: {user?.role}
            </div>
          </div>
          <button className="secondary" onClick={logout}>
            Выйти
          </button>
        </div>
        <h3>Токен для мода</h3>
        <pre>{token}</pre>
        <p className="muted">
          Введи в игре: <code>{"/cape auth <токен>"}</code> (полный токен из поля выше)
        </p>
      </div>

      <div className="card">
        <h2>Мой плащ</h2>
        {cape && (
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
            <CapePreview url={cape.url} />
            <div className="muted">
              Активен · {cape.meta.width}×{cape.meta.height}
              <br />
              hash: {cape.hash.slice(0, 16)}…
            </div>
          </div>
        )}
        <label>Ссылка на PNG-плащ (2:1, до 4096×2048)</label>
        <input
          value={capeUrl}
          onChange={(e) => setCapeUrl(e.target.value)}
          placeholder="https://example.com/my-cape.png"
        />
        {capeError && <div className="msg-err">{capeError}</div>}
        {capeOk && <div className="msg-ok">{capeOk}</div>}
        <div className="row" style={{ marginTop: 14 }}>
          <button onClick={handleSetCape} disabled={busy || !capeUrl}>
            Установить плащ
          </button>
          <button className="secondary" onClick={handleClearCape} disabled={busy || !cape}>
            Сбросить
          </button>
        </div>
      </div>
    </>
  );
}
