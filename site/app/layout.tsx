import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "EasyCapes — любые плащи по ссылке",
  description:
    "Мод для Minecraft 1.20.1–1.21.11: устанавливайте любые плащи по ссылке. Fabric, Forge, NeoForge.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <header className="nav">
          <Link href="/" className="logo">
            Easy<span>Capes</span>
          </Link>
          <nav>
            <Link href="/gallery">Галерея</Link>
            <Link href="/account">Аккаунт</Link>
            <Link href="/docs">Документация</Link>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="footer">
          EasyCapes · мод для Minecraft · плащи видят все игроки с модом
        </footer>
      </body>
    </html>
  );
}
