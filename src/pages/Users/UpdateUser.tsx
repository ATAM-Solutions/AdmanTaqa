import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// Mock data – same as Users.tsx (in real app would come from API)
const MOCK_USERS = [
    { id: "USR-001", fullName: "Ahmed Mansour", email: "ahmed.m@alamal.com", phone: "+966 50 123 4567", role: "ADMIN", orgName: "Al-Amal Fuel Station", status: "ACTIVE" },
    { id: "USR-002", fullName: "Sarah Al-Ghamdi", email: "sarah.g@ecoenergy.sa", phone: "+966 55 987 6543", role: "SERVICE_PROVIDER", orgName: "EcoEnergy Services", status: "ACTIVE" },
    { id: "USR-003", fullName: "Mohammed Khalid", email: "m.khalid@authority.gov", phone: "+966 51 000 1111", role: "AUTHORITY", orgName: "Energy Authority", status: "ACTIVE" },
    { id: "USR-004", fullName: "Laila Ibrahim", email: "laila.i@redseapetro.com", phone: "+966 53 444 5555", role: "BRANCH_MANAGER", orgName: "Red Sea Petroleum", status: "ACTIVE" },
    { id: "USR-005", fullName: "Yasser Fawzi", email: "yasser.f@mmasters.net", phone: "+966 54 222 3333", role: "TECHNICIAN", orgName: "Maintenance Masters", status: "INACTIVE" },
];

type UserData = { id: string; fullName: string; email: string; phone: string; role: string; orgName: string; status: string };

function UpdateUserForm({ id, initialUser, onCancel }: { id: string; initialUser: UserData; onCancel: () => void }) {
    const { t } = useTranslation("users");
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        fullName: initialUser.fullName,
        email: initialUser.email,
        phone: initialUser.phone,
        role: initialUser.role,
        orgName: initialUser.orgName,
        status: initialUser.status,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        toast.success(t("updateUser.updateSuccess"));
        setTimeout(() => navigate("/users"), 1000);
    };

    return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <Card className="border-none shadow-xl bg-card/70 backdrop-blur-md">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">{t("updateUser.title")}</CardTitle>
                    <p className="text-muted-foreground text-sm font-mono" dir="ltr">{id}</p>
                    <p className="text-muted-foreground">{t("updateUser.subtitle")}</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="fullName">{t("updateUser.fullName")}</Label>
                                <Input id="fullName" name="fullName" value={formData.fullName} onChange={handleChange} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">{t("updateUser.email")}</Label>
                                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">{t("updateUser.phone")}</Label>
                                <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role">{t("updateUser.systemRole")}</Label>
                                <Select value={formData.role} onValueChange={(v) => handleSelectChange("role", v)}>
                                    <SelectTrigger id="role"><SelectValue placeholder={t("updateUser.selectRole")} /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ADMIN">{t("updateUser.roles.ADMIN")}</SelectItem>
                                        <SelectItem value="AUTHORITY">{t("updateUser.roles.AUTHORITY")}</SelectItem>
                                        <SelectItem value="SERVICE_PROVIDER">{t("updateUser.roles.SERVICE_PROVIDER")}</SelectItem>
                                        <SelectItem value="BRANCH_MANAGER">{t("updateUser.roles.BRANCH_MANAGER")}</SelectItem>
                                        <SelectItem value="TECHNICIAN">{t("updateUser.roles.TECHNICIAN")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="orgName">{t("updateUser.organization")}</Label>
                                <Input id="orgName" name="orgName" value={formData.orgName} onChange={handleChange} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status">{t("updateUser.status")}</Label>
                                <Select value={formData.status} onValueChange={(v) => handleSelectChange("status", v)}>
                                    <SelectTrigger id="status"><SelectValue placeholder={t("updateUser.selectStatus")} /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ACTIVE">{t("updateUser.statuses.ACTIVE")}</SelectItem>
                                        <SelectItem value="INACTIVE">{t("updateUser.statuses.INACTIVE")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex gap-4 pt-4">
                            <Button type="button" variant="outline" onClick={onCancel}>{t("updateUser.cancel")}</Button>
                            <Button type="submit">{t("updateUser.update")}</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

export default function UpdateUser() {
    const { t } = useTranslation("users");
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const location = useLocation();

    const initialUserData = location.state?.userData ?? (id ? MOCK_USERS.find(u => u.id === id) : null);

    if (!initialUserData) {
        return (
            <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
                <Card className="border-none shadow-xl bg-card/70 backdrop-blur-md">
                    <CardHeader>
                        <CardTitle className="text-xl text-muted-foreground">{t("updateUser.notFoundTitle")}</CardTitle>
                        <p className="text-muted-foreground">{t("updateUser.notFoundDescription", { id })}</p>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" onClick={() => navigate("/users")}>{t("updateUser.backToUsers")}</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return <UpdateUserForm key={id} id={id!} initialUser={initialUserData} onCancel={() => navigate(-1)} />;
}
