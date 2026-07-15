export const MAX_BLOBS = 16;

export const fragmentShaderSource = `#version 300 es

precision highp float;

out vec4 out_color;

#define MAX_BLOBS ${MAX_BLOBS}

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_time_multiplier;
uniform vec3 u_bg_color;
uniform bool u_color_blend;

uniform int u_blob_count;
uniform vec2  u_blob_pos[MAX_BLOBS];
uniform float u_blob_size[MAX_BLOBS];
uniform float u_blob_scale[MAX_BLOBS];
uniform float u_blob_angle[MAX_BLOBS];        // radians
uniform float u_blob_smooth[MAX_BLOBS];
uniform float u_blob_corner[MAX_BLOBS];
uniform float u_blob_deform_ratio[MAX_BLOBS];
uniform float u_blob_deform_speed[MAX_BLOBS];
uniform float u_blob_separation[MAX_BLOBS];
uniform vec3  u_blob_color[MAX_BLOBS];

// Random noise
float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// Smooth (value) noise
float smoothNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = noise(i);
    float b = noise(i + vec2(1.0, 0.0));
    float c = noise(i + vec2(0.0, 1.0));
    float d = noise(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Soft-edged, time-deformed blob.
float blob(
    vec2 uv,
    vec2 center,
    float size,
    float angle,
    float scale_x,
    float smooth_step,
    float corner,
    float deform_ratio,
    float deform_speed,
    float separation,
    float aspect,
    float t
) {
    vec2 p = uv - center;
    p = vec2(p.x, p.y / aspect);

    p = vec2(
        p.x * cos(angle) - p.y * sin(angle),
        p.x * sin(angle) + p.y * cos(angle)
    );

    p = vec2(p.x / scale_x, p.y);

    float r = length(p);

    float deformation = smoothNoise(p * deform_ratio + t * deform_speed * vec2(1.0, 0.75)) * separation;
    float radius = size + deformation;

    float smoothEdge = exp(-r * r * corner);
    return smoothEdge * smoothstep(radius, radius - smooth_step, r);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    uv.y = 1.0 - uv.y;
    float aspect = u_resolution.x / u_resolution.y;
    float t = u_time * u_time_multiplier;

    // Layered ("over") result and the accumulators for the blended result are
    // both computed in one pass; the mode just picks which to output.
    vec4 layered = vec4(u_bg_color, 1.0);
    vec3 blendAccum = vec3(0.0);
    float blendWeight = 0.0;
    float coverage = 0.0;

    for (int i = 0; i < MAX_BLOBS; i++) {
        if (i >= u_blob_count) break;

        float shape = blob(
            uv,
            u_blob_pos[i],
            u_blob_size[i],
            u_blob_angle[i],
            u_blob_scale[i],
            u_blob_smooth[i],
            u_blob_corner[i],
            u_blob_deform_ratio[i],
            u_blob_deform_speed[i],
            u_blob_separation[i],
            aspect,
            t
        );

        layered = mix(layered, vec4(u_blob_color[i], 1.0), shape);

        blendAccum += u_blob_color[i] * shape;
        blendWeight += shape;
        // Union of coverage so overlaps don't over-darken toward the background.
        coverage = coverage + shape - coverage * shape;
    }

    if (u_color_blend) {
        vec3 color = u_bg_color;
        if (blendWeight > 0.0) {
            color = mix(u_bg_color, blendAccum / blendWeight, coverage);
        }
        out_color = vec4(color, 1.0);
    } else {
        out_color = layered;
    }
}`;
