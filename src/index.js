// Hours: 9.5
/*
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

let AirStat
let ChargeStat
let FPSCounter

const eventQueue = []
const state = {
    gameLoopRunning: false,
    air: 100,
    charge: 100,
    flashLightOn: false,
    shark: {
        resetTarget: new THREE.Vector3(),
        resetting: false,
        swimDelay: 3,
        speed: 1,
    },
}

const MAXPOS = 200

let panX = 0
// let panY = 0

let swimUp = false
let crank = false

const clock = new THREE.Clock()
const lookAt = new THREE.Vector3(0, -10, 100)

const onWindowResize = () => {
    const container = document.getElementById('GLWindow')
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()

    renderer.setSize(container.clientWidth, container.clientHeight)
}

const onStart = () => {
    eventQueue.push('gameStart')
}

const onIntro = () => {
    eventQueue.push('showIntro')
}

const resetShark = () => {
    eventQueue.push('resetShark')
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
        case 'KeyE':
            crank = true
            break
        case 'Space':
            eventQueue.push('flashLightOn')
            break
        case 'KeyR':
            resetShark()
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
        case 'KeyE':
            crank = false
            break
        case 'Space':
            eventQueue.push('flashLightOff')
            break
        default:
            break
    }
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
    scene.fog = new THREE.FogExp2(0x002233, 0.008)

    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000)
    // camera.position.set(0, -13, 0)
    camera.position.set(0, 1, 0)
    camera.lookAt(lookAt)

    onWindowResize()

    const light = new THREE.AmbientLight(0x000000, 0.05)
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

    loadFish('assets/Shark.fbx', 0.1, 5).then((model) => {
        shark = model
        shark.position.set(0, -13, 200)
        scene.add(shark)
    })

    for (let i = 0; i < 50; i += 1) {
        loadingFish.push(loadFish('assets/ClownFish.fbx', 0.02))
    }

    for (let i = 0; i < 50; i += 1) {
        loadingFish.push(loadFish('assets/TunaFish.fbx', 0.02))
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
    document.getElementById('IntroButton').onclick = onIntro

    AirStat = document.getElementById('AirStat')
    ChargeStat = document.getElementById('ChargeStat')
    FPSCounter = document.getElementById('FPSCounter')
}

function render() {
    const delta = clock.getDelta()
    FPSCounter.innerHTML = Math.round(1 / delta)

    water.material.uniforms.time.value += 1.0 / 60.0

    if (state.gameLoopRunning) {
        if (camera.position.y < 0) {
            state.air = Math.max(0, state.air - ((100 / 30) * delta))
        } else {
            state.air = Math.min(100, state.air + ((100 / 5) * delta))
        }
        AirStat.style.width = `${state.air}%`

        if (state.flashLightOn) {
            state.charge = Math.max(0, state.charge - ((100 / 10) * delta))
        } else if (crank && camera.position.y > 0) {
            state.charge = Math.min(100, state.charge + ((100 / 20) * delta))
        }
        ChargeStat.style.width = `${state.charge}%`

        if (swimUp) {
            camera.position.y = Math.max(-10, Math.min(2, camera.position.y + 0.07))
        } else {
            camera.position.y = Math.max(-10, Math.min(2, camera.position.y - 0.07))
        }

        // lookAt.y = camera.position.y + (panY / -100)
        lookAt.y = camera.position.y - 10
        lookAt.applyAxisAngle(new THREE.Vector3(0, 1, 0), panX * (Math.PI / 180 / -5))

        flashLight.position.copy(camera.position)
        flashLight.target.position.copy(lookAt)
        camera.lookAt(lookAt)

        const theta = Math.PI * delta * 0.01

        fishes.forEach((fish) => {
            fish.position.set(
                fish.position.x * Math.cos(theta * fish.speed) + fish.position.z * Math.sin(theta * fish.speed),
                fish.position.y,
                fish.position.z * Math.cos(theta * fish.speed) - fish.position.x * Math.sin(theta * fish.speed),
            )

            fish.setRotationFromAxisAngle(
                new THREE.Vector3(0, 1, 0), Math.atan2(fish.position.x, fish.position.z) - (Math.PI / 2),
            )

            fish.mixer.update(delta)
        })

        // Shark
        shark.mixer.update(delta)
        if (state.shark.swimDelay > 0) {
            state.shark.swimDelay -= delta
        } else {
            let target

            if (state.shark.resetting) {
                // Shark is swimming away while resetting
                target = state.shark.resetTarget
                if (shark.position.length() > state.shark.resetTarget.length() - 10) {
                    resetShark()
                }
            } else {
                // Shark swims towards camera
                target = camera.position.clone()
                target.y -= 2.5
            }

            // Update shark position and rotation
            shark.position.lerp(target, state.shark.speed * delta)

            // In the range that you can spook the shark
            if (shark.position.length() < 50) {
                if (shark.position.length() < 20) {
                    eventQueue.push('death')
                } else if (state.flashLightOn) {
                    // check for flashlight angle
                    state.shark.resetting = true
                    state.shark.resetTarget.set(0, -13, 400)
                }
            }
        }
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
            case 'showIntro':
                document.getElementById('StartScreen').classList.add('hidden')
                document.getElementById('IntroScreen').classList.remove('hidden')
                window.setTimeout(() => {
                    document.getElementById('StartButton').disabled = false
                }, 5000)
                break
            case 'gameStart':
                document.getElementById('IntroScreen').classList.add('hidden')
                document.getElementById('GameScreen').classList.remove('hidden')
                requestPointerLock()
                document.getElementById('WebGLCanvas').addEventListener('click', requestPointerLock)
                state.gameLoopRunning = true
                break
            case 'death':
                document.getElementById('GameScreen').classList.add('hidden')
                document.getElementById('DeathScreen').classList.remove('hidden')
                state.gameLoopRunning = false
                break
            case 'flashLightOn':
                flashLight.visible = true
                state.flashLightOn = true
                break
            case 'flashLightOff':
                flashLight.visible = false
                state.flashLightOn = false
                break
            case 'resetShark':
                shark.position.set(0, -30, 800)
                // state.shark.swimDelay = (Math.random() * 10) + 10
                state.shark.swimDelay = 3
                state.shark.resetting = false
                break
            default:
                break
        }
    })
    eventQueue.splice(0, eventQueue.length)
}

window.addEventListener('DOMContentLoaded', () => {
    function tick() {
        requestAnimationFrame(tick)
        processEvents()
        render()
    }

    init()
    tick()
})
