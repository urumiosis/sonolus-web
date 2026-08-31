export type SpriteDraw = {
  x: number
  y: number
  w: number
  h: number
  z: number
  sprite: number
}

/** Minimal WebGL sprite renderer. Coordinates use Sonolus's centered [-1, 1] viewport. */
export class WebGLSpriteRenderer {
  readonly gl: WebGLRenderingContext
  private readonly program: WebGLProgram
  private readonly position: number
  private readonly uv: number
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
      void main() { gl_FragColor = texture2D(uTexture, vUv); }
    `)
    this.program = link(gl, vertex, fragment)
    this.position = gl.getAttribLocation(this.program, 'aPosition')
    this.uv = gl.getAttribLocation(this.program, 'aUv')
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
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    for (const draw of [...draws].sort((a, b) => a.z - b.z)) {
      const x0 = draw.x - draw.w / 2
      const x1 = draw.x + draw.w / 2
      const y0 = draw.y - draw.h / 2
      const y1 = draw.y + draw.h / 2
      const positions = new Float32Array([x0, y0, x1, y0, x0, y1, x1, y1])
      const u0 = draw.sprite / textureWidth
      const u1 = (draw.sprite + 1) / textureWidth
      const uvs = new Float32Array([u0, 0, u1, 0, u0, 1, u1, 1])
      bindAttribute(gl, this.position, positions, 2)
      bindAttribute(gl, this.uv, uvs, 2)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
  }
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('Could not create shader')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'Shader compilation failed')
  return shader
}

function link(gl: WebGLRenderingContext, vertex: WebGLShader, fragment: WebGLShader): WebGLProgram {
  const program = gl.createProgram()
  if (!program) throw new Error('Could not create program')
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'Program link failed')
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
