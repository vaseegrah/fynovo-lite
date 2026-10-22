import type { BusinessName } from "@/types/financial";

export const businessNames: BusinessName[] = ["Techvaseegrah", "Vaseegrah Veda", "Vaseegrah Vanam", "Spa Vaseegrah"];

export function normaliseBusinessName(value: unknown): BusinessName {
  const name = String(value ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (name.includes("veda")) return "Vaseegrah Veda";
  if (name.includes("vanam")) return "Vaseegrah Vanam";
  if (name.includes("spa")) return "Spa Vaseegrah";
  return "Techvaseegrah";
}
