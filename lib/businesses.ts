import type { BusinessName } from "@/types/financial";

export const businessNames: BusinessName[] = ["Techvaseegrah", "Vaseegrah Veda", "Vaseegrah Edibles", "Spa Vaseegrah"];

export function displayBusinessName(name: BusinessName): BusinessName {
  if (name === "Vaseegrah Edibles") return "Spa Vaseegrah";
  if (name === "Spa Vaseegrah") return "Vaseegrah Edibles";
  return name;
}

export function businessForTransaction(brand?: BusinessName, business?: BusinessName): BusinessName {
  return brand || business || "Techvaseegrah";
}

export function normaliseBusinessName(value: unknown): BusinessName {
  const name = String(value ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (name.includes("veda")) return "Vaseegrah Veda";
  if (name.includes("Edibles")) return "Vaseegrah Edibles";
  if (name.includes("spa")) return "Spa Vaseegrah";
  return "Techvaseegrah";
}
