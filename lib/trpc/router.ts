import { router } from "./init";
import { workspaceRouter } from "./routers/workspace";
import { projectsRouter } from "./routers/projects";
import { tasksRouter } from "./routers/tasks";
import { notificationsRouter } from "./routers/notifications";
import { dashboardRouter } from "./routers/dashboard";
import { activityLogRouter } from "./routers/activityLog";
import { notificationPreferenceRouter } from "./routers/notificationPreference";
import { calendarRouter } from "./routers/calendar";

export const appRouter = router({
  workspace: workspaceRouter,
  projects: projectsRouter,
  tasks: tasksRouter,
  notifications: notificationsRouter,
  dashboard: dashboardRouter,
  activityLog: activityLogRouter,
  notificationPreference: notificationPreferenceRouter,
  calendar: calendarRouter,
});

export type AppRouter = typeof appRouter;
