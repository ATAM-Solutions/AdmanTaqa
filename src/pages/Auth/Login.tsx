import { Link, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import LanguageSwitcher from "@/components/LanguageSwitcher"
import DarkModeToggle from "@/components/DarkModeToggle"
import { useLoginForm } from "@/hooks/Auth/useLoginForm"
import logo from "@/assets/logo.jpeg"
import { Mail, Lock, ShieldCheck, Loader2, ChevronRight } from "lucide-react"

export default function Login() {
    const { t } = useTranslation("auth")
    const location = useLocation()
    const accessDenied = (location.state as { message?: string } | null)?.message === "access_denied"
    const form = useLoginForm()
    const { control, submitForm, isLoading, apiError } = form

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <div className="w-full max-w-sm space-y-6">
                <div className="flex flex-col items-center gap-3 text-center">
                    <img src={logo} alt="Servexa" className="h-12 w-12 rounded-2xl object-cover shadow-lg shadow-primary/20" />
                    <h1 className="text-xl font-bold tracking-tight">Servexa Admin</h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t("login.title")}</CardTitle>
                        <CardDescription>{t("login.subtitle")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {accessDenied && (
                            <Alert variant="destructive">
                                <AlertDescription>{t("login.accessDenied")}</AlertDescription>
                            </Alert>
                        )}

                        <Form {...form}>
                            <form onSubmit={submitForm} className="space-y-4">
                                <FormField
                                    control={control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("login.email")}</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        type="email"
                                                        placeholder={t("login.emailPlaceholder")}
                                                        className="ps-10"
                                                        {...field}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex items-center justify-between">
                                                <FormLabel>{t("login.password")}</FormLabel>
                                                <Link to="#" className="text-sm text-primary hover:underline">
                                                    {t("login.forgotPassword")}
                                                </Link>
                                            </div>
                                            <FormControl>
                                                <div className="relative">
                                                    <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input type="password" placeholder="••••••••" className="ps-10" {...field} />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {apiError && (
                                    <Alert variant="destructive">
                                        <AlertDescription>{apiError}</AlertDescription>
                                    </Alert>
                                )}

                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            {t("login.signingIn")}
                                        </>
                                    ) : (
                                        t("login.signIn")
                                    )}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {t("login.securityNotice")}
                </div>

                <p className="text-center text-sm text-muted-foreground">
                    {t("login.newUser")}{" "}
                    <Link to="/register" className="font-medium text-primary hover:underline inline-flex items-center gap-1 group">
                        {t("login.createAccount")}
                        <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
                    </Link>
                </p>

                <div className="flex items-center justify-center gap-1">
                    <LanguageSwitcher />
                    <DarkModeToggle />
                </div>
            </div>
        </div>
    )
}
