export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResultDto {
  accessToken: string;

  user: {
    userId: string;
    username: string | null;
    email: string;
    roles: string[];
  };
}