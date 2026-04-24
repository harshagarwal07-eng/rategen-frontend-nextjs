export function FDTabPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center rounded-md border border-dashed text-muted-foreground">
      <div className="text-lg font-medium">{title}</div>
      <div className="text-sm">Coming soon</div>
    </div>
  );
}
