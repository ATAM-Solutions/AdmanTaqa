import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Building2, Mail, Phone, MapPin, Globe, Users, FileText } from "lucide-react";

export default function CreateRegisterOrganization() {
    const { t } = useTranslation("authority");
    const navigate = useNavigate();

    // State for form data
    const [formData, setFormData] = useState({
        name: "",
        type: "FUEL_STATION", // default
        email: "",
        phone: "",
        website: "",
        address: "",
        city: "",
        country: "SA", // Saudi Arabia as default
        description: "",
        licenseNumber: "",
        establishmentDate: "",
        contactPerson: "",
        contactPosition: ""
    });

    // State for file uploads
    const [licenseFile, setLicenseFile] = useState<File | null>(null);
    const [businessFile, setBusinessFile] = useState<File | null>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (type: 'license' | 'business', file: File | null) => {
        if (type === 'license') {
            setLicenseFile(file);
        } else {
            setBusinessFile(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.name || !formData.email || !formData.phone || !formData.address) {
            toast.error(t("organizations.create.validationError"));
            return;
        }

        // In a real app, this would send data to an API
        console.log("Form submitted:", { ...formData, licenseFile, businessFile });

        toast.success(t("organizations.create.submitSuccess"));
        navigate('/organizations');
    };

    return (
        <div className="p-4 md:p-8 space-y-6 animate-in slide-in-from-right duration-500 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/organizations')}>
                    <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                </Button>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-bold tracking-tight">{t("organizations.create.title")}</h1>
                        <Badge variant="outline" className="text-xs font-medium">
                            {t("organizations.create.pendingBadge")}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1">
                        {t("organizations.create.subtitle")}
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t("organizations.create.cardTitle")}</CardTitle>
                    <CardDescription>
                        {t("organizations.create.cardDescription")}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">{t("organizations.create.name")}</Label>
                                <div className="relative">
                                    <Building2 className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder={t("organizations.create.namePlaceholder")}
                                        className="ps-10"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="type">{t("organizations.create.type")}</Label>
                                <Select value={formData.type} onValueChange={(value) => handleSelectChange('type', value)}>
                                    <SelectTrigger id="type" className="w-full">
                                        <SelectValue placeholder={t("organizations.create.typePlaceholder")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="FUEL_STATION">{t("organizations.create.typeFuelStation")}</SelectItem>
                                        <SelectItem value="SERVICE_PROVIDER">{t("organizations.create.typeServiceProvider")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">{t("organizations.create.email")}</Label>
                                <div className="relative">
                                    <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder={t("organizations.create.emailPlaceholder")}
                                        className="ps-10"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">{t("organizations.create.phone")}</Label>
                                <div className="relative" dir="ltr">
                                    <Phone className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="phone"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        placeholder={t("organizations.create.phonePlaceholder")}
                                        className="ps-10"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="website">{t("organizations.create.website")}</Label>
                                <div className="relative">
                                    <Globe className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="website"
                                        name="website"
                                        value={formData.website}
                                        onChange={handleInputChange}
                                        placeholder={t("organizations.create.websitePlaceholder")}
                                        className="ps-10"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="licenseNumber">{t("organizations.create.licenseNumber")}</Label>
                                <Input
                                    id="licenseNumber"
                                    name="licenseNumber"
                                    value={formData.licenseNumber}
                                    onChange={handleInputChange}
                                    placeholder={t("organizations.create.licenseNumberPlaceholder")}
                                    required
                                />
                            </div>
                        </div>

                        {/* Address Information */}
                        <div className="space-y-3">
                            <Label className="text-base font-semibold">{t("organizations.create.addressSection")}</Label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="address">{t("organizations.create.address")}</Label>
                                    <div className="relative">
                                        <MapPin className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="address"
                                            name="address"
                                            value={formData.address}
                                            onChange={handleInputChange}
                                            placeholder={t("organizations.create.addressPlaceholder")}
                                            className="ps-10"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="city">{t("organizations.create.city")}</Label>
                                    <Input
                                        id="city"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleInputChange}
                                        placeholder={t("organizations.create.cityPlaceholder")}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="country">{t("organizations.create.country")}</Label>
                                    <Select value={formData.country} onValueChange={(value) => handleSelectChange('country', value)}>
                                        <SelectTrigger id="country">
                                            <SelectValue placeholder={t("organizations.create.countryPlaceholder")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="SA">{t("organizations.create.countries.SA")}</SelectItem>
                                            <SelectItem value="AE">{t("organizations.create.countries.AE")}</SelectItem>
                                            <SelectItem value="KW">{t("organizations.create.countries.KW")}</SelectItem>
                                            <SelectItem value="QA">{t("organizations.create.countries.QA")}</SelectItem>
                                            <SelectItem value="BH">{t("organizations.create.countries.BH")}</SelectItem>
                                            <SelectItem value="OM">{t("organizations.create.countries.OM")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Contact Person Information */}
                        <div className="space-y-3">
                            <Label className="text-base font-semibold">{t("organizations.create.contactSection")}</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="contactPerson">{t("organizations.create.contactPerson")}</Label>
                                    <div className="relative">
                                        <Users className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="contactPerson"
                                            name="contactPerson"
                                            value={formData.contactPerson}
                                            onChange={handleInputChange}
                                            placeholder={t("organizations.create.contactPersonPlaceholder")}
                                            className="ps-10"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="contactPosition">{t("organizations.create.contactPosition")}</Label>
                                    <Input
                                        id="contactPosition"
                                        name="contactPosition"
                                        value={formData.contactPosition}
                                        onChange={handleInputChange}
                                        placeholder={t("organizations.create.contactPositionPlaceholder")}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">{t("organizations.create.description")}</Label>
                            <div className="relative">
                                <FileText className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    placeholder={t("organizations.create.descriptionPlaceholder")}
                                    className="min-h-[120px] ps-10"
                                    required
                                />
                            </div>
                        </div>

                        {/* Document Uploads */}
                        <div className="space-y-3">
                            <Label className="text-base font-semibold">{t("organizations.create.documentsSection")}</Label>
                            <p className="text-sm text-muted-foreground">{t("organizations.create.documentsSubtitle")}</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="license-upload">{t("organizations.create.licenseUpload")}</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="license-upload"
                                            type="file"
                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                            onChange={(e) => handleFileChange('license', e.target.files?.[0] || null)}
                                            className="cursor-pointer"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="business-upload">{t("organizations.create.businessUpload")}</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="business-upload"
                                            type="file"
                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                            onChange={(e) => handleFileChange('business', e.target.files?.[0] || null)}
                                            className="cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Submission Buttons */}
                        <div className="flex justify-end gap-4 pt-6 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate('/organizations')}
                            >
                                {t("organizations.create.cancel")}
                            </Button>
                            <Button type="submit">
                                {t("organizations.create.submit")}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900">
                <CardHeader>
                    <CardTitle className="text-blue-800 dark:text-blue-300 flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {t("organizations.create.guidelinesTitle")}
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-blue-700 dark:text-blue-400">
                    <ul className="list-disc ps-5 space-y-2">
                        <li>{t("organizations.create.guidelines.required")}</li>
                        <li>{t("organizations.create.guidelines.clear")}</li>
                        <li>{t("organizations.create.guidelines.match")}</li>
                        <li>{t("organizations.create.guidelines.reviewTime")}</li>
                        <li>{t("organizations.create.guidelines.notification")}</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
