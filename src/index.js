// Hours: 2.5
import * as THREE from 'three'

// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { Sky } from 'three/examples/jsm/objects/Sky'

import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'

import Flashlight from 'components/Flashlight'
import Water from 'components/Water'

import 'style.scss'

let camera
let scene
let renderer
let water
let sun
let shark
const animations = []
const fish = []

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
    renderer.outputEncoding = THREE.sRGBEncoding

    scene = new THREE.Scene()
    scene.background = 0x000000
    scene.fog = new THREE.FogExp2(0x000000, 0.01)

    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000)
    camera.position.set(0, -3, 0)
    camera.lookAt(lookAt)

    onWindowResize()

    const light = new THREE.AmbientLight(0x404040, 0.5)
    scene.add(light)

    flashLight = new Flashlight()
    scene.add(flashLight)
    scene.add(flashLight.target)

    flashLight.target.position.set(0, 0, 1000)

    sun = new THREE.Vector3()

    // Water
    water = new Water()
    water.material.side = THREE.DoubleSide
    scene.add(water)

    const parameters = {
        elevation: 3,
        azimuth: 180,
    }

    const pmremGenerator = new THREE.PMREMGenerator(renderer)

    const phi = THREE.MathUtils.degToRad(90 - parameters.elevation)
    const theta = THREE.MathUtils.degToRad(parameters.azimuth)

    sun.setFromSphericalCoords(1, phi, theta)

    water.material.uniforms.sunDirection.value.copy(sun).normalize()

    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshStandardMaterial({ roughness: 0 })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(0, 0, 20)
    scene.add(mesh)

    const underwaterGeo = new THREE.SphereGeometry(2)
    const underwaterMat = new THREE.MeshStandardMaterial({
        transparent: true,
        opacity: 0.5,
        color: 0x49ef4,
        side: THREE.BackSide,
        lightMapIntesity: 0,
    })
    const underwaterMesh = new THREE.Mesh(underwaterGeo, underwaterMat)
    underwaterMesh.position.copy(camera.position)
    // scene.add(underwaterMesh)

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
        shark.position.set(0, -5, 50)

        const sharkMixer = new THREE.AnimationMixer(shark)
        const action = sharkMixer.clipAction(shark.animations[0])
        action.timeScale = 5
        action.play()
        animations.push(sharkMixer)
    })

    const generateFish = (model) => {

    }

    loader.load('assets/ClownFish.fbx', (model) => {
        model.scale.setScalar(0.02)
        model.traverse((c) => {
            if (c.isMesh) {
                c.castShadow = true
                c.receiveShadow = true
            }
        })
        model.position.set(10, -5, 50)

        // const mixer = new THREE.AnimationMixer(model)
        // const action = mixer.clipAction(model.animations[0])
        // action.timeScale = 1
        // action.play()
        // animations.push(mixer)
        scene.add(model)
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

    animations.forEach((a) => a.update(delta))

    water.material.uniforms.time.value += 1.0 / 60.0

    // if (swimUp) {
    //     camera.position.y = Math.max(-10, Math.min(2, camera.position.y + 0.05))
    // } else {
    //     camera.position.y = Math.max(-10, Math.min(2, camera.position.y - 0.05))
    // }

    // lookAt.y = camera.position.y + (panY / -100)
    lookAt.y = camera.position.y
    lookAt.applyAxisAngle(new THREE.Vector3(0, 1, 0), panX * (Math.PI / 180 / -5))

    flashLight.position.copy(camera.position)
    flashLight.target.position.copy(lookAt)
    camera.lookAt(lookAt)

    if (shark) {
        shark.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), (Math.PI * delta * 0.05))
        shark.setRotationFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(shark.position.x, shark.position.z) - (Math.PI / 2))
    }

    renderer.render(scene, camera)

    panX = 0
    panY = 0
}

window.addEventListener('DOMContentLoaded', () => {
    function tick() {
        requestAnimationFrame(tick)
        render()
    }

    init()
    tick()
})
