import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, AlertTriangle } from "lucide-react";
import i18n from "@/i18n/config";
import { reportError } from "@/lib/errorReporting";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    reportError("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const message =
        this.state.error.message ||
        i18n.t("routeError.fallbackMessage");

      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 md:p-8 text-center">
          <div className="max-w-md w-full space-y-6">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground">{i18n.t("routeError.title")}</h1>
            <p className="text-muted-foreground text-sm">
              {message}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link to="/">
                  <Home className="h-4 w-4" />
                  {i18n.t("routeError.returnHome")}
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="gap-2"
                onClick={() => this.setState({ hasError: false, error: null })}
              >
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                {i18n.t("routeError.tryAgain")}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
