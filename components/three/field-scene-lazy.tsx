"use client"

import dynamic from "next/dynamic"

/**
 * O three.js sai do bundle inicial e vira um chunk buscado depois que a página
 * fica interativa. Sem fallback visual: o campo é decorativo e cobre a página
 * inteira, então um placeholder piscando seria pior que a ausência dele.
 */
export const FieldSceneLazy = dynamic(
    () => import("./field-scene").then((m) => m.FieldScene),
    { ssr: false },
)
