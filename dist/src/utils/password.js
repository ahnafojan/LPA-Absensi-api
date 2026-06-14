import bcrypt from "bcryptjs";
const saltRounds = 10;
export const hashPassword = (password) => {
    return bcrypt.hash(password, saltRounds);
};
export const verifyPassword = (password, passwordHash) => {
    return bcrypt.compare(password, passwordHash);
};
//# sourceMappingURL=password.js.map