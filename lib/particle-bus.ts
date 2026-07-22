"use client"

/**
 * Canal entre o DOM e o campo de partículas.
 *
 * Os títulos da home não sabem nada sobre WebGL: eles só anunciam "houve um
 * toque aqui, nestas coordenadas de tela". O campo, que pode nem estar
 * carregado ainda (é um chunk lazy), escuta e transforma isso numa onda de
 * interferência que atravessa as partículas.
 *
 * É um módulo simples de propósito — um contexto de React forçaria o campo a
 * re-renderizar, e ele vive fora do ciclo de render do React.
 */

export interface FieldPulse {
    /** Coordenadas de tela (clientX/clientY) de onde a onda parte. */
    x: number
    y: number
    /** Multiplicador de intensidade; 1 é o padrão. */
    strength: number
}

type Listener = (pulse: FieldPulse) => void

const listeners = new Set<Listener>()

export function emitFieldPulse(x: number, y: number, strength = 1) {
    listeners.forEach((fn) => fn({ x, y, strength }))
}

export function onFieldPulse(fn: Listener) {
    listeners.add(fn)
    return () => {
        listeners.delete(fn)
    }
}
