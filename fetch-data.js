import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchData() {
  const baseUrl = "https://metaforge.app/api";

  console.log("Fetching items...");
  let allItems = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${baseUrl}/arc-raiders/items?page=${page}&limit=100&includeComponents=true`);
    const data = await res.json();
    allItems = allItems.concat(data.data);
    console.log(`Fetched page ${page}, total items: ${allItems.length}`);
    if (!data.pagination.hasNextPage) break;
    page++;
  }

  // Calculate recycle values for items that have recycle components
  console.log("Calculating recycle values...");
  allItems.forEach((item) => {
    if (item.recycle_components && item.recycle_components.length > 0) {
      item.recycle_value = item.recycle_components.reduce((total, recycle) => {
        // Find the component in the items array to get its value
        const componentItem = allItems.find((i) => i.id === recycle.component?.id);
        const componentValue = componentItem?.value || 0;
        return total + componentValue * recycle.quantity;
      }, 0);
    } else {
      item.recycle_value = 0;
    }
  });

  console.log("Fetching quests...");
  const questRes = await fetch(`${baseUrl}/arc-raiders/quests?limit=100`);
  const questData = await questRes.json();

  // Save to files
  const dataDir = path.join(__dirname, "src", "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(path.join(dataDir, "items-api.json"), JSON.stringify(allItems, null, 2));
  fs.writeFileSync(path.join(dataDir, "quests-api.json"), JSON.stringify(questData.data, null, 2));

  console.log("Data fetched and saved successfully!");
}

fetchData().catch(console.error);
