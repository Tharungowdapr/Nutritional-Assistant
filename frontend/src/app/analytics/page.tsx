import NutritionDataViewer from "@/components/nutrition-data-viewer";

export default function AnalyticsPage() {
  return (
    <NutritionDataViewer
      sheetSelectorType="tabs"
      searchPlaceholder="Filter rows..."
    />
  );
}
