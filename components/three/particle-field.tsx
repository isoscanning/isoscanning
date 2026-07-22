"use client"

import { useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"
import {
    AdditiveBlending,
    BufferAttribute,
    BufferGeometry,
    Clock,
    Color,
    NormalBlending,
    PerspectiveCamera,
    Points,
    Scene,
    ShaderMaterial,
    Vector3,
    WebGLRenderer,
} from "three"
import { ParticleBackground } from "@/components/particle-background"

const VERTEX_SHADER = /* glsl */ `
  attribute float aSize;
  attribute float aSpeed;
  attribute float aPhase;

  uniform float uTime;
  uniform float uPixelRatio;
  uniform vec3 uRayOrigin;      // posição da câmera
  uniform vec3 uRayDir;         // direção normalizada da câmera até o cursor
  uniform float uMouseStrength; // 0 quando o ponteiro sai da janela, 1 quando está ativo
  uniform float uMagnetRadius;  // raio do cone à distância uRefDist
  uniform float uRefDist;

  varying float vDepthFade;
  varying float vAttract;

  void main() {
    vec3 p = position;

    // Deriva vertical contínua: o mod faz a partícula reaparecer embaixo
    // ao sair por cima, então o campo nunca "acaba".
    p.y = mod(p.y + uTime * aSpeed + 30.0, 60.0) - 30.0;
    // Balanço lateral leve, dessincronizado por aPhase.
    p.x += sin(uTime * 0.25 * aSpeed + aPhase) * 0.7;

    // ── Ímã ──────────────────────────────────────────────────────────
    // Tudo aqui roda por vértice na GPU: 14 mil partículas custam o mesmo
    // que 4 mil em CPU, porque a CPU não toca em nenhuma delas.
    //
    // A atração mede a distância da partícula ao RAIO que vai da câmera até
    // o cursor, não a um ponto fixo no espaço. Isso importa: num campo com
    // profundidade, um ponto fixo só atrairia quem está no mesmo plano dele,
    // e as partículas do fundo ficariam paradas. Com o raio, o ímã vira um
    // cone e pega tudo que aparece sob o cursor, perto ou longe.
    vec3 w = p - uRayOrigin;
    float t = max(dot(w, uRayDir), 0.0);          // quão fundo está a partícula
    vec3 delta = (uRayOrigin + uRayDir * t) - p;  // vetor até o eixo do cone
    float dist = length(delta);

    // O raio cresce com a distância, então o ímã tem tamanho constante na
    // tela em vez de virar um alfinete no fundo e um monstro na frente.
    float radius = uMagnetRadius * max(t, 0.001) / uRefDist;

    float pull = smoothstep(radius, 0.0, dist) * uMouseStrength;

    vec3 dir = normalize(delta + vec3(1e-5));
    // Componente tangencial ao redor do eixo do cone: em vez de colapsarem
    // num ponto, as partículas entram girando, como limalha num ímã.
    vec3 swirl = normalize(cross(uRayDir, dir) + vec3(1e-5));
    p += (dir * 0.58 + swirl * 0.42) * pull * min(dist, radius);

    vAttract = pull;

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Perspectiva: quem está longe fica menor e mais fraco. É isso que dá
    // a sensação de profundidade que o canvas 2D não conseguia produzir.
    gl_PointSize = aSize * uPixelRatio * (18.0 / -mvPosition.z) * (1.0 + vAttract * 1.5);
    vDepthFade = smoothstep(55.0, 4.0, -mvPosition.z);
  }
`

const FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uHotColor;
  uniform float uOpacity;

  varying float vDepthFade;
  varying float vAttract;

  void main() {
    // gl_PointCoord vai de 0 a 1 dentro do ponto; recorta um círculo suave.
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;

    // Quem está sendo puxado acende: o halo do cursor fica visível sem
    // precisar desenhar nada além das próprias partículas.
    vec3 color = mix(uColor, uHotColor, vAttract);
    float alpha = smoothstep(0.5, 0.0, d) * vDepthFade * uOpacity * (1.0 + vAttract * 0.9);

    gl_FragColor = vec4(color, alpha);
  }
`

/**
 * Campo de partículas em WebGL para o hero.
 *
 * Substitui o canvas 2D do <ParticleBackground /> nesta seção: as partículas
 * vivem na GPU (posição animada no vertex shader, zero trabalho de CPU por
 * quadro), têm profundidade real via câmera em perspectiva e reagem ao mouse.
 *
 * Se o WebGL não estiver disponível, cai de volta no canvas 2D original.
 * Com `prefers-reduced-motion: reduce` desenha um único quadro estático.
 */
export function ParticleField() {
    const containerRef = useRef<HTMLDivElement>(null)
    const { resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    const [webglFailed, setWebglFailed] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!mounted || webglFailed) return

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
                antialias: false, // pontos já são suavizados no shader
                powerPreference: "low-power",
            })
        } catch {
            setWebglFailed(true)
            return
        }

        // Telas Retina dobram/triplicam a contagem de pixels. Acima de 1.5 o
        // ganho visual em partículas desfocadas é nulo e o custo de GPU não é.
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

        const material = new ShaderMaterial({
            vertexShader: VERTEX_SHADER,
            fragmentShader: FRAGMENT_SHADER,
            transparent: true,
            depthWrite: false,
            // No escuro, additive faz as partículas somarem luz. No claro isso
            // estouraria para branco, então usa blending normal e cor mais forte.
            blending: isDark ? AdditiveBlending : NormalBlending,
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: { value: pixelRatio },
                uColor: { value: new Color(isDark ? "#7dd3fc" : "#3b82f6") },
                uHotColor: { value: new Color(isDark ? "#ffffff" : "#4338ca") },
                uOpacity: { value: isDark ? 0.85 : 0.5 },
                uRayOrigin: { value: new Vector3(0, 0, 6) },
                uRayDir: { value: new Vector3(0, 0, -1) },
                uMouseStrength: { value: 0 },
                uMagnetRadius: { value: 2.6 },
                uRefDist: { value: 6 },
            },
        })

        const points = new Points(geometry, material)
        scene.add(points)

        const resize = () => {
            const { clientWidth: w, clientHeight: h } = container
            if (!w || !h) return
            renderer.setSize(w, h, false)
            camera.aspect = w / h
            camera.updateProjectionMatrix()
        }
        resize()

        const resizeObserver = new ResizeObserver(resize)
        resizeObserver.observe(container)

        // ── Loop ────────────────────────────────────────────────────────
        const clock = new Clock()
        let frameId = 0
        let inView = true
        const pointer = { x: 0, y: 0 }
        const cameraTarget = { x: 0, y: 0 }

        // Só faz sentido com ponteiro de verdade: em touch não existe hover,
        // o ímã ficaria preso onde o dedo tocou por último.
        const hasHover = window.matchMedia("(hover: hover)").matches
        let strengthTarget = 0

        const rayOrigin = material.uniforms.uRayOrigin.value as Vector3
        const rayDir = material.uniforms.uRayDir.value as Vector3
        const aimDir = new Vector3()

        const updateMagnetRay = () => {
            rayOrigin.copy(camera.position)

            // Desprojeta o cursor (NDC) para achar a direção da câmera até ele.
            aimDir
                .set(pointer.x, pointer.y, 0.5)
                .unproject(camera)
                .sub(camera.position)
                .normalize()

            // A direção é perseguida com atraso: dá inércia ao ímã, em vez de
            // as partículas grudarem instantaneamente no cursor.
            rayDir.lerp(aimDir, 0.12).normalize()
        }

        const renderFrame = () => {
            material.uniforms.uTime.value = clock.getElapsedTime()

            // Parallax de mouse: a câmera persegue o cursor com atraso, o que
            // desloca as camadas de profundidade uma em relação à outra.
            // Mais discreto agora, para não brigar com o ímã.
            cameraTarget.x += (pointer.x * 0.7 - cameraTarget.x) * 0.04
            cameraTarget.y += (pointer.y * 0.45 - cameraTarget.y) * 0.04
            camera.position.x = cameraTarget.x
            camera.position.y = cameraTarget.y
            camera.lookAt(0, 0, -10)

            if (hasHover) {
                updateMagnetRay()
                const s = material.uniforms.uMouseStrength
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
            if (!frameId && inView && !document.hidden) {
                clock.getDelta() // descarta o tempo parado
                loop()
            }
        }

        const onPointerMove = (e: PointerEvent) => {
            pointer.x = (e.clientX / window.innerWidth) * 2 - 1
            pointer.y = -((e.clientY / window.innerHeight) * 2 - 1)
            if (e.pointerType === "mouse") strengthTarget = 1
        }

        // Cursor saiu da janela: o ímã desliga suavemente e as partículas
        // voltam ao curso normal, em vez de ficarem travadas na última posição.
        const onPointerOut = (e: PointerEvent) => {
            if (!e.relatedTarget) strengthTarget = 0
        }

        // Fora da viewport ou aba em segundo plano: nada de queimar GPU/bateria.
        const intersectionObserver = new IntersectionObserver(
            ([entry]) => {
                inView = entry.isIntersecting
                inView ? start() : stop()
            },
            { threshold: 0 },
        )
        intersectionObserver.observe(container)

        const onVisibility = () => (document.hidden ? stop() : start())

        const onContextLost = (e: Event) => {
            e.preventDefault()
            stop()
        }
        const onContextRestored = () => start()

        renderer.domElement.addEventListener("webglcontextlost", onContextLost)
        renderer.domElement.addEventListener(
            "webglcontextrestored",
            onContextRestored,
        )

        if (reduceMotion) {
            // Um quadro só: o campo aparece, mas nada se move.
            renderFrame()
        } else {
            window.addEventListener("pointermove", onPointerMove, {
                passive: true,
            })
            document.addEventListener("pointerout", onPointerOut)
            document.addEventListener("visibilitychange", onVisibility)
            start()
        }

        return () => {
            stop()
            resizeObserver.disconnect()
            intersectionObserver.disconnect()
            window.removeEventListener("pointermove", onPointerMove)
            document.removeEventListener("pointerout", onPointerOut)
            document.removeEventListener("visibilitychange", onVisibility)
            renderer.domElement.removeEventListener(
                "webglcontextlost",
                onContextLost,
            )
            renderer.domElement.removeEventListener(
                "webglcontextrestored",
                onContextRestored,
            )
            geometry.dispose()
            material.dispose()
            renderer.dispose()
            renderer.domElement.remove()
        }
    }, [mounted, resolvedTheme, webglFailed])

    if (webglFailed) return <ParticleBackground />

    return (
        <div
            ref={containerRef}
            aria-hidden="true"
            className="absolute inset-0 z-0 pointer-events-none"
        />
    )
}
