import { LABEL_COLOR_CLASSES, type LabelColor } from "@/lib/labels";

export const GRADIENT_COVERS = [
  { id: "gradient-sunset", label: "Coucher de soleil", classes: "bg-gradient-to-br from-orange-400 to-pink-500" },
  { id: "gradient-ocean", label: "Océan", classes: "bg-gradient-to-br from-sky-400 to-blue-600" },
  { id: "gradient-forest", label: "Forêt", classes: "bg-gradient-to-br from-green-400 to-emerald-600" },
  { id: "gradient-lavender", label: "Lavande", classes: "bg-gradient-to-br from-purple-400 to-indigo-500" },
  { id: "gradient-peach", label: "Pêche", classes: "bg-gradient-to-br from-rose-300 to-orange-300" },
  { id: "gradient-midnight", label: "Minuit", classes: "bg-gradient-to-br from-slate-700 to-slate-900" },
] as const;

export type GradientCoverId = (typeof GRADIENT_COVERS)[number]["id"];

const GRADIENT_CLASSES: Record<string, string> = Object.fromEntries(
  GRADIENT_COVERS.map((gradient) => [gradient.id, gradient.classes]),
);

/** A cover color is either a solid label color or one of the fixed gradient presets. */
export function coverClasses(coverColor: string): string {
  return GRADIENT_CLASSES[coverColor] ?? LABEL_COLOR_CLASSES[coverColor as LabelColor] ?? "bg-muted";
}
