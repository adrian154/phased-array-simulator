#version 300 es

precision highp float;

#define PI 3.1415926538
#define WAVE_SPEED 50.0
#define SOURCE_RADIUS 3.0

uniform vec2 inResolution;
uniform float inTime;
uniform float inFreq;
uniform float inSeparation;
uniform float inPointAngle;
uniform int inSourceCount;
uniform int inPlotMagnitude;

out vec4 outColor;

void main() {

    // compute some wave properties
    float wl = WAVE_SPEED / inFreq;
    float k = 2.0*PI / wl;
    float omega = inFreq * 2.0 * PI;
    float separation = inSeparation * wl;

    // compute phasor
    float phasor_real = 0.0, phasor_imag = 0.0;
    float circleAlpha = 0.0;
    float phase_advance = cos(inPointAngle) * separation * k;

    for(int i = 0; i < inSourceCount; i++) {

        vec2 sourcePos = vec2(
            inResolution.x/2.0 + separation*(float(i) - float(inSourceCount) / 2.0),
            inResolution.y/2.0
        );

        float dist = distance(sourcePos, gl_FragCoord.xy);
        circleAlpha += 1.0 - smoothstep(SOURCE_RADIUS, SOURCE_RADIUS + 1.0, dist);
        phasor_real += cos(-dist*k + phase_advance*float(i)) / float(inSourceCount);
        phasor_imag += sin(-dist*k + phase_advance*float(i)) / float(inSourceCount);
        
    }

    vec4 circleColor = vec4(1, 1, 0, 1);
    if(bool(inPlotMagnitude)) {
        float magnitude = sqrt(phasor_imag*phasor_imag + phasor_real*phasor_real);
        outColor = (1.0 - circleAlpha) * vec4(0, magnitude, 0, 1) + circleAlpha * circleColor;
    } else {
        float osc_real = cos(omega*inTime);
        float osc_imag = sin(omega*inTime);
        float waveVal = (osc_real * phasor_real - osc_imag * phasor_imag);
        outColor = (1.0 - circleAlpha) * vec4(waveVal, 0, -waveVal, 1) + circleAlpha * circleColor;
    }

}