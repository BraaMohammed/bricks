import { SunLight, HalfMoon } from "iconoir-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const isDark = theme !== "light"

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <SunLight className="text-[15px]" />
      ) : (
        <HalfMoon className="text-[15px]" />
      )}
    </button>
  )
}
