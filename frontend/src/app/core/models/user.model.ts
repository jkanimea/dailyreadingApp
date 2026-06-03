export interface UserDto {
  id: number;
  email: string;
  displayName: string;
  provider: string;
  selectedSeriesId: number;
  photoUrl?: string;
  role?: string; // 'Admin' | 'User'
}

export interface LoginRequest {
  provider: 'google' | 'facebook';
  token: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserDto;
}

export function isTokenResponse(value: unknown): value is TokenResponse {
  return typeof value === 'object' && value !== null
    && typeof (value as TokenResponse).accessToken === 'string'
    && typeof (value as TokenResponse).refreshToken === 'string';
}
