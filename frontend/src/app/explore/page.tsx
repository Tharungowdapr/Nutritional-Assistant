import NutritionDataViewer from "@/components/nutrition-data-viewer";

export default function ExplorePage() {
  return (
    <NutritionDataViewer
      sheetSelectorType="dropdown"
      enableColumnToggle={true}
      excludeColumns={["IFCT Code"]}
      headerRowDetection={true}
    />
  );
}
