"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { updateDmcSettings } from "@/data-access/dmc-settings";
import { toast } from "sonner";
import { DMCSettings, PricingBreakupRule } from "@/types/dmc-settings";
import { BankDetailsSection } from "@/components/settings/bank-details-section";

interface DMCSettingsClientProps {
  initialSettings: DMCSettings;
  serviceOptions: { label: string; value: string }[];
}

const PRICING_BREAKUP_OPTIONS: {
  value: PricingBreakupRule;
  label: string;
  description: string;
}[] = [
  {
    value: "total_gross",
    label: "Total Gross Price",
    description: "No price breakup whatsoever",
  },
  {
    value: "category_breakup",
    label: "Category Wise Breakup + Total Gross",
    description: "Category wise breakup only",
  },
  {
    value: "item_breakup",
    label: "Item Wise Breakup + Category + Total Gross",
    description: "Item + Category wise breakup",
  },
];

export default function DMCSettingsClient({ initialSettings, serviceOptions }: DMCSettingsClientProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handlePricingBreakupChange = async (value: PricingBreakupRule) => {
    setIsUpdating(true);
    const result = await updateDmcSettings({ pricing_breakup_rule: value });
    setIsUpdating(false);

    if (result.error) {
      toast.error("Failed to update pricing breakup rule");
    } else {
      toast.success("Pricing breakup rule updated");
    }
  };

  const handleChatDMCListingToggle = async (checked: boolean) => {
    setIsUpdating(true);
    const result = await updateDmcSettings({ chatdmc_listing: checked });
    setIsUpdating(false);

    if (result.error) {
      toast.error("Failed to update ChatDMC listing");
    } else {
      toast.success(checked ? "ChatDMC listing enabled" : "ChatDMC listing disabled");
    }
  };

  const handleKillSwitchToggle = async (checked: boolean) => {
    setIsUpdating(true);
    const result = await updateDmcSettings({ kill_switch: checked });
    setIsUpdating(false);

    if (result.error) {
      toast.error("Failed to update kill switch");
    } else {
      toast.success(checked ? "Kill switch enabled - AI stopped" : "Kill switch disabled - AI active");
    }
  };

  const handleIndividualServiceRatesToggle = async (checked: boolean) => {
    setIsUpdating(true);
    const result = await updateDmcSettings({ allow_individual_service_rates: checked });
    setIsUpdating(false);

    if (result.error) {
      toast.error("Failed to update individual service rates setting");
    } else {
      toast.success(checked ? "Individual service rates enabled" : "Individual service rates disabled");
    }
  };

  return (
    <div className="space-y-6">
      {/* Bank Details */}
      <BankDetailsSection initialBankDetails={initialSettings.bank_details} />

      {/* Services Active - Read Only */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Services Active</CardTitle>
          <p className="text-sm text-muted-foreground">By CDMC Admin only. DMC can&apos;t change/edit/add</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {serviceOptions.map((service) => (
              <Badge key={service.value} variant="secondary">
                {service.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pricing Breakup Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pricing Breakup Rules</CardTitle>
          <p className="text-sm text-muted-foreground">DMC can select either of the 3 options</p>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={initialSettings.pricing_breakup_rule}
            onValueChange={handlePricingBreakupChange}
            disabled={isUpdating}
            className="space-y-3"
          >
            {PRICING_BREAKUP_OPTIONS.map((option) => (
              <div
                key={option.value}
                className="flex items-start space-x-3 space-y-0 rounded-lg border p-4 hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => !isUpdating && handlePricingBreakupChange(option.value)}
              >
                <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                <div className="flex-1 space-y-1">
                  <Label htmlFor={option.value} className="font-medium cursor-pointer flex items-center gap-2">
                    {option.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Individual Service Rates - NEW */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Individual Service Rates</CardTitle>
          <p className="text-sm text-muted-foreground">Allow sharing individual service pricing with customers</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Switch
              id="individual-service-rates"
              checked={initialSettings.allow_individual_service_rates}
              onCheckedChange={handleIndividualServiceRatesToggle}
              disabled={isUpdating}
            />
            <Label htmlFor="individual-service-rates" className="cursor-pointer">
              Allow Individual Service Rates
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Output Currency */}
      <Card className="relative">
        <CardHeader>
          <CardTitle className="text-lg">Output Currency</CardTitle>
          <p className="text-sm text-muted-foreground">
            This currency will be the output currency in which AI will always quote
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 opacity-50">
            <Label>Coming Soon ...</Label>
          </div>
        </CardContent>
      </Card>

      {/* ChatDMC Listing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ChatDMC Listing</CardTitle>
          <p className="text-sm text-muted-foreground">Enable or disable your listing on ChatDMC</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Switch
              id="chatdmc-listing"
              checked={initialSettings.chatdmc_listing}
              onCheckedChange={handleChatDMCListingToggle}
              disabled={isUpdating}
            />
            <Label htmlFor="chatdmc-listing" className="cursor-pointer">
              ChatDMC Listing
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Kill Switch */}
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            Kill Switch
            {initialSettings.kill_switch && <Badge variant="destructive">AI Stopped</Badge>}
          </CardTitle>
          <p className="text-sm text-muted-foreground">Stops AI from running. Use this to pause all AI operations</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Switch
              id="kill-switch"
              checked={initialSettings.kill_switch}
              onCheckedChange={handleKillSwitchToggle}
              disabled={isUpdating}
            />
            <Label htmlFor="kill-switch" className="cursor-pointer">
              Enable Kill Switch
            </Label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
