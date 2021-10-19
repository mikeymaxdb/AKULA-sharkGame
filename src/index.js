import * as THREE from 'three'

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { Water } from 'three/examples/jsm/objects/Water'
import { Sky } from 'three/examples/jsm/objects/Sky'

import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'

import 'style.scss'

window.addEventListener('DOMContentLoaded', () => {
    let camera
    let scene
    let renderer
    let water
    let sun
    let shark
    let sharkMixer

    const loader = new FBXLoader()
    const clock = new THREE.Clock()

    function onWindowResize() {
        const container = document.getElementById('GLWindow')
        camera.aspect = container.clientWidth / container.clientHeight
        camera.updateProjectionMatrix()

        renderer.setSize(container.clientWidth, container.clientHeight)
    }

    function init() {
        renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('WebGLCanvas') })
        renderer.setPixelRatio(window.devicePixelRatio)
        renderer.setSize(window.innerWidth, window.innerHeight)
        renderer.toneMapping = THREE.ACESFilmicToneMapping

        scene = new THREE.Scene()

        camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000)
        camera.position.set(0, 10, 0)
        camera.lookAt(new THREE.Vector3(0, 0, 1000))

        onWindowResize()

        const light = new THREE.AmbientLight(0x404040, 1)
        scene.add(light)

        sun = new THREE.Vector3()

        // Water

        const waterGeometry = new THREE.PlaneGeometry(1000, 1000)

        water = new Water(
            waterGeometry,
            {
                textureWidth: 512,
                textureHeight: 512,
                waterNormals: new THREE.TextureLoader().load('assets/waternormals.jpg', (texture) => {
                    texture.wrapS = THREE.RepeatWrapping
                    texture.wrapT = THREE.RepeatWrapping
                }),
                sunDirection: new THREE.Vector3(),
                sunColor: 0xffffff,
                waterColor: 0x001e0f,
                distortionScale: 3.7,
                fog: scene.fog !== undefined,
            },
        )

        water.rotation.x = (-1 * Math.PI) / 2

        scene.add(water)

        // Skybox

        const sky = new Sky()
        sky.scale.setScalar(10000)
        scene.add(sky)

        const skyUniforms = sky.material.uniforms

        skyUniforms.turbidity.value = 10
        skyUniforms.rayleigh.value = 2
        skyUniforms.mieCoefficient.value = 0.005
        skyUniforms.mieDirectionalG.value = 0.8

        const parameters = {
            elevation: 2,
            azimuth: 180,
        }

        const pmremGenerator = new THREE.PMREMGenerator(renderer)

        const phi = THREE.MathUtils.degToRad(90 - parameters.elevation)
        const theta = THREE.MathUtils.degToRad(parameters.azimuth)

        sun.setFromSphericalCoords(1, phi, theta)

        sky.material.uniforms.sunPosition.value.copy(sun)
        water.material.uniforms.sunDirection.value.copy(sun).normalize()

        scene.environment = pmremGenerator.fromScene(sky).texture

        const geometry = new THREE.BoxGeometry(1, 1, 1)
        const material = new THREE.MeshStandardMaterial({ roughness: 0 })

        const mesh = new THREE.Mesh(geometry, material)
        mesh.position.set(0, 0, 20)
        scene.add(mesh)

        const controls = new OrbitControls(camera, renderer.domElement)
        controls.maxPolarAngle = Math.PI * 0.495
        controls.target.set(0, 0, 100)
        controls.minDistance = 40.0
        controls.maxDistance = 200.0
        controls.update()

        window.addEventListener('resize', onWindowResize)

        loader.load('assets/Shark.fbx', (model) => {
            shark = model
            shark.scale.setScalar(0.1)
            shark.traverse((c) => {
                if (c.isMesh) {
                    c.castShadow = true
                    c.receiveShadow = true
                }
            })
            scene.add(shark)
            shark.position.set(0, 0, 50)

            sharkMixer = new THREE.AnimationMixer(shark)
            const action = sharkMixer.clipAction(shark.animations[0])
            action.timeScale = 5
            action.play()
        })

        loader.load('assets/ClownFish.fbx', (model) => {
            model.scale.setScalar(0.05)
            model.traverse((c) => {
                if (c.isMesh) {
                    c.castShadow = true
                    c.receiveShadow = true
                }
            })
            scene.add(model)
            model.position.set(10, 0, 50)
        })
    }

    function render() {
        const delta = clock.getDelta()
        if (sharkMixer) {
            sharkMixer.update(delta)
        }
        water.material.uniforms.time.value += 1.0 / 60.0
        renderer.render(scene, camera)
    }

    function animate() {
        requestAnimationFrame(animate)
        render()
    }

    init()
    animate()
})
