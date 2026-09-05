import { X } from "lucide-react";

export function BottomSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl border border-b-0 border-card-border bg-background p-4 pb-6 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="font-medium">{title}</p>
          <button onClick={onClose} aria-label="Close" className="p-2 -m-2 text-muted hover:text-foreground">
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
