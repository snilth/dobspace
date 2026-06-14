import { router } from "./init";
import { workspaceRouter } from "./routers/workspace";
import { projectsRouter } from "./routers/projects";
import { tasksRouter } from "./routers/tasks";
import { notificationsRouter } from "./routers/notifications";
import { dashboardRouter } from "./routers/dashboard";
import { activityLogRouter } from "./routers/activityLog";
import { notificationPreferenceRouter } from "./routers/notificationPreference";
import { calendarRouter } from "./routers/calendar";
import { userThemeRouter } from "./routers/userTheme";
import { userPrefsRouter } from "./routers/userPrefs";
import { coursesRouter } from "./routers/courses";
import { assignmentsRouter } from "./routers/assignments";
import { remindersRouter } from "./routers/reminders";
export const appRouter = router({
  workspace: workspaceRouter,
  projects: projectsRouter,
  tasks: tasksRouter,
  notifications: notificationsRouter,
  dashboard: dashboardRouter,
  activityLog: activityLogRouter,
  notificationPreference: notificationPreferenceRouter,
  calendar: calendarRouter,
  userTheme: userThemeRouter,
  userPrefs: userPrefsRouter,
  courses: coursesRouter,
  assignments: assignmentsRouter,
  reminders: remindersRouter,
});

export type AppRouter = typeof appRouter;
