export type DataTableIdAccessor<T> = keyof T | (string & NonNullable<unknown>) | ((record: T) => React.Key);
