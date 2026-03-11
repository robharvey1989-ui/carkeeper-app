import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useSingleCar } from "@/hooks/useSingleCar";

export default function CarHistory() {
  const { id } = useParams<{ id: string }>();
  const { car, loading, saving, error, save } = useSingleCar(id);
  const [value, setValue] = useState("");

  useEffect(() => {
    setValue(car?.history_text ?? "");
  }, [car?.history_text]);

  async function handleSave() {
    await save({ history_text: value });
    // optional: toast / visual feedback
    alert("History saved.");
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">History</h1>
          <p className="text-sm opacity-70">
            Capture the car’s story: ownership changes, notable trips, restorations, etc.
          </p>
        </div>
        <Link to={`/car/${id}`} className="text-blue-600 hover:underline">Back to car</Link>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          {error && <div className="mb-3 text-red-600">{error}</div>}
          <textarea
            className="w-full min-h-[280px] rounded-md border bg-white dark:bg-neutral-900 p-3"
            placeholder="Write the history here..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

