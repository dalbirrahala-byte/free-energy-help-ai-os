import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
type Task = {
  id: number;
  created_at: string;
  lead_id: number | null;
  title: string | null;
  due_date: string | null;
  due_time: string | null;
  priority: string | null;
  status: string | null;
  notes: string | null;
};

function formatDate(date: string | null) {
  if (!date) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function formatTime(time: string | null) {
  if (!time) {
    return "Not set";
  }

  return time.slice(0, 5);
}

function priorityStyle(priority: string | null) {
  switch (priority) {
    case "Urgent":
      return "bg-red-100 text-red-700";
    case "High":
      return "bg-orange-100 text-orange-700";
    case "Low":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-amber-100 text-amber-700";
  }
}
function taskStatusStyle(
  status: string | null,
  dueDate: string | null,
) {
  if (status === "Completed") {
    return {
      label: "Completed",
      className: "bg-emerald-100 text-emerald-700",
    };
  }

  if (!dueDate) {
    return {
      label: status || "Open",
      className: "bg-slate-100 text-slate-600",
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const taskDate = new Date(`${dueDate}T00:00:00`);

  if (taskDate < today) {
    return {
      label: "Overdue",
      className: "bg-red-100 text-red-700",
    };
  }

  if (taskDate.getTime() === today.getTime()) {
    return {
      label: "Due Today",
      className: "bg-orange-100 text-orange-700",
    };
  }

  return {
    label: "Upcoming",
    className: "bg-blue-100 text-blue-700",
  };
}

export default async function TasksPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, created_at, lead_id, title, due_date, due_time, priority, status, notes",
    )
    .order("due_date", { ascending: true })
    .order("due_time", { ascending: true });

  const tasks: Task[] = data ?? [];

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Follow-up Tasks
            </h1>

            <p className="mt-1 text-slate-500">
              Manage customer calls, reminders and sales follow-ups.
            </p>
          </div>

          <Link
            href="/tasks/new"
            className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white hover:bg-emerald-600"
          >
            Add Task
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Tasks could not be loaded. Please check the Supabase connection.
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-5 py-4 font-semibold">Task</th>
                  <th className="px-5 py-4 font-semibold">Due Date</th>
                  <th className="px-5 py-4 font-semibold">Time</th>
                  <th className="px-5 py-4 font-semibold">Priority</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Lead</th>
                </tr>
              </thead>

              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      No follow-up tasks have been added yet.
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr
                      key={task.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {task.title || "Untitled task"}
                        </p>

                        {task.notes && (
                          <p className="mt-1 max-w-md truncate text-xs text-slate-500">
                            {task.notes}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {formatDate(task.due_date)}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {formatTime(task.due_time)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityStyle(
                            task.priority,
                          )}`}
                        >
                          {task.priority || "Medium"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
  {(() => {
    const taskDisplayStatus = taskStatusStyle(
      task.status,
      task.due_date,
    );

    return (
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold ${taskDisplayStatus.className}`}
      >
        {taskDisplayStatus.label}
      </span>
    );
  })()}
</td>

                      <td className="px-5 py-4">
                        {task.lead_id ? (
                          <Link
                            href={`/leads/${task.lead_id}`}
                            className="font-semibold text-emerald-600 hover:text-emerald-700"
                          >
                            View Lead
                          </Link>
                        ) : (
                          <span className="text-slate-400">
                            No lead linked
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}