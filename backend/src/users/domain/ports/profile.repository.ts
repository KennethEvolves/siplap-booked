import type { UpdateProfile, UserProfile } from '@shared/contracts';
export abstract class ProfileRepository {
  abstract findByUserId(userId: string): Promise<UserProfile | null>;
  abstract update(userId: string, input: UpdateProfile): Promise<UserProfile>;
}
