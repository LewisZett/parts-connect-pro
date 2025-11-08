import { X } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import gearPuzzleIcon from "@/assets/gear-puzzle-icon.png";

export function AnimatedMenuIcon() {
  const { open, toggleSidebar } = useSidebar();

  return (
    <button
      onClick={toggleSidebar}
      className="flex items-center justify-center w-10 h-10 rounded-md hover:bg-accent transition-colors"
      aria-label="Toggle menu"
    >
      {open ? (
        <X className="h-6 w-6 text-foreground animate-in fade-in-0 zoom-in-95 duration-200" />
      ) : (
        <img
          src={gearPuzzleIcon}
          alt="Menu"
          className="h-6 w-6 animate-pulse-gentle"
        />
      )}
    </button>
  );
}
