export type UserRole = "KARYAWAN" | "HRD";

export type AuthUser = {
  id: string;
  username: string;
  role: UserRole;
  employeeId: string | null;
};

export type AppEnv = {
  Variables: {
    authUser: AuthUser;
  };
};
