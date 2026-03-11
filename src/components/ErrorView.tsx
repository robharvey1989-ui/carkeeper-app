export default function ErrorView({ message }: { message?: string }) {
  return (
    <div className="rounded-lg border p-6 text-center">
      <div className="font-medium mb-1">Something went wrong</div>
      <div className="text-sm text-muted-foreground">{message || "Please try again."}</div>
    </div>
  );
}
