import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AddAnnotationButtonProps {
  position: { top: number; left: number };
  onClick: () => void;
  onClose: () => void;
}

export const AddAnnotationButton = ({ position, onClick, onClose }: AddAnnotationButtonProps) => {
  return (
    <div
      className="absolute animate-in fade-in zoom-in-95 duration-200"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 9999,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        size="sm"
        onClick={onClick}
        className="h-8 w-8 p-0 rounded-full shadow-lg bg-primary hover:bg-primary/90"
        title="Add annotation"
      >
        <MessageSquarePlus className="h-4 w-4" />
      </Button>
    </div>
  );
};
