import type { Theme } from "@/lib/theme";
import { Button } from "@/components/ui/button";

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "system", label: "Système" },
  { value: "light", label: "Clair" },
  { value: "dark", label: "Sombre" },
];

export function SettingsPage({
  theme,
  setTheme,
  onBack,
}: {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  onBack: () => void;
}) {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Paramètres</h1>
        <Button variant="ghost" onClick={onBack}>
          Retour
        </Button>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Thème</h2>
        <div className="flex gap-2">
          {THEME_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={theme === option.value ? "default" : "outline"}
              onClick={() => setTheme(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </section>
    </main>
  );
}
