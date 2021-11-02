// Hours: 9.5

// TODO Restart functionality

import * as THREE from 'three'

import loadFish from 'utils/loadFish'

import Flashlight from 'components/Flashlight'
import Water from 'components/Water'

import 'style.scss'

const INTRO_DELAY = 0
const AVG_SWIM_DELAY = 3
const MAX_DEPTH = -13
const SHARK_RADIUS = 300
const PICKUP_TIME = 20

const TAU = Math.PI * 2
const Y_AXIS = new THREE.Vector3(0, 1, 0)

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
let Time

const eventQueue = []
const state = {
    gameLoopRunning: false,
    air: 100,
    charge: 100,
    timeLeft: PICKUP_TIME,
    flashLightOn: false,
    shark: {
        resetTarget: new THREE.Vector3(),
        resetting: false,
        swimDelay: AVG_SWIM_DELAY,
        speed: 1,
    },
}

const MAXPOS = 200

let panX = 0

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

const onRestart = () => {
    eventQueue.push('restart')
}

const resetShark = () => {
    eventQueue.push('resetShark')
}

const newSharkPosition = () => {
    const position = new THREE.Vector3(1, 0, 0)
    position.applyAxisAngle(Y_AXIS, Math.random() * TAU)
    position.multiplyScalar(SHARK_RADIUS)
    position.y = MAX_DEPTH
    return position
}

const onMouseMove = (e) => {
    panX += e.movementX
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

const exitPointerLock = () => {
    document.exitPointerLock()
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
    camera.position.set(0, 1, 0)
    camera.lookAt(lookAt)

    onWindowResize()

    const light = new THREE.AmbientLight(0x222222, 0.05)
    scene.add(light)

    flashLight = new Flashlight()
    scene.add(flashLight)
    scene.add(flashLight.target)
    flashLight.target.position.set(0, 0, 1000)

    water = new Water()
    scene.add(water)

    loadFish('assets/Shark.fbx', 0.1, 5).then((model) => {
        shark = model
        shark.position.copy(newSharkPosition())
        scene.add(shark)
    })

    // for (let i = 0; i < 50; i += 1) {
    //     loadingFish.push(loadFish('assets/ClownFish.fbx', 0.02))
    // }

    // for (let i = 0; i < 50; i += 1) {
    //     loadingFish.push(loadFish('assets/TunaFish.fbx', 0.02))
    // }

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
    document.getElementById('RestartButton').onclick = onRestart

    AirStat = document.getElementById('AirStat')
    ChargeStat = document.getElementById('ChargeStat')
    FPSCounter = document.getElementById('FPSCounter')
    Time = document.getElementById('Time')
}

function render() {
    const delta = clock.getDelta()
    FPSCounter.innerHTML = Math.round(1 / delta)

    water.material.uniforms.time.value += 1.0 / 60.0

    if (state.gameLoopRunning) {
        state.timeLeft = Math.max(0, state.timeLeft - delta)

        if (state.timeLeft) {
            Time.innerHTML = Math.round(state.timeLeft)
        } else {
            eventQueue.push('victory')
        }

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
            // Shark is waiting
            state.shark.swimDelay -= delta
        } else {
            // Shark is swimming
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
            shark.lookAt(target)
            shark.rotateY(Math.PI)

            if (!state.shark.resetting) {
                if (shark.position.length() < 20) {
                    eventQueue.push('death')
                } else if (shark.position.length() < 50 && state.flashLightOn) {
                    // check for flashlight angle
                    if (flashLight.target.position.angleTo(shark.position) < Math.PI / 6) {
                        state.shark.resetting = true
                        state.shark.resetTarget.copy(newSharkPosition())
                    }
                }
            }
        }
    }

    renderer.render(scene, camera)

    panX = 0
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
                }, INTRO_DELAY)
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
                exitPointerLock()
                break
            case 'victory':
                document.getElementById('GameScreen').classList.add('hidden')
                document.getElementById('VictoryScreen').classList.remove('hidden')
                state.gameLoopRunning = false
                exitPointerLock()
                break
            case 'restart':
                document.getElementById('DeathScreen').classList.add('hidden')
                document.getElementById('DeathScreen').classList.add('hidden')
                eventQueue.push('showIntro')
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
                shark.position.copy(newSharkPosition())
                state.shark.swimDelay = (Math.random() * AVG_SWIM_DELAY) + (AVG_SWIM_DELAY / 2)
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
