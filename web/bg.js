const DOT_COLOR_LIGHT_MODE = "#dce0e8";
const DOT_COLOR_DARK_MODE = "#45475a";
const devicePixelRatio = window.devicePixelRatio || 1;
const DOT_RADIUS = 1 * devicePixelRatio;

const canvas = document.getElementById("bg");
const ctx = canvas.getContext("2d");

let mouseX = -1; // initialize to -1 so no mouse position
let mouseY = -1;
let dotColor = DOT_COLOR_LIGHT_MODE;

// Math.sqrt((nx - x) ** 2 + (ny - y) ** 2) <= radius + 0.5;
// if (dx * dx + dy * dy < Math.sqrt(Math.floor(radius)) + 3.14) {
// Math.sqrt((x - nx) ** 2 + (y - ny) ** 2) <= radius + 0.5

function resizeCanvas(width, height) {
	canvas.style.width = `${width}px`;
	canvas.style.height = `${height}px`;
	canvas.width = width * devicePixelRatio;
	canvas.height = height * devicePixelRatio;
	imageData = ctx.createImageData(canvas.width, canvas.height);
	clearCanvas();
}

function clearCanvas() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	imageData = ctx.createImageData(canvas.width, canvas.height); // Reset image data
}

let imageData = [];

function drawDot(x, y) {
	// Calculate the distance from the mouse cursor
	const cursorDistance = Math.sqrt((x - mouseX) ** 2 + (y - mouseY) ** 2);
	const effectRadius = 100; // Maximum radius of effect

	// Calculate the dynamic radius based on distance to create the "fading out" effect
	let radius =
		DOT_RADIUS +
		2 *
			devicePixelRatio *
			((effectRadius - Math.min(cursorDistance, effectRadius)) /
				effectRadius);

	const red = parseInt(dotColor.slice(1, 3), 16);
	const green = parseInt(dotColor.slice(3, 5), 16);
	const blue = parseInt(dotColor.slice(5, 7), 16);

	const radiusCeil = Math.ceil(radius);
	const radiusSquared = radius * radius;
	const radiusCS = Math.ceil(radius) ** 2;
	// radius = Math.max(radiusCeil, );
	// console.log(radius, radiusCeil, radiusSquared); 2.7790927796562546 3 7.723356677937527

	// Iterate through a bounding box around the circle
	for (let dx = -radiusCeil; dx <= radiusCeil; dx++) {
		for (let dy = -radiusCeil; dy <= radiusCeil; dy++) {
			// Check if the point is within the circle using squared distance
			if (dx * dx + dy * dy <= radiusSquared) {
				const nx = (x + dx) | 0; // New x position
				const ny = (y + dy) | 0; // New y position
				// console.log(radius, radiusCeil, radiusSquared);
				// Check if the new position is within the canvas boundaries
				// nx >= 0 && nx < canvas.width && ny >= 0 && ny < canvas.height;
				// Calculate the index in ImageData array

				const index = (ny * canvas.width + nx) * 4;
				const distanceSquared = dx * dx + dy * dy;
				const distanceFromCenter = Math.round(
					Math.sqrt(distanceSquared)
				);
				const maxDistance = radiusSquared;

				// Ensure pixels near the edge are dimmed without fully fading out too quickly
				const alpha =
					255 *
					Math.max(
						0,
						(maxDistance - distanceFromCenter) / maxDistance
					); // Slightly adjusted gradient

				// Set the pixel color to the dot color
				imageData.data[index] = red;
				imageData.data[index + 1] = green;
				imageData.data[index + 2] = blue;
				imageData.data[index + 3] = alpha; // alpha
			}
		}
	}
	// ctx.beginPath();
	// ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
	// ctx.fillStyle = dotColor;
	// ctx.fill();
}

function drawPattern() {
	clearCanvas();
	for (let x = 0; x < canvas.width; x += 10 * devicePixelRatio) {
		for (let y = 0; y < canvas.height; y += 10 * devicePixelRatio) {
			drawDot(x, y);
		}
	}
	if (imageData) ctx.putImageData(imageData, 0, 0);
}

let resizing = false;
window.addEventListener("resize", () => {
	if (!resizing) {
		resizing = true;
		requestAnimationFrame(() => {
			resizeCanvas(window.innerWidth, window.innerHeight);
			drawPattern();
			resizing = false;
		});
	}
});

let mouseMoved = false;
window.addEventListener("mousemove", (event) => {
	mouseX = event.clientX * devicePixelRatio;
	mouseY = event.clientY * devicePixelRatio;
	if (!mouseMoved) {
		mouseMoved = true;
		requestAnimationFrame(() => {
			drawPattern();
			mouseMoved = false;
		});
	}
});

window.addEventListener("mouseleave", () => {
	mouseX = -1;
	mouseY = -1;
	clearCanvas();
});

if (window.matchMedia) {
	const query = window.matchMedia("(prefers-color-scheme: dark)");
	dotColor = query.matches ? DOT_COLOR_DARK_MODE : DOT_COLOR_LIGHT_MODE;

	query.addEventListener("change", (event) => {
		dotColor = event.matches ? DOT_COLOR_DARK_MODE : DOT_COLOR_LIGHT_MODE;
		drawPattern();
	});
}

resizeCanvas(window.innerWidth, window.innerHeight);
drawPattern();
