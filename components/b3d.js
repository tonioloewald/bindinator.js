/**
# babylonjs component

<b8r-component path="../components/b3d.js"></b8r-component>

This is a pure javascript babylonjs component for use as a starting point for 3d apps.
*/

export default {
  css: `
  ._component_ {
    display: block;
    position: relative;
    width: 50vw;
    height: 50vh;
  }

  ._component_ .maximize {
    position: absolute;
    top: 2px;
    right: 2px;
  }

  ._component_ .babylonjs {
    width: 100%;
    height: 100%;
  }
`,
  html: `
<canvas class="babylonjs" data-event="mousedown:_component_.pick">
</canvas>
<button class="maximize" data-event="click:_component_.toggleFullscreen">
  <span data-bind="class(icon-shrink|icon-enlarge)=_component_.isFullscreen"></span>
</button>
`,
  async load ({ component, findOne, get, set }) {
    const { viaTag } = await import('../lib/scripts.js')
    const { BABYLON } = await viaTag('https://cdn.babylonjs.com/babylon.max.js')
    await viaTag('https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js')
    const canvas = findOne('canvas')
    const engine = new BABYLON.Engine(canvas, true)
    const createScene = async function () {
      const scene = new BABYLON.Scene(engine)
      const hemi = new BABYLON.HemisphericLight()
      hemi.intensity = 0.5
      hemi.diffuse = hemi.specular = new BABYLON.Color3(0.3, 0.3, 1)
      const sun = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(0.5, -1, -1), scene)
      const shadowGenerator = new BABYLON.ShadowGenerator(1024, sun)
      shadowGenerator.bias = 0.001
      shadowGenerator.normalBias = 0.01
      sun.shadowMaxZ = 5
      sun.shadowMinZ = 0.1
      shadowGenerator.useContactHardeningShadow = true
      shadowGenerator.contactHardeningLightSizeUVRatio = 0.05
      shadowGenerator.setDarkness(0.1)

      // Adding an Arc Rotate Camera
      const camera = new BABYLON.ArcRotateCamera('Camera', 0, 0.8, 10, BABYLON.Vector3.Zero(), scene)

      camera.attachControl(canvas, false)
      const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene)
      const SPS = new BABYLON.SolidParticleSystem('SPS', scene)
      const sphere = BABYLON.MeshBuilder.CreateSphere('s', {})
      const poly = BABYLON.MeshBuilder.CreatePolyhedron('p', { type: 2 })
      SPS.addShape(sphere, 20) // 20 spheres
      SPS.addShape(poly, 120) // 120 polyhedrons
      SPS.addShape(sphere, 80) // 80 other spheres
      sphere.dispose() // dispose of original model sphere
      poly.dispose() // dispose of original model poly

      const mesh = SPS.buildMesh() // finally builds and displays the SPS mesh

      // initiate particles function
      SPS.initParticles = () => {
        for (let p = 0; p < SPS.nbParticles; p++) {
          const particle = SPS.particles[p]
          particle.position.x = BABYLON.Scalar.RandomRange(-50, 50)
          particle.position.y = BABYLON.Scalar.RandomRange(-50, 50)
          particle.position.z = BABYLON.Scalar.RandomRange(-50, 50)
        }
      }

      // Update SPS mesh
      SPS.initParticles()
      SPS.setParticles()

      // const xr = scene.createDefaultXRExperienceAsync();
      set({
        camera,
        mesh,
        light
      })

      return scene
    }
    const scene = await createScene()
    const highlightLayer = new BABYLON.HighlightLayer('hl1', scene)
    scene.onPointerDown = (evt, info) => {
      highlightLayer.removeAllMeshes()
      if (info.hit) {
        highlightLayer.addMesh(info.pickedMesh, BABYLON.Color3.FromHexString('#aaaaff'))
      }
    }

    const glowLayer = new BABYLON.GlowLayer('glow', scene)
    glowLayer.intensity = 1
    let lastUpdate = 0
    const fps = 30
    const render = () => {
      if (Date.now() - lastUpdate > 1000 / get('fps')) {
        scene.render()
        lastUpdate = Date.now()
      }
    }
    engine.runRenderLoop(render)

    set({
      fps,
      engine,
      scene,
      destroy () {
        engine.stopRenderLoop(render)
      },
      isFullScreen: false,
      async toggleFullscreen () {
        const { isFullscreen } = get()
        if (isFullscreen) {
          await document.exitFullscreen()
          engine.resize()
        } else {
          await component.requestFullscreen()
          engine.resize()
        }
        set({ isFullscreen: !isFullscreen })
      }
    })
  }
}
