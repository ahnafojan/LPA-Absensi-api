import bcrypt from "bcryptjs";

const saltRounds = 10;

export const hashPassword = (password: string): Promise<string> => {
  return bcrypt.hash(password, saltRounds);
};

export const verifyPassword = (
  password: string,
  passwordHash: string,
): Promise<boolean> => {
  return bcrypt.compare(password, passwordHash);
};
