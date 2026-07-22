"use client"

import { useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"
import {
    AdditiveBlending,
    BufferAttribute,
    BufferGeometry,
    Clock,
    Color,
    Mesh,
    NormalBlending,
    PerspectiveCamera,
    PlaneGeometry,
    Points,
    Scene,
    ShaderMaterial,
    Vector3,
    Vector4,
    WebGLRenderer,
} from "three"
import { onFieldPulse } from "@/lib/particle-bus"

const MAX_PULSES = 4

/**
 * Cinco comportamentos, misturados por peso linear conforme o scroll.
 * Como os pesos de dois modos vizinhos sempre somam 1, a transição entre
 * seções é uma dissolução contínua — nunca um corte.
 */
const PARTICLE_VERTEX = /* glsl */ `
  attribute float aSize;
  attribute float aSpeed;
  attribute float aPhase;

  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uMode;

  uniform vec3 uRayOrigin;
  uniform vec3 uRayDir;
  uniform float uMouseStrength;
  uniform float uMagnetRadius;
  uniform float uRefDist;

  uniform vec4 uPulses[${MAX_PULSES}]; // xyz = origem no mundo, w = instante de início
  uniform float uPulseLife;

  varying float vDepthFade;
  varying float vAttract;
  varying float vPulse;

  float weight(float mode, float i) {
    return max(0.0, 1.0 - abs(mode - i));
  }

  void main() {
    float ty = uTime * aSpeed;

    // ── Modo 0 — Campo: deriva lenta para cima (o hero) ──────────────
    vec3 m0 = position;
    m0.y = mod(position.y + ty + 30.0, 60.0) - 30.0;
    m0.x += sin(uTime * 0.25 * aSpeed + aPhase) * 0.7;

    // Só dois modos vizinhos têm peso ao mesmo tempo. Os testes abaixo olham
    // uniformes, então o desvio é coerente para todos os vértices e a GPU
    // simplesmente pula os modos inativos — sem isso pagaríamos por cinco
    // comportamentos o tempo todo para exibir dois.
    vec3 p = m0 * weight(uMode, 0.0);
    float mw;

    // ── Modo 1 — Peso: tudo desce, devagar e comprimido ──────────────
    mw = weight(uMode, 1.0);
    if (mw > 0.0) {
      vec3 m1 = position;
      m1.y = (mod(position.y - ty * 0.4 + 30.0, 60.0) - 30.0) * 0.8;
      m1.x += sin(uTime * 0.1 + aPhase) * 0.25;
      p += m1 * mw;
    }

    // ── Modo 2 — Malha: as partículas se organizam numa grade ────────
    mw = weight(uMode, 2.0);
    if (mw > 0.0) {
      vec3 grid = floor(position / 5.0) * 5.0 + 2.5;
      float breathe = 0.5 + 0.5 * sin(uTime * 0.7 + aPhase);
      p += mix(m0, grid, 0.72 + 0.22 * breathe) * mw;
    }

    // ── Modo 3 — Corrente: fluxo horizontal, como um rio de luz ──────
    mw = weight(uMode, 3.0);
    if (mw > 0.0) {
      vec3 m3 = position;
      m3.x = mod(position.x + uTime * (1.1 + aSpeed) + 30.0, 60.0) - 30.0;
      m3.y += sin(m3.x * 0.22 + uTime * 0.55 + aPhase) * 1.3;
      p += m3 * mw;
    }

    // ── Modo 4 — Vórtice: espiral convergindo para o centro ──────────
    mw = weight(uMode, 4.0);
    if (mw > 0.0) {
      float r = length(position.xy);
      float a = atan(position.y, position.x) + uTime * (0.22 + aSpeed * 0.18) + aPhase * 0.08;
      float rr = r * (0.5 + 0.42 * sin(uTime * 0.3 + aPhase));
      p += vec3(cos(a) * rr, sin(a) * rr, position.z) * mw;
    }

    // ── Ímã do cursor ────────────────────────────────────────────────
    // Distância até o RAIO câmera→cursor, não até um ponto: assim o ímã
    // vira um cone e pega partículas de qualquer profundidade.
    vec3 w = p - uRayOrigin;
    float t = max(dot(w, uRayDir), 0.0);
    vec3 delta = (uRayOrigin + uRayDir * t) - p;
    float dist = length(delta);
    float radius = uMagnetRadius * max(t, 0.001) / uRefDist;
    float pull = smoothstep(radius, 0.0, dist) * uMouseStrength;

    vec3 dir = normalize(delta + vec3(1e-5));
    vec3 swirl = normalize(cross(uRayDir, dir) + vec3(1e-5));
    p += (dir * 0.58 + swirl * 0.42) * pull * min(dist, radius);
    vAttract = pull;

    // ── Ondas de interferência ───────────────────────────────────────
    // Cada título tocado dispara uma frente de onda que empurra as
    // partículas para fora numa banda estreita e depois se dissipa.
    float pulseSum = 0.0;
    for (int i = 0; i < ${MAX_PULSES}; i++) {
      vec4 pulse = uPulses[i];
      float age = uTime - pulse.w;
      if (pulse.w > 0.0 && age > 0.0 && age < uPulseLife) {
        vec2 toP = p.xy - pulse.xy;
        float d = length(toP);
        float front = age * 16.0;
        // Banda gaussiana estreita acompanhando a frente de onda.
        float band = exp(-pow(d - front, 2.0) * 0.05);
        float decay = 1.0 - age / uPulseLife;
        float amp = band * decay * 2.6;
        p.xy += normalize(toP + vec2(1e-5)) * amp;
        pulseSum += band * decay;
      }
    }
    vPulse = clamp(pulseSum, 0.0, 1.0);

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // O ganho de tamanho é contido de propósito: área cresce ao quadrado, e
    // com blending aditivo cada pixel a mais é fill rate. O brilho extra vem
    // da cor no fragmento, que é barato.
    gl_PointSize = aSize * uPixelRatio * (18.0 / -mvPosition.z)
                 * (1.0 + vAttract * 0.8 + vPulse * 0.7);
    vDepthFade = smoothstep(55.0, 4.0, -mvPosition.z);
  }
`

const PARTICLE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uHotColor;
  uniform float uOpacity;
  uniform float uPresence; // 1 nas seções que pedem o campo, 0 nas que não

  varying float vDepthFade;
  varying float vAttract;
  varying float vPulse;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;

    // Tanto o ímã quanto a onda acendem a partícula: o efeito fica visível
    // sem precisar desenhar nada além dos próprios pontos.
    float hot = clamp(vAttract + vPulse, 0.0, 1.0);
    vec3 color = mix(uColor, uHotColor, hot);
    float alpha = smoothstep(0.5, 0.0, d) * vDepthFade * uOpacity
                * uPresence * (1.0 + hot * 0.9);

    gl_FragColor = vec4(color, alpha);
  }
`

/** Feixes de luz suaves varrendo o fundo, só nos modos de corrente/vórtice. */
const SHAFT_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const SHAFT_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uColor;

  varying vec2 vUv;

  // Faixa suave sem exp/pow: este shader roda por pixel na tela inteira, e
  // ali cada instrução transcendental custa caro. smoothstep entrega o mesmo
  // perfil visual por uma fração do preço.
  float band(float x, float c, float w) {
    return smoothstep(w, 0.0, abs(x - c));
  }

  void main() {
    // Inclina o eixo horizontal com a altura: os feixes ficam diagonais,
    // como luz entrando por uma fresta.
    float x = (vUv.x * 2.0 - 1.0) + (vUv.y - 0.5) * 0.75;

    float s = 0.0;
    s += band(x, sin(uTime * 0.11) * 0.7 - 0.25, 0.22) * 0.85;
    s += band(x, sin(uTime * 0.07 + 2.0) * 0.6 + 0.4, 0.15) * 0.6;

    // Apaga nas bordas de cima e de baixo para o feixe não ter corte seco.
    s *= smoothstep(0.0, 0.4, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
    s *= uIntensity;

    gl_FragColor = vec4(uColor * s, s * 0.55);
  }
`

/**
 * Campo de partículas que cobre a página inteira, num canvas `fixed` único.
 *
 * A ideia central: em vez de cada seção ter o seu próprio sistema, existe UM
 * campo. Conforme a página rola, ele muda de comportamento — as mesmas
 * partículas que sobem no hero afundam na seção do problema, se organizam
 * numa malha nos serviços, viram correnteza no "como funciona" e espiralam no
 * CTA final. A continuidade entre seções é o efeito.
 *
 * As seções declaram o modo que querem via `data-field-mode="0..4"`; este
 * componente não sabe nada sobre a estrutura da home.
 */
export function FieldScene() {
    const containerRef = useRef<HTMLDivElement>(null)
    const { resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!mounted) return
        const container = containerRef.current
        if (!container) return

        const isDark = resolvedTheme === "dark"
        const reduceMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches
        const isSmallScreen = window.innerWidth < 768

        let renderer: WebGLRenderer
        try {
            renderer = new WebGLRenderer({
                alpha: true,
                antialias: false,
                powerPreference: "low-power",
            })
        } catch {
            return
        }

        const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)
        renderer.setPixelRatio(pixelRatio)
        renderer.setClearColor(0x000000, 0)
        container.appendChild(renderer.domElement)
        Object.assign(renderer.domElement.style, {
            position: "absolute",
            inset: "0",
            width: "100%",
            height: "100%",
            display: "block",
        })

        const scene = new Scene()
        const camera = new PerspectiveCamera(60, 1, 0.1, 120)
        camera.position.set(0, 0, 6)

        // ── Partículas ──────────────────────────────────────────────────
        const count = isSmallScreen ? 5000 : 14000
        const positions = new Float32Array(count * 3)
        const sizes = new Float32Array(count)
        const speeds = new Float32Array(count)
        const phases = new Float32Array(count)

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 60
            positions[i * 3 + 1] = (Math.random() - 0.5) * 60
            positions[i * 3 + 2] = -Math.random() * 48 + 2
            sizes[i] = Math.random() * 2.2 + 0.8
            speeds[i] = Math.random() * 0.6 + 0.15
            phases[i] = Math.random() * Math.PI * 2
        }

        const geometry = new BufferGeometry()
        geometry.setAttribute("position", new BufferAttribute(positions, 3))
        geometry.setAttribute("aSize", new BufferAttribute(sizes, 1))
        geometry.setAttribute("aSpeed", new BufferAttribute(speeds, 1))
        geometry.setAttribute("aPhase", new BufferAttribute(phases, 1))

        const pulses = Array.from(
            { length: MAX_PULSES },
            () => new Vector4(0, 0, 0, 0),
        )

        const particleMaterial = new ShaderMaterial({
            vertexShader: PARTICLE_VERTEX,
            fragmentShader: PARTICLE_FRAGMENT,
            transparent: true,
            depthWrite: false,
            blending: isDark ? AdditiveBlending : NormalBlending,
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: { value: pixelRatio },
                uMode: { value: 0 },
                uColor: { value: new Color(isDark ? "#7dd3fc" : "#3b82f6") },
                uHotColor: { value: new Color(isDark ? "#ffffff" : "#4338ca") },
                uOpacity: { value: isDark ? 0.85 : 0.5 },
                uPresence: { value: 1 },
                uRayOrigin: { value: new Vector3(0, 0, 6) },
                uRayDir: { value: new Vector3(0, 0, -1) },
                uMouseStrength: { value: 0 },
                uMagnetRadius: { value: 2.6 },
                uRefDist: { value: 6 },
                uPulses: { value: pulses },
                uPulseLife: { value: 2.4 },
            },
        })

        const points = new Points(geometry, particleMaterial)
        scene.add(points)

        // ── Feixes de luz ───────────────────────────────────────────────
        const shaftGeometry = new PlaneGeometry(120, 80)
        const shaftMaterial = new ShaderMaterial({
            vertexShader: SHAFT_VERTEX,
            fragmentShader: SHAFT_FRAGMENT,
            transparent: true,
            depthWrite: false,
            blending: AdditiveBlending,
            uniforms: {
                uTime: { value: 0 },
                uIntensity: { value: 0 },
                uColor: { value: new Color(isDark ? "#60a5fa" : "#818cf8") },
            },
        })
        const shafts = new Mesh(shaftGeometry, shaftMaterial)
        shafts.position.z = -34
        scene.add(shafts)

        // ── Modo a partir do scroll ─────────────────────────────────────
        // As seções declaram o modo; aqui só medimos qual delas está no meio
        // da tela e misturamos as vizinhas por proximidade.
        interface Marker {
            mode: number
            /** 1 = seção quer o campo; 0 = seção fica limpa. */
            presence: number
            center: number
            height: number
        }
        let markers: Marker[] = []

        const measureMarkers = () => {
            markers = Array.from(
                document.querySelectorAll<HTMLElement>("[data-field-mode]"),
            ).map((el) => {
                const rect = el.getBoundingClientRect()
                const top = rect.top + window.scrollY
                return {
                    mode: parseFloat(el.dataset.fieldMode || "0"),
                    presence: el.hasAttribute("data-field-off") ? 0 : 1,
                    center: top + rect.height / 2,
                    height: rect.height,
                }
            })
        }
        measureMarkers()

        /**
         * Média ponderada pela proximidade da seção ao centro da tela.
         * O mesmo cálculo serve para o modo e para a presença — por isso as
         * partículas somem e reaparecem em fade, sem corte entre seções.
         */
        const sampleMarkers = () => {
            if (!markers.length) return { mode: 0, presence: 1 }
            const viewCenter = window.scrollY + window.innerHeight / 2
            let modeSum = 0
            let presenceSum = 0
            let weightSum = 0
            for (const m of markers) {
                const reach = m.height / 2 + window.innerHeight * 0.5
                const w = Math.max(
                    0,
                    1 - Math.abs(m.center - viewCenter) / reach,
                )
                modeSum += m.mode * w
                presenceSum += m.presence * w
                weightSum += w
            }
            if (weightSum <= 0) return { mode: 0, presence: 1 }
            return {
                mode: modeSum / weightSum,
                presence: presenceSum / weightSum,
            }
        }

        // ── Ciclo ───────────────────────────────────────────────────────
        const clock = new Clock()
        let frameId = 0
        let visible = true
        const pointer = { x: 0, y: 0 }
        const hasHover = window.matchMedia("(hover: hover)").matches
        let strengthTarget = 0
        let sample = sampleMarkers()

        const rayOrigin = particleMaterial.uniforms.uRayOrigin.value as Vector3
        const rayDir = particleMaterial.uniforms.uRayDir.value as Vector3
        const aimDir = new Vector3()
        const projected = new Vector3()

        /** Converte coordenadas de tela para o plano z = 0 do mundo. */
        const screenToWorld = (clientX: number, clientY: number) => {
            const ndcX = (clientX / window.innerWidth) * 2 - 1
            const ndcY = -((clientY / window.innerHeight) * 2 - 1)
            projected.set(ndcX, ndcY, 0.5).unproject(camera)
            projected.sub(camera.position).normalize()
            const t = -camera.position.z / projected.z
            return projected
                .multiplyScalar(t)
                .add(camera.position)
                .clone()
        }

        let pulseSlot = 0
        const unsubscribePulse = onFieldPulse(({ x, y, strength }) => {
            if (reduceMotion) return
            const world = screenToWorld(x, y)
            const slot = pulses[pulseSlot % MAX_PULSES]
            slot.set(world.x, world.y, world.z, clock.getElapsedTime())
            pulseSlot++
            // A força regula quanto o pulso sobrevive — títulos maiores podem
            // pedir ondas mais longas.
            particleMaterial.uniforms.uPulseLife.value = 2.4 * strength
        })

        const resize = () => {
            const { clientWidth: w, clientHeight: h } = container
            if (!w || !h) return
            renderer.setSize(w, h, false)
            camera.aspect = w / h
            camera.updateProjectionMatrix()
        }
        resize()

        const resizeObserver = new ResizeObserver(() => {
            resize()
            measureMarkers()
        })
        resizeObserver.observe(container)

        const renderFrame = () => {
            const time = clock.getElapsedTime()
            particleMaterial.uniforms.uTime.value = time
            shaftMaterial.uniforms.uTime.value = time

            // Suaviza a troca de modo: mesmo um scroll aos trancos vira uma
            // transição contínua entre comportamentos.
            const uMode = particleMaterial.uniforms.uMode
            uMode.value += (sample.mode - uMode.value) * 0.05

            // Presença: as seções marcadas com data-field-off levam isto a 0,
            // e o campo desaparece em fade em vez de sumir de uma vez.
            const presence = particleMaterial.uniforms.uPresence
            presence.value += (sample.presence - presence.value) * 0.05
            points.visible = presence.value > 0.01

            // Os feixes só aparecem na correnteza (3) e no vórtice (4), e
            // apenas onde o campo está presente.
            const shaftTarget =
                Math.max(0, Math.min((uMode.value - 2.2) / 1.4, 1)) *
                0.55 *
                presence.value
            const intensity = shaftMaterial.uniforms.uIntensity
            intensity.value += (shaftTarget - intensity.value) * 0.05
            // Apagado significa não desenhar: um quad aditivo em tela cheia é
            // caro em fill rate, e `discard` no fragmento não evita esse custo.
            shafts.visible = intensity.value > 0.01

            if (hasHover) {
                rayOrigin.copy(camera.position)
                aimDir
                    .set(pointer.x, pointer.y, 0.5)
                    .unproject(camera)
                    .sub(camera.position)
                    .normalize()
                rayDir.lerp(aimDir, 0.12).normalize()

                const s = particleMaterial.uniforms.uMouseStrength
                s.value += (strengthTarget - s.value) * 0.07
            }

            renderer.render(scene, camera)
        }

        const loop = () => {
            frameId = requestAnimationFrame(loop)
            renderFrame()
        }
        const stop = () => {
            if (frameId) {
                cancelAnimationFrame(frameId)
                frameId = 0
            }
        }
        const start = () => {
            if (!frameId && visible && !document.hidden) {
                clock.getDelta()
                loop()
            }
        }

        const onScroll = () => {
            sample = sampleMarkers()
        }
        const onPointerMove = (e: PointerEvent) => {
            pointer.x = (e.clientX / window.innerWidth) * 2 - 1
            pointer.y = -((e.clientY / window.innerHeight) * 2 - 1)
            if (e.pointerType === "mouse") strengthTarget = 1
        }
        const onPointerOut = (e: PointerEvent) => {
            if (!e.relatedTarget) strengthTarget = 0
        }
        const onVisibility = () => (document.hidden ? stop() : start())
        const onContextLost = (e: Event) => {
            e.preventDefault()
            stop()
        }

        renderer.domElement.addEventListener("webglcontextlost", onContextLost)
        renderer.domElement.addEventListener("webglcontextrestored", start)

        if (reduceMotion) {
            renderFrame()
        } else {
            window.addEventListener("scroll", onScroll, { passive: true })
            window.addEventListener("resize", measureMarkers)
            window.addEventListener("pointermove", onPointerMove, {
                passive: true,
            })
            document.addEventListener("pointerout", onPointerOut)
            document.addEventListener("visibilitychange", onVisibility)
            start()
        }

        return () => {
            stop()
            unsubscribePulse()
            resizeObserver.disconnect()
            window.removeEventListener("scroll", onScroll)
            window.removeEventListener("resize", measureMarkers)
            window.removeEventListener("pointermove", onPointerMove)
            document.removeEventListener("pointerout", onPointerOut)
            document.removeEventListener("visibilitychange", onVisibility)
            renderer.domElement.removeEventListener(
                "webglcontextlost",
                onContextLost,
            )
            renderer.domElement.removeEventListener(
                "webglcontextrestored",
                start,
            )
            geometry.dispose()
            particleMaterial.dispose()
            shaftGeometry.dispose()
            shaftMaterial.dispose()
            renderer.dispose()
            renderer.domElement.remove()
            visible = false
        }
    }, [mounted, resolvedTheme])

    return (
        <div
            ref={containerRef}
            aria-hidden="true"
            className="fixed inset-0 z-0 pointer-events-none"
        />
    )
}
