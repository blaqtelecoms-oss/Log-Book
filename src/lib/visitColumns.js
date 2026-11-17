import { formatDate } from "@/lib/kioskFormat";

/** Table columns for the visits workspace; `optional` ones can be hidden. */
export const VISIT_COLUMNS = [
  { key: "full_name", header: "Name", sort: "full_name" },
  { key: "address", header: "Address", optional: true },
  { key: "contact_number", header: "Contact" },
  { key: "email", header: "Email", render: (row) => row.email || "—" },
  { key: "town", header: "Organisation", render: (row) => row.town || "—" },
  { key: "reason", header: "Purpose" },
  { key: "visit_date", header: "Date", sort: "visit_date", render: (row) => formatDate(row.visit_date) },
  { key: "time_in", header: "Time in", sort: "time_in" },
  { key: "time_out", header: "Time out", optional: true, render: (row) => row.time_out || "—" },
  { key: "branch", header: "Site", optional: true, render: (row) => row.branch || "—" },
  { key: "status", header: "Status", sort: "status" },
];

export const DEFAULT_HIDDEN = ["address", "time_out", "branch"];

/** Column set used by CSV, Excel and the printed register. */
export const EXPORT_COLUMNS = [
  { key: "full_name", header: "Name" },
  { key: "address", header: "Address" },
  { key: "contact_number", header: "Contact" },
  { key: "email", header: "Email" },
  { key: "town", header: "Organisation" },
  { key: "reason", header: "Purpose" },
  { key: "visit_date", header: "Date", value: (row) => formatDate(row.visit_date) },
  { key: "time_in", header: "Time in" },
  { key: "time_out", header: "Time out" },
  { key: "branch", header: "Site" },
  { key: "status", header: "Status" },
  { key: "consent_given", header: "Privacy consent", value: (row) => (row.consent_given ? "Yes" : "No") },
  { key: "notes", header: "Internal notes" },
];