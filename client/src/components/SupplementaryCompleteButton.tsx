import { Check as CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSupplementaryProgress } from "@/hooks/use-supplementary-progress";

interface Props {
  itemType: "podcast" | "material";
  itemId: number;
  size?: "sm" | "default";
  className?: string;
}

/**
 * Botão "Marcar como concluído" para podcasts e materiais.
 * Reflete o estado atual e muda otimisticamente.
 */
export function SupplementaryCompleteButton({ itemType, itemId, size = "default", className }: Props) {
  const { isComplete, toggle, isPending } = useSupplementaryProgress();
  const done = isComplete(itemType, itemId);

  return (
    <Button
      type="button"
      variant={done ? "default" : "outline"}
      size={size}
      onClick={(e) => {
        e.stopPropagation();
        toggle(itemType, itemId);
      }}
      disabled={isPending}
      className={className}
    >
      <CheckIcon className="w-4 h-4 mr-1.5" />
      {done ? "Concluído" : "Marcar como concluído"}
    </Button>
  );
}
