import { type DataTableColumn, type DataTableFilterOption, type DataTableFilters, filterRecords } from '__PACKAGE__';
import { type Employee, employees } from '~/data';
import { delay } from '~/lib/examples';

// Stands in for your API. A real backend would translate the filters to SQL (see `toSqlLikePattern`);
// a Node backend can also evaluate them with `filterRecords`, as done here.
const serverColumns: DataTableColumn<Employee>[] = [
  { accessor: 'name', filter: { type: 'text', getValue: ({ firstName, lastName }) => `${firstName} ${lastName}` } },
  { accessor: 'email', filter: { type: 'text' } },
  { accessor: 'department.name', filter: { type: 'select' } },
  { accessor: 'birthDate', filter: { type: 'date' } },
];

export type EmployeeSearchRequest = {
  page: number;
  pageSize: number;
  filters: DataTableFilters;
};

export async function searchEmployees({ page, pageSize, filters }: EmployeeSearchRequest) {
  await delay({ min: 300, max: 600 });
  const matching = filterRecords(employees, { columns: serverColumns, filters });
  return {
    records: matching.slice((page - 1) * pageSize, page * pageSize),
    total: matching.length,
  };
}

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
