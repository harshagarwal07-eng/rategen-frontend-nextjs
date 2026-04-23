export function getStatusLabel(status: string): string {
  const normalizedStatus = status?.toLowerCase();

  switch (normalizedStatus) {
    case "pending":
      return "Pending Verification";
    case "active":
      return "Active";
    case "inactive":
      return "Inactive";
    case "suspend":
      return "Suspended";
    case "deleted":
      return "Deleted";
    default:
      return "Unknown Status";
  }
}

export function getStatusColor(status: string): string {
  const normalizedStatus = status?.toLowerCase();

  switch (normalizedStatus) {
    case "pending":
      return "#2D9BF0"; // Blue
    case "active":
      return "#27AE60"; // Green
    case "inactive":
      return "#F2C94C"; // Yellow
    case "suspend":
      return "#F2994A"; // Orange
    case "deleted":
      return "#EB5757"; // Red
    default:
      return "#BDBDBD"; // Grey
  }
}
