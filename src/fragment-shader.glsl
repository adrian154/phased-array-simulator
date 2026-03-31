#version 300 es

precision highp float;

uniform vec2 inResolution;
uniform float inTime;

out vec4 outColor;

void main() {
    //outColor = vec4(gl_FragCoord.x/50.0, 0, 1, 1);
    float sinTime = (sin(inTime)+1.0)/2.0;
    outColor = vec4(
        sin(gl_FragCoord.x * 4.0 / inResolution.x) + sinTime,
        sin(gl_FragCoord.y * 4.0 / inResolution.y) - sinTime,
        0,
        1
    );
}