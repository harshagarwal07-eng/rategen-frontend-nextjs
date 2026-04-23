"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  whiteLabelSchema,
  IWhiteLabelSettings,
} from "@/components/forms/schemas/white-label-schema";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PhoneInput } from "@/components/ui/phone-input";
// import { Checkbox } from "@/components/ui/checkbox";
// import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import useUser from "@/hooks/use-user";
import { uploadToS3, removeFromS3, getSignedUrl } from "@/lib/s3-upload";
import { createOrUpdateWhiteLabelSettings } from "@/data-access/white-label-settings";
import { IAppSettings } from "@/types/whitelabel-config";
import { Palette, Globe, Settings } from "lucide-react";
import { LogoUploadBox } from "@/components/common/logo-upload-box";
import DNSRecordsDisplay from "@/components/settings/dns-records-display";

type Props = {
  settings: IAppSettings | null;
};

export default function WhiteLabelSettingsForm({ settings }: Props) {
  const { user } = useUser();

  // Logo file state (temporary until save)
  const [logoLightFile, setLogoLightFile] = useState<File | null>(null);
  const [logoDarkFile, setLogoDarkFile] = useState<File | null>(null);
  const [logoIconFile, setLogoIconFile] = useState<File | null>(null);

  // Preview URLs (from existing S3 or from File object)
  const [logoLightPreview, setLogoLightPreview] = useState<string>("");
  const [logoDarkPreview, setLogoDarkPreview] = useState<string>("");
  const [logoIconPreview, setLogoIconPreview] = useState<string>("");

  const form = useForm<IWhiteLabelSettings>({
    resolver: zodResolver(whiteLabelSchema) as any,
    defaultValues: {
      branding: {
        siteName:
          settings?.site_customizations?.branding?.siteName ||
          user?.dmc.name ||
          "",
        logoLight: settings?.site_customizations?.branding?.logoLight || "",
        logoDark: settings?.site_customizations?.branding?.logoDark || "",
        logoIcon: settings?.site_customizations?.branding?.logoIcon || "",
        tagline: settings?.site_customizations?.branding?.tagline || "",
        themeColor: settings?.site_customizations?.branding?.themeColor || "",
      },
      support: {
        supportEmail:
          settings?.site_customizations?.support?.supportEmail || "",
        supportPhone:
          settings?.site_customizations?.support?.supportPhone || "",
        whatsappUrl: settings?.site_customizations?.support?.whatsappUrl || "",
      },
      seo: {
        metaTitle: settings?.site_customizations?.seo?.metaTitle || "",
        metaDescription:
          settings?.site_customizations?.seo?.metaDescription || "",
        metaKeywords: settings?.site_customizations?.seo?.metaKeywords || "",
        ogImage: settings?.site_customizations?.seo?.ogImage || "",
      },
      domain: settings?.domain || "",
      permissions: settings?.permissions || {
        bookings: {
          hotel: {
            features: ["search", "book", "cancel", "modify"] as (
              | "search"
              | "book"
              | "cancel"
              | "modify"
            )[],
            providers: [],
          },
          tour: {
            features: ["search", "book"] as (
              | "search"
              | "book"
              | "cancel"
              | "modify"
            )[],
            providers: [],
          },
          transfer: {
            features: ["search", "book"] as (
              | "search"
              | "book"
              | "cancel"
              | "modify"
            )[],
            providers: [],
          },
        },
      },
    },
  });

  // Load existing logo previews on mount
  useEffect(() => {
    const loadPreviews = async () => {
      const logoLightUrl = settings?.site_customizations?.branding?.logoLight;
      const logoDarkUrl = settings?.site_customizations?.branding?.logoDark;
      const logoIconUrl = settings?.site_customizations?.branding?.logoIcon;

      if (logoLightUrl) {
        const url = await getSignedUrl(logoLightUrl);
        setLogoLightPreview(url);
      }
      if (logoDarkUrl) {
        const url = await getSignedUrl(logoDarkUrl);
        setLogoDarkPreview(url);
      }
      if (logoIconUrl) {
        const url = await getSignedUrl(logoIconUrl);
        setLogoIconPreview(url);
      }
    };
    loadPreviews();
  }, [settings]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (logoLightPreview && logoLightPreview.startsWith("blob:")) {
        URL.revokeObjectURL(logoLightPreview);
      }
      if (logoDarkPreview && logoDarkPreview.startsWith("blob:")) {
        URL.revokeObjectURL(logoDarkPreview);
      }
      if (logoIconPreview && logoIconPreview.startsWith("blob:")) {
        URL.revokeObjectURL(logoIconPreview);
      }
    };
  }, [logoLightPreview, logoDarkPreview, logoIconPreview]);

  // Handle logo file selection
  const handleLogoChange = (file: File, type: "light" | "dark" | "icon") => {
    const previewUrl = URL.createObjectURL(file);

    if (type === "light") {
      // Revoke old blob URL before creating new one
      if (logoLightPreview && logoLightPreview.startsWith("blob:")) {
        URL.revokeObjectURL(logoLightPreview);
      }
      setLogoLightFile(file);
      setLogoLightPreview(previewUrl);

      form.setValue("branding.logoLight", previewUrl);
    } else if (type === "dark") {
      if (logoDarkPreview && logoDarkPreview.startsWith("blob:")) {
        URL.revokeObjectURL(logoDarkPreview);
      }
      setLogoDarkFile(file);
      setLogoDarkPreview(previewUrl);
      form.setValue("branding.logoDark", previewUrl);
    } else {
      if (logoIconPreview && logoIconPreview.startsWith("blob:")) {
        URL.revokeObjectURL(logoIconPreview);
      }
      setLogoIconFile(file);
      setLogoIconPreview(previewUrl);
      form.setValue("branding.logoIcon", previewUrl);
    }

    toast.success("Logo selected. Click Save Settings to upload.");
  };

  // Handle logo removal
  const handleLogoRemove = (type: "light" | "dark" | "icon") => {
    if (type === "light") {
      // Revoke the blob URL to free memory
      if (logoLightPreview && logoLightPreview.startsWith("blob:")) {
        URL.revokeObjectURL(logoLightPreview);
      }
      setLogoLightFile(null);
      setLogoLightPreview("");
      form.setValue("branding.logoLight", "");
    } else if (type === "dark") {
      if (logoDarkPreview && logoDarkPreview.startsWith("blob:")) {
        URL.revokeObjectURL(logoDarkPreview);
      }
      setLogoDarkFile(null);
      setLogoDarkPreview("");
      form.setValue("branding.logoDark", "");
    } else {
      if (logoIconPreview && logoIconPreview.startsWith("blob:")) {
        URL.revokeObjectURL(logoIconPreview);
      }
      setLogoIconFile(null);
      setLogoIconPreview("");
      form.setValue("branding.logoIcon", "");
    }
  };

  // Character counter for SEO fields
  const metaTitleLength = form.watch("seo.metaTitle")?.length || 0;
  const metaDescriptionLength = form.watch("seo.metaDescription")?.length || 0;

  // Permissions section hidden - these handlers are not used
  // const permissions = form.watch("permissions");
  // const hotelEnabled = !!permissions?.bookings?.hotel;
  // const tourEnabled = !!permissions?.bookings?.tour;
  // const transferEnabled = !!permissions?.bookings?.transfer;

  // Handle service toggle
  // const handleServiceToggle = (
  //   service: "hotel" | "tour" | "transfer",
  //   checked: boolean
  // ) => {
  //   if (!checked) {
  //     // Remove service
  //     const currentPermissions = form.getValues("permissions") || {
  //       bookings: {},
  //     };
  //     const updatedBookings = { ...currentPermissions.bookings };
  //     delete updatedBookings[service];
  //     form.setValue("permissions", { bookings: updatedBookings });
  //   } else {
  //     // Add service with default features
  //     const currentPermissions = form.getValues("permissions") || {
  //       bookings: {},
  //     };
  //     form.setValue("permissions", {
  //       bookings: {
  //         ...currentPermissions.bookings,
  //         [service]: {
  //           features: ["search", "book"],
  //           providers: [],
  //         },
  //       },
  //     });
  //   }
  // };

  // Handle feature toggle
  // const handleFeatureToggle = (
  //   service: "hotel" | "tour" | "transfer",
  //   feature: string,
  //   checked: boolean
  // ) => {
  //   const currentPermissions = form.getValues("permissions") || {
  //     bookings: {},
  //   };
  //   const currentFeatures =
  //     currentPermissions.bookings?.[service]?.features || [];

  //   const updatedFeatures = checked
  //     ? [...currentFeatures, feature]
  //     : currentFeatures.filter((f) => f !== feature);

  //   form.setValue("permissions", {
  //     bookings: {
  //       ...currentPermissions.bookings,
  //       [service]: {
  //         features: updatedFeatures as (
  //           | "search"
  //           | "book"
  //           | "cancel"
  //           | "modify"
  //         )[],
  //         providers: currentPermissions.bookings?.[service]?.providers || [],
  //       },
  //     },
  //   });
  // };

  async function onSubmit(values: IWhiteLabelSettings) {
    try {
      // Step 1: Upload new logo files to S3 (in parallel)
      const uploadPromises = [];
      let newLogoLightUrl = values.branding.logoLight;
      let newLogoDarkUrl = values.branding.logoDark;
      let newLogoIconUrl = values.branding.logoIcon;

      if (logoLightFile) {
        uploadPromises.push(
          uploadToS3({
            file: logoLightFile,
            userId: user?.id ?? "",
            prefix: "white-label/",
          }).then((result) => {
            if (result.error) {
              console.error("Light logo upload error:", result.error);
              throw new Error(`Failed to upload light logo: ${result.error}`);
            }
            newLogoLightUrl = result.url || "";
            return result;
          })
        );
      }

      if (logoDarkFile) {
        uploadPromises.push(
          uploadToS3({
            file: logoDarkFile,
            userId: user?.id ?? "",
            prefix: "white-label/",
          }).then((result) => {
            if (result.error) {
              console.error("Dark logo upload error:", result.error);
              throw new Error(`Failed to upload dark logo: ${result.error}`);
            }
            newLogoDarkUrl = result.url || "";
            return result;
          })
        );
      }

      if (logoIconFile) {
        uploadPromises.push(
          uploadToS3({
            file: logoIconFile,
            userId: user?.id ?? "",
            prefix: "white-label/",
          }).then((result) => {
            if (result.error) {
              console.error("Icon upload error:", result.error);
              throw new Error(`Failed to upload icon: ${result.error}`);
            }
            newLogoIconUrl = result.url || "";
            return result;
          })
        );
      }

      // Wait for all uploads
      await Promise.all(uploadPromises);

      // Step 2: Build site_customizations object (using new nested structure)
      const siteCustomizations = {
        branding: {
          logoLight: newLogoLightUrl,
          logoDark: newLogoDarkUrl || undefined,
          logoIcon: newLogoIconUrl || undefined,
          siteName: values.branding.siteName,
          tagline: values.branding.tagline || undefined,
          themeColor: values.branding.themeColor || undefined,
        },
        support: {
          supportEmail: values.support.supportEmail,
          supportPhone: values.support.supportPhone || undefined,
          whatsappUrl: values.support.whatsappUrl || undefined,
        },
        seo: {
          metaTitle: values.seo.metaTitle || undefined,
          metaDescription: values.seo.metaDescription || undefined,
          metaKeywords: values.seo.metaKeywords || undefined,
          ogImage: values.seo.ogImage || undefined,
        },
      };

      console.log("Saving site_customizations:", siteCustomizations);
      console.log("Saving domain:", values.domain);
      console.log("Saving permissions:", values.permissions);

      // Step 3: Save to database with default permissions
      const defaultPermissions = {
        bookings: {
          hotel: {
            features: ["search", "book", "cancel", "modify"] as (
              | "search"
              | "book"
              | "cancel"
              | "modify"
            )[],
            providers: [],
          },
          tour: {
            features: ["search", "book"] as (
              | "search"
              | "book"
              | "cancel"
              | "modify"
            )[],
            providers: [],
          },
          transfer: {
            features: ["search", "book"] as (
              | "search"
              | "book"
              | "cancel"
              | "modify"
            )[],
            providers: [],
          },
        },
      };

      const result = await createOrUpdateWhiteLabelSettings({
        site_customizations: siteCustomizations,
        permissions: defaultPermissions, // Always use default permissions
        domain: values.domain, // Save domain as top-level field
        payment_options: settings?.payment_options || {},
      });

      if (result.error) {
        throw new Error(result.error);
      }

      // Step 4: Delete old logos from S3 (if they were replaced)
      const deletePromises = [];

      // Get old logo URLs
      const oldLogoLightUrl =
        settings?.site_customizations?.branding?.logoLight;
      const oldLogoDarkUrl = settings?.site_customizations?.branding?.logoDark;
      const oldLogoIconUrl = settings?.site_customizations?.branding?.logoIcon;

      if (
        logoLightFile &&
        oldLogoLightUrl &&
        oldLogoLightUrl !== newLogoLightUrl
      ) {
        deletePromises.push(removeFromS3(oldLogoLightUrl));
      }
      if (logoDarkFile && oldLogoDarkUrl && oldLogoDarkUrl !== newLogoDarkUrl) {
        deletePromises.push(removeFromS3(oldLogoDarkUrl));
      }
      if (logoIconFile && oldLogoIconUrl && oldLogoIconUrl !== newLogoIconUrl) {
        deletePromises.push(removeFromS3(oldLogoIconUrl));
      }

      if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
      }

      // Step 5: Clear file state and update form values
      // Revoke blob URLs to free memory
      if (logoLightPreview && logoLightPreview.startsWith("blob:")) {
        URL.revokeObjectURL(logoLightPreview);
      }
      if (logoDarkPreview && logoDarkPreview.startsWith("blob:")) {
        URL.revokeObjectURL(logoDarkPreview);
      }
      if (logoIconPreview && logoIconPreview.startsWith("blob:")) {
        URL.revokeObjectURL(logoIconPreview);
      }

      setLogoLightFile(null);
      setLogoDarkFile(null);
      setLogoIconFile(null);

      // Update previews to S3 URLs
      setLogoLightPreview(newLogoLightUrl);
      setLogoDarkPreview(newLogoDarkUrl || "");
      setLogoIconPreview(newLogoIconUrl || "");

      form.setValue("branding.logoLight", newLogoLightUrl);
      form.setValue("branding.logoDark", newLogoDarkUrl || "");
      form.setValue("branding.logoIcon", newLogoIconUrl || "");

      toast.success("White label settings saved successfully!");
    } catch (error) {
      console.error("Error saving white label settings:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save settings"
      );
    }
  }

  const isLoading = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 w-full">
        {/* Site Branding Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              <CardTitle>Site Branding</CardTitle>
            </div>
            <CardDescription>
              Configure your white-label site&apos;s branding and visual
              identity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo Light - Temporary: flex-1 for responsive width */}
            <div className="max-w-[420px]">
              <LogoUploadBox
                title="Full Logo"
                description="Used in sidebar and main navigation"
                preview={logoLightPreview}
                onFileSelect={(file) => handleLogoChange(file, "light")}
                onRemove={() => handleLogoRemove("light")}
                recommendedSize="240x80px"
                aspectRatio="landscape"
                required
              />
            </div>
            {/* Logo Upload Boxes */}
            {/* Icon / Favicon - Temporary: constrained width for better alignment */}
            <LogoUploadBox
              title="Icon / Favicon"
              description="Used for favicon and collapsed sidebar"
              preview={logoIconPreview}
              onFileSelect={(file) => handleLogoChange(file, "icon")}
              onRemove={() => handleLogoRemove("icon")}
              recommendedSize="64x64px"
              aspectRatio="square"
            />

            {/* Logo Dark - Hidden for now */}
            {/* <div className="w-full">
                <LogoUploadBox
                  title="Full Logo (Dark Theme)"
                  description="Optional logo for dark mode"
                  preview={logoDarkPreview}
                  onFileSelect={(file) => handleLogoChange(file, "dark")}
                  onRemove={() => handleLogoRemove("dark")}
                  recommendedSize="240x80px"
                  aspectRatio="landscape"
                />
              </div> */}

            {form.formState.errors.branding?.logoLight && (
              <p className="text-sm text-destructive">
                {form.formState.errors.branding.logoLight.message}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="branding.siteName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Site Name <span className="text-destructive">★</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., My Travel Agency" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="support.supportEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Support Email <span className="text-destructive">★</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="support@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 items-start">
              <FormField
                control={form.control}
                name="branding.tagline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tagline (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Your journey begins here"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      A short tagline that appears alongside your brand
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="branding.themeColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Theme Color (Optional)</FormLabel>
                    <FormControl>
                      <div className="flex gap-3 items-center">
                        <Input
                          type="color"
                          className="w-20 h-10 cursor-pointer"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                        <Input
                          type="text"
                          placeholder="Select a color"
                          className="flex-1"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Primary color used for backgrounds and accents (hex
                      format)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 items-start">
              <FormField
                control={form.control}
                name="support.supportPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Support Phone (Optional)</FormLabel>
                    <FormControl>
                      <PhoneInput
                        value={field.value}
                        onChange={field.onChange}
                        defaultCountry="IN"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="support.whatsappUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp URL (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://wa.me/1234567890"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      WhatsApp click-to-chat link (e.g.,
                      https://wa.me/1234567890)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
        {/* Domain Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              <CardTitle>Domain Configuration</CardTitle>
            </div>
            <CardDescription>
              Set your custom domain for the white-label site
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="domain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Custom Domain <span className="text-destructive">★</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="yoursite.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    Enter your domain without http:// or https:// (e.g.,
                    example.com)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* DNS Records Display */}
            <DNSRecordsDisplay settings={settings} />
          </CardContent>
        </Card>

        {/* SEO & Metadata */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <CardTitle>SEO & Metadata</CardTitle>
            </div>
            <CardDescription>
              Optimize your site for search engines and social sharing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="seo.metaTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Meta Title
                    <span className="ml-2 text-sm text-muted-foreground">
                      ({metaTitleLength}/60)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Your site title" {...field} />
                  </FormControl>
                  <FormDescription>
                    Optimal length: 50-60 characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="seo.metaDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Meta Description
                    <span className="ml-2 text-sm text-muted-foreground">
                      ({metaDescriptionLength}/160)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of your site"
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormDescription>
                    Optimal length: 120-160 characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="seo.metaKeywords"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Keywords</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="travel, tours, hotels, bookings (comma-separated)"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Comma-separated keywords for SEO
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Service Permissions - Hidden, all permissions enabled by default */}
        {/* <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <CardTitle>Service Permissions</CardTitle>
            </div>
            <CardDescription>
              Control which services are available on your white-label site
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Hotel Service */}
        {/* <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hotel-enabled"
                  checked={hotelEnabled}
                  onCheckedChange={(checked) =>
                    handleServiceToggle("hotel", checked as boolean)
                  }
                />
                <Label htmlFor="hotel-enabled" className="font-semibold">
                  Hotel Bookings
                </Label>
              </div>
              {hotelEnabled && (
                <div className="ml-6 space-y-2 p-4 bg-muted/50 rounded-lg">
                  <Label className="text-sm text-muted-foreground">
                    Features:
                  </Label>
                  <div className="flex flex-wrap gap-3">
                    {["search", "book", "cancel", "modify"].map((feature) => (
                      <div
                        key={feature}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`hotel-${feature}`}
                          checked={
                            permissions?.bookings?.hotel?.features?.includes(
                              feature as "search" | "book" | "cancel" | "modify"
                            ) || false
                          }
                          onCheckedChange={(checked) =>
                            handleFeatureToggle(
                              "hotel",
                              feature,
                              checked as boolean
                            )
                          }
                        />
                        <Label
                          htmlFor={`hotel-${feature}`}
                          className="capitalize text-sm cursor-pointer"
                        >
                          {feature}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div> */}

        {/* Tour Service */}
        {/* <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tour-enabled"
                  checked={tourEnabled}
                  onCheckedChange={(checked) =>
                    handleServiceToggle("tour", checked as boolean)
                  }
                />
                <Label htmlFor="tour-enabled" className="font-semibold">
                  Tour Bookings
                </Label>
              </div>
              {tourEnabled && (
                <div className="ml-6 space-y-2 p-4 bg-muted/50 rounded-lg">
                  <Label className="text-sm text-muted-foreground">
                    Features:
                  </Label>
                  <div className="flex flex-wrap gap-3">
                    {["search", "book"].map((feature) => (
                      <div
                        key={feature}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`tour-${feature}`}
                          checked={
                            permissions?.bookings?.tour?.features?.includes(
                              feature as "search" | "book" | "cancel" | "modify"
                            ) || false
                          }
                          onCheckedChange={(checked) =>
                            handleFeatureToggle(
                              "tour",
                              feature,
                              checked as boolean
                            )
                          }
                        />
                        <Label
                          htmlFor={`tour-${feature}`}
                          className="capitalize text-sm cursor-pointer"
                        >
                          {feature}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div> */}

        {/* Transfer Service */}
        {/* <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="transfer-enabled"
                  checked={transferEnabled}
                  onCheckedChange={(checked) =>
                    handleServiceToggle("transfer", checked as boolean)
                  }
                />
                <Label htmlFor="transfer-enabled" className="font-semibold">
                  Transfer Bookings
                </Label>
              </div>
              {transferEnabled && (
                <div className="ml-6 space-y-2 p-4 bg-muted/50 rounded-lg">
                  <Label className="text-sm text-muted-foreground">
                    Features:
                  </Label>
                  <div className="flex flex-wrap gap-3">
                    {["search", "book"].map((feature) => (
                      <div
                        key={feature}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`transfer-${feature}`}
                          checked={
                            permissions?.bookings?.transfer?.features?.includes(
                              feature as "search" | "book" | "cancel" | "modify"
                            ) || false
                          }
                          onCheckedChange={(checked) =>
                            handleFeatureToggle(
                              "transfer",
                              feature,
                              checked as boolean
                            )
                          }
                        />
                        <Label
                          htmlFor={`transfer-${feature}`}
                          className="capitalize text-sm cursor-pointer"
                        >
                          {feature}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card> */}

        {/* Form Actions */}
        <div className="flex justify-end gap-4 pb-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.location.reload()}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" loading={isLoading} loadingText="Saving...">
            Save Settings
          </Button>
        </div>
      </form>
    </Form>
  );
}
