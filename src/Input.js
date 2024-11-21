import { globals } from "./Globals.js"
import * as THREE from '../node_modules/three/src/Three.js';
import * as util from './util';
import * as KeysHeld from './KeysHeld'

const getRelativePoint = (pixel, length, set) => set.start + (pixel / length) * (set.end - set.start);

document.addEventListener("wheel", e => {
	e.preventDefault();
	if(e.button != 0)
		return;

	const WIDTH = window.innerWidth;
	const HEIGHT = window.innerHeight;

	const ZOOM_FACTOR = e.deltaY < 0 ? 0.1 : 1.0;
	const zfw = (WIDTH * ZOOM_FACTOR)
    const zfh = (HEIGHT * ZOOM_FACTOR)

	const m = unproject(e.x, e.y, globals.stateTex.get());

    globals.REAL_SET = {
        start: getRelativePoint(m.x - zfw, WIDTH, globals.REAL_SET),
        end: getRelativePoint(m.x + zfw, WIDTH, globals.REAL_SET)
    }
    globals.IMAGINARY_SET = {
        start: getRelativePoint(m.y - zfh, HEIGHT, globals.IMAGINARY_SET),
        end: getRelativePoint(m.y + zfh, HEIGHT, globals.IMAGINARY_SET)
    }
});


function unproject(x, y, tex) {
	return new THREE.Vector2(x*globals.scale, tex.image.height - 1 - y*globals.scale);
}

function drawLine(p1Projected, p2Projected) {
	const p1 = unproject(p1Projected.x, p1Projected.y, globals.stateTex.get());
	const p2 = unproject(p2Projected.x, p2Projected.y, globals.stateTex.get());
	for(var i = 0; i < 1; i+=0.1/p1.distanceTo(p2)) {
		const p = p1.lerp(p2, i)
		drawCircleToTex(globals.stateTex, p);
	}
}

document.addEventListener("mousemove", e => {
	if((e.buttons & 1) != 0 || (e.buttons & 2) != 0) {
		paintMaterial.color = e.buttons & 1 ? new THREE.Color(1,1,1) : new THREE.Color(0, 0, 0);
		drawLine(new THREE.Vector2(e.x, e.y), new THREE.Vector2(e.x - e.movementX, e.y - e.movementY));
	}
});

var lastTouchPos;

document.addEventListener("touchstart", e => {
	document.getElementById("intro").style.display = "none";
});

document.addEventListener("touchend", e => {
	lastTouchPos = undefined;
});

document.addEventListener("touchmove", e => {
	var t = e.changedTouches[0];
	var pos = new THREE.Vector2(t.clientX, t.clientY);
	if(lastTouchPos === undefined)
		lastTouchPos = pos;
	paintMaterial.color = new THREE.Color(1,1,1);
	drawLine(pos, lastTouchPos);
	lastTouchPos = pos;
});

document.addEventListener("keydown", e => {
	const char = e.code.toLowerCase();
	KeysHeld.global_keysHeld[char] = true;
});

document.addEventListener("keyup", e => {
	const char = e.code.toLowerCase();
	KeysHeld.global_keysHeld[char] = false;
});