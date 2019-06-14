export class JobDoesNotExistError extends Error {
    constructor(message: string = "You tried to modify a job that does not exist!") {
        super(message);
    }
}
