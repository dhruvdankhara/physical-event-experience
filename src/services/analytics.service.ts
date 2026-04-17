import { generateAnalyticsOverview as generateGAnalyticsOverview } from "@/lib/google/analytics";

export async function generateAnalyticsOverview(params?: { startDate?: string; endDate?: string }) {
  return await generateGAnalyticsOverview(params);
}
