/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useRef, useEffect, MutableRefObject } from 'react';
import { CameraData } from '../types';

interface ShaderCanvasProps {
  fragmentSrc: string;
  onError: (error: string) => void;
  uniforms: { [key: string]: number };
  cameraRef?: MutableRefObject<CameraData>;
  isHdEnabled: boolean;
  isFpsEnabled: boolean;
  isPlaying: boolean;
  shouldReduceQuality: boolean;
}

const VERTEX_SHADER_SRC = `#version 300 es
  in vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const compileShader = (gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | string => {
  const shader = gl.createShader(type);
  if (!shader) return 'Could not create shader';
  
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    return `Shader compilation error:\n${error}`;
  }
  
  return shader;
};

const createProgram = (gl: WebGL2RenderingContext, vs: WebGLShader, fs: WebGLShader): WebGLProgram | string => {
  const program = gl.createProgram();
  if (!program) return 'Could not create program';
  
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const error = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    return `Program linking error:\n${error}`;
  }
  
  return program;
};


export const ShaderCanvas: React.FC<ShaderCanvasProps> = React.memo(({ fragmentSrc, onError, uniforms, cameraRef, isHdEnabled, isFpsEnabled, isPlaying, shouldReduceQuality }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fpsRef = useRef<HTMLDivElement>(null);
  
  const uniformsRef = useRef(uniforms);
  // Only update if reference changes to avoid unnecessary writes in render loop if it was already current
  if (uniformsRef.current !== uniforms) {
      uniformsRef.current = uniforms;
  }
  
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const isHdEnabledRef = useRef(isHdEnabled);
  isHdEnabledRef.current = isHdEnabled;
  const shouldReduceQualityRef = useRef(shouldReduceQuality);
  shouldReduceQualityRef.current = shouldReduceQuality;
  const isFpsEnabledRef = useRef(isFpsEnabled);
  isFpsEnabledRef.current = isFpsEnabled;

  // OPTIMIZATION: Cache previously uploaded uniform values to avoid redundant WebGL calls.
  const uniformCacheRef = useRef<{ [key: string]: number | number[] }>({});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const gl = canvas.getContext('webgl2', { 
        preserveDrawingBuffer: false,
        alpha: false,
        depth: false,
        stencil: false,
        antialias: false,
        powerPreference: 'high-performance',
        desynchronized: true
    });
    if (!gl) {
      onError('WebGL 2 is not supported on this browser.');
      return;
    }

    const generateUniformDeclarations = (uniformsToDeclare: { [key: string]: number }): string => {
        return Object.entries(uniformsToDeclare).map(([name, value]) => {
             return `uniform float ${name};`;
        }).join('\n');
    };

    const fragmentTemplate = `#version 300 es
      precision highp float;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec3 u_cameraPosition;
      uniform vec2 u_cameraRotation;
      uniform float u_cameraRoll;
      uniform vec3 u_explosions[8];
      uniform vec3 u_explosionColors[8];
      ${generateUniformDeclarations(uniformsRef.current)}
      out vec4 outColor;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      mat3 rotate3D(float angle, vec3 axis){
        vec3 a = normalize(axis);
        float s = sin(angle);
        float c = cos(angle);
        float r = 1.0 - c;
        return mat3(
            a.x * a.x * r + c,
            a.y * a.x * r + a.z * s,
            a.z * a.x * r - a.y * s,
            a.x * a.y * r - a.z * s,
            a.y * a.y * r + c,
            a.z * a.y * r + a.x * s,
            a.x * a.z * r + a.y * s,
            a.y * a.z * r - a.x * s,
            a.z * a.z * r + c
        );
      }

      void main() {
        vec4 o = vec4(0.0, 0.0, 0.0, 1.0);
        vec2 r = u_resolution;
        float t = u_time;
        vec3 FC = gl_FragCoord.xyz;
        ${fragmentSrc};
        
        // --- GPU Shader Canvas Explosions Overlay ---
        vec2 uv = FC.xy / r.xy;
        for (int i = 0; i < 8; i++) {
          vec3 exp = u_explosions[i];
          float age = exp.z;
          if (age > 0.0 && age < 1.0) {
            vec2 center = exp.xy;
            vec3 col = u_explosionColors[i];
            float aspect = r.x / r.y;
            vec2 diff = uv - center;
            diff.x *= aspect;
            float dist = length(diff);

            // Expanding Shockwave Ring
            float ringRadius = age * 0.22;
            float ringWidth = 0.012 * (1.1 - age);
            float ringIntensity = smoothstep(ringWidth, 0.0, abs(dist - ringRadius));
            o.rgb += col * ringIntensity * (1.0 - age) * 4.5;

            // 16 outward flying particles
            for (int p_idx = 0; p_idx < 16; p_idx++) {
              float angle = float(p_idx) * 6.28318 / 16.0;
              float p_hash = hash(vec2(float(p_idx), float(i)));
              float speed = 0.18 + 0.32 * p_hash;
              float p_dist = age * speed;
              vec2 p_coord = vec2(cos(angle), sin(angle)) * p_dist;
              p_coord.x /= aspect;
              float sparkSize = 0.007 * (1.0 - age);
              float d_spark = length(uv - (center + p_coord));
              o.rgb += col * smoothstep(sparkSize, 0.0, d_spark) * (1.0 - age) * 4.0;
            }

            // Core Flare
            float coreIntensity = smoothstep(0.05 * (1.0 - age), 0.0, dist);
            o.rgb += col * coreIntensity * (1.0 - age) * 2.0;
          }
        }

        outColor = o;
      }
    `;

    const vsResult = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    if (typeof vsResult === 'string') { onError(vsResult); return; }
    const vs = vsResult;

    const fsResult = compileShader(gl, gl.FRAGMENT_SHADER, fragmentTemplate);
    if (typeof fsResult === 'string') { gl.deleteShader(vs); onError(fsResult); return; }
    const fs = fsResult;
    
    const programResult = createProgram(gl, vs, fs);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (typeof programResult === 'string') { onError(programResult); return; }
    const program = programResult;
    
    const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
    const resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');
    const timeUniformLocation = gl.getUniformLocation(program, 'u_time');
    const cameraPosLocation = gl.getUniformLocation(program, 'u_cameraPosition');
    const cameraRotLocation = gl.getUniformLocation(program, 'u_cameraRotation');
    const cameraRollLocation = gl.getUniformLocation(program, 'u_cameraRoll');
    const explosionsLocation = gl.getUniformLocation(program, 'u_explosions');
    const explosionColorsLocation = gl.getUniformLocation(program, 'u_explosionColors');
    
    const uniformLocations: { [key: string]: WebGLUniformLocation | null } = {};
    for (const uniformName of Object.keys(uniformsRef.current)) {
        uniformLocations[uniformName] = gl.getUniformLocation(program, uniformName);
    }

    uniformCacheRef.current = {};

    // --- GPU Particle Explosions Management ---
    let activeExplosions: Array<{
      x: number;
      y: number;
      age: number;
      speed: number;
      color: [number, number, number];
    }> = [];

    const handleExplosionEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;

      let rgb: [number, number, number] = [0.13, 0.82, 0.93]; // Default cyan
      if (detail.color) {
        const cleanHex = detail.color.replace('#', '');
        const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
        const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
        const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
          rgb = [r, g, b];
        }
      }

      const x_uv = detail.x / 100;
      const y_uv = 1.0 - (detail.y / 100);

      if (activeExplosions.length >= 8) {
        activeExplosions.shift();
      }
      activeExplosions.push({
        x: x_uv,
        y: y_uv,
        age: 0.05,
        speed: 1.8, // Completes particle animation in ~0.5 seconds
        color: rgb
      });
    };

    window.addEventListener('cyber-explosion', handleExplosionEvent);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    gl.useProgram(program);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    onError("");

    let animationFrameId: number;
    let accumulatedTime = 0;
    let lastTimestamp = 0;
    let frameCount = 0;
    let lastFpsUpdate = 0;

    const render = (timestamp: number) => {
      if (lastTimestamp === 0) lastTimestamp = timestamp;
      const deltaTime = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      if (isPlayingRef.current) {
        accumulatedTime += deltaTime;
      }

      let scale = isHdEnabledRef.current ? 1.0 : 0.5;
      if (isHdEnabledRef.current && shouldReduceQualityRef.current) {
          scale = 0.65; 
      }

      const displayWidth = Math.floor(canvas.clientWidth * scale);
      const displayHeight = Math.floor(canvas.clientHeight * scale);

      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      }

      gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
      gl.uniform1f(timeUniformLocation, accumulatedTime * 0.001);

      // OPTIMIZATION: Directly read camera state from the mutable ref
      if (cameraRef && cameraRef.current) {
          gl.uniform3fv(cameraPosLocation, cameraRef.current.position);
          gl.uniform2fv(cameraRotLocation, cameraRef.current.rotation);
          gl.uniform1f(cameraRollLocation, cameraRef.current.roll);
      }

      // Animate and upload active target explosions
      activeExplosions.forEach(exp => {
        exp.age += deltaTime * 0.001 * exp.speed;
      });
      activeExplosions = activeExplosions.filter(exp => exp.age < 1.0);

      const explosionData = new Float32Array(24); // 8 vec3s (x, y, age)
      const explosionColors = new Float32Array(24); // 8 vec3s (r, g, b)

      activeExplosions.forEach((exp, idx) => {
        if (idx < 8) {
          explosionData[idx * 3] = exp.x;
          explosionData[idx * 3 + 1] = exp.y;
          explosionData[idx * 3 + 2] = exp.age;

          explosionColors[idx * 3] = exp.color[0];
          explosionColors[idx * 3 + 1] = exp.color[1];
          explosionColors[idx * 3 + 2] = exp.color[2];
        }
      });

      if (explosionsLocation) {
        gl.uniform3fv(explosionsLocation, explosionData);
      }
      if (explosionColorsLocation) {
        gl.uniform3fv(explosionColorsLocation, explosionColors);
      }

      // Slider uniforms
      const currentUniforms = uniformsRef.current;
      const cache = uniformCacheRef.current;

      for (const name in currentUniforms) {
          const value = currentUniforms[name];
          const location = uniformLocations[name];

          if (location !== null) {
               if (cache[name] !== value) {
                   gl.uniform1f(location, value);
                   cache[name] = value;
               }
          }
      }

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      
      if (isFpsEnabledRef.current) {
        frameCount++;
        if (timestamp - lastFpsUpdate >= 500) {
            const fps = Math.round((frameCount * 1000) / (timestamp - lastFpsUpdate));
            if (fpsRef.current) {
                fpsRef.current.textContent = `${fps} FPS`;
            }
            lastFpsUpdate = timestamp;
            frameCount = 0;
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('cyber-explosion', handleExplosionEvent);
      gl.deleteProgram(program);
      gl.deleteBuffer(positionBuffer);
    };
  }, [fragmentSrc, onError, cameraRef]);

  return (
    <>
        <canvas 
            ref={canvasRef} 
            className="absolute top-0 left-0 w-full h-full"
            style={{
                imageRendering: isHdEnabled && shouldReduceQuality ? 'pixelated' : 'auto' 
            }}
        />
        {isFpsEnabled && (
            <div 
                ref={fpsRef}
                className="fixed bottom-2 right-2 z-30 pointer-events-none bg-black/60 backdrop-blur-sm text-green-400 font-mono text-xs px-2 py-1 rounded border border-green-900/50 shadow-sm"
            >
                -- FPS
            </div>
        )}
    </>
  );
});
