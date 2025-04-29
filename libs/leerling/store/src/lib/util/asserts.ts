export function assertIsDefined<T>(value: T): asserts value is NonNullable<T> {
    if (value === undefined || value === null) {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Expected 'value' to be defined, but received ${value}`);
    }
}
