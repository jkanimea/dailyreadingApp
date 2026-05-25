export interface UserDto {
  id: number;
  email: string;
  displayName: string;
  provider: string;
  selectedSeriesId: number;
  photoUrl?: string;
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
