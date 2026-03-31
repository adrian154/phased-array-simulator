#version 300 es

precision highp float;

#define PI 3.1415926538
#define WAVE_SPEED 50.0
#define SOURCE_RADIUS 5.0

uniform vec2 inResolution;
uniform float inTime;
uniform float inFreq;
uniform float inSeparation;
uniform int inSourceCount;

out vec4 outColor;

void main() {

    // compute some wave properties
    float wl = WAVE_SPEED / inFreq;
    float k = 2.0*PI / wl;
    float phi = inFreq * 2.0 * PI;

    // accumulate contribution from sources
    float waveVal = 0.0;
    float circleAlpha = 0.0;
    float arrayWidth = inSeparation * float(inSourceCount-1);
    for(int i = 0; i < inSourceCount; i++) {

        vec2 sourcePos = vec2(
            inResolution.x/2.0 + float(i)*inSeparation - arrayWidth/2.0,
            inResolution.y/2.0
        );

        float dist = distance(sourcePos, gl_FragCoord.xy);
        waveVal += cos(dist*k - inTime*phi) / float(inSourceCount);
        circleAlpha += 1.0 - smoothstep(SOURCE_RADIUS, SOURCE_RADIUS + 1.0, dist);
    
    }

    outColor = (1.0 - circleAlpha) * vec4(waveVal, 0, -waveVal, 1) + circleAlpha * vec4(1,1,0,1);

}