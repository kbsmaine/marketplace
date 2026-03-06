import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, isAdmin: !!user.is_admin, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}
