import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/User';
import { ApiError } from '../utils/ApiError';

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, 'You do not have permission to perform this action.');
    }
    next();
  };
}
