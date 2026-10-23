import { connectToDatabase } from "@/lib/mongodb";
import { UserPreferences } from "@/models/UserPreferences";

export interface PreferencesData { currency: "INR" | "USD" | "EUR" | "GBP"; pendingTreatment: "exclude" | "include"; reportStartDay: number }
const defaults: PreferencesData = { currency: "INR", pendingTreatment: "exclude", reportStartDay: 1 };

export async function getPreferencesForUser(userId: string): Promise<PreferencesData> {
  await connectToDatabase(); const preferences = await UserPreferences.findOne({ userId }).lean() as unknown as Partial<PreferencesData> | null;
  return { ...defaults, ...preferences };
}
