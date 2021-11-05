// Hours: 12

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
const NUM_FISH = 20

const TAU = Math.PI * 2
const Y_AXIS = new THREE.Vector3(0, 1, 0)

let camera
let flashLight
let scene
let renderer
let water
let shark
let fishes = []

let AirStat
let ChargeStat
let FPSCounter
let Time
let BackgroundTrack
let EffectTrack

const eventQueue = []
const initialState = {
    panX: 0,
    swimUp: false,
    crank: false,
    gameLoopRunning: false,
    underwater: false,
    air: 100,
    charge: 100,
    timeLeft: PICKUP_TIME,
    flashLightOn: false,
    resetTarget: new THREE.Vector3(),
    resetting: false,
    swimDelay: AVG_SWIM_DELAY,
    speed: 1,
}
let state

const clock = new THREE.Clock()
const lookAt = new THREE.Vector3(0, -10, 100)

const onWindowResize = () => {
    const container = document.getElementById('GLWindow')
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()

    renderer.setSize(container.clientWidth, container.clientHeight)
}

const newSharkPosition = () => {
    const position = new THREE.Vector3(1, 0, 0)
    position.applyAxisAngle(Y_AXIS, Math.random() * TAU)
    position.multiplyScalar(SHARK_RADIUS)
    position.y = MAX_DEPTH
    return position
}

const onMouseMove = (e) => {
    state.panX += e.movementX
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
            state.swimUp = true
            break
        case 'KeyE':
            state.crank = true
            break
        case 'Space':
        case 'Enter':
            eventQueue.push('flashLightOn')
            break
        default:
            break
    }

    if (e instanceof window.MouseEvent) {
        eventQueue.push('flashLightOn')
    }
}

const onKeyUp = (e) => {
    switch (e.code) {
        case 'KeyW':
            state.swimUp = false
            break
        case 'KeyE':
            state.crank = false
            break
        case 'Space':
        case 'Enter':
            eventQueue.push('flashLightOff')
            break
        default:
            break
    }

    if (e instanceof window.MouseEvent) {
        eventQueue.push('flashLightOff')
    }
}

function setUpDocument() {
    window.addEventListener('resize', onWindowResize)
    document.addEventListener('pointerlockchange', onPointerLockChange)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
    document.addEventListener('mousedown', onKeyDown)
    document.addEventListener('mouseup', onKeyUp)

    document.getElementById('StartButton').onclick = () => eventQueue.push('gameStart')
    document.getElementById('IntroButton').onclick = () => eventQueue.push('showIntro')
    document.getElementById('RestartButton').onclick = () => eventQueue.push('restart')
    document.getElementById('PlayAgainButton').onclick = () => eventQueue.push('restart')

    AirStat = document.getElementById('AirStat')
    ChargeStat = document.getElementById('ChargeStat')
    FPSCounter = document.getElementById('FPSCounter')
    Time = document.getElementById('Time')
    BackgroundTrack = document.getElementById('BackgroundTrack')
    EffectTrack = document.getElementById('EffectTrack')
}

function setUpRenderer() {
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

    scene.add(new THREE.AmbientLight(0x222222, 0.05))

    onWindowResize()
}

function loadSchoolOfFish() {
    const loadingFish = []

    for (let i = 0, max = Math.round(NUM_FISH * 0.3); i < max; i += 1) {
        loadingFish.push(loadFish('assets/models/ClownFish.fbx', 0.01))
    }

    for (let i = 0, max = Math.round(NUM_FISH * 0.3); i < max; i += 1) {
        loadingFish.push(loadFish('assets/models/TunaFish.fbx', (Math.random() * 0.02) + 0.02))
    }

    for (let i = 0, max = Math.round(NUM_FISH * 0.3); i < max; i += 1) {
        loadingFish.push(loadFish('assets/models/BrownFish.fbx', 0.02))
    }

    for (let i = 0, max = Math.round(NUM_FISH * 0.05); i < max; i += 1) {
        loadingFish.push(loadFish('assets/models/Turtle.fbx', 0.02))
    }

    Promise.all(loadingFish).then((loadedFish) => {
        fishes = loadedFish
        const position = new THREE.Vector3(1, 0, 0)
        fishes.forEach((fish) => {
            scene.add(fish)

            position.applyAxisAngle(Y_AXIS, Math.random() * TAU)

            fish.position.copy(position)
            fish.position.multiplyScalar((Math.random() * 70) + 80)
            fish.position.y = (Math.random() * -50) - 10
        })
        eventQueue.push('fishLoaded')
    })
}

function updateFish(delta) {
    const theta = Math.PI * delta * 0.01

    fishes.forEach((fish) => {
        fish.position.applyAxisAngle(Y_AXIS, theta * fish.speed)

        fish.setRotationFromAxisAngle(
            Y_AXIS, Math.atan2(fish.position.x, fish.position.z) - (Math.PI / 2),
        )

        fish.mixer.update(delta)
    })
}

function init() {
    state = { ...initialState }

    setUpDocument()
    setUpRenderer()

    flashLight = new Flashlight()
    scene.add(flashLight)
    scene.add(flashLight.target)
    flashLight.target.position.set(0, 0, 1000)

    water = new Water()
    scene.add(water)

    loadFish('assets/models/Shark.fbx', 0.1, 5).then((model) => {
        shark = model
        shark.position.copy(newSharkPosition())
        scene.add(shark)
    })

    loadSchoolOfFish()
}

function render() {
    const delta = clock.getDelta()
    FPSCounter.innerHTML = Math.round(1 / delta)

    water.material.uniforms.time.value += 1.0 / 60.0

    updateFish(delta)

    if (state.gameLoopRunning) {
        state.timeLeft = Math.max(0, state.timeLeft - delta)

        if (state.timeLeft) {
            Time.innerHTML = Math.round(state.timeLeft)
        } else if (state.swimDelay) {
            eventQueue.push('victory')
        }

        if (camera.position.y < 0) {
            const exerciseFactor = state.crank ? 0.25 : 1
            state.air = Math.max(0, state.air - ((100 / 30 / exerciseFactor) * delta))
            if (!state.underwater) {
                BackgroundTrack.src = 'assets/audio/underwater2.mp3'
                state.underwater = true
            }
        } else {
            state.air = Math.min(100, state.air + ((100 / 5) * delta))
            if (state.underwater) {
                BackgroundTrack.src = 'assets/audio/waves.mp3'
                state.underwater = false
            }
        }
        AirStat.style.width = `${state.air}%`
        if (!state.air) {
            eventQueue.push('death')
        }

        if (state.flashLightOn) {
            state.charge = Math.max(0, state.charge - ((100 / 5) * delta))
        } else if (state.crank) {
            state.charge = Math.min(100, state.charge + ((100 / 20) * delta))
        }
        ChargeStat.style.width = `${state.charge}%`
        if (!state.charge) {
            eventQueue.push('flashLightOff')
        }

        if (state.swimUp) {
            camera.position.y = Math.max(-10, Math.min(2, camera.position.y + 0.07))
        } else {
            camera.position.y = Math.max(-10, Math.min(2, camera.position.y - 0.07))
        }

        lookAt.y = camera.position.y - 10
        lookAt.applyAxisAngle(new THREE.Vector3(0, 1, 0), state.panX * (Math.PI / 180 / -5))

        flashLight.position.copy(camera.position)
        flashLight.target.position.copy(lookAt)
        camera.lookAt(lookAt)

        // Shark
        shark.mixer.update(delta)
        if (state.swimDelay > 0) {
            // Shark is waiting
            if (state.swimDelay - delta <= 0) {
                window.setTimeout(() => {
                    EffectTrack.src = 'assets/audio/attack.mp3'
                }, 1000)
            }
            state.swimDelay = Math.max(0, state.swimDelay - delta)
        } else {
            // Shark is swimming
            let target

            if (state.resetting) {
                // Shark is swimming away while resetting
                target = state.resetTarget
                if (shark.position.length() > state.resetTarget.length() - 10) {
                    eventQueue.push('resetShark')
                }
            } else {
                // Shark swims towards camera
                target = camera.position.clone()
                target.y -= 2.5
            }

            // Update shark position and rotation
            shark.position.lerp(target, state.speed * delta)
            shark.position.y = Math.min(shark.position.y, -9)
            shark.lookAt(target)
            shark.rotateY(Math.PI)

            if (!state.resetting) {
                if (shark.position.length() < 20) {
                    eventQueue.push('death')
                } else if (shark.position.length() < 50 && state.flashLightOn) {
                    // check for flashlight angle
                    if (flashLight.target.position.angleTo(shark.position) < Math.PI / 6) {
                        state.resetting = true
                        state.resetTarget.copy(newSharkPosition())
                    }
                }
            }
        }
    }

    renderer.render(scene, camera)

    state.panX = 0
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
                EffectTrack.src = 'assets/audio/intro.mp3'
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
                // BackgroundTrack.src = 'assets/audio/scream.mp3'
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
                document.getElementById('VictoryScreen').classList.add('hidden')
                document.getElementById('IntroScreen').classList.remove('hidden')
                state = { ...initialState }
                camera.position.y = 1
                BackgroundTrack.src = 'assets/audio/waves.mp3'
                shark.position.copy(newSharkPosition())
                state.swimDelay = (Math.random() * AVG_SWIM_DELAY) + (AVG_SWIM_DELAY / 2)
                break
            case 'flashLightOn':
                if (state.charge) {
                    flashLight.visible = true
                    state.flashLightOn = true
                }
                break
            case 'flashLightOff':
                flashLight.visible = false
                state.flashLightOn = false
                break
            case 'resetShark':
                shark.position.copy(newSharkPosition())
                state.swimDelay = (Math.random() * AVG_SWIM_DELAY) + (AVG_SWIM_DELAY / 2)
                state.resetting = false
                break
            default:
                break
        }
    })
    eventQueue.splice(0, eventQueue.length)
}

window.addEventListener('DOMContentLoaded', () => {
    function tick() {
        processEvents()
        render()
        requestAnimationFrame(tick)
    }

    init()
    tick()
})
