export type TaskMovedPayload = {
  taskId: string;
  status: "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE";
  changedBy: string;
};

export type TaskCreatedPayload = {
  taskId: string;
  title: string;
  status: "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH";
  tags: string[];
  assignee?: { id: string; name: string; image?: string | null } | null;
  dueDate?: Date | null;
  changedBy: string;
};

export type TaskUpdatedPayload = {
  taskId: string;
  title?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  status?: "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE";
  tags?: string[];
  dueDate?: Date | null;
  assignee?: { id: string; name: string; image?: string | null } | null;
  changedBy: string;
};

export type TaskDeletedPayload = {
  taskId: string;
  changedBy: string;
};

export type NotificationPayload = {
  id: string;
  type: string;
  message: string;
  taskId?: string | null;
  createdAt: Date;
};

export type ServerToClientEvents = {
  "task:moved": (payload: TaskMovedPayload) => void;
  "task:created": (payload: TaskCreatedPayload) => void;
  "task:updated": (payload: TaskUpdatedPayload) => void;
  "task:deleted": (payload: TaskDeletedPayload) => void;
  "notification:new": (payload: NotificationPayload) => void;
};

export type ClientToServerEvents = {
  "join:project": (projectId: string) => void;
  "join:user": (userId: string) => void;
};
