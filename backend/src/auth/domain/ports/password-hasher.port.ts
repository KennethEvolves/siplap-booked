export abstract class PasswordHasherPort {
  abstract compare(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean>;
}