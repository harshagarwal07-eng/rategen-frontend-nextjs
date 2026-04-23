"use client";
import useUser from "@/hooks/use-user";
import EditTeamDialog from "@/components/settings/edit-team-dialog";
import TeamTable from "@/components/settings/team-table";
import { Button } from "@/components/ui/button";
import { getMembers } from "@/data-access/dmc";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { ITeam } from "@/types/user";
import Show from "@/components/ui/show";

export default function TeamClient() {
  const { user } = useUser();
  const [membersData, setMembersData] = useState<ITeam[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.dmc.id) {
      setIsLoading(true);
      getMembers(user.dmc.id)
        .then((d) => setMembersData(d))
        .finally(() => setIsLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 space-y-6 flex flex-col w-full h-full overflow-auto no-scrollbar">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Members</h1>
          <p className="text-sm text-muted-foreground">Manage your team members</p>
        </div>
        <Show when={user?.role === "dmc_admin"}>
          <EditTeamDialog>
            <Button size={"lg"}>
              <Plus /> Add Member
            </Button>
          </EditTeamDialog>
        </Show>
      </div>

      <TeamTable membersData={membersData} isLoading={isLoading} />
    </div>
  );
}
