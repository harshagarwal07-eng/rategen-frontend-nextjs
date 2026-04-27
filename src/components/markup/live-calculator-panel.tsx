"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApiClients } from "@/hooks/markup/use-api-clients";
import { useMarkupCalculator } from "@/hooks/markup/use-markup-calculator";
import { useMarketClusters } from "@/hooks/markup/use-market-clusters";
import {
  AGENT_TIERS,
  type CalculateMarkupInput,
  type ServiceType,
  TIER_LABELS,
} from "@/types/markup";

type Props = {
  serviceType: ServiceType;
  bundleServiceTypes?: ServiceType[];
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function plus7DaysISO() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export function LiveCalculatorPanel({ serviceType, bundleServiceTypes }: Props) {
  const { data: clusters = [] } = useMarketClusters();
  const { data: apiClients = [] } = useApiClients();
  const calc = useMarkupCalculator();

  const [tier, setTier] = useState<CalculateMarkupInput["agent_tier"]>("unrated");
  const [clusterId, setClusterId] = useState<string>("");
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(plus7DaysISO());
  const [channel, setChannel] = useState<"whitelabel" | "api">("whitelabel");
  const [apiClientId, setApiClientId] = useState<string>("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [baseCost, setBaseCost] = useState(1000);
  const [units, setUnits] = useState(1);
  const [productId, setProductId] = useState("");

  // Default cluster to the first one when loaded.
  useEffect(() => {
    if (!clusterId && clusters.length > 0) setClusterId(clusters[0].id);
  }, [clusters, clusterId]);

  useEffect(() => {
    if (channel === "api" && !apiClientId && apiClients.length > 0) {
      setApiClientId(apiClients[0].id);
    }
  }, [channel, apiClientId, apiClients]);

  const canRun = !!clusterId && from && to && (channel === "whitelabel" || !!apiClientId);

  const onCalculate = () => {
    const input: CalculateMarkupInput = {
      service_type: serviceType,
      agent_tier: tier,
      agent_market_cluster_id: clusterId,
      booking_date_range: { from, to },
      channel,
      pax: { adults, children, infants },
      base_cost: baseCost,
    };
    if (channel === "api" && apiClientId) input.api_client_id = apiClientId;
    if (units > 0) input.units = units;
    if (productId.trim()) input.product_id = productId.trim();
    if (bundleServiceTypes && bundleServiceTypes.length >= 2) {
      input.bundle_service_types = bundleServiceTypes;
    }
    calc.mutate(input);
  };

  const result = calc.data;
  const error = calc.error?.message;

  const finalAsPct = useMemo(() => {
    if (!result || !baseCost) return null;
    return ((result.final_markup / baseCost) * 100).toFixed(1);
  }, [result, baseCost]);

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-4 w-4" /> Live calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground">Agent tier</Label>
          <Select value={tier} onValueChange={(v) => setTier(v as typeof tier)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AGENT_TIERS.map((t) => (
                <SelectItem key={t} value={t}>
                  {TIER_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground">Market cluster</Label>
          <Select value={clusterId} onValueChange={setClusterId}>
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {clusters.length === 0 ? (
                <SelectItem value="__none" disabled>
                  No clusters defined
                </SelectItem>
              ) : (
                clusters.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground">Channel</Label>
          <RadioGroup
            value={channel}
            onValueChange={(v) => setChannel(v as "whitelabel" | "api")}
            className="flex gap-3"
          >
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <RadioGroupItem value="whitelabel" /> Whitelabel
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <RadioGroupItem value="api" /> API
            </label>
          </RadioGroup>
        </div>

        {channel === "api" && (
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">API client</Label>
            <Select value={apiClientId} onValueChange={setApiClientId}>
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {apiClients.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    No API clients defined
                  </SelectItem>
                ) : (
                  apiClients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Adults</Label>
            <Input
              type="number"
              min={0}
              value={adults}
              onChange={(e) => setAdults(Number.parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Children</Label>
            <Input
              type="number"
              min={0}
              value={children}
              onChange={(e) => setChildren(Number.parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Infants</Label>
            <Input
              type="number"
              min={0}
              value={infants}
              onChange={(e) => setInfants(Number.parseInt(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Base cost ($)</Label>
            <Input
              type="number"
              min={0}
              value={baseCost}
              onChange={(e) => setBaseCost(Number.parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Units (nights/etc)</Label>
            <Input
              type="number"
              min={0}
              value={units}
              onChange={(e) => setUnits(Number.parseInt(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Product ID (optional)</Label>
          <Input
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            placeholder="for testing overrides"
          />
        </div>

        <Button
          onClick={onCalculate}
          disabled={!canRun || calc.isPending}
          loading={calc.isPending}
          className="mt-1"
        >
          Calculate
        </Button>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && !error && (
          <div className="flex flex-col gap-3 pt-2 border-t">
            <div>
              <p className="text-xs text-muted-foreground">Final markup</p>
              <p className="text-2xl font-semibold">
                ${result.final_markup.toFixed(2)}{" "}
                {finalAsPct && (
                  <span className="text-base text-muted-foreground">({finalAsPct}%)</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Rule path: <span className="font-mono">{result.rule_path}</span>
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-md bg-muted/30 p-2 text-xs">
              <div>
                <div className="text-muted-foreground">Adult</div>
                <div className="font-semibold">${result.per_pax_breakdown.adult.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Child</div>
                <div className="font-semibold">${result.per_pax_breakdown.child.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Infant</div>
                <div className="font-semibold">${result.per_pax_breakdown.infant.toFixed(2)}</div>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Computation log</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs h-8">Step</TableHead>
                    <TableHead className="text-xs h-8 text-right">Contribution</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.computation_log.map((step, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs py-1">
                        <div className="font-mono">{step.step}</div>
                        {step.note && (
                          <div className="text-muted-foreground text-[10px]">{step.note}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs py-1 text-right font-mono">
                        {step.contribution >= 0 ? "+" : ""}
                        {step.contribution.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
