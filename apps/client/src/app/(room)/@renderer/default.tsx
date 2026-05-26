export default function Renderer() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
      <div className="relative min-h-[520px] flex-1 overflow-hidden rounded-2xl border border-border bg-overlay shadow-overlay">
        <div className="absolute inset-0 todak-grid-bg" />
        renderer
      </div>
    </div>
  );
}
