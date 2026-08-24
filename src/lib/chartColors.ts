import { useTheme } from "next-themes";

/**
 * Categorical palette (fixed slot order — never cycled/reassigned per filter)
 * and status colors from the dataviz skill's validated reference palette.
 * Light/dark are each independently validated sets, not a single flip.
 */
const CATEGORICAL_LIGHT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
const CATEGORICAL_DARK = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];

export const STATUS_COLORS_LIGHT = { good: "#0ca30c", warning: "#fab219", serious: "#ec835a", critical: "#d03b3b" };
export const STATUS_COLORS_DARK = STATUS_COLORS_LIGHT;

export interface ChartColors {
  categorical: string[];
  status: typeof STATUS_COLORS_LIGHT;
  grid: string;
  axisText: string;
  surface: string;
}

/** Resolves the active (light/dark) chart color set from the app's theme. */
export function useChartColors(): ChartColors {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return {
    categorical: isDark ? CATEGORICAL_DARK : CATEGORICAL_LIGHT,
    status: isDark ? STATUS_COLORS_DARK : STATUS_COLORS_LIGHT,
    grid: isDark ? "#3a3a38" : "#e5e5e2",
    axisText: isDark ? "#c3c2b7" : "#52514e",
    surface: isDark ? "#1a1a19" : "#fcfcfb",
  };
}
