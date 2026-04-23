"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { ISignup, SignupSchema } from "./schemas/signup-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { IOption } from "@/types/common";
import { fetchCitiesByCountryId, fetchCountries } from "@/data-access/datastore";
import { Autocomplete } from "../ui/autocomplete";
import { VirtualizedAutocomplete } from "../ui/virtualized-autocomplete";
import { EyeIcon, EyeOffIcon, Mail, Phone } from "lucide-react";
import { Button } from "../ui/button";
import Link from "next/link";
import { PhoneInput } from "../ui/phone-input";
import { toast } from "sonner";
import { register } from "@/data-access/auth";
import TermsAndConditions from "../common/terms-and-conditions";
import { Checkbox } from "../ui/checkbox";

export default function SignupForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countryOptions, setCountryOptions] = useState<IOption[]>([]);
  const [cityOptions, setCityOptions] = useState<IOption[]>([]);

  const router = useRouter();

  const form = useForm<ISignup>({
    resolver: zodResolver(SignupSchema),
    defaultValues: {
      name: "",
      streetAddress: "",
      city: "",
      country: "",
      adminName: "",
      adminEmail: "",
      adminMobile: "",
      password: "",
      confirmPassword: "",
      termsAccepted: false,
      website: "https://",
    },
  });

  async function onSubmit(values: ISignup) {
    const { error } = await register(values);
    console.log("🚀 ~ onSubmit ~ error:", error);

    if (error) return toast.error(error);

    router.push(`/verify-account?email=${values.adminEmail}`);
  }

  const isLoading = form.formState.isSubmitting;

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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 relative text-left" autoComplete="off">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>DMC Name *</FormLabel>
              <FormControl>
                <Input placeholder="Enter DMC name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="streetAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address *</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter street address" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Country *</FormLabel>
              <Autocomplete options={countryOptions} value={field.value} onChange={field.onChange} showCountryFlag />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>City *</FormLabel>
              <VirtualizedAutocomplete options={cityOptions} value={field.value} onChange={field.onChange} />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="adminName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Admin Name *</FormLabel>
              <FormControl>
                <Input placeholder="Enter admin name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="adminEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Admin Email *</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input type="email" placeholder="Enter admin email" {...field} />
                  <Mail className="top-2.5 right-2.5 absolute w-4 h-4 text-muted-foreground" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="adminMobile"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Admin Phone *</FormLabel>
              <FormControl>
                <div className="relative">
                  <PhoneInput
                    {...field}
                    value={field.value}
                    defaultCountry="IN"
                    placeholder="Enter a phone number"
                    international
                  />
                  <Phone className="top-2.5 right-2.5 absolute w-4 h-4 text-muted-foreground" />
                </div>
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
              <FormLabel>Website *</FormLabel>
              <FormControl>
                <Input placeholder="Enter full website address e.g. https://rategen.ai" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password *</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} placeholder="Enter password" {...field} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="top-0 right-0 absolute hover:bg-transparent px-3 py-2 h-full"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? (
                      <EyeIcon className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <EyeOffIcon className="w-4 h-4" aria-hidden="true" />
                    )}
                    <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password *</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input type={showConfirmPassword ? "text" : "password"} placeholder="Confirm password" {...field} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="top-0 right-0 absolute hover:bg-transparent px-3 py-2 h-full"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                  >
                    {showConfirmPassword ? (
                      <EyeIcon className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <EyeOffIcon className="w-4 h-4" aria-hidden="true" />
                    )}
                    <span className="sr-only">{showConfirmPassword ? "Hide password" : "Show password"}</span>
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="termsAccepted"
          render={({ field }) => (
            <FormItem className="flex items-center space-x-3 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="">
                I agree to the DMC <TermsAndConditions {...form.getValues()} />
              </FormLabel>
            </FormItem>
          )}
        />

        <div className="space-y-2 text-center mb-10">
          <Button
            type="submit"
            size={"lg"}
            disabled={isLoading}
            loading={isLoading}
            loadingText="Signing up..."
            className="w-full"
          >
            Register
          </Button>

          <p className="font-light text-sm">
            Already have an account?{" "}
            <Link href={"/login"} className="font-bold text-primary hover:underline">
              Login
            </Link>
          </p>
        </div>
      </form>
    </Form>
  );
}
