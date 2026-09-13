"use client";

import { useEffect, useState } from "react";
import CapePreview from "@/components/CapePreview";
import { fetchGallery } from "@/lib/api";

export default function GalleryPage() {
  const [items, setItems] = useState<{ name: string; cape: import("@/lib/api").Cape }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGallery(60)
      .then((res) => setItems(res.items))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="muted">Загрузка…</p>;
  if (error) return <p className="msg-err">Ошибка: {error}</p>;

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Галерея плащей</h2>
      {items.length === 0 ? (
        <p className="muted">Пока пусто — установи первый плащ через /cape!</p>
      ) : (
        <div className="grid">
          {items.map((item) => (
            <div key={item.cape.id} className="cape-card">
              <CapePreview url={item.cape.url} scale={10} />
              <div className="cape-name">{item.name}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
