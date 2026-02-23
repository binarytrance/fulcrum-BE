export const ID_GENERATOR_PORT = Symbol('ID_GENERATOR_PORT');

export interface IIDGenerator {
  generate(): string;
}
