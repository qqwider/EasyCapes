export const metadata = { title: "Документация — EasyCapes" };

export default function DocsPage() {
  return (
    <>
      <h2 style={{ marginTop: 0 }}>Документация API</h2>
      <p className="muted">
        Полный протокол: <code>docs/protocol.md</code> в репозитории. Prefix: <code>/api/v1</code>.
      </p>

      <div className="card">
        <h2>REST</h2>
        <table>
          <thead>
            <tr>
              <th>Метод</th>
              <th>Путь</th>
              <th>Описание</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>POST</td>
              <td><code>/auth/register</code></td>
              <td>Регистрация: {"{ mcName, password }"} → token</td>
            </tr>
            <tr>
              <td>POST</td>
              <td><code>/auth/login</code></td>
              <td>Вход → token</td>
            </tr>
            <tr>
              <td>GET</td>
              <td><code>/me</code></td>
              <td>Профиль (Bearer)</td>
            </tr>
            <tr>
              <td>POST</td>
              <td><code>/me/cape</code></td>
              <td>Установить плащ {"{ url }"} (Bearer)</td>
            </tr>
            <tr>
              <td>DELETE</td>
              <td><code>/me/cape</code></td>
              <td>Сбросить плащ (Bearer)</td>
            </tr>
            <tr>
              <td>POST</td>
              <td><code>/premium/verify</code></td>
              <td>Верификация Mojang-сессии → token</td>
            </tr>
            <tr>
              <td>GET</td>
              <td><code>/capes?names=a,b,c</code></td>
              <td>Массовая загрузка плащей (≤32 ников)</td>
            </tr>
            <tr>
              <td>GET</td>
              <td><code>/textures/:hash.png</code></td>
              <td>Текстура (immutable cache)</td>
            </tr>
            <tr>
              <td>GET</td>
              <td><code>/gallery</code></td>
              <td>Галерея плащей</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>WebSocket</h2>
        <p className="muted">
          <code>ws://host/api/v1/ws</code> — сервер пушит событие{" "}
          <code>{"{ event: \"cape:update\", name, cape }"}</code> всем подключённым клиентам при
          смене плаща. Клиент отправляет <code>{"{ event: \"ping\" }"}</code>, сервер отвечает{" "}
          <code>pong</code>.
        </p>
      </div>

      <div className="card">
        <h2>Валидация картинок</h2>
        <ul className="muted">
          <li>Только HTTPS-ссылки (приватные адреса заблокированы)</li>
          <li>image/png, ≤ 10 МБ</li>
          <li>Соотношение 2:1, ширина кратна 64, максимум 4096×2048</li>
          <li>Rate limit: 10 смен плаща в час</li>
          <li>Текстуры раздаются с бекенда по хешу (dedupe)</li>
        </ul>
      </div>
    </>
  );
}
