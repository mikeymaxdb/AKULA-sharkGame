// Hours: 6.5
/*
 * loading screen
 * start screen
 * intro screen
 * gameplay
 * death screen / success screen
 */
import * as THREE from 'three'

import loadFish from 'utils/loadFish'

import Flashlight from 'components/Flashlight'
import Water from 'components/Water'

import 'style.scss'

let camera
let flashLight
let scene
let renderer
let water
let shark
const loadingFish = []
let fishes = []

const eventQueue = []
const state = {
    gameLoopRunning: false,
}

const MAXPOS = 200


let panX = 0
// let panY = 0

let swimUp = false

const clock = new THREE.Clock()
const lookAt = new THREE.Vector3(0, 1, 1)

const onWindowResize = () => {
    const container = document.getElementById('GLWindow')
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()

    renderer.setSize(container.clientWidth, container.clientHeight)
}

const onMouseMove = (e) => {
    panX += e.movementX
    // panY += e.movementY
}

const onPointerLockChange = () => {
    if (document.pointerLockElement === document.getElementById('WebGLCanvas')) {
        document.addEventListener('mousemove', onMouseMove, false)
    } else {
        document.removeEventListener('mousemove', onMouseMove, false)
    }
}

const requestPointerLock = () => {
    document.getElementById('WebGLCanvas').requestPointerLock()
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

const onStart = () => {
    eventQueue.push('gameStart')
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
    scene.background = new THREE.Color(0x002233)
    scene.fog = new THREE.FogExp2(0x002233, 0.01)

    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000)
    // camera.position.set(0, -13, 0)
    camera.position.set(0, 1, 0)
    camera.lookAt(lookAt)

    onWindowResize()

    const light = new THREE.AmbientLight(0x404040, 0.1)
    scene.add(light)

    flashLight = new Flashlight()
    scene.add(flashLight)
    scene.add(flashLight.target)
    flashLight.target.position.set(0, 0, 1000)

    water = new Water()
    scene.add(water)

    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshStandardMaterial({ roughness: 0 })
    const box = new THREE.Mesh(geometry, material)
    box.position.set(0, 0, 20)
    // scene.add(box)

    loadFish('assets/Shark.fbx', 0.1).then((model) => {
        shark = model
        shark.position.set(0, -13, 50)
        scene.add(shark)
    })

    for (let i = 0; i < 60; i += 1) {
        loadingFish.push(loadFish('assets/ClownFish.fbx', 0.02))
    }
    Promise.all(loadingFish).then((loadedFish) => {
        fishes = loadedFish
        fishes.forEach((fish) => {
            scene.add(fish)

            fish.position.set(
                (Math.random() * MAXPOS) - (MAXPOS / 2),
                (-1 * Math.random() * 50) - 7,
                (Math.random() * MAXPOS) - (MAXPOS / 2),
            )
        })
        eventQueue.push('fishLoaded')
    })


    window.addEventListener('resize', onWindowResize)
    document.addEventListener('pointerlockchange', onPointerLockChange, false)
    document.addEventListener('keydown', onKeyDown, false)
    document.addEventListener('keyup', onKeyUp, false)

    document.getElementById('StartButton').onclick = onStart
}

function render() {
    const delta = clock.getDelta()

    water.material.uniforms.time.value += 1.0 / 60.0

    if (state.gameLoopRunning) {
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

        if (shark) {
            shark.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), (Math.PI * delta * 0.05))
            shark.setRotationFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(shark.position.x, shark.position.z) - (Math.PI / 2))
            shark.mixer.update(delta)
        }

        const theta = Math.PI * delta * 0.01

        fishes.forEach((fish) => {
            fish.position.set(
                fish.position.x * Math.cos(theta) + fish.position.z * Math.sin(theta),
                fish.position.y,
                fish.position.z * Math.cos(theta) - fish.position.x * Math.sin(theta),
            )

            fish.setRotationFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(fish.position.x, fish.position.z) - (Math.PI / 2))

            fish.mixer.update(delta)
        })
    }

    renderer.render(scene, camera)

    panX = 0
    // panY = 0
}

function processEvents() {
    eventQueue.forEach((event) => {
        switch (event) {
            case 'fishLoaded':
                document.getElementById('LoadingScreen').classList.add('hidden')
                document.getElementById('StartScreen').classList.remove('hidden')
                break
            case 'gameStart':
                document.getElementById('StartScreen').classList.add('hidden')
                requestPointerLock()
                document.getElementById('WebGLCanvas').addEventListener('click', requestPointerLock)
                state.gameLoopRunning = true
                break
            default:
                break
        }
    })
    eventQueue.splice(0, eventQueue.length)
}

window.addEventListener('DOMContentLoaded', () => {
    function tick() {
        // processEvents()
        requestAnimationFrame(tick)
        render()
    }

    init()
    tick()
})
