import type { Request, Response } from 'express';
import { NotFoundError } from '../../shared/errors/AppError.js';
import type { AuthenticatedRequest } from '../../shared/middleware/auth.middleware.js';
import type { AuthService } from './auth.service.js';
import { parseLoginInput, parseRegisterInput } from './auth.validators.js';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const input = parseRegisterInput(req.body);
    const result = await this.authService.register(input);
    res.status(201).json(result);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const input = parseLoginInput(req.body);
    const result = await this.authService.login(input);
    res.status(200).json(result);
  };

  me = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = await this.authService.getCurrentUser(req.userId!);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    res.status(200).json({ user });
  };
}
