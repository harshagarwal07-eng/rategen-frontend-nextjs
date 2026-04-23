"use client";

import { useForm } from "react-hook-form";
import {
  companyProfileSchema,
  ICompanyProfile,
} from "./schemas/profile-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Autocomplete } from "../ui/autocomplete";
import { useEffect, useState } from "react";
import { IOption } from "@/types/common";
import { VirtualizedAutocomplete } from "../ui/virtualized-autocomplete";
import {
  fetchCitiesByCountryId,
  fetchCountries,
} from "@/data-access/datastore";
import { Button } from "../ui/button";
import { IDMCShort } from "@/types/user";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { getSignedUrl, uploadToS3 } from "@/lib/s3-upload";
import useUser from "@/hooks/use-user";
import { toast } from "sonner";
import { updateDmc } from "@/data-access/dmc";
import Show from "../ui/show";

type Props = {
  dmcData: IDMCShort;
};

export default function CompanyProfileForm({ dmcData }: Props) {
  const { user } = useUser();

  const [countryOptions, setCountryOptions] = useState<IOption[]>([]);
  const [cityOptions, setCityOptions] = useState<IOption[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [dmcLogo, setDmcLogo] = useState("");

  const form = useForm<ICompanyProfile>({
    resolver: zodResolver(companyProfileSchema),
    values: {
      city: dmcData.city ?? "",
      country: dmcData.country ?? "",
      name: dmcData.name ?? "",
      streetAddress: dmcData.streetAddress ?? "",
      website: dmcData.website ?? "https://",
      avatar_url: dmcData.avatar_url ?? "",
    },
  });

  useEffect(() => {
    fetchCountries().then((options) => {
      setCountryOptions(options);
    });
  }, []);

  const country = form.watch("country");

  useEffect(() => {
    if (!country) {
      setCityOptions([]);
      return;
    }
    fetchCitiesByCountryId(country).then((options) => {
      setCityOptions(options);
    });
  }, [country]);

  // Clear city options when country changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "country") {
        setCityOptions([]);
        form.setValue("city", "");
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;

    const file = e.target.files[0];

    // Show loading state
    setUploadingAvatar(true);

    // Upload to S3
    const { url, error } = await uploadToS3({
      file,
      userId: user?.id ?? "",
    });

    if (error) {
      setUploadingAvatar(false);
      console.error("Upload error:", error);
      return toast.error("Failed to upload images");
    }

    // Update form with new avatar URL
    form.setValue("avatar_url", `${url}`);
    toast.success(
      "Image uploaded successfully! Click on the update button to save the image"
    );
    setUploadingAvatar(false);
    e.target.value = "";
  };

  async function onSubmit(values: ICompanyProfile) {
    const { error } = await updateDmc(dmcData.id, values);

    if (error) {
      console.error("Error submitting form:", error);
      return toast.error("Failed to update dmc profile");
    }

    toast.success("Profile Updated Successfully");
  }

  const isLoading = form.formState.isSubmitting;
  const avatarUrl = form.watch("avatar_url");

  useEffect(() => {
    if (avatarUrl?.length) getSignedUrl(avatarUrl).then((d) => setDmcLogo(d));
  }, [avatarUrl]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8 relative text-left mb-6"
        autoComplete="off"
      >
        <div className="space-y-4">
          <FormLabel>Logo</FormLabel>
          <div className="flex gap-6 items-center">
            <Avatar className="size-20 border">
              <AvatarImage src={dmcLogo || ""} alt="DMC Logo" />
              <AvatarFallback className="text-2xl uppercase">
                {form.getValues("name")?.substring(0, 2)}
              </AvatarFallback>
            </Avatar>
            <Show when={user?.role === "dmc_admin"}>
              <Button
                size={"lg"}
                type="button"
                onClick={() => document.getElementById("image-upload")?.click()}
                disabled={uploadingAvatar}
                loading={uploadingAvatar}
                loadingText="Uploading..."
              >
                Update Logo
              </Button>
            </Show>
            <input
              id="image-upload"
              type="file"
              hidden
              accept="image/*"
              onChange={uploadAvatar}
              disabled={uploadingAvatar}
            />
          </div>
        </div>
        <div className="gap-4 grid grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>DMC Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter DMC name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter full website address e.g. https://rategen.ai"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="streetAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter street address" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="gap-4 grid grid-cols-2">
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <Autocomplete
                  options={countryOptions}
                  value={field.value}
                  onChange={field.onChange}
                  showCountryFlag
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <VirtualizedAutocomplete
                  options={cityOptions}
                  value={field.value}
                  onChange={field.onChange}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Show when={user?.role === "dmc_admin"}>
          <div className="text-center">
            <Button
              type="submit"
              size={"lg"}
              disabled={isLoading}
              loading={isLoading}
              loadingText="Updating..."
            >
              Update Profile
            </Button>
          </div>
        </Show>
      </form>
    </Form>
  );
}
