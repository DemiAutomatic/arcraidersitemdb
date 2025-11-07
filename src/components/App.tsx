import { useState, useMemo } from "react";
import Items from "../data/items-api.json";
import Quests from "../data/quests-api.json";
import Hideout from "../data/workbenches.json";
import Projects from "../data/projects.json";
import "./App.css";

function App() {
  const [search, setSearch] = useState("");
  const [sortColumn, setSortColumn] = useState("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Create lookup maps for performance - computed once on load
  const { questRequirementsMap, hideoutRequirementsMap, projectRequirementsMap } = useMemo(() => {
    const questMap: Record<string, { questName: string; quantity: number }[]> = {};
    const hideoutMap: Record<string, { moduleName: string; level: number; quantity: number }[]> = {};
    const projectMap: Record<string, { projectName: string; phase: number; quantity: number }[]> = {};

    // Build quest requirements map
    Quests.forEach((quest) => {
      const questName = quest.name;

      // Check required_items array
      quest.required_items?.forEach((req: any) => {
        if (!questMap[req.item_id]) {
          questMap[req.item_id] = [];
        }
        questMap[req.item_id].push({
          questName,
          quantity: req.quantity,
        });
      });

      // Also check objectives text for additional patterns
      const itemNameMap: Record<string, string> = {};
      Items.forEach((item) => {
        itemNameMap[item.id] = item.name;
      });

      quest.objectives?.forEach((objText: string) => {
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
      const moduleName = module.name || module.id;

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

    // Build project requirements map
    Projects.forEach((project) => {
      const projectName = project.name || project.id;

      project.phases?.forEach((phase) => {
        phase.requirementItemIds?.forEach((req) => {
          if (!projectMap[req.itemId]) {
            projectMap[req.itemId] = [];
          }
          projectMap[req.itemId].push({
            projectName,
            phase: phase.phase,
            quantity: req.quantity,
          });
        });
      });
    });

    return { questRequirementsMap: questMap, hideoutRequirementsMap: hideoutMap, projectRequirementsMap: projectMap };
  }, []); // No dependencies since data is static

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
        return item.name;
      case "value":
        return item.value || 0;
      case "type":
        return item.item_type || "";
      case "rarity":
        return item.rarity || "";
      case "recyclesInto":
        return (item.recycle_components ? item.recycle_components.length : 0).toString();
      case "recycleValue":
        return item.recycle_value || 0;
      case "Quests":
        return (questRequirementsMap[item.id] || []).length.toString();
      case "HideoutUpgrades":
        return (hideoutRequirementsMap[item.id] || []).length.toString();
      case "Projects":
        return (projectRequirementsMap[item.id] || []).length.toString();
      default:
        return "";
    }
  };

  // Simplified functions that use the pre-computed maps
  const getQuestRequirements = (itemId: string) => questRequirementsMap[itemId] || [];
  const getHideoutRequirements = (itemId: string) => hideoutRequirementsMap[itemId] || [];
  const getProjectRequirements = (itemId: string) => projectRequirementsMap[itemId] || [];

  const filtered = Items.filter((item) => {
    const name = item.name;
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const filteredItems = filtered.sort((a, b) => {
    const aValue = getSortValue(a, sortColumn);
    const bValue = getSortValue(b, sortColumn);

    // For numeric columns (counts), sort numerically
    if (["value", "recyclesInto", "recycleValue", "Quests", "HideoutUpgrades", "Projects"].includes(sortColumn)) {
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
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort("name")} style={{ cursor: "pointer" }}>
                Item {sortColumn === "name" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th onClick={() => handleSort("value")} style={{ cursor: "pointer" }}>
                Value: Sell/Recycle {sortColumn === "value" && (sortDirection === "asc" ? "↑" : "↓")}
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
                Upgrades {sortColumn === "HideoutUpgrades" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th onClick={() => handleSort("Projects")} style={{ cursor: "pointer" }}>
                Projects {sortColumn === "Projects" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item, index) => {
              const questReqs = getQuestRequirements(item.id);
              const hideoutReqs = getHideoutRequirements(item.id);
              const projectReqs = getProjectRequirements(item.id);

              return (
                <tr key={item.id || index}>
                  <td style={{ whiteSpace: "wrap" }}>{item.name}</td>
                  <td>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span
                        style={{
                          color: (item.value || 0) > (item.recycle_value || 0) ? "#4CAF50" : "#666",
                          fontWeight: (item.value || 0) > (item.recycle_value || 0) ? "bold" : "normal",
                        }}
                      >
                        {item.value !== undefined ? item.value : "-"}
                      </span>
                      <span style={{ color: "#999" }}>/</span>
                      <span
                        style={{
                          color: (item.recycle_value || 0) > (item.value || 0) ? "#4CAF50" : "#666",
                          fontWeight: (item.recycle_value || 0) > (item.value || 0) ? "bold" : "normal",
                        }}
                      >
                        {item.recycle_components && item.recycle_components.length > 0 ? item.recycle_value : 0}
                      </span>
                    </div>
                  </td>
                  <td>{item.item_type}</td>
                  <td className={item.rarity ? item.rarity.toLowerCase() : ""}>{item.rarity}</td>
                  <td>
                    {item.recycle_components && item.recycle_components.length > 0 ? (
                      item.recycle_components.map((recycle: any, idx: number) => {
                        const recycleName = recycle.component?.name || recycle.component?.id || `Unknown (${recycle.component?.id})`;
                        return (
                          <div key={idx}>
                            {recycleName} x{recycle.quantity}
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
                  <td>
                    {projectReqs.map((req, idx) => (
                      <div key={idx}>
                        {req.projectName} Ph.{req.phase} x{req.quantity}
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
        {filteredItems.map((item, index) => {
          const questReqs = getQuestRequirements(item.id);
          const hideoutReqs = getHideoutRequirements(item.id);
          const projectReqs = getProjectRequirements(item.id);

          return (
            <div key={item.id || index} className="mobile-card">
              <div className="card-title">{item.name}</div>

              <div className="card-row">
                <span className="card-label">Type:</span>
                <span className="card-value">{item.item_type}</span>
              </div>

              <div className="card-row">
                <span className="card-label">Rarity:</span>
                <span className={`card-value ${item.rarity ? item.rarity.toLowerCase() : ""}`}>{item.rarity}</span>
              </div>

              <div className="card-row">
                <span className="card-label">Value/Recycle:</span>
                <div className="card-value" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span
                    style={{
                      color: (item.value || 0) > (item.recycle_value || 0) ? "#4CAF50" : "#666",
                      fontWeight: (item.value || 0) > (item.recycle_value || 0) ? "bold" : "normal",
                    }}
                  >
                    {item.value !== undefined ? item.value : "-"}
                  </span>
                  <span style={{ color: "#999" }}>/</span>
                  <span
                    style={{
                      color: (item.recycle_value || 0) > (item.value || 0) ? "#4CAF50" : "#666",
                      fontWeight: (item.recycle_value || 0) > (item.value || 0) ? "bold" : "normal",
                    }}
                  >
                    {item.recycle_components && item.recycle_components.length > 0 ? item.recycle_value : 0}
                  </span>
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

              <div className="card-row">
                <span className="card-label">Hideout Upgrades:</span>
                <div className="card-value">
                  {hideoutReqs.map((req, idx) => (
                    <div key={idx}>
                      {req.moduleName} Lv.{req.level} x{req.quantity}
                    </div>
                  ))}
                </div>
              </div>

              <div className="card-row" style={{ borderBottom: "none" }}>
                <span className="card-label">Projects:</span>
                <div className="card-value">
                  {projectReqs.map((req, idx) => (
                    <div key={idx}>
                      {req.projectName} Ph.{req.phase} x{req.quantity}
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
