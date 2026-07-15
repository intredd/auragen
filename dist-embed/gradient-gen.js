var GradientGen=(function(u){"use strict";var D=Object.defineProperty;var N=(u,d,h)=>d in u?D(u,d,{enumerable:!0,configurable:!0,writable:!0,value:h}):u[d]=h;var n=(u,d,h)=>N(u,typeof d!="symbol"?d+"":d,h);function d(r){let o=r.replace("#","").trim();o.length===3&&(o=o.split("").map(t=>t+t).join(""));const e=Number.parseInt(o,16);return o.length!==6||Number.isNaN(e)?{r:0,g:0,b:0}:{r:e>>16&255,g:e>>8&255,b:e&255}}function h(r){const{r:o,g:e,b:t}=d(r);return[o/255,e/255,t/255]}const S=`#version 300 es
layout(location = 0) in vec4 a_position;
out vec2 uv;

void main() {
    uv = (a_position.xy + 1.0) * 0.5;
    gl_Position = a_position;
}`,c=16,L=`#version 300 es

precision highp float;

out vec4 out_color;

#define MAX_BLOBS ${c}

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_time_multiplier;
uniform vec3 u_bg_color;
// 0 = layer (paint over), 1 = blend (mix colors)
uniform int u_blend_mode;

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

    if (u_blend_mode == 1) {
        vec3 color = u_bg_color;
        if (blendWeight > 0.0) {
            color = mix(u_bg_color, blendAccum / blendWeight, coverage);
        }
        out_color = vec4(color, 1.0);
    } else {
        out_color = layered;
    }
}`,B=new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),U=Math.PI/180,w={layer:0,blend:1};class M{constructor(){n(this,"canvas",null);n(this,"gl",null);n(this,"program",null);n(this,"quadBuffer",null);n(this,"uniformLocations",new Map);n(this,"posArray",new Float32Array(c*2));n(this,"sizeArray",new Float32Array(c));n(this,"scaleArray",new Float32Array(c));n(this,"angleArray",new Float32Array(c));n(this,"smoothArray",new Float32Array(c));n(this,"cornerArray",new Float32Array(c));n(this,"deformRatioArray",new Float32Array(c));n(this,"deformSpeedArray",new Float32Array(c));n(this,"separationArray",new Float32Array(c));n(this,"colorArray",new Float32Array(c*3));n(this,"bgColor",new Float32Array(3));n(this,"blobCount",0);n(this,"speed",1);n(this,"blendMode",0);n(this,"rafId",null);n(this,"lastTimestamp",0);n(this,"elapsed",0);n(this,"playing",!1)}mount(o){this.canvas=o;const e=o.getContext("webgl2",{preserveDrawingBuffer:!0,premultipliedAlpha:!1});if(!e)throw new Error("WebGL2 is not supported in this browser");this.gl=e;const t=this.compileShader(e.VERTEX_SHADER,S),i=this.compileShader(e.FRAGMENT_SHADER,L),a=e.createProgram();if(!a)throw new Error("Failed to create WebGL program");if(e.attachShader(a,t),e.attachShader(a,i),e.linkProgram(a),!e.getProgramParameter(a,e.LINK_STATUS)){const l=e.getProgramInfoLog(a);throw new Error(`Failed to link WebGL program: ${l??"unknown error"}`)}this.program=a,e.useProgram(a),this.quadBuffer=e.createBuffer(),e.bindBuffer(e.ARRAY_BUFFER,this.quadBuffer),e.bufferData(e.ARRAY_BUFFER,B,e.STATIC_DRAW);const s=e.getAttribLocation(a,"a_position");e.enableVertexAttribArray(s),e.vertexAttribPointer(s,2,e.FLOAT,!1,0,0),this.resize(o.clientWidth,o.clientHeight)}setConfig(o){const e=Math.min(o.blobs.length,c);this.blobCount=e,this.speed=o.global.speed,this.blendMode=w[o.global.blendMode]??0;const[t,i,a]=h(o.global.backgroundColor);this.bgColor[0]=t,this.bgColor[1]=i,this.bgColor[2]=a;for(let s=0;s<e;s+=1){const l=o.blobs[s];this.posArray[s*2]=l.position.x,this.posArray[s*2+1]=l.position.y,this.sizeArray[s]=l.size,this.scaleArray[s]=l.scale,this.angleArray[s]=l.angle*U,this.smoothArray[s]=l.smoothStep,this.cornerArray[s]=l.cornerSmoothing,this.deformRatioArray[s]=l.deformationRatio,this.deformSpeedArray[s]=l.deformationSpeed,this.separationArray[s]=l.separation;const[m,p,G]=h(l.color);this.colorArray[s*3]=m,this.colorArray[s*3+1]=p,this.colorArray[s*3+2]=G}this.uploadConfigUniforms()}resize(o,e,t=window.devicePixelRatio||1){const{gl:i,canvas:a,program:s}=this;if(!i||!a)return;const l=Math.max(1,Math.round(o*t)),m=Math.max(1,Math.round(e*t));if(a.width=l,a.height=m,i.viewport(0,0,l,m),s){i.useProgram(s);const p=this.getUniformLocation("u_resolution");p&&i.uniform2f(p,l,m)}}start(){if(this.rafId!==null)return;this.lastTimestamp=0;const o=e=>{this.tick(e),this.rafId=requestAnimationFrame(o)};this.rafId=requestAnimationFrame(o)}stop(){this.rafId!==null&&(cancelAnimationFrame(this.rafId),this.rafId=null)}play(){this.playing=!0}pause(){this.playing=!1}isPlaying(){return this.playing}renderFrame(){this.draw()}getCanvas(){return this.canvas}dispose(){this.stop();const{gl:o,program:e,quadBuffer:t}=this;o&&(e&&o.deleteProgram(e),t&&o.deleteBuffer(t)),this.uniformLocations.clear(),this.program=null,this.quadBuffer=null,this.gl=null,this.canvas=null}tick(o){this.lastTimestamp===0&&(this.lastTimestamp=o);const e=(o-this.lastTimestamp)/1e3;this.lastTimestamp=o,this.playing&&(this.elapsed+=e),this.draw()}draw(){const{gl:o,program:e}=this;if(!o||!e)return;o.useProgram(e);const t=this.getUniformLocation("u_time");t&&o.uniform1f(t,this.elapsed),o.drawArrays(o.TRIANGLES,0,6)}uploadConfigUniforms(){const{gl:o,program:e}=this;!o||!e||(o.useProgram(e),this.setUniform1i("u_blob_count",this.blobCount),this.setUniform1f("u_time_multiplier",this.speed),this.setUniform1i("u_blend_mode",this.blendMode),this.setUniform3fv("u_bg_color",this.bgColor),this.setUniform2fv("u_blob_pos",this.posArray),this.setUniform1fv("u_blob_size",this.sizeArray),this.setUniform1fv("u_blob_scale",this.scaleArray),this.setUniform1fv("u_blob_angle",this.angleArray),this.setUniform1fv("u_blob_smooth",this.smoothArray),this.setUniform1fv("u_blob_corner",this.cornerArray),this.setUniform1fv("u_blob_deform_ratio",this.deformRatioArray),this.setUniform1fv("u_blob_deform_speed",this.deformSpeedArray),this.setUniform1fv("u_blob_separation",this.separationArray),this.setUniform3fv("u_blob_color",this.colorArray))}setUniform1i(o,e){var i;const t=this.getUniformLocation(o);t&&((i=this.gl)==null||i.uniform1i(t,e))}setUniform1f(o,e){var i;const t=this.getUniformLocation(o);t&&((i=this.gl)==null||i.uniform1f(t,e))}setUniform1fv(o,e){var i;const t=this.getUniformLocation(o);t&&((i=this.gl)==null||i.uniform1fv(t,e))}setUniform2fv(o,e){var i;const t=this.getUniformLocation(o);t&&((i=this.gl)==null||i.uniform2fv(t,e))}setUniform3fv(o,e){var i;const t=this.getUniformLocation(o);t&&((i=this.gl)==null||i.uniform3fv(t,e))}getUniformLocation(o){const{gl:e,program:t}=this;if(!e||!t)return null;if(this.uniformLocations.has(o))return this.uniformLocations.get(o)??null;const i=e.getUniformLocation(t,o);return this.uniformLocations.set(o,i),i}compileShader(o,e){const{gl:t}=this;if(!t)throw new Error("WebGL context is not initialized");const i=t.createShader(o);if(!i)throw new Error("Failed to create shader");if(t.shaderSource(i,e),t.compileShader(i),!t.getShaderParameter(i,t.COMPILE_STATUS)){const a=t.getShaderInfoLog(i);throw t.deleteShader(i),new Error(`Failed to compile shader: ${a??"unknown error"}`)}return i}}function x(){return new M}const _=4,z=16;function E(){return typeof crypto<"u"&&"randomUUID"in crypto?crypto.randomUUID():`blob-${Math.random().toString(36).slice(2,10)}`}const y={position:{x:.5,y:.5},size:.35,scale:1,angle:0,smoothStep:.5,cornerSmoothing:.5,deformationRatio:3,deformationSpeed:.4,separation:.1,color:"#6a5cff"};function b(r={}){return{...y,...r,position:{...y.position,...r.position},id:E()}}const g={backgroundColor:"#1b0b2e",speed:.5,blendMode:"layer"};function C(){const r={smoothStep:.5,cornerSmoothing:.55,deformationRatio:3.5,separation:.18,deformationSpeed:.6};return{version:_,global:{backgroundColor:"#030a18",speed:.5,blendMode:"blend"},blobs:[b({...r,position:{x:.32,y:.55},size:.26,scale:2.4,angle:20,color:"#17e6a0"}),b({...r,position:{x:.55,y:.5},size:.22,scale:2.2,angle:160,color:"#4dff7a"}),b({...r,position:{x:.7,y:.6},size:.24,scale:2.6,angle:30,separation:.2,color:"#7a5cff"})]}}function R(r){const o=r.replace(/-/g,"+").replace(/_/g,"/"),e=o.length%4===0?"":"=".repeat(4-o.length%4);return atob(o+e)}function f(r,o){return typeof r=="number"&&Number.isFinite(r)?r:o}function v(r,o){return typeof r=="string"?r:o}const F=["layer","blend"];function O(r,o){return typeof r.blendMode=="string"&&F.includes(r.blendMode)?r.blendMode:typeof r.colorBlend=="boolean"?r.colorBlend?"blend":"layer":o}function T(r){const o=b(),e=typeof r=="object"&&r!==null?r:{},t=typeof e.position=="object"&&e.position!==null?e.position:{};return{...o,position:{x:f(t.x,o.position.x),y:f(t.y,o.position.y)},size:f(e.size,o.size),scale:f(e.scale,o.scale),angle:f(e.angle,o.angle),smoothStep:f(e.smoothStep,o.smoothStep),cornerSmoothing:f(e.cornerSmoothing,o.cornerSmoothing),deformationRatio:f(e.deformationRatio,o.deformationRatio),deformationSpeed:f(e.deformationSpeed,o.deformationSpeed),separation:f(e.separation,o.separation),color:v(e.color,o.color)}}function I(r){const o=typeof r=="object"&&r!==null?r:{};return{backgroundColor:v(o.backgroundColor,g.backgroundColor),speed:f(o.speed,g.speed),blendMode:O(o,g.blendMode)}}function k(r){if(typeof r!="object"||r===null)return null;const o=r;return!Array.isArray(o.blobs)||o.blobs.length===0?null:{version:_,blobs:o.blobs.slice(0,z).map(T),global:I(o.global)}}function P(r){try{return k(JSON.parse(R(r)))}catch{return null}}class A extends HTMLElement{constructor(){super(...arguments);n(this,"renderer",null);n(this,"canvas",null);n(this,"resizeObserver",null)}static get observedAttributes(){return["preset","autoplay"]}connectedCallback(){this.style.display||(this.style.display="block"),this.style.position||(this.style.position="relative");const e=document.createElement("canvas");e.style.width="100%",e.style.height="100%",e.style.display="block",this.appendChild(e),this.canvas=e;const t=x();t.mount(e),this.renderer=t,this.applyPreset(),this.getAttribute("autoplay")!=="false"&&t.play(),t.start(),this.resizeObserver=new ResizeObserver(()=>this.resize()),this.resizeObserver.observe(this),this.resize()}disconnectedCallback(){var e,t;(e=this.resizeObserver)==null||e.disconnect(),this.resizeObserver=null,(t=this.renderer)==null||t.dispose(),this.renderer=null,this.canvas&&(this.canvas.remove(),this.canvas=null)}attributeChangedCallback(e){this.renderer&&(e==="preset"?this.applyPreset():e==="autoplay"&&(this.getAttribute("autoplay")==="false"?this.renderer.pause():this.renderer.play()))}applyPreset(){if(!this.renderer)return;const e=this.getAttribute("preset"),t=e&&P(e)||C();this.renderer.setConfig(t)}resize(){if(!this.renderer)return;const e=this.clientWidth||300,t=this.clientHeight||150;this.renderer.resize(e,t)}}return typeof customElements<"u"&&!customElements.get("gradient-gen")&&customElements.define("gradient-gen",A),u.GradientGenElement=A,Object.defineProperty(u,Symbol.toStringTag,{value:"Module"}),u})({});
