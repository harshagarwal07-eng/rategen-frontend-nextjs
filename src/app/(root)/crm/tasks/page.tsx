import { Metadata } from "next";
import { getQueryTaskSummary } from "@/data-access/tasks";
import { TasksTableView } from "@/components/crm/tasks/tasks-table-view";

export const metadata: Metadata = {
  title: "Tasks",
  description: "Manage CRM tasks",
};

export default async function TasksPage() {
  const data = await getQueryTaskSummary();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center border-b px-3 py-2.5 shrink-0">
        <p className="font-medium text-sm">Tasks</p>
      </div>
      <div className="flex-1 px-6 py-4 flex flex-col overflow-hidden">
        <TasksTableView data={data} />
      </div>
    </div>
  );
}
