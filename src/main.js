const mainCanvas = document.getElementById("main-view"),
      gl = mainCanvas.getContext("webgl2");

const radPatternCanvas = document.getElementById("rad-pattern"),
      ctx = radPatternCanvas.getContext("2d");

const sourceCountSlider = document.getElementById("source-count");
const separationSlider = document.getElementById("separation");
const pointingAngleSlider = document.getElementById("pointing-angle");
const plotMagnitudeButton = document.getElementById("plot-magnitude");
const plotRadPatternButton = document.getElementById("plot-rad-pattern");

const sourceCountDisplay = document.getElementById("source-count-display");
const separationDisplay = document.getElementById("separation-display");
const pointingAngleDisplay = document.getElementById("pointing-angle-display");
const directivityDisplay = document.getElementById("directivity");
const hpbwDisplay = document.getElementById("hpbw");

if(!gl) {
    alert("WebGL not available :(");
}

// add entries to datalist
const datalist = document.getElementById("separation-steplist");
for(let i = 0; i <= separationSlider.max; i += 0.25) {
    const option = document.createElement("option");
    option.value = i;
    datalist.append(option);
}

// phased array parameters
let waveFrequency = 3;
let sourceCount = null;
let separation = null;
let pointingAngle = null;

// resize canvas
const resizeCanvas = () => {
    const rect = mainCanvas.getBoundingClientRect();
    mainCanvas.width = rect.width * window.devicePixelRatio;
    mainCanvas.height = rect.height * window.devicePixelRatio;
    radPatternCanvas.width = mainCanvas.width;
    radPatternCanvas.height = mainCanvas.height;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
};

// webgl objects
let glReady = false;
const glUniforms = {
    resolution: {name: "inResolution"},
    time: {name: "inTime"},
    frequency: {name: "inFreq"},
    sourceCount: {name: "inSourceCount"},
    separation: {name: "inSeparation"},
    plotMagnitude: {name: "inPlotMagnitude"},
    pointingAngle: {name: "inPointAngle"},
    brightness: {name: "inBrightness"}
};

const makeShader = async (url, type) => {

    // fetch source
    const resp = await fetch(url);
    const src = await resp.text();

    // compile shader
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if(gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        return shader;
    }

    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(info);

};

const setupWebgl = async () => {

    // compile shaders
    const fragmentShader = await makeShader("fragment-shader.glsl", gl.FRAGMENT_SHADER);
    const vertexShader = await makeShader("vertex-shader.glsl", gl.VERTEX_SHADER);

    // make program
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw new Error(info);
    }

    // set up position buffer for 2 triangles
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
        -1, 1,
        1, 1,
        -1, -1,
        1, -1,
        1, 1
    ]), gl.STATIC_DRAW);

    // setup vertex properties
    const positionAttr = gl.getAttribLocation(program, "inPosition");
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.enableVertexAttribArray(positionAttr);
    gl.vertexAttribPointer(positionAttr, 2, gl.FLOAT, false, 0, 0);

    // define viewport and enable program
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.useProgram(program);

    // lookup uniform locations
    for(const uniform in glUniforms) {
        glUniforms[uniform].attr = gl.getUniformLocation(program, glUniforms[uniform].name);
    }
    glReady = true;

};

const renderFields = (time) => {
    gl.uniform2f(glUniforms.resolution.attr, gl.canvas.width, gl.canvas.height);
    gl.uniform1f(glUniforms.time.attr, time);
    gl.uniform1f(glUniforms.frequency.attr, waveFrequency);
    gl.uniform1i(glUniforms.sourceCount.attr, sourceCount);
    gl.uniform1f(glUniforms.separation.attr, separation);
    gl.uniform1i(glUniforms.plotMagnitude.attr, plotMagnitudeButton.checked);
    gl.uniform1f(glUniforms.pointingAngle.attr, pointingAngle);
    gl.uniform1f(glUniforms.brightness.attr, 100);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
};

const handleInput = () => {
    
    // read inputs
    sourceCount = sourceCountSlider.value;
    separation = separationSlider.value;
    pointingAngle = pointingAngleSlider.value / 180 * Math.PI;

    // update readouts
    sourceCountDisplay.textContent = sourceCount;
    separationDisplay.textContent = `${Number(separation).toFixed(2)}\u03bb`;
    pointingAngleDisplay.textContent = `${Number(pointingAngleSlider.value).toFixed(2)}\u00b0`;

    calcRadPattern();
    
};

const calcRadPattern = () => {

    ctx.clearRect(0, 0, radPatternCanvas.width, radPatternCanvas.height);
    ctx.strokeStyle = "#0084ff";
    ctx.lineWidth = 2;

    const steeringPhase = Math.cos(pointingAngle) * separation * 2 * Math.PI;
    const sourceAmplitude = 1/sourceCount;

    const points = 1000;
    const intensity = new Array(1000);
    const radius = 0.8 * Math.min(mainCanvas.width, mainCanvas.height)/2;
    for(let i = 0; i < points; i++) {
        
        const angle = i/points * 2*Math.PI;
        let phasorReal = 0, phasorImag = 0;

        for(let source = 0; source < sourceCount; source++) {
            const sourceX = separation*(source - sourceCount / 2);
            const phase = steeringPhase*source + Math.cos(angle)*sourceX*2*Math.PI;
            phasorReal += sourceAmplitude * Math.cos(phase);
            phasorImag += sourceAmplitude * Math.sin(phase);
        }

        const magnitude = Math.sqrt(phasorReal**2 + phasorImag**2);
        intensity[i] = magnitude**2;

    }

    if(plotRadPatternButton.checked) {
        ctx.beginPath();
        for(let i = 0; i < points; i++) {
            const magnitude = Math.sqrt(intensity[i]);
            const angle = i/points * 2 * Math.PI;
            const x = radPatternCanvas.width / 2 + Math.cos(angle) * magnitude * radius;
            const y = radPatternCanvas.height / 2 + Math.sin(angle) * magnitude * radius;
            if(i == 0)
                ctx.moveTo(x, y);
            else
                ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    const avgIntensity = intensity.reduce((a, b) => a + b, 0) / intensity.length;
    const maxIntensity = Math.max(...intensity);
    const maxDirectivity = maxIntensity/avgIntensity;
    directivityDisplay.textContent = (10*Math.log10(maxDirectivity)).toFixed(1);

    // find direction of max directivity; determine HPBW
    const maxDirectivityIdx = intensity.indexOf(maxIntensity);
    let hpbwSteps = 0;
    for(let range = 1; range < points; range++) {
        const i_left = (maxDirectivityIdx - range + points) % points;
        const inext_left = (maxDirectivityIdx - range - 1 + points) % points;
        const i_right = (maxDirectivityIdx + range) % points;
        const inext_right = (maxDirectivityIdx + range + 1) % points;
        if(intensity[i_left] >= maxIntensity/2 && intensity[inext_left] < maxIntensity/2 ||
           intensity[i_right] >= maxIntensity/2 && intensity[inext_right] < maxIntensity/2) {
            hpbwSteps = range;
            break;
        }
    }

    if(hpbwSteps) {
        const hpbwDeg = hpbwSteps/points * 360;
        hpbwDisplay.textContent = Math.round(hpbwDeg);
    } else {
        hpbwDisplay.textContent = "\u2014";
    }

};

let timeStart = Date.now();
const draw = () => {

    if(glReady) {
        const time = (Date.now() - timeStart) / 1000;
        renderFields(time);
    }

    requestAnimationFrame(draw);

};

// ensure canvas always is appropriately sized
resizeCanvas();
const resizeObserver = new ResizeObserver(() => {
    requestAnimationFrame(resizeCanvas);
});
resizeObserver.observe(mainCanvas);

// handle inputs
handleInput();
sourceCountSlider.addEventListener("input", handleInput);
separationSlider.addEventListener("input", handleInput);
pointingAngleSlider.addEventListener("input", handleInput);
plotRadPatternButton.addEventListener("input", handleInput);

setupWebgl();
draw();