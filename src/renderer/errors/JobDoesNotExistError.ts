export class JobDoesNotExistError extends Error {
  constructor(message = "You tried to modify a job that does not exist!") {
    super(message);
  }
}
