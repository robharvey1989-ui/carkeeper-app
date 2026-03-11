// src/components/EmptyGarage.tsx
export default function EmptyGarage({ onNewCar }: { onNewCar: () => void }) {
  return (
    <div className="rounded-2xl p-10 text-center">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-white/5 grid place-items-center text-white/60">
        Car
      </div>
      <h2 className="heading text-white/90 text-xl mt-4">Your garage is empty</h2>
      <p className="text-white/60 mt-1">
        Add your first car to start building a concours-grade digital history.
      </p>
      <button
        onClick={onNewCar}
        className="mt-5 px-4 py-2 rounded-xl btn-primary"
      >
        Add car
      </button>
    </div>
  );
}

