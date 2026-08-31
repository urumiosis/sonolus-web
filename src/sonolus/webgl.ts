export type SpriteRect = {
  x: number
  y: number
  w: number
  h: number
}

export type SpriteDraw = {
  /** Sonolus screen-space quad corners: bottom-left, top-left, top-right, bottom-right. */
  quad: [number, number, number, number, number, number, number, number]
  z: number
  alpha: number
  sprite: SpriteRect
}

/** WebGL renderer for Sonolus skin sprites. */
export class WebGLSpriteRenderer {
  readonly gl: WebGLRenderingContext
  private readonly program: WebGLProgram
  private readonly position: number
  private readonly uv: number
  private readonly alpha: WebGLUniformLocation
  private readonly texture: WebGLTexture

  constructor(private readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', { alpha: false, antialias: true })
    if (!gl) throw new Error('WebGL is unavailable')
    this.gl = gl

    const vertex = compile(gl, gl.VERTEX_SHADER, `
      attribute vec2 aPosition;
      attribute vec2 aUv;
      varying vec2 vUv;
      void main() {
        vUv = aUv;
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `)
    const fragment = compile(gl, gl.FRAGMENT_SHADER, `
      precision mediump float;
      varying vec2 vUv;
      uniform sampler2D uTexture;
      uniform float uAlpha;
      void main() {
        vec4 color = texture2D(uTexture, vUv);
        gl_FragColor = vec4(color.rgb, color.a * uAlpha);
      }
    `)
    this.program = link(gl, vertex, fragment)
    this.position = gl.getAttribLocation(this.program, 'aPosition')
    this.uv = gl.getAttribLocation(this.program, 'aUv')
    const alpha = gl.getUniformLocation(this.program, 'uAlpha')
    if (!alpha) throw new Error('Could not find alpha uniform')
    this.alpha = alpha

    const texture = gl.createTexture()
    if (!texture) throw new Error('Could not create WebGL texture')
    this.texture = texture
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  }

  upload(image: TexImageSource, interpolation = true): void {
    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    const filter = interpolation ? gl.LINEAR : gl.NEAREST
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
  }

  clear(): void {
    const gl = this.gl
    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    gl.clearColor(0.067, 0.075, 0.10, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
  }

  draw(draws: readonly SpriteDraw[], textureWidth: number, textureHeight: number): void {
    const gl = this.gl
    gl.useProgram(this.program)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.uniform1f(this.alpha, 1)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    for (const draw of [...draws].sort((a, b) => a.z - b.z)) {
      const [blx, bly, tlx, tly, trx, try_, brx, bry] = draw.quad
      // Skin texture coordinates have an origin at the top-left; WebGL's texture
      // coordinate origin is bottom-left, so invert V here.
      const u0 = draw.sprite.x / textureWidth
      const u1 = (draw.sprite.x + draw.sprite.w) / textureWidth
      const v0 = 1 - (draw.sprite.y + draw.sprite.h) / textureHeight
      const v1 = 1 - draw.sprite.y / textureHeight

      const positions = new Float32Array([
        blx, bly, tlx, tly, trx, try_, brx, bry,
      ])
      const uvs = new Float32Array([
        u0, v0, u0, v1, u1, v1, u1, v0,
      ])
      bindAttribute(gl, this.position, positions, 2)
      bindAttribute(gl, this.uv, uvs, 2)
      gl.uniform1f(this.alpha, Math.max(0, Math.min(1, draw.alpha)))
      gl.drawArrays(gl.TRIANGLE_FAN, 0, 4)
    }
  }
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('Could not create shader')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? 'Shader compilation failed')
  }
  return shader
}

function link(gl: WebGLRenderingContext, vertex: WebGLShader, fragment: WebGLShader): WebGLProgram {
  const program = gl.createProgram()
  if (!program) throw new Error('Could not create program')
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? 'Program link failed')
  }
  return program
}

function bindAttribute(gl: WebGLRenderingContext, location: number, values: Float32Array, size: number): void {
  const buffer = gl.createBuffer()
  if (!buffer) throw new Error('Could not create vertex buffer')
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, values, gl.STREAM_DRAW)
  gl.enableVertexAttribArray(location)
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0)
}
