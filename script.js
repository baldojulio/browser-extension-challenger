"use strict";

const $ = (id) => document.getElementById(id);
const elements = {
	GRID_ELEMENT: $("grid"),
	TOOGLE_THEME: $("toggle-theme-btn"),
	BODY: document.body,
	FILTER_ACTIVE: $("filter-active"),
	FILTER_INACTIVE: $("filter-inactive"),
	FILTER_ALL: $("filter-all"),
};

let array_extensions;

document.addEventListener("DOMContentLoaded", function () {
	// Register service worker for caching (bfcache-friendly)
	if ("serviceWorker" in navigator) {
		navigator.serviceWorker
			.register("./sw.js", {
				updateViaCache: "none",
			})
			.catch((err) => console.log("Service worker registration failed", err));
	}

	// Handle page lifecycle for bfcache
	const handlePageShow = (event) => {
		if (event.persisted) {
			// Page was restored from bfcache, refresh data if needed
			loadExtensions();
		}
	};

	window.addEventListener("pageshow", handlePageShow);

	// Load the extensions
	loadExtensions();
	loadTheme();
});

function loadExtensions() {
	// Create stable placeholder layout to prevent shifts
	const placeholderHTML = Array(9)
		.fill()
		.map(
			(_, index) => `
		<div class="extension-placeholder" style="min-height: 160px; background: var(--neutral-100); border-radius: 16px; border: 1px solid hsl(220, 20%, 90%); padding: 16px;">
			<div style="display: flex; gap: 12px; margin-bottom: 32px;">
				<div style="width: 48px; height: 48px; background: hsl(220, 20%, 85%); border-radius: 8px; flex-shrink: 0;"></div>
				<div style="flex: 1;">
					<div style="height: 20px; background: hsl(220, 20%, 85%); border-radius: 4px; margin-bottom: 8px; width: 60%;"></div>
					<div style="height: 14px; background: hsl(220, 20%, 90%); border-radius: 4px; width: 90%;"></div>
				</div>
			</div>
			<div style="display: flex; justify-content: space-between; align-items: center;">
				<div style="width: 70px; height: 32px; background: hsl(220, 20%, 85%); border-radius: 10px;"></div>
				<div style="width: 44px; height: 24px; background: hsl(220, 20%, 85%); border-radius: 24px;"></div>
			</div>
		</div>
	`
		)
		.join("");

	elements.GRID_ELEMENT.innerHTML = placeholderHTML;

	fetchData().then(function (data) {
		if (data && data.length > 0) {
			array_extensions = data;
			renderHTML(array_extensions);
		} else {
			elements.GRID_ELEMENT.innerHTML = `<div style="text-align: center; padding: 40px;"><p>No extensions found</p></div>`;
		}
	});
}

async function fetchData() {
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 3000);

		const response = await fetch("./data.json", {
			signal: controller.signal,
			cache: "force-cache",
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		return data;
	} catch (error) {
		console.error("Failed to fetch extensions:", error);
		// Return fallback data to prevent critical chain failure
		return [];
	}
}

function renderHTML(data) {
	if (data) {
		const gridData = data
			.map(function (extension, index) {
				return `<div id="extension" data-index="${index}">
            <div class="extension-info">
              <img src="${
								extension.logo
							}" alt="${extension.name} logo" width="48" height="48" loading="lazy" decoding="async">
              <div>
                <h2>${extension.name}</h2>
                <p class="extension-description">${extension.description}</p>
              </div>
            </div>
            <div class="extension-options">
              <button class="remove-btn" type="button" data-index="${index}" aria-label="Remove ${extension.name} extension">Remove</button>
              
              <label class="switch" aria-label="Toggle ${
								extension.name
							} extension">
                <input type="checkbox" ${
									extension.isActive ? "checked" : ""
								} aria-label="Enable or disable ${extension.name}">
                <span class="slider"></span>
              </label>
            </div>
          </div>`;
			})
			.join("");

		elements.GRID_ELEMENT.innerHTML = gridData;
	} else {
		elements.GRID_ELEMENT.innerHTML = `<p>Error when trying to fetch data</p>`;
	}
}

function loadTheme() {
	const THEME = localStorage.getItem("theme");
	elements.BODY.setAttribute("data-theme", THEME || "");
}

elements.TOOGLE_THEME.addEventListener("click", function () {
	const THEME = localStorage.getItem("theme");

	if (THEME === "dark") {
		elements.BODY.setAttribute("data-theme", "");
		localStorage.setItem("theme", "");
	} else {
		elements.BODY.setAttribute("data-theme", "dark");
		localStorage.setItem("theme", "dark");
	}
});

let currentFilter = "all";

function filterExtensions(filterType) {
	if (!array_extensions) return;

	let filtered;

	switch (filterType) {
		case "active":
			filtered = array_extensions.filter((ext) => ext.isActive);
			break;
		case "inactive":
			filtered = array_extensions.filter((ext) => !ext.isActive);
			break;
		case "all":
			filtered = array_extensions;
			break;
	}

	renderHTML(filtered);
	updateActiveFilterButton(filterType);
}

const updateActiveFilterButton = (activeFilter) => {
	[
		elements.FILTER_ALL,
		elements.FILTER_ACTIVE,
		elements.FILTER_INACTIVE,
	].forEach((btn) => btn.classList.remove("active"));
	const target =
		activeFilter === "active"
			? elements.FILTER_ACTIVE
			: activeFilter === "inactive"
			? elements.FILTER_INACTIVE
			: elements.FILTER_ALL;
	target.classList.add("active");
};

elements.FILTER_ALL.addEventListener("click", () => filterExtensions("all"));
elements.FILTER_ACTIVE.addEventListener("click", () =>
	filterExtensions("active")
);
elements.FILTER_INACTIVE.addEventListener("click", () =>
	filterExtensions("inactive")
);

elements.GRID_ELEMENT.addEventListener("click", function (event) {
	if (event.target.classList.contains("remove-btn")) {
		const index = parseInt(event.target.getAttribute("data-index"));
		removeExt(index);
	}
});

function removeExt(index) {
	array_extensions.splice(index, 1);
	renderHTML(array_extensions);
}
