export abstract class PasswordEncoderPort {
  abstract hash(plainPassword: string): Promise<string>;
}