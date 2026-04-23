import { IAppSettings } from "@/types/whitelabel-config";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle } from "lucide-react";
import { CopyButton } from "../ui/copy-button";
import { getSiteStatusConfig } from "@/lib/status-styles-config";
import { cn } from "@/lib/utils";

type Props = {
  settings: IAppSettings | null;
};

export default function DNSRecordsDisplay({ settings }: Props) {
  if (!settings?.domain) {
    return null;
  }

  const status = settings.status;
  const statusConfig = getSiteStatusConfig(status);
  const StatusIcon = statusConfig.icon;
  const dnsRecords = settings?.dns_records || [];
  const hasRecords = dnsRecords.length > 0;

  return (
    <div className="w-full space-y-4">
      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          Domain Status:
        </span>
        <Badge
          variant="outline"
          className={cn(
            statusConfig.bgColor,
            statusConfig.color,
            `border-0 py-1 px-2.5`
          )}
        >
          <StatusIcon className="size-3 mr-1" />
          {statusConfig.label}
        </Badge>
      </div>

      {/* Status-based content */}
      {(status === "active" || status === "approved") && hasRecords ? (
        <div className="w-full space-y-4">
          {status === "approved" ? (
            <p className="text-sm text-muted-foreground">
              Your domain has been approved! Add these DNS records to your domain
              provider to connect your custom domain.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your domain is successfully connected! DNS records are shown below
              for reference.
            </p>
          )}

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>TTL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dnsRecords.map((record, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Badge variant="outline">{record.type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      <div className="flex justify-between items-center truncate">
                        <p>{record.name}</p>
                        <CopyButton
                          content={record.name}
                          copyMessage="Copied name to clipboard!"
                        />
                      </div>
                    </TableCell>
                    <TableCell
                      className="font-mono text-sm max-w-md"
                      title={record.value}
                    >
                      <div className="flex justify-between items-center truncate">
                        <p>{record.value}</p>
                        <CopyButton
                          content={record.value}
                          copyMessage="Copied value to clipboard!"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {record.ttl || "Auto"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="rounded-lg bg-muted/30 p-4 space-y-2">
            <p className="text-sm font-medium">Instructions:</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>
                Log in to your domain provider (e.g., GoDaddy, Namecheap,
                Cloudflare)
              </li>
              <li>Navigate to DNS settings or DNS management</li>
              <li>Add each DNS record exactly as shown in the table above</li>
              <li>
                Save your changes and wait for DNS propagation (can take up to
                48 hours)
              </li>
            </ol>
          </div>
        </div>
      ) : (status === "active" || status === "approved") && !hasRecords ? (
        <div className="flex items-center gap-2 text-muted-foreground p-4 bg-muted/30 rounded-lg">
          <AlertCircle className="size-5 shrink-0" />
          <p className="text-sm">
            DNS records are being generated. Please check back in a few moments.
          </p>
        </div>
      ) : status === "pending" ? (
        <div className="flex items-center gap-2 p-4 bg-warning/5 rounded-lg border border-warning/20">
          <StatusIcon className="size-5 shrink-0 text-warning" />
          <p className="text-sm text-muted-foreground">
            Your domain configuration is currently under review. You&apos;ll
            receive DNS records once approved.
          </p>
        </div>
      ) : status === "suspend" ? (
        <div className="flex items-center gap-2 p-4 bg-destructive/5 rounded-lg border border-destructive/20">
          <StatusIcon className="size-5 shrink-0 text-destructive" />
          <p className="text-sm text-muted-foreground">
            Your domain has been suspended. Please contact support for
            assistance.
          </p>
        </div>
      ) : null}
    </div>
  );
}
