// --- INITIAL STATE & DATA ---
let specimens = [];
let artifacts = [];
let rotationOffset = 0;
let imageOffsetX = 0;
let imageOffsetY = 0;
let currentAngle = 0;
let targetAngle = 0;
const radius = 300;

// --- STORAGE: extension (chrome.storage) or static site (localStorage) ---
const hasChromeStorage = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
function storageGet(keys, callback) {
    if (hasChromeStorage) {
        chrome.storage.local.get(keys, callback);
    } else {
        const result = {};
        keys.forEach(k => {
            try {
                const raw = localStorage.getItem(k);
                if (raw != null) result[k] = JSON.parse(raw);
            } catch (_) {}
        });
        callback(result);
    }
}
function storageSet(obj, callback) {
    if (hasChromeStorage) {
        chrome.storage.local.set(obj, callback || (() => {}));
    } else {
        Object.keys(obj).forEach(k => {
            try { localStorage.setItem(k, JSON.stringify(obj[k])); } catch (_) {}
        });
        if (callback) callback();
    }
}

function applyImageOffsets() {
    const layer = document.getElementById('artifact-layer');
    if (layer) layer.style.transform = `translate(${imageOffsetX}px, ${imageOffsetY}px)`;
}

// --- INITIALIZATION FROM STORAGE ---
storageGet(['archiveSites', 'compassOffset', 'archiveArtifacts', 'imageOffsetX', 'imageOffsetY', 'darkMode'], (result) => {
    // 1. Load Website Specimens
    specimens = result.archiveSites || [
        { name: "GitHub", url: "https://github.com" },
        { name: "YouTube", url: "https://youtube.com" },
        { name: "Godot Engine", url: "https://godotengine.org" }
    ];

    // 2. Load Calibration Offset
    rotationOffset = result.compassOffset || 0;
    const slider = document.getElementById('offset-slider');
    if (slider) slider.value = rotationOffset;

    // 2b. Load Image Offsets
    imageOffsetX = result.imageOffsetX ?? 0;
    imageOffsetY = result.imageOffsetY ?? 0;
    const ix = document.getElementById('image-offset-x');
    const iy = document.getElementById('image-offset-y');
    if (ix) { ix.value = imageOffsetX; }
    if (iy) { iy.value = imageOffsetY; }
    const vx = document.getElementById('image-offset-x-val');
    const vy = document.getElementById('image-offset-y-val');
    if (vx) vx.textContent = imageOffsetX;
    if (vy) vy.textContent = imageOffsetY;
    applyImageOffsets();

    // 3. Load Artifact Catalog (ensure each has offsetX, offsetY)
    const raw = result.archiveArtifacts || [
        { src: "", rot: 0 }, { src: "", rot: 0 }, 
        { src: "", rot: 0 }, { src: "", rot: 0 }
    ];
    artifacts = raw.map(a => ({
        src: a.src ?? "",
        rot: a.rot ?? 0,
        offsetX: a.offsetX ?? 0,
        offsetY: a.offsetY ?? 0
    }));

    const darkMode = !!result.darkMode;
    document.body.classList.toggle('dark-mode', darkMode);
    const darkToggle = document.getElementById('dark-mode-toggle');
    if (darkToggle) darkToggle.checked = darkMode;

    renderAll();
});

// --- RENDER ENGINE ---
function renderAll() {
    const uiLayer = document.getElementById('ui-layer');
    const specList = document.getElementById('specimen-list');
    const artList = document.getElementById('artifact-list');
    
    // Clear dynamic UI layers
    uiLayer.innerHTML = '';
    specList.innerHTML = '';
    if (artList) artList.innerHTML = '';

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    // Render Radial Labels and Link Manager
    specimens.forEach((item, i) => {
        const angle = (i / specimens.length) * Math.PI * 2 - Math.PI / 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        const linkX = centerX + Math.cos(angle) * radius * .9;
        const linkY = centerY + Math.sin(angle) * radius * .8;
        // Create the floating label
        const label = document.createElement('div');
        label.className = 'specimen-label';
        label.style.left = `${linkX}px`; label.style.top = `${linkY}px`;
        label.innerHTML = `<span class="fig-num">FIG. ${i + 1}</span><span class="site-name">${item.name}</span>`;
        
        // Needle Tracking: Snap to target angle on hover
        label.onmouseenter = () => targetAngle = (angle * 180 / Math.PI) + 90;
        label.onclick = () => window.location.href = item.url;
        uiLayer.appendChild(label);

        // Populate Specimen Manager in hidden menu
        const div = document.createElement('div');
        div.className = 'manager-item';
        div.innerHTML = `
            <input type="text" class="name-in" value="${item.name}" style="width: 80px">
            <input type="text" class="url-in" value="${item.url}" style="width: 170px">
            <button class="btn del-btn" style="color:#a33">×</button>
        `;
        div.querySelector('.name-in').oninput = (e) => updateSpecimen(i, 'name', e.target.value);
        div.querySelector('.url-in').oninput = (e) => updateSpecimen(i, 'url', e.target.value);
        div.querySelector('.del-btn').onclick = () => removeSpecimen(i);
        specList.appendChild(div);
    });

    // Render Artifact Images and Catalog Manager
    artifacts.forEach((art, i) => {
        const img = document.getElementById(`art-${i}`);
        if (img) {
            if (art.src && art.src !== "") {
                img.src = art.src;
                img.style.display = "block";
                const ox = art.offsetX ?? 0, oy = art.offsetY ?? 0;
                img.style.transform = `translate(${ox}px, ${oy}px) rotate(${art.rot}deg)`;
            } else {
                img.style.display = "none";
            }
        }

        // Populate Artifact Catalog in hidden menu (with per-image position offsets)
        if (artList) {
            const div = document.createElement('div');
            div.className = 'manager-item';
            div.innerHTML = `
                <label style="font-size:0.5rem; width:22px;">#${i+1}</label>
                <input type="text" class="art-src" value="${art.src}" placeholder="src" style="width:95px">
                <input type="number" class="art-rot" value="${art.rot}" style="width:38px" title="rot">
                <input type="number" class="art-offset-x" value="${art.offsetX ?? 0}" style="width:38px" title="X">
                <input type="number" class="art-offset-y" value="${art.offsetY ?? 0}" style="width:38px" title="Y">
            `;
            div.querySelector('.art-src').oninput = (e) => updateArtifact(i, 'src', e.target.value);
            div.querySelector('.art-rot').oninput = (e) => updateArtifact(i, 'rot', e.target.value);
            div.querySelector('.art-offset-x').oninput = (e) => updateArtifact(i, 'offsetX', e.target.value);
            div.querySelector('.art-offset-y').oninput = (e) => updateArtifact(i, 'offsetY', e.target.value);
            artList.appendChild(div);
        }
    });
}

// --- UPDATE & STORAGE LOGIC ---
function updateSpecimen(i, field, val) {
    specimens[i][field] = val;
    storageSet({ archiveSites: specimens });
    const labels = document.querySelectorAll('.specimen-label .site-name');
    if(labels[i] && field === 'name') labels[i].innerText = val;
}

function updateArtifact(i, field, val) {
    const art = artifacts[i];
    if (field === 'rot' || field === 'offsetX' || field === 'offsetY') {
        art[field] = Number(val) || 0;
    } else {
        art[field] = val;
    }
    storageSet({ archiveArtifacts: artifacts });
    const img = document.getElementById(`art-${i}`);
    if (img) {
        if (field === 'src') {
            img.src = val;
            img.style.display = (val === "") ? "none" : "block";
        }
        const ox = art.offsetX ?? 0, oy = art.offsetY ?? 0;
        img.style.transform = `translate(${ox}px, ${oy}px) rotate(${art.rot ?? 0}deg)`;
    }
}

function addSpecimen() {
    specimens.push({name:"NEW_INDEX", url:"https://"});
    storageSet({ archiveSites: specimens }, renderAll);
}

function removeSpecimen(i) {
    specimens.splice(i,1);
    storageSet({ archiveSites: specimens }, renderAll);
}

// --- INTERACTION LISTENERS ---
document.getElementById('add-btn').onclick = addSpecimen;

document.getElementById('dark-mode-toggle').onchange = (e) => {
    const on = !!e.target.checked;
    storageSet({ darkMode: on });
    document.body.classList.toggle('dark-mode', on);
};

document.getElementById('offset-slider').oninput = (e) => {
    rotationOffset = parseFloat(e.target.value);
    storageSet({ compassOffset: rotationOffset });
};

document.getElementById('image-offset-x').oninput = (e) => {
    imageOffsetX = parseInt(e.target.value, 10);
    storageSet({ imageOffsetX });
    const v = document.getElementById('image-offset-x-val');
    if (v) v.textContent = imageOffsetX;
    applyImageOffsets();
};
document.getElementById('image-offset-y').oninput = (e) => {
    imageOffsetY = parseInt(e.target.value, 10);
    storageSet({ imageOffsetY });
    const v = document.getElementById('image-offset-y-val');
    if (v) v.textContent = imageOffsetY;
    applyImageOffsets();
};

window.addEventListener('keydown', (e) => {
    if (e.key === '~' || e.key === '`') {
        const m = document.getElementById('calibration-menu');
        m.style.display = m.style.display === 'block' ? 'none' : 'block';
    }
});

// Precise Mouse Tracking (2D Angle Calculation)
window.addEventListener('mousemove', (e) => {
    const hovered = document.querySelector('.specimen-label:hover');
    if (!hovered) {
        const dx = e.clientX - window.innerWidth / 2;
        const dy = e.clientY - window.innerHeight / 2;
        // The +90 aligns the needle's tip to the mouse
        targetAngle = (Math.atan2(dy, dx) * 180 / Math.PI) + 90;
    }
});

// --- ANIMATION LOOP (Dampened Movement) ---
function animate() {
    requestAnimationFrame(animate);

    // Shortest-path rotation math to prevent 360-degree spinning jitters
    const finalTarget = targetAngle + rotationOffset;
    let diff = finalTarget - currentAngle;
    while (diff < -180) diff += 360;
    while (diff > 180) diff -= 360;
    
    currentAngle += diff * 0.15; // Smoothness factor (0.1 to 0.2 is best)
    
    const needle = document.getElementById('needle-group');
    if (needle) {
        needle.style.transform = `rotate(${currentAngle}deg)`;
    }
}

// Ensure the search bar is ready for input immediately
window.onload = () => {
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.focus();

    function drawCompassTicks() {
    const tickLayer = document.getElementById('tick-layer');
    if (!tickLayer) return;

    // We draw 72 ticks (one every 5 degrees) for a clean, scientific look
    for (let i = 0; i < 360; i += 5) {
        const isMajor = i % 10 === 0; // Longer line every 10 degrees
        const tickLength = isMajor ? 6 : 3;
        const innerRadius = 54;
        
        // Math to find the start and end of the line on a circle
        const angleRad = (i - 90) * (Math.PI / 180);
        
        const x1 = 100 + innerRadius * Math.cos(angleRad);
        const y1 = 100 + innerRadius * Math.sin(angleRad);
        const x2 = 100 + (innerRadius + tickLength) * Math.cos(angleRad);
        const y2 = 100 + (innerRadius + tickLength) * Math.sin(angleRad);

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        
        // Direct styling to ensure they show up
        line.setAttribute("stroke", "#0072b0");
        line.setAttribute("stroke-width", isMajor ? "0.8" : "0.55");
        line.setAttribute("opacity", isMajor ? "0.4" : "0.38");
        
        tickLayer.appendChild(line);
    }
}

// Call the function immediately
drawCompassTicks();

    initMatrixRain();
};

// --- MATRIX SIDE RAIN (subtle 0/1) ---
function initMatrixRain() {
    const canvas = createMatrixCanvas();
    const rain = new MatrixRain(canvas, { fontSize: 11, speedPxPerSec: 110, fpsCap: 45 });
    rain.start();

    window.addEventListener('resize', () => rain.resize());
}

function createMatrixCanvas() {
    const canvas = document.createElement('canvas');
    canvas.className = 'matrix-rain';
    document.body.appendChild(canvas);
    return canvas;
}

class MatrixRain {
    constructor(canvas, opts) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: true });
        this.opts = opts;
        this.lastT = 0;
        this.accum = 0;
        this.running = false;
        this.drops = [];
        this.chars = ['0', '1'];
        this.stackLen = 6;
        this.resize();
    }

    resize() {
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = Math.floor(rect.width * dpr);
        this.canvas.height = Math.floor(window.innerHeight * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.ctx.imageSmoothingEnabled = false;

        const cols = Math.max(1, Math.floor(rect.width / this.opts.fontSize));
        if (this.drops.length !== cols) {
            this.drops = Array.from({ length: cols }, () => ({
                y: Math.random() * window.innerHeight,
                stack: Array.from({ length: this.stackLen }, () => this.chars[(Math.random() * this.chars.length) | 0]),
            }));
        }
    }

    start() {
        this.running = true;
        this.lastT = performance.now();
        requestAnimationFrame((t) => this.tick(t));
    }

    tick(t) {
        if (!this.running) return;

        const dt = Math.min(0.05, (t - this.lastT) / 1000);
        this.lastT = t;
        const frameInterval = 1 / this.opts.fpsCap;
        this.accum += dt;
        if (this.accum >= frameInterval) {
            this.accum = 0;
            this.draw(dt);
        }

        requestAnimationFrame((nt) => this.tick(nt));
    }

    draw(dt) {
        const ctx = this.ctx;
        const w = this.canvas.getBoundingClientRect().width;
        const h = window.innerHeight;

        // No trail / blur: fully clear each frame for crisp digits
        ctx.clearRect(0, 0, w, h);

        ctx.font = `${this.opts.fontSize}px Courier New, monospace`;
        ctx.textBaseline = 'top';

        const xStep = this.opts.fontSize;
        for (let i = 0; i < this.drops.length; i++) {
            const drop = this.drops[i];

            drop.y += this.opts.speedPxPerSec * dt;
            if (drop.y > h + this.opts.fontSize * 2) {
                drop.y = -Math.random() * 200;
                // Re-randomize only when a column respawns (no per-frame flicker)
                drop.stack = Array.from({ length: this.stackLen }, () => this.chars[(Math.random() * this.chars.length) | 0]);
            }

            // Denser look: draw a short vertical stack per column
            for (let k = 0; k < this.stackLen; k++) {
                const y = Math.round(drop.y - k * (this.opts.fontSize * 1.05));
                if (y < -this.opts.fontSize * 2) continue;

                const alpha = Math.max(0.16, 0.62 - k * 0.08);
                ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;

                ctx.fillText(drop.stack[k] ?? '0', Math.round(i * xStep), y);
            }
        }
    }
}



// Start the engine
renderAll();
animate();



// Re-calculate layout if user resizes the window
window.addEventListener('resize', renderAll);