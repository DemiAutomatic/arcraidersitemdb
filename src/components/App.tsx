import { useState, useMemo, useRef } from "react";
import Items from "../data/items.json";
import Quests from "../data/quests.json";
import Workbenches from "../data/workbenches.json";
import Projects from "../data/projects.json";
import "./App.css";

function App() {
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortColumn, setSortColumn] = useState("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const debounceTimer = useRef<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debounceTimer.current && clearTimeout(debounceTimer.current);
    debounceTimer.current = null;
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(e.target.value);
    }, 300);
  };

  const handleItemClick = (itemName: string) => {
    setDebouncedSearch(itemName);
    if (searchInputRef.current) {
      searchInputRef.current.value = itemName;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const { questRequirementsMap, workbenchRequirementsMap, projectRequirementsMap, itemLookup } = useMemo(() => {
    const questMap: Record<string, { questName: string; quantity: number }[]> = {};
    const workbenchMap: Record<string, { moduleName: string; level: number; quantity: number }[]> = {};
    const projectMap: Record<string, { projectName: string; phase: number; quantity: number }[]> = {};
    const itemLookup: Record<string, any> = {};

    Items.forEach((item) => {
      itemLookup[item.id] = item;
      (item as any).lowercaseName = item.name.en.toLowerCase();
    });

    Quests.forEach((quest) => {
      const questName = quest.name.en;

      quest.requiredItemIds?.forEach((req: any) => {
        if (!questMap[req.itemId]) {
          questMap[req.itemId] = [];
        }
        questMap[req.itemId].push({
          questName,
          quantity: req.quantity,
        });
      });

      const itemNameMap: Record<string, string> = {};
      Items.forEach((item) => {
        itemNameMap[item.id] = item.name.en;
      });

      quest.objectives?.forEach((locales: { [index: string]: string }) => {
        const patterns = [/^Obtain (\d+) (.+)$/i, /^Get (\d+) (.+) for/i, /^Collect (\d+) (.+)$/i, /^Gather (\d+) (.+)$/i, /^Find (\d+) (.+)$/i];
        const objText = locales.en;

        for (const pattern of patterns) {
          const match = objText.match(pattern);
          if (match) {
            const quantity = parseInt(match[1]);
            const requiredItemName = match[2].trim();

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

    Workbenches.forEach((module) => {
      const moduleName = module.name.en || module.id;

      module.levels?.forEach((level) => {
        level.requirementItemIds?.forEach((req) => {
          if (!workbenchMap[req.itemId]) {
            workbenchMap[req.itemId] = [];
          }
          workbenchMap[req.itemId].push({
            moduleName,
            level: level.level,
            quantity: req.quantity,
          });
        });
      });
    });

    Projects.forEach((project) => {
      const projectName = project.name.en || project.id;

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

    return { questRequirementsMap: questMap, workbenchRequirementsMap: workbenchMap, projectRequirementsMap: projectMap, itemLookup: itemLookup };
  }, []);

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
        return item.name.en;
      case "value":
        return item.value || 0;
      case "type":
        return item.type || "";
      case "rarity":
        return item.rarity || "";
      case "recyclesTo":
        return (item.recyclesInto ? Object.keys(item.recyclesInto).length : 0).toString();
      case "recycledFrom":
        return Object.keys(item.recycledFrom).length.toString();
      case "droppedBy":
        return (item.droppedBy ? item.droppedBy.length : 0).toString();
      case "recycleValue":
        return item.recycleValue || 0;
      case "Quests":
        return (questRequirementsMap[item.id] || []).length.toString();
      case "WorkbenchUpgrades":
        return (workbenchRequirementsMap[item.id] || []).length.toString();
      case "Projects":
        return (projectRequirementsMap[item.id] || []).length.toString();
      default:
        return "";
    }
  };

  const getQuestRequirements = (itemId: string) => questRequirementsMap[itemId] || [];
  const getWorkbenchRequirements = (itemId: string) => workbenchRequirementsMap[itemId] || [];
  const getProjectRequirements = (itemId: string) => projectRequirementsMap[itemId] || [];

  const filtered = useMemo(() => Items.filter((item) => (item as any).lowercaseName.includes(debouncedSearch.toLowerCase())), [debouncedSearch]);

  const filteredItems = useMemo(() => {
    return filtered.sort((a, b) => {
      const aValue = getSortValue(a, sortColumn);
      const bValue = getSortValue(b, sortColumn);

      if (["value", "recyclesTo", "recycledFrom", "droppedBy", "recycleValue", "Quests", "WorkbenchUpgrades", "Projects"].includes(sortColumn)) {
        const aNum = parseInt(aValue) || 0;
        const bNum = parseInt(bValue) || 0;
        return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
      }

      if (sortDirection === "asc") {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
  }, [filtered, sortColumn, sortDirection]);

  return (
    <div>
      <img src="https://cdn1.epicgames.com/spt-assets/9e8b37541e614575b4de303d2c2e44cf/arc-raiders-weavs.jpg" alt="ARC Raiders Logo" className="logo" />
      <h1>Item Database</h1>
      <div className="search-container">
        <input ref={searchInputRef} type="text" placeholder="Search for an item..." onChange={handleSearchChange} />
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort("name")} style={{ cursor: "pointer" }}>
                Item {sortColumn === "name" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th onClick={() => handleSort("value")} style={{ cursor: "pointer", textAlign: "center" }}>
                Value: <br /> Sell/Recycle/Salvage {sortColumn === "value" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th onClick={() => handleSort("type")} style={{ cursor: "pointer" }}>
                Type {sortColumn === "type" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th onClick={() => handleSort("rarity")} style={{ cursor: "pointer" }}>
                Rarity {sortColumn === "rarity" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th onClick={() => handleSort("recyclesTo")} style={{ cursor: "pointer" }}>
                Recycles To {sortColumn === "recyclesTo" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th onClick={() => handleSort("salvagesTo")} style={{ cursor: "pointer" }}>
                Salvages To {sortColumn === "salvagesTo" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th onClick={() => handleSort("recycledFrom")} style={{ cursor: "pointer" }}>
                Recycled From {sortColumn === "recycledFrom" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th onClick={() => handleSort("droppedBy")} style={{ cursor: "pointer" }}>
                Dropped By {sortColumn === "droppedBy" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th onClick={() => handleSort("Quests")} style={{ cursor: "pointer" }}>
                Quests {sortColumn === "Quests" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>

              <th onClick={() => handleSort("WorkbenchUpgrades")} style={{ cursor: "pointer" }}>
                Upgrades {sortColumn === "WorkbenchUpgrades" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th onClick={() => handleSort("Projects")} style={{ cursor: "pointer" }}>
                Projects {sortColumn === "Projects" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.slice(0, 50).map((item, index) => {
              const questReqs = getQuestRequirements(item.id);
              const workbenchReqs = getWorkbenchRequirements(item.id);
              const projectReqs = getProjectRequirements(item.id);

              const highestValue = Math.max(item.value || 0, item.recycleValue || 0, item.salvageValue || 0);

              return (
                <tr key={item.id || index}>
                  <td style={{ whiteSpace: "wrap" }}>{item.name.en}</td>
                  <td>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span
                        style={{
                          color: highestValue > 0 && item.value == highestValue ? "#4CAF50" : "#666",
                          fontWeight: highestValue > 0 && item.value == highestValue ? "bold" : "normal",
                        }}
                      >
                        {item.value !== undefined ? item.value : "-"}
                      </span>
                      <span style={{ color: "#999" }}>/</span>
                      <span
                        style={{
                          color: highestValue > 0 && item.recycleValue == highestValue ? "#4CAF50" : "#666",
                          fontWeight: highestValue > 0 && item.recycleValue == highestValue ? "bold" : "normal",
                        }}
                      >
                        {item.recycleValue}
                      </span>
                      <span style={{ color: "#999" }}>/</span>
                      <span style={{ color: highestValue > 0 && item.salvageValue == highestValue ? "#4CAF50" : "#666", fontWeight: highestValue > 0 && item.salvageValue == highestValue ? "bold" : "normal" }}>{item.salvageValue !== undefined ? item.salvageValue : "-"}</span>
                    </div>
                  </td>
                  <td>{item.type}</td>
                  <td className={item.rarity ? item.rarity.toLowerCase() : ""}>{item.rarity}</td>
                  <td>
                    {item.recyclesInto ? (
                      Object.keys(item.recyclesInto).map((recycle: string, idx: number) => {
                        const recycleItem = itemLookup[recycle];
                        const recycleName = recycleItem?.name.en || `Unknown (${recycleItem?.id})`;
                        return (
                          <div key={idx} className={"clickable-item-search"} onClick={() => handleItemClick(recycleName)}>
                            {/* @ts-ignore */}
                            {recycleName} x{item.recyclesInto[recycle]}
                          </div>
                        );
                      })
                    ) : (
                      <span style={{ color: "#666", fontStyle: "italic" }}>No Data</span>
                    )}
                  </td>
                  <td>
                    {item.salvagesInto ? (
                      Object.keys(item.salvagesInto).map((salvage: string, idx: number) => {
                        const salvageItem = itemLookup[salvage];
                        const salvageName = salvageItem?.name.en || `Unknown (${salvageItem?.id})`;
                        return (
                          <div key={idx} className={"clickable-item-search"} onClick={() => handleItemClick(salvageName)}>
                            {/* @ts-ignore */}
                            {salvageName} x{item.salvagesInto[salvage]}
                          </div>
                        );
                      })
                    ) : item.recyclesInto ? (
                      Object.keys(item.recyclesInto).map((recycle: string, idx: number) => {
                        const recycleItem = itemLookup[recycle];
                        const recycleName = recycleItem?.name.en || `Unknown (${recycleItem?.id})`;
                        return (
                          <div key={idx} className={"clickable-item-search"} onClick={() => handleItemClick(recycleName)}>
                            {/* @ts-ignore */}
                            {recycleName} x{item.recyclesInto[recycle]}
                          </div>
                        );
                      })
                    ) : (
                      <span style={{ color: "#666", fontStyle: "italic" }}>No Data</span>
                    )}
                  </td>
                  <td>
                    {Object.keys(item.recycledFrom).length > 0 ? (
                      Object.entries(item.recycledFrom)
                        .sort(([aId], [bId]) => (itemLookup[aId]?.name?.en || "").localeCompare(itemLookup[bId]?.name?.en || ""))
                        .map(([itemId, qty], idx) => {
                          const recycleItem = itemLookup[itemId];
                          const recycleName = recycleItem?.name?.en || `Unknown (${itemId})`;
                          return (
                            <div key={idx} className={"clickable-item-search"} onClick={() => handleItemClick(recycleName)}>
                              {recycleName} x{qty}
                            </div>
                          );
                        })
                    ) : (
                      <span style={{ color: "#666", fontStyle: "italic" }}>No Data</span>
                    )}
                  </td>
                  <td>
                    {item.droppedBy && item.droppedBy.length > 0 ? (
                      item.droppedBy
                        .sort((a: any, b: any) => a.name.localeCompare(b.name))
                        .map((arc: any, idx: number) => {
                          const enemyName = arc?.name || arc?.id || `Unknown (${arc?.id})`;
                          return (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }} key={idx}>
                              {enemyName}
                              <div style={{ width: "30px", height: "30px", marginLeft: "4px", backgroundImage: `url(${arc.icon})`, backgroundSize: "contain", backgroundRepeat: "no-repeat" }} />
                            </div>
                          );
                        })
                    ) : (
                      <span style={{ color: "#666", fontStyle: "italic" }}>No Data</span>
                    )}
                  </td>
                  <td>
                    {questReqs.length > 0 ? (
                      questReqs.map((req, idx) => (
                        <div key={idx}>
                          {req.questName} x{req.quantity}
                        </div>
                      ))
                    ) : (
                      <span style={{ color: "#666", fontStyle: "italic" }}>No Data</span>
                    )}
                  </td>
                  <td>
                    {workbenchReqs.length > 0 ? (
                      workbenchReqs.map((req, idx) => (
                        <div key={idx}>
                          {req.moduleName} Lv.{req.level} x{req.quantity}
                        </div>
                      ))
                    ) : (
                      <span style={{ color: "#666", fontStyle: "italic" }}>No Data</span>
                    )}
                  </td>
                  <td>
                    {projectReqs.length > 0 ? (
                      projectReqs.map((req, idx) => (
                        <div key={idx}>
                          {req.projectName} Ph.{req.phase} x{req.quantity}
                        </div>
                      ))
                    ) : (
                      <span style={{ color: "#666", fontStyle: "italic" }}>No Data</span>
                    )}
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
          const workbenchReqs = getWorkbenchRequirements(item.id);
          const projectReqs = getProjectRequirements(item.id);
          const highestValue = Math.max(item.value || 0, item.recycleValue || 0, item.salvageValue || 0);

          return (
            <div key={item.id || index} className="mobile-card">
              <div className="card-title">{item.name.en}</div>

              <div className="card-row">
                <span className="card-label">Type:</span>
                <span className="card-value">{item.type}</span>
              </div>

              <div className="card-row">
                <span className="card-label">Rarity:</span>
                <span className={`card-value ${item.rarity ? item.rarity.toLowerCase() : ""}`}>{item.rarity}</span>
              </div>

              <div className="card-row">
                <span className="card-label">Sell/Recycle/Salvage:</span>
                <div className="card-value" style={{ display: "flex", gap: "8px", alignItems: "center", justifyContent: "flex-end" }}>
                  <span
                    style={{
                      color: highestValue > 0 && item.value == highestValue ? "#4CAF50" : "#666",
                      fontWeight: highestValue > 0 && item.value == highestValue ? "bold" : "normal",
                    }}
                  >
                    {item.value !== undefined ? item.value : "-"}
                  </span>
                  <span style={{ color: "#999" }}>/</span>
                  <span
                    style={{
                      color: highestValue > 0 && item.recycleValue == highestValue ? "#4CAF50" : "#666",
                      fontWeight: highestValue > 0 && item.recycleValue == highestValue ? "bold" : "normal",
                    }}
                  >
                    {item.recycleValue}
                  </span>
                  <span style={{ color: "#999" }}>/</span>
                  <span style={{ color: highestValue > 0 && item.salvageValue == highestValue ? "#4CAF50" : "#666", fontWeight: highestValue > 0 && item.salvageValue == highestValue ? "bold" : "normal" }}>{item.salvageValue !== undefined ? item.salvageValue : "-"}</span>
                </div>
              </div>

              <div className="card-row">
                <span className="card-label">Recycle To:</span>
                <div className="card-value">
                  {item.recyclesInto ? (
                    Object.keys(item.recyclesInto).map((recycle: string, idx: number) => {
                      const recycleItem = itemLookup[recycle];
                      const recycleName = recycleItem?.name.en || `Unknown (${recycleItem?.id})`;
                      return (
                        <div key={idx} className={"clickable-item-search"} onClick={() => handleItemClick(recycleName)}>
                          {recycleName} x{item.recyclesInto[recycle as keyof typeof item.recyclesInto]}
                        </div>
                      );
                    })
                  ) : (
                    <span style={{ color: "#666", fontStyle: "italic" }}>No Data</span>
                  )}
                </div>
              </div>

              <div className="card-row">
                <span className="card-label">Salvage To:</span>
                <div className="card-value">
                  {item.salvagesInto ? (
                    Object.keys(item.salvagesInto).map((salvage: string, idx: number) => {
                      const salvageItem = itemLookup[salvage];
                      const salvageName = salvageItem?.name.en || `Unknown (${salvageItem?.id})`;
                      return (
                        <div key={idx} className={"clickable-item-search"} onClick={() => handleItemClick(salvageName)}>
                          {salvageName} x{item.salvagesInto[salvage as keyof typeof item.salvagesInto]}
                        </div>
                      );
                    })
                  ) : (
                    <span style={{ color: "#666", fontStyle: "italic" }}>No Data</span>
                  )}
                </div>
              </div>

              <div className="card-row">
                <span className="card-label">Recycle From:</span>
                <div className="card-value">
                  {Object.keys(item.recycledFrom).length > 0 ? (
                    Object.keys(item.recycledFrom).map((recycle: any, idx: number) => {
                      const recycleItem = itemLookup[recycle];
                      const recycleName = recycleItem?.name.en || `Unknown (${recycleItem?.id})`;
                      return (
                        <div key={idx} className={"clickable-item-search"} onClick={() => handleItemClick(recycleName)}>
                          {recycleName} x{item.recycledFrom[recycle as keyof typeof item.recycledFrom]}
                        </div>
                      );
                    })
                  ) : (
                    <span style={{ color: "#666", fontStyle: "italic" }}>No Data</span>
                  )}
                </div>
              </div>

              <div className="card-row">
                <span className="card-label">Dropped By:</span>
                <div className="card-value">
                  {item.droppedBy && item.droppedBy.length > 0 ? (
                    item.droppedBy
                      .sort((a: any, b: any) => a.name.localeCompare(b.arc))
                      .map((arc: any, idx: number) => {
                        const enemyName = arc?.name || arc?.id || `Unknown (${arc?.id})`;
                        return (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px" }} key={idx}>
                            {enemyName}
                            <div style={{ width: "30px", height: "30px", backgroundImage: `url(${arc.icon})`, backgroundSize: "contain", backgroundRepeat: "no-repeat" }} />
                          </div>
                        );
                      })
                  ) : (
                    <span style={{ color: "#666", fontStyle: "italic" }}>No Data</span>
                  )}
                </div>
              </div>

              <div className="card-row">
                <span className="card-label">Quests:</span>
                <div className="card-value">
                  {questReqs.length > 0 ? (
                    questReqs.map((req, idx) => (
                      <div key={idx}>
                        {req.questName} x{req.quantity}
                      </div>
                    ))
                  ) : (
                    <span style={{ color: "#666", fontStyle: "italic" }}>No Data</span>
                  )}
                </div>
              </div>

              <div className="card-row">
                <span className="card-label">Workbench Upgrades:</span>
                <div className="card-value">
                  {workbenchReqs.length > 0 ? (
                    workbenchReqs.map((req, idx) => (
                      <div key={idx}>
                        {req.moduleName} Lv.{req.level} x{req.quantity}
                      </div>
                    ))
                  ) : (
                    <span style={{ color: "#666", fontStyle: "italic" }}>No Data</span>
                  )}
                </div>
              </div>

              <div className="card-row" style={{ borderBottom: "none" }}>
                <span className="card-label">Projects:</span>
                <div className="card-value">
                  {projectReqs.length > 0 ? (
                    projectReqs.map((req, idx) => (
                      <div key={idx}>
                        {req.projectName} Ph.{req.phase} x{req.quantity}
                      </div>
                    ))
                  ) : (
                    <span style={{ color: "#666", fontStyle: "italic" }}>No Data</span>
                  )}
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
