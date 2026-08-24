import type { PropsWithChildren } from "react";
import { useTranslation } from "react-i18next";
import { ThemeProvider } from "next-themes";
import { DirectionProvider } from "@radix-ui/react-direction";
import { isRtl } from "@/i18n/config";

export default function AppProviders({ children }: PropsWithChildren) {
  const { i18n } = useTranslation();
  const dir = isRtl(i18n.language) ? "rtl" : "ltr";

  return (
    <DirectionProvider dir={dir}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </ThemeProvider>
    </DirectionProvider>
  );
}
