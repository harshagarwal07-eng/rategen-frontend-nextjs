import { Metadata } from "next";
import { getCurrentUser } from "@/data-access/auth";
import { getLibraryTasks } from "@/data-access/tasks";
import { LibraryTasksSection } from "@/components/docs/tasks/library-tasks-section";

export const metadata: Metadata = {
  title: "Tasks - Docs",
  description: "Manage task definitions",
};

export default async function DocsTasksPage() {
  const user = await getCurrentUser();
  const dmcId = user && "dmc" in user ? user.dmc?.id : undefined;

  const taskDefinitions = dmcId ? await getLibraryTasks(dmcId) : [];

  return <LibraryTasksSection initialData={taskDefinitions} />;
}
