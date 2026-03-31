const mainCanvas = document.getElementById("main-view"),
      gl = mainCanvas.getContext("webgl2");

// warn user if webgl not available
// TODO

// phased array parameters
const WAVELENGTH = 30;
let separation = 1; // measured in wavelengths

// webgl objects
let glReady = false;
const glUniforms = {
    resolution: null,
    time: null
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
    glUniforms.resolution = gl.getUniformLocation(program, "inResolution");
    glUniforms.time = gl.getUniformLocation(program, "inTime");
    glReady = true;

};

const renderFields = (time) => {
    gl.uniform2f(glUniforms.resolution, gl.canvas.width, gl.canvas.height);
    gl.uniform1f(glUniforms.time, time);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
};

gl.canvas.width = 500;
gl.canvas.height = 500;

let timeStart = Date.now();
const draw = () => {
    if(glReady) {
        const time = (Date.now() - timeStart) / 1000;
        renderFields(time);
    }
    requestAnimationFrame(draw);
};

setupWebgl();
draw();