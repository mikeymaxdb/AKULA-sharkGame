// Hours: 2.5
import * as THREE from 'three'

// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
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

    let flashLight

    let panX = 0
    let panY = 0

    let swimUp = false

    const loader = new FBXLoader()
    const clock = new THREE.Clock()
    const lookAt = new THREE.Vector3(0, 1, 1)

    function onWindowResize() {
        const container = document.getElementById('GLWindow')
        camera.aspect = container.clientWidth / container.clientHeight
        camera.updateProjectionMatrix()

        renderer.setSize(container.clientWidth, container.clientHeight)
    }

    function onMouseMove(e) {
        panX += e.movementX
        panY += e.movementY
    }

    function init() {
        renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('WebGLCanvas'),
            antialias: true,
            shadowMap: true,
        })
        renderer.setPixelRatio(window.devicePixelRatio)
        renderer.setSize(window.innerWidth, window.innerHeight)
        renderer.toneMapping = THREE.ACESFilmicToneMapping

        scene = new THREE.Scene()

        camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000)
        camera.position.set(0, 1, 0)
        camera.lookAt(lookAt)

        onWindowResize()

        const light = new THREE.AmbientLight(0x404040, 1)
        scene.add(light)

        flashLight = new THREE.SpotLight(0xffffff)
        flashLight.position.set(0, 1, 0)
        flashLight.castShadow = true
        flashLight.angle = Math.PI / 8
        flashLight.intensity = 5
        flashLight.shadow.mapSize.width = 1024
        flashLight.shadow.mapSize.height = 1024
        flashLight.shadow.camera.near = 1
        flashLight.shadow.camera.far = 1000
        flashLight.shadow.camera.fov = 30

        scene.add(flashLight)
        scene.add(flashLight.target)

        flashLight.target.position.set(0, 0, 1000)

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

        // const controls = new OrbitControls(camera, renderer.domElement)
        // controls.target.set(0, 0, 100)
        // controls.update()

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

        document.getElementById('WebGLCanvas').addEventListener('click', () => {
            document.getElementById('WebGLCanvas').requestPointerLock()
        })

        const onPointerLockChange = () => {
            if (document.pointerLockElement === document.getElementById('WebGLCanvas')) {
                document.addEventListener('mousemove', onMouseMove, false)
            } else {
                document.removeEventListener('mousemove', onMouseMove, false)
            }
        }

        const onKeyDown = (e) => {
            switch (e.code) {
                case 'KeyW':
                    swimUp = true
                    break
                default:
                    break
            }
        }

        const onKeyUp = (e) => {
            switch (e.code) {
                case 'KeyW':
                    swimUp = false
                    break
                default:
                    break
            }
        }

        document.addEventListener('pointerlockchange', onPointerLockChange, false)
        document.addEventListener('keydown', onKeyDown, false)
        document.addEventListener('keyup', onKeyUp, false)
    }

    function render() {
        const delta = clock.getDelta()
        if (sharkMixer) {
            sharkMixer.update(delta)
        }
        water.material.uniforms.time.value += 1.0 / 60.0

        if (swimUp) {
            camera.position.y = Math.max(-10, Math.min(2, camera.position.y + 0.05))
        } else {
            camera.position.y = Math.max(-10, Math.min(2, camera.position.y - 0.05))
        }

        // lookAt.y = camera.position.y + (panY / -100)
        lookAt.y = camera.position.y
        lookAt.applyAxisAngle(new THREE.Vector3(0, 1, 0), panX * (Math.PI / 180 / -5))

        flashLight.position.copy(camera.position)
        flashLight.target.position.copy(lookAt)
        camera.lookAt(lookAt)

        renderer.render(scene, camera)

        panX = 0
        panY = 0
    }

    function animate() {
        requestAnimationFrame(animate)
        render()
    }

    init()
    animate()
})
