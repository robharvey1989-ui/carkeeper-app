// src/components/CollapseSection.tsx
import { ReactNode } from "react";

type Props = {
  title: string;
  visible: boolean;
  collapsed: boolean;
  onToggleVisible: () => void;
  onToggleCollapsed: () => void;
  children: ReactNode;
  rightSlot?: ReactNode; // optional controls on the right of header
};

export default function CollapseSection({
  title,
  visible,
  collapsed,
  onToggleVisible,
  onToggleCollapsed,
  children,
  rightSlot,
}: Props) {
  return (
    <div className="rounded-xl border">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleCollapsed}
            className="px-2 py-1 rounded-md border text-sm"
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>
          <div className="font-medium">{title}</div>
        </div>
        <div className="flex items-center gap-2">
          {rightSlot}
          <button
            onClick={onToggleVisible}
            className="px-2 py-1 rounded-md border text-sm"
            title={visible ? "Hide section" : "Show section"}
          >
            {visible ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      {visible && !collapsed && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
      {visible && collapsed && (
        <div className="px-4 pb-4 opacity-60 text-sm">
          (collapsed)
        </div>
      )}
      {!visible && (
        <div className="px-4 pb-4 opacity-60 text-sm">
          (hidden)
        </div>
      )}
    </div>
  );
}
