import { useState, useMemo } from "react";
import Items from "../data/items.json";
import Quests from "../data/quests.json";
import Hideout from "../data/hideout.json";
import "./App.css";

function App() {
  const [search, setSearch] = useState("");
  const [locale, setLocale] = useState("en");
  const [sortColumn, setSortColumn] = useState("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Create lookup maps for performance - computed once on load
  const { questRequirementsMap, hideoutRequirementsMap } = useMemo(() => {
    const questMap: Record<string, { questName: string; quantity: number }[]> = {};
    const hideoutMap: Record<string, { moduleName: string; level: number; quantity: number }[]> = {};

    // Build quest requirements map
    Quests.forEach((quest) => {
      const questName = (quest.name as Record<string, string>)?.[locale] || quest.name.en || quest.id;

      // Check requiredItemIds array
      quest.requiredItemIds?.forEach((req) => {
        if (!questMap[req.itemId]) {
          questMap[req.itemId] = [];
        }
        questMap[req.itemId].push({
          questName,
          quantity: req.quantity,
        });
      });

      // Also check objectives text for additional patterns
      const itemNameMap: Record<string, string> = {};
      Items.forEach((item) => {
        itemNameMap[item.id] = (item.name as Record<string, string>)?.[locale] || item.id;
      });

      quest.objectives?.forEach((objective) => {
        const objText = (objective as Record<string, string>)[locale] || objective.en || "";
        const patterns = [/^Obtain (\d+) (.+)$/i, /^Get (\d+) (.+) for/i, /^Collect (\d+) (.+)$/i, /^Gather (\d+) (.+)$/i, /^Find (\d+) (.+)$/i];

        for (const pattern of patterns) {
          const match = objText.match(pattern);
          if (match) {
            const quantity = parseInt(match[1]);
            const requiredItemName = match[2].trim();

            // Find the item ID by name
            const itemId = Object.keys(itemNameMap).find((id) => itemNameMap[id].toLowerCase() === requiredItemName.toLowerCase());

            if (itemId && !questMap[itemId]?.some((req) => req.questName === questName)) {
              if (!questMap[itemId]) {
                questMap[itemId] = [];
              }
              questMap[itemId].push({
                questName,
                quantity,
              });
            }
            break;
          }
        }
      });
    });

    // Build hideout requirements map
    Hideout.forEach((module) => {
      const moduleName = (module.name as Record<string, string>)?.[locale] || module.name.en || module.id;

      module.levels?.forEach((level) => {
        level.requirementItemIds?.forEach((req) => {
          if (!hideoutMap[req.itemId]) {
            hideoutMap[req.itemId] = [];
          }
          hideoutMap[req.itemId].push({
            moduleName,
            level: level.level,
            quantity: req.quantity,
          });
        });
      });
    });

    return { questRequirementsMap: questMap, hideoutRequirementsMap: hideoutMap };
  }, [locale]); // Recompute when locale changes

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getSortValue = (item: any, column: string) => {
    switch (column) {
      case "name":
        return (item.name as Record<string, string>)?.[locale] || item.id;
      case "type":
        return item.type || "";
      case "rarity":
        return item.rarity || "";
      case "recyclesInto":
        return (item.recyclesInto ? Object.keys(item.recyclesInto).length : 0).toString();
      case "Quests":
        return (questRequirementsMap[item.id] || []).length.toString();
      case "HideoutUpgrades":
        return (hideoutRequirementsMap[item.id] || []).length.toString();
      default:
        return "";
    }
  };

  // Simplified functions that use the pre-computed maps
  const getQuestRequirements = (itemId: string) => questRequirementsMap[itemId] || [];
  const getHideoutRequirements = (itemId: string) => hideoutRequirementsMap[itemId] || [];

  const filtered = Items.filter((item) => {
    const name = (item.name as Record<string, string>)?.[locale] || item.id;
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const recyclableItems = filtered.sort((a, b) => {
    const aValue = getSortValue(a, sortColumn);
    const bValue = getSortValue(b, sortColumn);

    // For numeric columns (counts), sort numerically
    if (["recyclesInto", "Quests", "HideoutUpgrades"].includes(sortColumn)) {
      const aNum = parseInt(aValue) || 0;
      const bNum = parseInt(bValue) || 0;
      return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
    }

    // For text columns, sort alphabetically
    if (sortDirection === "asc") {
      return aValue.localeCompare(bValue);
    } else {
      return bValue.localeCompare(aValue);
    }
  });

  return (
    <div>
      <img src="https://cdn1.epicgames.com/spt-assets/9e8b37541e614575b4de303d2c2e44cf/arc-raiders-weavs.jpg" alt="ARC Raiders Logo" className="logo" />
      <h1>Item Database</h1>
      <div className="search-container">
        <input type="text" placeholder="Search for an item..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="locale-selector">
        <label>Language: </label>
        <select value={locale} onChange={(e) => setLocale(e.target.value)}>
          <option value="en">English</option>
          <option value="de">Deutsch</option>
          <option value="fr">Français</option>
          <option value="es">Español</option>
          <option value="pt">Português</option>
          <option value="pl">Polski</option>
          <option value="ru">Русский</option>
          <option value="ja">日本語</option>
          <option value="zh-CN">中文</option>
        </select>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort("name")} style={{ cursor: "pointer" }}>
                Item {sortColumn === "name" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th onClick={() => handleSort("type")} style={{ cursor: "pointer" }}>
                Type {sortColumn === "type" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th onClick={() => handleSort("rarity")} style={{ cursor: "pointer" }}>
                Rarity {sortColumn === "rarity" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th onClick={() => handleSort("recyclesInto")} style={{ cursor: "pointer" }}>
                Recycle {sortColumn === "recyclesInto" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th onClick={() => handleSort("Quests")} style={{ cursor: "pointer" }}>
                Quests {sortColumn === "Quests" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>

              <th onClick={() => handleSort("HideoutUpgrades")} style={{ cursor: "pointer" }}>
                Hideout Upgrades {sortColumn === "HideoutUpgrades" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
            </tr>
          </thead>
          <tbody>
            {recyclableItems.map((item, index) => {
              const questReqs = getQuestRequirements(item.id);
              const hideoutReqs = getHideoutRequirements(item.id);

              return (
                <tr key={item.id || index}>
                  <td>{(item.name as Record<string, string>)?.[locale] || item.id}</td>
                  <td>{item.type}</td>
                  <td>{item.rarity}</td>
                  <td>
                    {item.recyclesInto && Object.keys(item.recyclesInto).length > 0 ? (
                      Object.entries(item.recyclesInto as Record<string, number>).map(([recycleId, qty]) => {
                        const recycleItem = Items.find((i) => i.id === recycleId);
                        const recycleName = (recycleItem?.name as Record<string, string>)?.[locale] || recycleId;
                        return (
                          <div key={recycleId}>
                            {recycleName} x{qty}
                          </div>
                        );
                      })
                    ) : (
                      <span style={{ color: "#666", fontStyle: "italic" }}>No recycling data</span>
                    )}
                  </td>
                  <td>
                    {questReqs.map((req, idx) => (
                      <div key={idx}>
                        {req.questName} x{req.quantity}
                      </div>
                    ))}
                  </td>
                  <td>
                    {hideoutReqs.map((req, idx) => (
                      <div key={idx}>
                        {req.moduleName} Lv.{req.level} x{req.quantity}
                      </div>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards View */}
      <div className="mobile-cards">
        {recyclableItems.map((item, index) => {
          const questReqs = getQuestRequirements(item.id);
          const hideoutReqs = getHideoutRequirements(item.id);

          return (
            <div key={item.id || index} className="mobile-card">
              <div className="card-title">{(item.name as Record<string, string>)?.[locale] || item.id}</div>

              <div className="card-row">
                <span className="card-label">Type:</span>
                <span className="card-value">{item.type}</span>
              </div>

              <div className="card-row">
                <span className="card-label">Rarity:</span>
                <span className="card-value">{item.rarity}</span>
              </div>

              <div className="card-row">
                <span className="card-label">Recycle:</span>
                <div className="card-value">
                  {item.recyclesInto && Object.keys(item.recyclesInto).length > 0 ? (
                    Object.entries(item.recyclesInto as Record<string, number>).map(([recycleId, qty]) => {
                      const recycleItem = Items.find((i) => i.id === recycleId);
                      const recycleName = (recycleItem?.name as Record<string, string>)?.[locale] || recycleId;
                      return (
                        <div key={recycleId}>
                          {recycleName} x{qty}
                        </div>
                      );
                    })
                  ) : (
                    <span style={{ color: "#666", fontStyle: "italic" }}>No recycling data</span>
                  )}
                </div>
              </div>

              <div className="card-row">
                <span className="card-label">Quests:</span>
                <div className="card-value">
                  {questReqs.map((req, idx) => (
                    <div key={idx}>
                      {req.questName} x{req.quantity}
                    </div>
                  ))}
                </div>
              </div>

              <div className="card-row" style={{ borderBottom: "none" }}>
                <span className="card-label">Hideout Upgrades:</span>
                <div className="card-value">
                  {hideoutReqs.map((req, idx) => (
                    <div key={idx}>
                      {req.moduleName} Lv.{req.level} x{req.quantity}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;
