import type { DataTableFilterOption } from '__PACKAGE__';
import { type Employee, employees } from '~/data';
import { delay } from '~/lib/examples';

export type EmployeeRecord = Employee & {
  lastLogin: string;
  /** Average response time in seconds */
  responseTime: number;
};

function hash(text: string) {
  let value = 0;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) >>> 0;
  return value;
}

// Made-up values that stay the same per employee: a login within the last 45 days and an average
// response time between 30 seconds and 3 hours
export const records: EmployeeRecord[] = employees.map((employee) => {
  const seed = hash(employee.id);
  return {
    ...employee,
    lastLogin: new Date(Date.now() - (seed % (45 * 24 * 60)) * 60_000).toISOString(),
    responseTime: 30 + (seed % (3 * 3600 - 30)),
  };
});

// Stands in for an API returning the distinct departments matching the typed text
export async function loadDepartmentOptions(search: string, signal: AbortSignal): Promise<DataTableFilterOption[]> {
  await delay({ min: 200, max: 400 });
  signal.throwIfAborted();
  const counts = new Map<string, number>();
  for (const { department } of employees) {
    if (department.name.toLowerCase().includes(search.toLowerCase())) {
      counts.set(department.name, (counts.get(department.name) ?? 0) + 1);
    }
  }
  return [...counts].sort(([, a], [, b]) => b - a).map(([value, count]) => ({ value, label: value, count }));
}
