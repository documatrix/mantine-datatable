type DataTableSpacerRowProps = {
  height: number;
  colSpan: number;
};

/**
 * Invisible row compensating for the space taken by the rows excluded from the DOM
 * when virtualization is enabled.
 */
export function DataTableSpacerRow({ height, colSpan }: DataTableSpacerRowProps) {
  return (
    <tr aria-hidden className="mantine-datatable-spacer-row">
      <td colSpan={colSpan} style={{ height, padding: 0, border: 'none' }} />
    </tr>
  );
}
