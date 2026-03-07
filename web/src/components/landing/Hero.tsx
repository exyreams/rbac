import { ArrowRight } from "lucide-react";
import { useEffect, useRef } from "react";

export default function Hero() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const heroRef = useRef<HTMLElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const gl = canvas.getContext("webgl", { antialias: false });
		if (!gl) {
			console.error("WebGL not supported");
			return;
		}

		const vsSource = `
      attribute vec4 aVertexPosition;
      void main() {
          gl_Position = aVertexPosition;
      }
    `;

		const fsSource = `
      precision highp float;

      uniform vec2 u_resolution;
      uniform float u_time;
      uniform float u_isRecording;

      // Palette - Updated to Navy monochromatic
      const vec3 bg_color = vec3(0.02, 0.05, 0.10); // #050D1A
      const vec3 dot_color1 = vec3(0.04, 0.14, 0.34); // #0A2456
      const vec3 dot_color2 = vec3(0.30, 0.56, 1.0); // #4D8FFF
      
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

      float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439); 
          vec2 i  = floor(v + dot(v, C.yy) );
          vec2 x0 = v - i + dot(i, C.xx);
          vec2 i1;
          i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m*m ;
          m = m*m ;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
          vec3 g;
          g.x  = a0.x  * x0.x  + h.x  * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
      }

      void main() {
          vec2 st = gl_FragCoord.xy / u_resolution.xy;
          st.x *= u_resolution.x / u_resolution.y;

          float gridDensity = 60.0; 
          vec2 grid_st = fract(st * gridDensity);
          vec2 grid_id = floor(st * gridDensity);

          vec2 noise_pos = grid_id / gridDensity;
          float speed = mix(0.015, 0.1, u_isRecording);
          float noise_val = snoise(noise_pos * 2.5 + u_time * speed);
          float wave = sin(noise_val * 8.0 - u_time * 0.5);
          float size = smoothstep(-1.0, 1.0, wave) * 0.85;
          
          vec2 bl = step(vec2(0.5 - size/2.0), grid_st);
          vec2 tr = step(vec2(0.5 - size/2.0), 1.0 - grid_st);
          float is_dot = bl.x * bl.y * tr.x * tr.y * 0.45;

          vec3 final_color = bg_color;
          if (is_dot > 0.0) {
              float color_mix = snoise(noise_pos * 4.0 - u_time * 0.2) * 0.5 + 0.5;
              vec3 dot_col = mix(dot_color1, dot_color2, color_mix);
              final_color = mix(bg_color, dot_col, 0.45);
          }

          gl_FragColor = vec4(final_color, 1.0);
      }
    `;

		function loadShader(
			gl: WebGLRenderingContext,
			type: number,
			source: string,
		) {
			const shader = gl.createShader(type);
			if (!shader) return null;
			gl.shaderSource(shader, source);
			gl.compileShader(shader);

			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				console.error(
					"An error occurred compiling the shaders: " +
						gl.getShaderInfoLog(shader),
				);
				gl.deleteShader(shader);
				return null;
			}
			return shader;
		}

		function initShaderProgram(
			gl: WebGLRenderingContext,
			vs: string,
			fs: string,
		) {
			const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vs);
			const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fs);
			if (!vertexShader || !fragmentShader) return null;

			const shaderProgram = gl.createProgram();
			if (!shaderProgram) return null;

			gl.attachShader(shaderProgram, vertexShader);
			gl.attachShader(shaderProgram, fragmentShader);
			gl.linkProgram(shaderProgram);

			if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
				console.error(
					"Unable to initialize the shader program: " +
						gl.getProgramInfoLog(shaderProgram),
				);
				return null;
			}
			return shaderProgram;
		}

		const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
		if (!shaderProgram) return;

		const programInfo = {
			program: shaderProgram,
			attribLocations: {
				vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
			},
			uniformLocations: {
				resolution: gl.getUniformLocation(shaderProgram, "u_resolution"),
				time: gl.getUniformLocation(shaderProgram, "u_time"),
				isRecording: gl.getUniformLocation(shaderProgram, "u_isRecording"),
			},
		};

		const positions = [1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0];
		const positionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

		const startTime = Date.now();
		let isHovered = 0.0;
		let currentHoverVal = 0.0;
		let animationFrameId: number;

		function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement) {
			const displayWidth = canvas.clientWidth;
			const displayHeight = canvas.clientHeight;
			const needResize =
				canvas.width !== displayWidth || canvas.height !== displayHeight;
			if (needResize) {
				canvas.width = displayWidth;
				canvas.height = displayHeight;
			}
			return needResize;
		}

		function render() {
			if (!canvas) return;
			resizeCanvasToDisplaySize(canvas);
			gl!.viewport(0, 0, canvas.width, canvas.height);

			gl!.clearColor(0.02, 0.05, 0.1, 1.0);
			gl!.clear(gl!.COLOR_BUFFER_BIT);

			// biome-ignore lint/correctness/useHookAtTopLevel: WebGL method, not a React hook
			gl!.useProgram(programInfo.program);

			gl!.bindBuffer(gl!.ARRAY_BUFFER, positionBuffer);
			gl!.vertexAttribPointer(
				programInfo.attribLocations.vertexPosition,
				2,
				gl!.FLOAT,
				false,
				0,
				0,
			);
			gl!.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

			gl!.uniform2f(
				programInfo.uniformLocations.resolution,
				canvas.width,
				canvas.height,
			);
			const time = (Date.now() - startTime) / 1000.0;
			gl!.uniform1f(programInfo.uniformLocations.time, time);
			currentHoverVal += (isHovered - currentHoverVal) * 0.05;
			gl!.uniform1f(programInfo.uniformLocations.isRecording, currentHoverVal);

			gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
			animationFrameId = requestAnimationFrame(render);
		}

		const hero = heroRef.current;
		const enter = () => {
			isHovered = 1.0;
		};
		const leave = () => {
			isHovered = 0.0;
		};
		const move = () => {
			isHovered = 1.0;
		};

		if (hero) {
			hero.addEventListener("mouseenter", enter);
			hero.addEventListener("mouseleave", leave);
			hero.addEventListener("mousemove", move);
		}

		render();

		return () => {
			cancelAnimationFrame(animationFrameId);
			if (hero) {
				hero.removeEventListener("mouseenter", enter);
				hero.removeEventListener("mouseleave", leave);
				hero.removeEventListener("mousemove", move);
			}
		};
	}, []);

	return (
		<section
			ref={heroRef}
			id="hero"
			className="relative w-full h-[90vh] min-h-[600px] flex items-center justify-center overflow-hidden pt-16"
		>
			<canvas
				ref={canvasRef}
				id="shader-canvas"
				className="absolute inset-0 w-full h-full object-cover z-0"
			></canvas>

			<div className="absolute inset-0 bg-linear-to-b from-deepIndigo/60 via-deepIndigo/40 to-deepIndigo z-10 pointer-events-none"></div>

			<div className="relative z-20 max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
				<div className="lg:col-span-8 flex flex-col gap-6 relative z-20">
					<div className="font-mono text-xs text-white/90 border border-white/20 w-fit px-3 py-1 rounded-full backdrop-blur-sm fade-in-up bg-black/30">
						<span className="text-magentaViolet">●</span> LIVE ON SOLANA MAINNET
					</div>

					<h1 className="text-5xl md:text-7xl font-sans font-medium leading-[1.05] tracking-tight text-white fade-in-up delay-100 relative z-20">
						Decentralized
						<br />
						<span className="text-transparent bg-clip-text bg-linear-to-r from-palePeriwinkle to-lightLavender">
							Access Control,
						</span>
						<br />
						On-Chain.
					</h1>

					<p className="text-lg md:text-xl text-white/80 max-w-2xl mt-4 font-normal leading-relaxed fade-in-up delay-200">
						The standard for Role-Based Access Control in Web3. granular
						permission management for DAOs, protocols, and on-chain teams.
					</p>

					<div className="flex flex-col sm:flex-row gap-4 mt-4 fade-in-up delay-300">
						<button className="px-8 py-4 bg-pearlWhite text-deepIndigo rounded-full font-medium hover:bg-white transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(77,143,255,0.2)]">
							Connect Wallet
						</button>
						<button className="px-8 py-4 border border-palePeriwinkle/30 text-palePeriwinkle rounded-full font-medium hover:bg-white/5 hover:border-palePeriwinkle transition-all flex items-center gap-2 group bg-transparent cursor-pointer">
							<span>View Demo</span>
							<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
						</button>
					</div>
				</div>

				<div className="hidden lg:block lg:col-span-4 fade-in-up delay-300">
					<div
						className="rounded-xl p-6 font-mono text-xs leading-relaxed text-palePeriwinkle/80 relative overflow-hidden"
						style={{ backgroundColor: "#050D1A", borderColor: "rgba(77,143,255,0.15)", borderWidth: 1 }}
					>
						<div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-royalBlue to-magentaViolet"></div>
						<div className="flex gap-2 mb-4 opacity-50">
							<div className="w-3 h-3 rounded-full bg-blue-500/50"></div>
							<div className="w-3 h-3 rounded-full bg-blue-400/50"></div>
							<div className="w-3 h-3 rounded-full bg-blue-300/50"></div>
						</div>
						<div className="space-y-2">
							<p>
								<span className="text-magentaViolet">const</span>{" "}
								<span className="text-blue-100">UserRole</span> = {"{"}
							</p>
							<p className="pl-4">
								ADMIN: <span className="text-blue-300">"0x..."</span>,
							</p>
							<p className="pl-4">
								CONTRIBUTOR: <span className="text-blue-300">"0x..."</span>,
							</p>
							<p className="pl-4">
								AUDITOR: <span className="text-blue-300">"0x..."</span>
							</p>
							<p>{"}"}</p>
							<p className="mt-4">
								<span className="text-blue-400">@modifier</span>
							</p>
							<p>
								<span className="text-magentaViolet">function</span>{" "}
								<span className="text-blue-100">executeProposal</span>() {"{"}
							</p>
							<p className="pl-4 text-blue-500/60">
								// Verifying on-chain permissions...
							</p>
							<p className="pl-4 text-white/80">
								<span className="text-blue-400">require</span>(
								<span className="text-blue-300">hasRole</span>(msg.sender));
							</p>
							<p className="pl-4">_execute();</p>
							<p>{"}"}</p>
						</div>
						<div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-[10px] uppercase tracking-wider opacity-60">
							<span>Status: Active</span>
							<span>Gas: 14 gwei</span>
						</div>
					</div>
				</div>
			</div>

			<div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2 opacity-50">
				<span className="font-mono text-[10px] uppercase tracking-widest text-palePeriwinkle">
					Scroll
				</span>
				<div className="w-[1px] h-12 bg-gradient-to-b from-palePeriwinkle to-transparent"></div>
			</div>
		</section>
	);
}
