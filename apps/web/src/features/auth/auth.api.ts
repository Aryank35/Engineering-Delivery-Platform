import { api } from '@/lib/api-client';
import type {
  AuthenticatedUser,
  ChangePasswordInput,
  LoginInput,
  LoginResult,
  RegisterInput,
  UpdateProfileInput,
} from '@eop/shared';

export const authApi = {
  login: (input: LoginInput) => api.post<LoginResult>('/auth/login', input).then((r) => r.data),
  register: (input: RegisterInput) =>
    api.post<LoginResult>('/auth/register', input).then((r) => r.data),
  me: () => api.get<AuthenticatedUser>('/auth/me').then((r) => r.data),
  updateProfile: (input: UpdateProfileInput) =>
    api.patch<AuthenticatedUser>('/auth/me', input).then((r) => r.data),
  logout: () => api.post<{ success: boolean }>('/auth/logout').then((r) => r.data),
  changePassword: (input: ChangePasswordInput) =>
    api.post<LoginResult>('/auth/change-password', input).then((r) => r.data),
};
