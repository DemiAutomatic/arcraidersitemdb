import { useState, useMemo, useRef } from "react";
import Items from "../data/items.json";
import Quests from "../data/quests.json";
import Workbenches from "../data/workbenches.json";
import Projects from "../data/projects.json";
import "./App.css";

import { Github, Kofi, Currency } from "../icons";

type RarityType = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";

function App() {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
	const [rarityFilter, setRarityFilter] = useState<RarityType | "All">("All");
	const [typeFilter, setTypeFilter] = useState<string>("All");
	const [sortBy, setSortBy] = useState<"name" | "value" | "rarity">("name");
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
	const searchInputRef = useRef<HTMLInputElement | null>(null);
	const debounceTimer = useRef<number | null>(null);
	const [debouncedSearch, setDebouncedSearch] = useState("");

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchQuery(e.target.value);
		debounceTimer.current && clearTimeout(debounceTimer.current);
		debounceTimer.current = setTimeout(() => {
			setDebouncedSearch(e.target.value);
		}, 200);
	};

	// Get unique types for filter
	const itemTypes = useMemo(() => {
		const types = new Set<string>();
		Items.forEach((item) => {
			if (item.type) types.add(item.type);
		});
		return Array.from(types).sort();
	}, []);

	// Build requirement maps
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
				if (!questMap[req.itemId]) questMap[req.itemId] = [];
				questMap[req.itemId].push({ questName, quantity: req.quantity });
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
							if (!questMap[itemId]) questMap[itemId] = [];
							questMap[itemId].push({ questName, quantity });
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
					if (!workbenchMap[req.itemId]) workbenchMap[req.itemId] = [];
					workbenchMap[req.itemId].push({ moduleName, level: level.level, quantity: req.quantity });
				});
			});
		});

		Projects.forEach((project) => {
			const projectName = project.name.en || project.id;
			project.phases?.forEach((phase) => {
				phase.requirementItemIds?.forEach((req) => {
					if (!projectMap[req.itemId]) projectMap[req.itemId] = [];
					projectMap[req.itemId].push({ projectName, phase: phase.phase, quantity: req.quantity });
				});
			});
		});

		return { questRequirementsMap: questMap, workbenchRequirementsMap: workbenchMap, projectRequirementsMap: projectMap, itemLookup };
	}, []);

	// Filter and sort items
	const filteredItems = useMemo(() => {
		let result = Items.filter((item) => {
			const matchesSearch = (item as any).lowercaseName.includes(debouncedSearch.toLowerCase());
			const matchesRarity = rarityFilter === "All" || item.rarity === rarityFilter;
			const matchesType = typeFilter === "All" || item.type === typeFilter;
			return matchesSearch && matchesRarity && matchesType;
		});

		result.sort((a, b) => {
			let comparison = 0;

			if (sortBy === "name") {
				comparison = a.name.en.localeCompare(b.name.en);
			} else if (sortBy === "value") {
				comparison = (a.value || 0) - (b.value || 0);
			} else if (sortBy === "rarity") {
				const rarityOrder = { Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4 };
				const aOrder = rarityOrder[a.rarity as RarityType] ?? -1;
				const bOrder = rarityOrder[b.rarity as RarityType] ?? -1;
				comparison = aOrder - bOrder;
			}

			return sortDirection === "asc" ? comparison : -comparison;
		});

		return result;
	}, [debouncedSearch, rarityFilter, typeFilter, sortBy, sortDirection]);

	// Get selected items
	const selectedItems = useMemo(() => {
		return selectedItemIds.map((id) => itemLookup[id]).filter(Boolean);
	}, [selectedItemIds, itemLookup]);

	// Helper functions
	const getQuestRequirements = (itemId: string) => questRequirementsMap[itemId] || [];
	const getWorkbenchRequirements = (itemId: string) => workbenchRequirementsMap[itemId] || [];
	const getProjectRequirements = (itemId: string) => projectRequirementsMap[itemId] || [];

	const handleItemSelect = (itemId: string) => {
		setSelectedItemIds((prev) => {
			// If already selected, bring it to the front
			if (prev.includes(itemId)) {
				return prev;
			}
			// Add new item to the selection
			return [...prev, itemId];
		});
	};

	const handleItemRemove = (itemId: string) => {
		setSelectedItemIds((prev) => prev.filter((id) => id !== itemId));
	};

	const handleRelatedItemClick = (itemName: string) => {
		const item = Items.find((i) => i.name.en === itemName);
		if (item) {
			handleItemSelect(item.id);
		}
	};

	const handleClearAll = () => {
		setSelectedItemIds([]);
	};

	const toggleSort = (field: "name" | "value" | "rarity") => {
		if (sortBy === field) {
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			setSortBy(field);
			setSortDirection("asc");
		}
	};

	const clearFilters = () => {
		setSearchQuery("");
		setDebouncedSearch("");
		setRarityFilter("All");
		setTypeFilter("All");
		if (searchInputRef.current) searchInputRef.current.value = "";
	};

	const renderItemValue = (item: any) => {
		const highestValue = Math.max(item.value || 0, item.recycleValue || 0, item.salvageValue || 0);

		return (
			<div className="detail-values">
				<div className="value-row">
					<span className="value-label">Sell</span>
					<span className={`value-amount ${item.value === highestValue && highestValue > 0 ? "best" : ""}`}>
						<Currency style={{ width: "14px", height: "14px" }} />
						{item.value ?? "-"}
					</span>
				</div>
				<div className="value-row">
					<span className="value-label">Recycle</span>
					<span className={`value-amount ${item.recycleValue === highestValue && highestValue > 0 ? "best" : ""}`}>
						<Currency style={{ width: "14px", height: "14px" }} />
						{item.recycleValue ?? "-"}
					</span>
				</div>
				<div className="value-row">
					<span className="value-label">Salvage</span>
					<span className={`value-amount ${item.salvageValue === highestValue && highestValue > 0 ? "best" : ""}`}>
						<Currency style={{ width: "14px", height: "14px" }} />
						{item.salvageValue ?? "-"}
					</span>
				</div>
			</div>
		);
	};

	const renderRelatedItems = (items: Record<string, number | undefined> | undefined, title: string) => {
		if (!items) return null;

		const validEntries = Object.entries(items).filter(([, qty]) => qty !== undefined && qty > 0) as [string, number][];
		if (validEntries.length === 0) return null;

		return (
			<div className="detail-section">
				<h4>{title}</h4>
				<div className="related-items">
					{validEntries.map(([itemId, qty], idx) => {
						const relatedItem = itemLookup[itemId];
						const name = relatedItem?.name?.en || `Unknown`;
						const rarity = relatedItem?.rarity?.toLowerCase() || "";
						return (
							<button key={idx} className={`related-item-chip ${rarity}`} onClick={() => handleRelatedItemClick(name)}>
								{name} <span className="qty">×{qty}</span>
							</button>
						);
					})}
				</div>
			</div>
		);
	};

	const renderDroppedBy = (droppedBy: any[] | undefined) => {
		if (!droppedBy || droppedBy.length === 0) return null;

		return (
			<div className="detail-section">
				<h4>Dropped By</h4>
				<div className="enemy-list">
					{droppedBy
						.sort((a: any, b: any) => a.name.localeCompare(b.name))
						.map((enemy: any, idx: number) => (
							<div key={idx} className="enemy-item">
								{enemy.icon && <img src={enemy.icon} alt={enemy.name} className="enemy-icon" />}
								<span>{enemy.name}</span>
							</div>
						))}
				</div>
			</div>
		);
	};

	const renderRequirements = (itemId: string) => {
		const questReqs = getQuestRequirements(itemId);
		const workbenchReqs = getWorkbenchRequirements(itemId);
		const projectReqs = getProjectRequirements(itemId);

		if (questReqs.length === 0 && workbenchReqs.length === 0 && projectReqs.length === 0) {
			return null;
		}

		return (
			<div className="detail-section">
				<h4>Used For</h4>

				{questReqs.length > 0 && (
					<div className="requirement-group">
						<span className="requirement-type quest">Quests</span>
						<div className="requirement-list">
							{questReqs.map((req, idx) => (
								<div key={idx} className="requirement-item">
									{req.questName} <span className="qty">×{req.quantity}</span>
								</div>
							))}
						</div>
					</div>
				)}

				{workbenchReqs.length > 0 && (
					<div className="requirement-group">
						<span className="requirement-type workbench">Workbench Upgrades</span>
						<div className="requirement-list">
							{workbenchReqs.map((req, idx) => (
								<div key={idx} className="requirement-item">
									{req.moduleName} Lv.{req.level} <span className="qty">×{req.quantity}</span>
								</div>
							))}
						</div>
					</div>
				)}

				{projectReqs.length > 0 && (
					<div className="requirement-group">
						<span className="requirement-type project">Projects</span>
						<div className="requirement-list">
							{projectReqs.map((req, idx) => (
								<div key={idx} className="requirement-item">
									{req.projectName} Ph.{req.phase} <span className="qty">×{req.quantity}</span>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		);
	};

	// Calculate grid layout based on number of items
	const getGridLayout = (count: number) => {
		if (count === 0) return { columns: 1, rows: 1 };
		if (count === 1) return { columns: 1, rows: 1 };
		if (count === 2) return { columns: 2, rows: 1 };
		if (count <= 4) return { columns: 2, rows: 2 };
		if (count <= 6) return { columns: 3, rows: 2 };
		if (count <= 9) return { columns: 3, rows: 3 };
		return { columns: 4, rows: Math.ceil(count / 4) };
	};

	const gridLayout = getGridLayout(selectedItems.length);

	return (
		<div className="app-container">
			{/* Header */}
			<header className="header">
				<div className="header-content">
					<div className="logo-small"></div>
					<h1>Arc Raiders Item Database</h1>
				</div>
				<div className="header-links">
					<a href="https://github.com/DemiAutomatic/arcraidersitemdb" target="_blank" rel="noopener noreferrer" className="header-link" title="GitHub">
						<Github />
					</a>
					<a href="https://ko-fi.com/demiautomatic" target="_blank" rel="noopener noreferrer" className="header-link" title="Support on Ko-fi">
						<Kofi />
					</a>
				</div>
			</header>

			{/* Main Content */}
			<div className="main-content">
				{/* Sidebar / Item List */}
				<aside className="sidebar">
					{/* Search */}
					<div className="search-box">
						<svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<circle cx="11" cy="11" r="8"></circle>
							<path d="m21 21-4.35-4.35"></path>
						</svg>
						<input ref={searchInputRef} type="text" placeholder="Search items..." value={searchQuery} onChange={handleSearchChange} />
						{searchQuery && (
							<button
								className="clear-search"
								onClick={() => {
									setSearchQuery("");
									setDebouncedSearch("");
									if (searchInputRef.current) searchInputRef.current.value = "";
								}}
							>
								×
							</button>
						)}
					</div>

					{/* Filters */}
					<div className="filters">
						<div className="filter-row">
							<label>Rarity</label>
							<select value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value as RarityType | "All")}>
								<option value="All">All Rarities</option>
								<option value="Common">Common</option>
								<option value="Uncommon">Uncommon</option>
								<option value="Rare">Rare</option>
								<option value="Epic">Epic</option>
								<option value="Legendary">Legendary</option>
							</select>
						</div>
						<div className="filter-row">
							<label>Type</label>
							<select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
								<option value="All">All Types</option>
								{itemTypes.map((type) => (
									<option key={type} value={type}>
										{type}
									</option>
								))}
							</select>
						</div>
						{(rarityFilter !== "All" || typeFilter !== "All" || searchQuery) && (
							<button className="clear-filters" onClick={clearFilters}>
								Clear Filters
							</button>
						)}
					</div>

					{/* Sort Options */}
					<div className="sort-options">
						<span className="sort-label">Sort by:</span>
						<button className={`sort-btn ${sortBy === "name" ? "active" : ""}`} onClick={() => toggleSort("name")}>
							Name {sortBy === "name" && (sortDirection === "asc" ? "↑" : "↓")}
						</button>
						<button className={`sort-btn ${sortBy === "value" ? "active" : ""}`} onClick={() => toggleSort("value")}>
							Value {sortBy === "value" && (sortDirection === "asc" ? "↑" : "↓")}
						</button>
						<button className={`sort-btn ${sortBy === "rarity" ? "active" : ""}`} onClick={() => toggleSort("rarity")}>
							Rarity {sortBy === "rarity" && (sortDirection === "asc" ? "↑" : "↓")}
						</button>
					</div>

					{/* Results Count */}
					<div className="results-count">
						{filteredItems.length} {filteredItems.length === 1 ? "item" : "items"} found
						{selectedItems.length > 0 && <span className="selected-count"> • {selectedItems.length} selected</span>}
					</div>

					{/* Item List */}
					<div className="item-list">
						{filteredItems.map((item) => (
							<button key={item.id} className={`item-list-item ${selectedItemIds.includes(item.id) ? "selected" : ""} ${item.rarity?.toLowerCase() || ""}`} onClick={() => handleItemSelect(item.id)}>
								<span className="item-name">{item.name.en}</span>
								<span className="item-meta">
									<span className={`item-rarity ${item.rarity?.toLowerCase() || ""}`}>{item.rarity || "Unknown"}</span>
									{item.value !== undefined && (
										<span className="item-value">
											<Currency style={{ width: "12px", height: "12px" }} />
											{item.value}
										</span>
									)}
								</span>
							</button>
						))}
						{filteredItems.length === 0 && (
							<div className="no-results">
								<p>No items found</p>
								<button onClick={clearFilters}>Clear filters</button>
							</div>
						)}
					</div>
				</aside>

				{/* Detail Panel - Tiling Grid */}
				<main className="detail-panel">
					{selectedItems.length > 0 ? (
						<>
							{/* Clear All Button */}
							{selectedItems.length > 1 && (
								<div className="detail-panel-header">
									<span className="panel-info">{selectedItems.length} items selected</span>
									<button className="clear-all-btn" onClick={handleClearAll}>
										Clear All
									</button>
								</div>
							)}

							{/* Tiling Grid */}
							<div
								className="detail-grid"
								style={{
									gridTemplateColumns: `repeat(${gridLayout.columns}, 1fr)`,
								}}
							>
								{selectedItems.map((item) => (
									<div key={item.id} className="detail-tile">
										<div className="detail-content">
											{/* Item Header */}
											<div className="detail-header">
												<div className="detail-title-row">
													<h2 className={item.rarity?.toLowerCase() || ""}>{item.name.en}</h2>
													<button className="close-detail" onClick={() => handleItemRemove(item.id)} title="Remove">
														×
													</button>
												</div>
												<div className="detail-subtitle">
													<span className="detail-type">{item.type || "Unknown Type"}</span>
													<span className={`detail-rarity ${item.rarity?.toLowerCase() || ""}`}>{item.rarity || "Unknown Rarity"}</span>
												</div>
											</div>

											{/* Values Section */}
											<div className="detail-section">
												<h4>Values</h4>
												{renderItemValue(item)}
											</div>

											{/* Recycles To */}
											{renderRelatedItems(item.recyclesInto, "Recycles Into")}

											{/* Salvages To */}
											{item.salvagesInto && renderRelatedItems(item.salvagesInto, "Salvages Into")}

											{/* Recycled From */}
											{renderRelatedItems(item.recycledFrom, "Obtained by Recycling")}

											{/* Dropped By */}
											{renderDroppedBy(item.droppedBy)}

											{/* Requirements */}
											{renderRequirements(item.id)}
										</div>
									</div>
								))}
							</div>
						</>
					) : (
						<div className="detail-empty">
							<div className="empty-icon">
								<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
									<path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
								</svg>
							</div>
							<h3>Select Items to Compare</h3>
							<p>Click items from the list to view their details</p>
							<p className="hint">Select multiple items to compare them side by side</p>
						</div>
					)}
				</main>
			</div>
		</div>
	);
}

export default App;
