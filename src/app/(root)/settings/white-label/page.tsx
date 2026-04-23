import { getWhiteLabelSettings } from "@/data-access/white-label-settings";
import WhiteLabelSettingsForm from "@/components/forms/white-label-settings-form";

export default async function WhiteLabelSettingsPage() {
  const settings = await getWhiteLabelSettings();

  return (
    <div className="relative flex flex-1">
      <div className="absolute inset-0 overflow-hidden">
        <div className="flex-1 flex h-full p-6 overflow-y-auto w-full no-scrollbar max-w-5xl mx-auto space-y-6">
          <WhiteLabelSettingsForm settings={settings} />
        </div>
      </div>
    </div>
  );
}
