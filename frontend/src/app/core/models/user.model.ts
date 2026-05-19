export interface UserDto {
  id: number;
  email: string;
  displayName: string;
  photoUrl?: string;
}

export interface LoginRequest {
  provider: 'google' | 'facebook';
  token: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: UserDto;
}
