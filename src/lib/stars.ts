// 밤하늘 별밭 SVG 생성기.
// gradient 배경 위에 얹는 레이어로 쓰기 위해 투명 배경의 <svg> 문자열을 반환한다.
// - 대부분 아주 작은 별가루, 일부 중간 별, 극소수 밝은 별(은은한 halo)
// - 아래로 갈수록 density가 서서히 옅어져 언덕 근처에서 자연스럽게 사라짐
// - 글자 회피 없이 하늘 전체를 채움 (레퍼런스 실제 밤하늘 참고)
// 결정론적(시드 고정)이라 SSR/CSR 결과가 동일하다.

export interface StarOpts {
  w: number
  h: number
  count: number
  seed?: number
  brightProb?: number // 밝은(halo) 별 비율. 작은 미리보기는 0으로 큰 별 제거.
  removeLargest?: number // 가장 큰 별 N개 제외 (홈에서 2개 빼기 용)
}

export function starsSvg({ w, h, count, seed = 7, brightProb = 0.06, removeLargest = 0 }: StarOpts): string {
  let s = seed
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  const fadeStart = h * 0.55
  const fadeEnd = h * 0.8

  const list: { rad: number; svg: string }[] = []
  let placed = 0
  let tries = 0
  while (placed < count && tries < count * 60) {
    tries++
    const x = rnd() * w
    const y = rnd() * fadeEnd
    if (y > fadeStart) {
      const p = (fadeEnd - y) / (fadeEnd - fadeStart)
      if (rnd() > p) continue // 아래쪽 페이드
    }
    const cx = x.toFixed(1)
    const cy = y.toFixed(1)
    const roll = rnd()
    let rad: number
    let svg: string
    if (roll < brightProb) {
      // 밝은 별 + halo
      rad = 1.0 + rnd() * 0.7
      svg =
        `<circle cx="${cx}" cy="${cy}" r="${(rad * 2.6).toFixed(2)}" fill="#FFFDF0" opacity="0.1"/>` +
        `<circle cx="${cx}" cy="${cy}" r="${rad.toFixed(2)}" fill="#FFFFFF" opacity="${(0.85 + rnd() * 0.15).toFixed(2)}"/>`
    } else if (roll < 0.28) {
      // 중간 별
      rad = 0.55 + rnd() * 0.4
      svg = `<circle cx="${cx}" cy="${cy}" r="${rad.toFixed(2)}" fill="#FBF8EC" opacity="${(0.5 + rnd() * 0.35).toFixed(2)}"/>`
    } else {
      // 작은 별가루(다수)
      rad = 0.3 + rnd() * 0.3
      svg = `<circle cx="${cx}" cy="${cy}" r="${rad.toFixed(2)}" fill="#EDEADC" opacity="${(0.28 + rnd() * 0.35).toFixed(2)}"/>`
    }
    list.push({ rad, svg })
    placed++
  }

  // 가장 큰 별 N개 제외
  if (removeLargest > 0) {
    const idx = list.map((_, i) => i).sort((a, b) => list[b].rad - list[a].rad)
    for (let k = 0; k < removeLargest && k < idx.length; k++) list[idx[k]] = null as never
  }

  const body = list.filter(Boolean).map((it) => it.svg).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" width="${w}" height="${h}">${body}</svg>`
}

// CSS background 로 바로 쓸 수 있는 data URI
export function starsDataUri(opts: StarOpts): string {
  return `url("data:image/svg+xml,${encodeURIComponent(starsSvg(opts))}")`
}
