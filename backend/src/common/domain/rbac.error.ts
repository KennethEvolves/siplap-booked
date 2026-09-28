export class RbacError extends Error {
  constructor(
    public readonly kind: 'not_found' | 'conflict' | 'invalid',
    message: string,
  ) {
    super(message);
  }
}
