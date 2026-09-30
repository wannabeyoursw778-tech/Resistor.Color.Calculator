"use strict";

const COLOR_DATA = {
	black: { name: "Qora", hex: "#111827", digit: 0, multiplier: 1, tolerance: null, temperature: null },
	brown: { name: "Jigarrang", hex: "#7A3E12", digit: 1, multiplier: 10, tolerance: 1, temperature: 100 },
	red: { name: "Qizil", hex: "#DC2626", digit: 2, multiplier: 100, tolerance: 2, temperature: 50 },
	orange: { name: "To‘q sariq", hex: "#EA580C", digit: 3, multiplier: 1000, tolerance: null, temperature: 15 },
	yellow: { name: "Sariq", hex: "#EAB308", digit: 4, multiplier: 10000, tolerance: null, temperature: 25 },
	green: { name: "Yashil", hex: "#16A34A", digit: 5, multiplier: 100000, tolerance: 0.5, temperature: null },
	blue: { name: "Ko‘k", hex: "#2563EB", digit: 6, multiplier: 1000000, tolerance: 0.25, temperature: 10 },
	violet: { name: "Binafsha", hex: "#7C3AED", digit: 7, multiplier: 10000000, tolerance: 0.1, temperature: 5 },
	gray: { name: "Kulrang", hex: "#6B7280", digit: 8, multiplier: 100000000, tolerance: 0.05, temperature: null },
	white: { name: "Oq", hex: "#F8FAFC", digit: 9, multiplier: 1000000000, tolerance: null, temperature: 1 },
	gold: { name: "Oltin", hex: "#D4AF37", digit: null, multiplier: 0.1, tolerance: 5, temperature: null },
	silver: { name: "Kumush", hex: "#A8A8A8", digit: null, multiplier: 0.01, tolerance: 10, temperature: null }
};

const COLOR_ORDER = Object.keys(COLOR_DATA);
const DIGIT_COLORS = COLOR_ORDER.filter((colorId) => COLOR_DATA[colorId].digit !== null);

const MODE_CONFIG = {
	4: {
		count: 4,
		roles: ["firstDigit", "digit", "multiplier", "tolerance"],
		labels: ["1-raqam", "2-raqam", "Ko‘paytiruvchi", "Tolerantlik"],
		defaultNewColor: ["brown", "black", "black", "gold"]
	},
	5: {
		count: 5,
		roles: ["firstDigit", "digit", "digit", "multiplier", "tolerance"],
		labels: ["1-raqam", "2-raqam", "3-raqam", "Ko‘paytiruvchi", "Tolerantlik"],
		defaultNewColor: ["brown", "red", "black", "red", "brown"]
	},
	6: {
		count: 6,
		roles: ["firstDigit", "digit", "digit", "multiplier", "tolerance", "temperature"],
		labels: ["1-raqam", "2-raqam", "3-raqam", "Ko‘paytiruvchi", "Tolerantlik", "Harorat koeffitsienti"],
		defaultNewColor: ["brown", "red", "black", "orange", "brown", "brown"]
	}
};

const DEFAULT_STATE = Object.freeze({ mode: 4, bands: Object.freeze(["yellow", "violet", "red", "gold"]) });
const STATE = { mode: DEFAULT_STATE.mode, bands: [...DEFAULT_STATE.bands] };

const bandControls = document.querySelector("#band-controls");
const resultPanel = document.querySelector(".result-panel");
const modeButtons = [...document.querySelectorAll("[data-mode]")];
const resetButton = document.querySelector("#reset-button");
const resistanceOutput = document.querySelector("#resistance-value");
const exactOutput = document.querySelector("#exact-value");
const toleranceOutput = document.querySelector("#tolerance-value");
const temperatureDetail = document.querySelector("#temperature-detail");
const temperatureOutput = document.querySelector("#temperature-value");
const resistorSvg = document.querySelector("#resistor-svg");
const colorSequence = document.querySelector("#color-sequence");

function getColorData(colorId) {
	return COLOR_DATA[colorId] || null;
}

function getAllowedColors(role) {
	if (role === "firstDigit") {
		return DIGIT_COLORS.filter((colorId) => colorId !== "black");
	}
	if (role === "digit") {
		return DIGIT_COLORS;
	}
	if (role === "multiplier") {
		return COLOR_ORDER.filter((colorId) => COLOR_DATA[colorId].multiplier !== null);
	}
	if (role === "tolerance") {
		return COLOR_ORDER.filter((colorId) => COLOR_DATA[colorId].tolerance !== null);
	}
	if (role === "temperature") {
		return COLOR_ORDER.filter((colorId) => COLOR_DATA[colorId].temperature !== null);
	}
	return [];
}

function getDefaultColor(role, index) {
	const configured = MODE_CONFIG[STATE.mode].defaultNewColor[index];
	if (configured && getAllowedColors(role).includes(configured)) {
		return configured;
	}
	return getAllowedColors(role)[0] || "brown";
}

function validateSelection() {
	const config = MODE_CONFIG[STATE.mode] || MODE_CONFIG[4];
	STATE.mode = config.count;
	STATE.bands.length = config.count;

	config.roles.forEach((role, index) => {
		const allowedColors = getAllowedColors(role);
		if (!allowedColors.includes(STATE.bands[index])) {
			STATE.bands[index] = getDefaultColor(role, index);
		}
	});
}

function calculateResistance() {
	const config = MODE_CONFIG[STATE.mode];
	const digitCount = config.count === 4 ? 2 : 3;
	let significantValue = 0;

	for (let index = 0; index < digitCount; index += 1) {
		significantValue = significantValue * 10 + COLOR_DATA[STATE.bands[index]].digit;
	}

	const multiplierIndex = digitCount;
	return significantValue * COLOR_DATA[STATE.bands[multiplierIndex]].multiplier;
}

function calculateTolerance() {
	const toleranceIndex = MODE_CONFIG[STATE.mode].roles.indexOf("tolerance");
	return COLOR_DATA[STATE.bands[toleranceIndex]].tolerance;
}

function calculateTemperatureCoefficient() {
	return STATE.mode === 6 ? COLOR_DATA[STATE.bands[5]].temperature : null;
}

function formatDisplayNumber(value) {
	if (!Number.isFinite(value)) {
		return "0";
	}
	const stableValue = Number(value.toFixed(6));
	return new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(stableValue);
}

function formatResistance(value) {
	if (!Number.isFinite(value) || value < 0) {
		return "0 Ω";
	}
	if (value < 1000) {
		return `${formatDisplayNumber(value)} Ω`;
	}
	if (value < 1000000) {
		return `${formatDisplayNumber(value / 1000)} kΩ`;
	}
	if (value < 1000000000) {
		return `${formatDisplayNumber(value / 1000000)} MΩ`;
	}
	return `${formatDisplayNumber(value / 1000000000)} GΩ`;
}

function formatOhms(value) {
	if (!Number.isFinite(value) || value < 0) {
		return "0 Ω";
	}
	return `${formatDisplayNumber(value)} Ω`;
}

function safeCalculation() {
	try {
		const resistance = calculateResistance();
		const tolerance = calculateTolerance();
		const temperature = calculateTemperatureCoefficient();
		if (!Number.isFinite(resistance) || resistance < 0 || !Number.isFinite(tolerance)) {
			throw new RangeError("Hisoblash uchun yaroqsiz qiymat");
		}
		if (STATE.mode === 6 && !Number.isFinite(temperature)) {
			throw new RangeError("Harorat koeffitsienti mavjud emas");
		}
		return { resistance, tolerance, temperature };
	} catch {
		STATE.mode = DEFAULT_STATE.mode;
		STATE.bands = [...DEFAULT_STATE.bands];
		return { resistance: 4700, tolerance: 5, temperature: null };
	}
}

function createBandCard(index, role, label) {
	const card = document.createElement("article");
	card.className = "band-card";

	const top = document.createElement("div");
	top.className = "band-card-top";

	const number = document.createElement("span");
	number.className = "band-number";
	number.textContent = `${index + 1}-BAND`;

	const roleLabel = document.createElement("span");
	roleLabel.className = "band-role";
	roleLabel.textContent = label;
	top.append(number, roleLabel);

	const picker = document.createElement("div");
	picker.className = "color-picker";
	picker.dataset.bandIndex = String(index);

	const trigger = document.createElement("button");
	trigger.className = "color-trigger";
	trigger.type = "button";
	trigger.dataset.action = "toggle-dropdown";
	trigger.setAttribute("aria-haspopup", "listbox");
	trigger.setAttribute("aria-expanded", "false");
	trigger.setAttribute("aria-label", `${index + 1}-band: ${label}`);

	const swatch = document.createElement("span");
	swatch.className = "selected-swatch";
	swatch.setAttribute("aria-hidden", "true");
	const selectedName = document.createElement("span");
	selectedName.className = "selected-color-name";
	const chevron = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	chevron.setAttribute("viewBox", "0 0 20 20");
	chevron.setAttribute("aria-hidden", "true");
	chevron.classList.add("dropdown-chevron");
	const chevronPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
	chevronPath.setAttribute("d", "m5 7.5 5 5 5-5");
	chevronPath.setAttribute("fill", "none");
	chevronPath.setAttribute("stroke", "currentColor");
	chevronPath.setAttribute("stroke-width", "1.7");
	chevronPath.setAttribute("stroke-linecap", "round");
	chevronPath.setAttribute("stroke-linejoin", "round");
	chevron.append(chevronPath);
	trigger.append(swatch, selectedName, chevron);

	const listbox = document.createElement("div");
	listbox.className = "color-listbox";
	listbox.id = `band-${index + 1}-listbox`;
	listbox.setAttribute("role", "listbox");
	listbox.setAttribute("aria-label", `${index + 1}-band uchun ${label.toLowerCase()} ranglari`);
	trigger.setAttribute("aria-controls", listbox.id);

	getAllowedColors(role).forEach((colorId) => {
		const color = getColorData(colorId);
		const option = document.createElement("button");
		option.className = "color-option";
		option.type = "button";
		option.dataset.action = "select-color";
		option.dataset.colorId = colorId;
		option.setAttribute("role", "option");
		option.setAttribute("aria-selected", "false");
		option.tabIndex = -1;

		const optionSwatch = document.createElement("span");
		optionSwatch.className = "option-swatch";
		optionSwatch.style.backgroundColor = color.hex;
		optionSwatch.setAttribute("aria-hidden", "true");
		const optionName = document.createElement("span");
		optionName.className = "option-name";
		optionName.textContent = color.name;
		const check = document.createElement("span");
		check.className = "option-check";
		check.setAttribute("aria-hidden", "true");
		check.textContent = "✓";
		option.append(optionSwatch, optionName, check);
		listbox.append(option);
	});

	listbox.hidden = true;
	picker.append(trigger, listbox);
	card.append(top, picker);
	return card;
}

function updateBandControls() {
	const config = MODE_CONFIG[STATE.mode];
	const existingCount = bandControls.children.length;
	if (existingCount !== config.count) {
		bandControls.replaceChildren();
		config.roles.forEach((role, index) => {
			bandControls.append(createBandCard(index, role, config.labels[index]));
		});
	}

	config.roles.forEach((role, index) => {
		const picker = bandControls.querySelector(`[data-band-index="${index}"]`);
		const trigger = picker.querySelector(".color-trigger");
		const color = getColorData(STATE.bands[index]);
		const swatch = trigger.querySelector(".selected-swatch");
		swatch.style.backgroundColor = color.hex;
		trigger.querySelector(".selected-color-name").textContent = color.name;
		trigger.setAttribute("aria-label", `${index + 1}-band: ${config.labels[index]}, ${color.name}`);
		picker.querySelectorAll('[role="option"]').forEach((option) => {
			const selected = option.dataset.colorId === STATE.bands[index];
			option.setAttribute("aria-selected", String(selected));
			option.querySelector(".option-check").textContent = selected ? "✓" : "";
		});
	});
}

function updateResistor() {
	const config = MODE_CONFIG[STATE.mode];
	const positions = config.count === 4
		? [270, 340, 410, 480]
		: config.count === 5
			? [260, 320, 380, 440, 500]
			: [248, 300, 352, 404, 456, 508];
	const widths = config.count === 6 ? 17 : config.count === 5 ? 22 : 28;

	config.roles.forEach((role, index) => {
		const group = document.querySelector(`#resistor-band-${index + 1}`);
		const rect = group.querySelector("rect");
		const color = getColorData(STATE.bands[index]);
		group.style.display = "";
		rect.setAttribute("x", String(positions[index]));
		rect.setAttribute("width", String(widths));
		rect.setAttribute("fill", color.hex);
	});
	for (let index = config.count + 1; index <= 6; index += 1) {
		document.querySelector(`#resistor-band-${index}`).style.display = "none";
	}

	const colorNames = STATE.bands.map((colorId) => COLOR_DATA[colorId].name).join(", ");
	resistorSvg.setAttribute("aria-label", `${config.count} bandli rezistor: ${colorNames}`);
}

function updateResult(result) {
	resistanceOutput.textContent = formatResistance(result.resistance);
	exactOutput.textContent = formatOhms(result.resistance);
	toleranceOutput.textContent = `±${formatDisplayNumber(result.tolerance)}%`;
	temperatureDetail.hidden = STATE.mode !== 6;
	if (STATE.mode === 6) {
		temperatureOutput.textContent = `${formatDisplayNumber(result.temperature)} ppm/K`;
	}

	resultPanel.classList.remove("result-updated");
	void resultPanel.offsetWidth;
	resultPanel.classList.add("result-updated");
}

function updateModeButtons() {
	modeButtons.forEach((button) => {
		const active = Number(button.dataset.mode) === STATE.mode;
		button.classList.toggle("is-active", active);
		button.setAttribute("aria-pressed", String(active));
	});
}

function updateColorSequence() {
	colorSequence.replaceChildren();
	STATE.bands.forEach((colorId, index) => {
		const color = getColorData(colorId);
		const item = document.createElement("li");
		item.className = "sequence-item";
		const swatch = document.createElement("span");
		swatch.className = "sequence-swatch";
		swatch.style.backgroundColor = color.hex;
		swatch.setAttribute("aria-hidden", "true");
		const name = document.createElement("span");
		name.textContent = color.name;
		item.append(swatch, name);
		colorSequence.append(item);
		if (index < STATE.bands.length - 1) {
			const arrowItem = document.createElement("li");
			arrowItem.className = "sequence-arrow";
			arrowItem.setAttribute("aria-hidden", "true");
			arrowItem.textContent = "→";
			colorSequence.append(arrowItem);
		}
	});
}

function updateCalculator() {
	validateSelection();
	const result = safeCalculation();
	updateResistor();
	updateBandControls();
	updateModeButtons();
	updateColorSequence();
	updateResult(result);
}

function closeAllDropdowns(returnFocus = false) {
	bandControls.querySelectorAll(".color-picker.is-open").forEach((picker) => {
		picker.classList.remove("is-open");
		picker.querySelector(".color-trigger").setAttribute("aria-expanded", "false");
		picker.querySelector(".color-listbox").hidden = true;
		picker.querySelector(".color-listbox").removeAttribute("data-placement");
		if (returnFocus) {
			picker.querySelector(".color-trigger").focus();
		}
	});
}

function openDropdown(index, focusSelected = true) {
	closeAllDropdowns();
	const picker = bandControls.querySelector(`[data-band-index="${index}"]`);
	if (!picker) {
		return;
	}
	const trigger = picker.querySelector(".color-trigger");
	const listbox = picker.querySelector(".color-listbox");
	picker.classList.add("is-open");
	trigger.setAttribute("aria-expanded", "true");
	listbox.hidden = false;

	const bounds = trigger.getBoundingClientRect();
	const estimatedHeight = Math.min(listbox.scrollHeight || 280, 280);
	const spaceBelow = window.innerHeight - bounds.bottom;
	listbox.dataset.placement = spaceBelow < estimatedHeight + 12 && bounds.top > estimatedHeight ? "top" : "bottom";

	if (focusSelected) {
		const selectedOption = listbox.querySelector('[aria-selected="true"]');
		(selectedOption || listbox.querySelector("[role=option]")).focus();
	}
}

function selectColor(index, colorId) {
	const role = MODE_CONFIG[STATE.mode].roles[index];
	if (!role || !getAllowedColors(role).includes(colorId)) {
		return;
	}
	STATE.bands[index] = colorId;
	closeAllDropdowns();
	updateCalculator();
	const trigger = bandControls.querySelector(`[data-band-index="${index}"] .color-trigger`);
	trigger.focus();
}

function setMode(mode) {
	const nextMode = Number(mode);
	if (!MODE_CONFIG[nextMode]) {
		return;
	}
	closeAllDropdowns();
	const previousBands = [...STATE.bands];
	STATE.mode = nextMode;
	const config = MODE_CONFIG[nextMode];
	STATE.bands = config.roles.map((role, index) => {
		const previousColor = previousBands[index];
		return getAllowedColors(role).includes(previousColor) ? previousColor : getDefaultColor(role, index);
	});
	updateCalculator();
}

function resetCalculator() {
	closeAllDropdowns();
	STATE.mode = DEFAULT_STATE.mode;
	STATE.bands = [...DEFAULT_STATE.bands];
	updateCalculator();
	resetButton.focus();
}

function handleKeyboardNavigation(event) {
	const trigger = event.target.closest(".color-trigger");
	const option = event.target.closest('[role="option"]');
	const picker = event.target.closest(".color-picker");
	if (!picker) {
		return;
	}

	const options = [...picker.querySelectorAll('[role="option"]')];
	const currentIndex = options.indexOf(option);
	const selectedIndex = Math.max(0, options.findIndex((item) => item.getAttribute("aria-selected") === "true"));
	let nextIndex = currentIndex >= 0 ? currentIndex : selectedIndex;

	if (event.key === "Escape") {
		event.preventDefault();
		closeAllDropdowns(true);
		return;
	}
	if (trigger && ["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) {
		event.preventDefault();
		if (trigger.getAttribute("aria-expanded") === "true") {
			return;
		}
		openDropdown(Number(picker.dataset.bandIndex), false);
		if (event.key === "ArrowDown") {
			nextIndex = selectedIndex;
		} else if (event.key === "ArrowUp") {
			nextIndex = selectedIndex;
		}
		options[nextIndex].focus();
		return;
	}
	if (option && ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
		event.preventDefault();
		if (event.key === "Home") {
			nextIndex = 0;
		} else if (event.key === "End") {
			nextIndex = options.length - 1;
		} else if (event.key === "ArrowDown") {
			nextIndex = (currentIndex + 1) % options.length;
		} else {
			nextIndex = (currentIndex - 1 + options.length) % options.length;
		}
		options[nextIndex].focus();
		return;
	}
	if (option && (event.key === "Enter" || event.key === " ")) {
		event.preventDefault();
		selectColor(Number(picker.dataset.bandIndex), option.dataset.colorId);
	}
}

function closeDropdownOnOutsideClick(event) {
	if (!event.target.closest(".color-picker")) {
		closeAllDropdowns();
	}
}

function initializeCalculator() {
	modeButtons.forEach((button) => {
		button.addEventListener("click", () => setMode(button.dataset.mode));
	});
	resetButton.addEventListener("click", resetCalculator);
	bandControls.addEventListener("click", (event) => {
		const actionTarget = event.target.closest("[data-action]");
		if (!actionTarget) {
			return;
		}
		const picker = actionTarget.closest(".color-picker");
		const index = Number(picker.dataset.bandIndex);
		if (actionTarget.dataset.action === "toggle-dropdown") {
			if (actionTarget.getAttribute("aria-expanded") === "true") {
				closeAllDropdowns();
			} else {
				openDropdown(index);
			}
		} else if (actionTarget.dataset.action === "select-color") {
			selectColor(index, actionTarget.dataset.colorId);
		}
	});
	bandControls.addEventListener("keydown", handleKeyboardNavigation);
	document.addEventListener("pointerdown", closeDropdownOnOutsideClick);
	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape") {
			closeAllDropdowns();
		}
	});
	updateCalculator();
}

initializeCalculator();
