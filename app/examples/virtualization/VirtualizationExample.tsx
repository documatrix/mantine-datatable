'use client';

import { DataTable } from '__PACKAGE__';
import dayjs from 'dayjs';
import { type Employee, employees } from '~/data';

// Repeat the sample employees to obtain a large dataset
const records: Employee[] = Array.from({ length: 5000 }, (_, index) => {
  const employee = employees[index % employees.length];
  return { ...employee, id: `${employee.id}-${index}` };
});

export function VirtualizationExample() {
  return (
    <DataTable
      withTableBorder
      borderRadius="sm"
      striped
      highlightOnHover
      height={400}
      virtualized
      records={records}
      columns={[
        { accessor: 'firstName' },
        { accessor: 'lastName' },
        { accessor: 'email' },
        { accessor: 'department.name', title: 'Department' },
        { accessor: 'department.company.name', title: 'Company', noWrap: true },
        {
          accessor: 'birthDate',
          title: 'Birthday',
          render: ({ birthDate }) => dayjs(birthDate).format('MMM D'),
        },
      ]}
    />
  );
}
