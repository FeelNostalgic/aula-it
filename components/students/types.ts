export type BulkCreateResult = {
  identifier: string;
  password: string;
  userId?: string;
  email?: string;
  error?: string;
};

export type ClassroomStudent = {
  id: string;
  identifier: string;
  email: string;
  is_banned: boolean;
  enrolledModules: Array<{ id: string; name: string }>;
};

export type TeacherModule = {
  id: string;
  name: string;
  status: string;
};

export type AdminModule = TeacherModule & {
  teacher_name: string;
  teacher_id: string;
};
