type DataTableSpacerRowProps = {
  height: number;
  colSpan: number;
};

export function DataTableSpacerRow({ height, colSpan }: DataTableSpacerRowProps) {
  return (
    <tr aria-hidden className="mantine-datatable-spacer-row">
      <td colSpan={colSpan} style={{ height, padding: 0, border: 'none' }} />
    </tr>
  );
}
