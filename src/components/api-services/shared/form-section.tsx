import { Card, CardContent } from "@/components/ui/card";

interface FormSectionProps {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  description?: string;
}

export default function FormSection({ title, icon: Icon, children, description }: FormSectionProps) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-primary" />}
            <h3 className="text-sm font-semibold">{title}</h3>
          </div>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="space-y-3">{children}</div>
      </CardContent>
    </Card>
  );
}
