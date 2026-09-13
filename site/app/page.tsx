import Link from "next/link";

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>EasyCapes</h1>
        <p>Любые плащи по ссылке — их видят все игроки с модом. Мгновенные обновления.</p>
        <Link href="/account">
          <button>Установить свой плащ</button>
        </Link>
      </section>

      <section className="card">
        <h2>Как это работает</h2>
        <ol className="muted">
          <li>Скачай мод для своей версии и лоадера (Fabric / Forge / NeoForge)</li>
          <li>Создай аккаунт здесь и получи токен</li>
          <li>В игре: <code>{"/cape auth <токен>"}</code></li>
          <li>В игре: <code>/cape https://ссылка-на-картинку.png</code></li>
          <li>Все игроки с модом увидят твой плащ мгновенно</li>
        </ol>
      </section>

      <section className="card">
        <h2>Команды</h2>
        <pre>
          {`/cape <url>      — установить плащ по ссылке (PNG, 2:1, до 4096×2048)
/cape clear     — сбросить плащ
/cape toggle    — скрыть/показать свой плащ локально
/cape auth <токен> — вход для offline-аккаунтов
/cape status    — состояние`}
        </pre>
      </section>

      <section className="card">
        <h2>Требования к картинке</h2>
        <ul className="muted">
          <li>Формат PNG, HTTPS-ссылка</li>
          <li>Соотношение сторон 2:1 (64×32, 128×64, 256×128, …, 4096×2048)</li>
          <li>Ширина кратна 64</li>
          <li>В будущем — анимированные GIF-плащи</li>
        </ul>
      </section>

      <section className="card">
        <h2>Поддержка</h2>
        <p className="muted">
          Версии Minecraft: 1.20.1 — 1.21.11 · Лоадеры: Fabric, Forge, NeoForge ·
          Плащи видят только игроки с модом.
        </p>
      </section>
    </>
  );
}
