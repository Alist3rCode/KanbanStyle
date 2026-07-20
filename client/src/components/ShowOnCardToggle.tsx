import { Eye, EyeOff } from "lucide-react";
import { nextShowOnCard, SHOW_ON_CARD_LABELS, type ShowOnCard } from "@/lib/customFields";

/** Cycles never → if_not_empty → always on click (US-10: card-front visibility rule). */
export function ShowOnCardToggle({
  value,
  onChange,
  size = "size-4",
}: {
  value: ShowOnCard;
  onChange: (value: ShowOnCard) => void;
  size?: string;
}) {
  const Icon = value === "never" ? EyeOff : Eye;
  return (
    <button
      type="button"
      aria-label={`Aperçu sur la carte : ${SHOW_ON_CARD_LABELS[value]}`}
      title={`Aperçu sur la carte : ${SHOW_ON_CARD_LABELS[value]} (cliquer pour changer)`}
      onClick={() => onChange(nextShowOnCard(value))}
      className={`inline-flex items-center gap-1 rounded p-0.5 text-xs transition hover:bg-accent ${
        value === "always"
          ? "text-primary"
          : value === "if_not_empty"
            ? "text-foreground/70"
            : "text-muted-foreground/60"
      }`}
    >
      <Icon className={size} />
    </button>
  );
}
