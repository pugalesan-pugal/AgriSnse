"use client";

import { useState } from "react";

type Activity = {
  id: string;
  type: string;
  notes: string;
  ts: number; // epoch ms
  photoUrl?: string;
};

export default function ActivityModule() {
  const [items, setItems] = useState<Activity[]>([]);
  const [type, setType] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function addActivity(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // TODO: upload photo and save to DB; placeholders below
      let photoUrl: string | undefined = undefined;
      if (photo) {
        // placeholder upload
        await new Promise((r) => setTimeout(r, 400));
        photoUrl = URL.createObjectURL(photo);
      }
      const entry: Activity = {
        id: crypto.randomUUID(),
        type: type || "Activity",
        notes,
        ts: Date.now(),
        photoUrl,
      };
      setItems((prev) => [entry, ...prev]);
      setType("");
      setNotes("");
      setPhoto(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Activity Tracking</h2>
      <form onSubmit={addActivity} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select
          className="border border-neutral-300 rounded-lg px-3 py-2"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">Select activity</option>
          <option value="Sowing">Sowing</option>
          <option value="Irrigation">Irrigation</option>
          <option value="Fertilizer">Fertilizer</option>
          <option value="Pesticide">Pesticide</option>
          <option value="Pest Issue">Pest Issue</option>
        </select>
        <input
          className="border border-neutral-300 rounded-lg px-3 py-2 sm:col-span-2"
          placeholder="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          className="sm:col-span-3"
        />
        <button
          className="px-4 py-2 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 sm:col-span-3 disabled:opacity-50"
          disabled={saving}
        >
          {saving ? "Saving..." : "Add Activity"}
        </button>
      </form>

      <div className="grid gap-3">
        {items.map((it) => (
          <div key={it.id} className="border border-neutral-200 rounded-lg p-3 bg-white">
            <div className="text-sm text-neutral-500">
              {new Date(it.ts).toLocaleString()} • {it.type}
            </div>
            <div className="mt-1">{it.notes}</div>
            {it.photoUrl && (
              <img src={it.photoUrl} alt="uploaded" className="mt-2 rounded-md max-h-56 object-cover" />
            )}
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-sm text-neutral-500">No activities yet.</div>
        )}
      </div>
    </div>
  );
}


